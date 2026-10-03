package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/waypoint/notification-service/config"
	"github.com/waypoint/notification-service/internal/handler"
	"github.com/waypoint/notification-service/internal/messaging"
	"github.com/waypoint/notification-service/internal/middleware"
	"github.com/waypoint/notification-service/internal/repository"
	"github.com/waypoint/notification-service/internal/service"
)

var version = "dev"

func main() {
	healthCheckFlag := flag.Bool("healthcheck", false, "Run a healthcheck probe and exit")
	configPathFlag := flag.String("config", "config/config.yaml", "Path to config file")
	flag.Parse()

	// ── Healthcheck mode (Docker HEALTHCHECK) ─────────────────────────────────
	if *healthCheckFlag {
		resp, err := http.Get("http://localhost:8080/health")
		if err != nil || resp.StatusCode != http.StatusOK {
			os.Exit(1)
		}
		os.Exit(0)
	}

	// ── Structured Logging ────────────────────────────────────────────────────
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	var logHandler slog.Handler
	if os.Getenv("APP_ENV") == "production" {
		logHandler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		logHandler = slog.NewTextHandler(os.Stdout, opts)
	}
	logger := slog.New(logHandler).With(
		slog.String("service", "notification-service"),
		slog.String("version", version),
	)
	slog.SetDefault(logger)
	logger.Info("Starting Notification Service", "version", version)

	// ── Config ───────────────────────────────────────────────────────────────
	cfg, err := config.Load(*configPathFlag)
	if err != nil {
		logger.Warn("Could not load config file; using defaults", "error", err)
		cfg = &config.Config{
			Server: config.ServerConfig{HTTPPort: ":8080", WSPath: "/ws"},
		}
	}

	// ── Database ─────────────────────────────────────────────────────────────
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var pgDB *repository.PostgresPool
	pgDB, err = repository.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		logger.Warn("Database pool unavailable; running without persistence", "error", err)
	} else {
		logger.Info("PostgreSQL pool initialized")
		defer pgDB.Close()
	}

	// ── Repositories ─────────────────────────────────────────────────────────
	var notifRepo *repository.NotificationRepository
	if pgDB != nil && pgDB.Pool != nil {
		notifRepo = repository.NewNotificationRepository(pgDB.Pool)
	}

	// ── WebSocket Hub ─────────────────────────────────────────────────────────
	hub := handler.NewHub(
		cfg.WebSocket.PingInterval(),
		cfg.WebSocket.PongWait(),
		logger,
	)

	// ── Services ──────────────────────────────────────────────────────────────
	notifService := service.NewNotificationService(notifRepo, hub, logger)

	// ── RabbitMQ Consumer ─────────────────────────────────────────────────────
	amqpURL := os.Getenv("RABBITMQ_URL")
	if amqpURL == "" {
		amqpURL = cfg.RabbitMQ.URL
	}

	// Build queue map: queueName → routingKey for the consumer.
	// config.yaml queues section maps labels → routing keys (e.g. "flag_raised" → "flag.raised").
	// We derive the actual durable queue name as "notification.<routingKey>" (dots replaced with underscores).
	queues := make(map[string]string)
	if len(cfg.RabbitMQ.Queues) > 0 {
		for _, routingKey := range cfg.RabbitMQ.Queues {
			queueName := "notification." + routingKey
			queues[queueName] = routingKey
		}
	}
	if len(queues) == 0 {
		queues = map[string]string{
			"notification.flag.raised":          "flag.raised",
			"notification.order.deferred":       "order.deferred",
			"notification.allocation.completed": "allocation.completed",
			"notification.delivery.completed":   "delivery.completed",
		}
	}

	consumer := messaging.NewConsumer(
		amqpURL,
		cfg.RabbitMQ.Exchange,
		queues,
		notifService.HandleEvent,
		logger,
	)
	consumer.Start()
	defer consumer.Stop()

	// ── HTTP Routing ──────────────────────────────────────────────────────────
	notifHandler := handler.NewNotificationHandler(hub, notifRepo)

	mux := http.NewServeMux()

	// Health — public (no auth)
	mux.Handle("/health", handler.NewHealthHandler(poolPinger{p: pgDB}))

	// WebSocket + Notification REST — gateway-auth protected
	notifyMux := http.NewServeMux()
	notifyMux.HandleFunc("GET /api/notify/ws", notifHandler.ServeWS)
	notifyMux.HandleFunc("GET /api/notify/notifications", notifHandler.GetNotifications)
	notifyMux.HandleFunc("PATCH /api/notify/notifications/read", notifHandler.MarkRead)

	mux.Handle("/api/notify/", middleware.GatewayAuthMiddleware(notifyMux))

	// ── HTTP Server ───────────────────────────────────────────────────────────
	srv := &http.Server{
		Addr:         cfg.Server.HTTPPort,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // No write timeout — WebSocket connections are long-lived.
		IdleTimeout:  120 * time.Second,
	}

	serverErrCh := make(chan error, 1)
	go func() {
		logger.Info(fmt.Sprintf("HTTP/WebSocket server listening on %s", cfg.Server.HTTPPort))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErrCh <- err
		}
	}()

	// ── Graceful Shutdown ─────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErrCh:
		logger.Error("Fatal server error", "error", err)
		os.Exit(1)
	case sig := <-quit:
		logger.Info("Shutdown signal received", "signal", sig.String())
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server forced shutdown", "error", err)
	}
	logger.Info("Notification Service exited cleanly")
}

// poolPinger adapts *repository.PostgresPool to the interface expected by HealthHandler.
type poolPinger struct{ p *repository.PostgresPool }

func (pp poolPinger) Ping(ctx context.Context) error {
	if pp.p == nil || pp.p.Pool == nil {
		return fmt.Errorf("not connected")
	}
	return pp.p.Pool.Ping(ctx)
}
