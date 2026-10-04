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

	"github.com/waypoint/loading-delivery-service/config"
	"github.com/waypoint/loading-delivery-service/internal/handler"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/repository"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

var (
	version = "dev"
)

func main() {
	healthCheckFlag := flag.Bool("healthcheck", false, "Run a healthcheck probe and exit")
	configPathFlag := flag.String("config", "config/config.yaml", "Path to config file")
	flag.Parse()

	// ── Healthcheck mode (for Docker container HEALTHCHECK command) ───────────
	if *healthCheckFlag {
		resp, err := http.Get("http://localhost:8080/health")
		if err != nil || resp.StatusCode != http.StatusOK {
			os.Exit(1)
		}
		os.Exit(0)
	}

	// ── Structured Logging Setup ─────────────────────────────────────────────
	logLevel := slog.LevelInfo
	opts := &slog.HandlerOptions{
		Level: logLevel,
	}
	var logHandler slog.Handler
	if os.Getenv("APP_ENV") == "production" {
		logHandler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		logHandler = slog.NewTextHandler(os.Stdout, opts)
	}
	logger := slog.New(logHandler).With(
		slog.String("service", "loading-delivery-service"),
		slog.String("version", version),
	)
	slog.SetDefault(logger)

	logger.Info("Starting Loading & Delivery Service", "version", version)

	// ── Config Loading ───────────────────────────────────────────────────────
	cfg, err := config.Load(*configPathFlag)
	if err != nil {
		logger.Warn("Could not load config file, falling back to defaults", "error", err)
		cfg = &config.Config{
			Server: config.ServerConfig{
				HTTPPort: ":8080",
				GRPCPort: ":9090",
				Env:      "development",
			},
		}
	}

	// ── Database Connection ──────────────────────────────────────────────────
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pgDB, err := repository.NewPostgresPool(ctx, cfg.Database)
	if err != nil {
		logger.Warn("Database pool initialization warning (will retry on requests)", "error", err)
	} else {
		logger.Info("PostgreSQL database pool initialized successfully")
		defer pgDB.Close()
	}

	// ── Repositories Initialization ──────────────────────────────────────────
	var loadingRepo *repository.LoadingRepository
	var loaderRepo *repository.LoaderRepository
	var departureRepo *repository.DepartureRepository
	var allocationRepo *repository.AllocationRepository

	if pgDB != nil && pgDB.Pool != nil {
		loadingRepo = repository.NewLoadingRepository(pgDB.Pool)
		loaderRepo = repository.NewLoaderRepository(pgDB.Pool)
		departureRepo = repository.NewDepartureRepository(pgDB.Pool)
		allocationRepo = repository.NewAllocationRepository(pgDB.Pool)
		logger.Info("Repositories initialized", "loading_repo", loadingRepo != nil, "loader_repo", loaderRepo != nil, "departure_repo", departureRepo != nil)
	}

	// ── Service & Handler Initialization ─────────────────────────────────────
	storageService := service.NewStorageServiceFromEnv()
	planningClient := service.NewPlanningServiceClient(os.Getenv("PLANNING_GRPC_ADDR"), logger)
	loadingService := service.NewLoadingService(loadingRepo, loaderRepo, planningClient, logger)
	loadingService.SetAllocationRepository(allocationRepo)
	departureService := service.NewDepartureService(departureRepo, loaderRepo, logger)
	loaderHandler := handler.NewLoaderHandler(loadingService, storageService, cfg.DemoMode)
	departureHandler := handler.NewDepartureHandler(departureService)

	// ── Background Outbox Worker ─────────────────────────────────────────────
	if pgDB != nil && pgDB.Pool != nil {
		amqpURL := os.Getenv("RABBITMQ_URL")
		if amqpURL == "" {
			amqpURL = cfg.RabbitMQ.URL
		}
		routingKey := "flag.raised"
		if k, ok := cfg.RabbitMQ.RoutingKeys["flag_raised"]; ok && k != "" {
			routingKey = k
		}
		outboxWorker := service.NewOutboxWorker(pgDB.Pool, amqpURL, cfg.RabbitMQ.Exchange, routingKey, logger)
		outboxWorker.Start()
		defer outboxWorker.Stop()

		allocationConsumer := service.NewAllocationConsumer(allocationRepo, amqpURL, cfg.RabbitMQ.Exchange, logger)
		allocationConsumer.Start()
		defer allocationConsumer.Stop()
	}

	// ── Routing Setup ────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// 1. Public Health Check
	healthH := handler.NewHealthHandler(pgDB)
	mux.Handle("/health", healthH)

	// 2. Loader Routes (/api/loading/**)
	loaderMux := http.NewServeMux()
	loaderMux.HandleFunc("GET /api/loading/trips/filter-options", loaderHandler.GetFilterOptions)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/stops/{stopId}/items", loaderHandler.GetStopItems)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/stops/{stopId}/confirm", loaderHandler.ConfirmStop)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/stops/{stopId}/start", loaderHandler.StartStopLoading)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/shortfall-context", loaderHandler.GetShortfallContext)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/shortfalls", loaderHandler.CreateShortfall)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/shortfalls", loaderHandler.GetShortfalls)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}", loaderHandler.GetTripDetails)
	loaderMux.HandleFunc("PUT /api/loading/trips/{tripId}/route-order", loaderHandler.UpdateRouteOrder)
	loaderMux.HandleFunc("GET /api/loading/trips", loaderHandler.GetTodayLoads)
	loaderMux.HandleFunc("PUT /api/loading/items/{itemId}/check", loaderHandler.CheckItem)
	loaderMux.HandleFunc("POST /api/loading/dev/reset-demo", loaderHandler.ResetDemo)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/plan-changes/latest", loaderHandler.GetLatestPlanChange)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/plan-changes/{revision}/acknowledge", loaderHandler.AcknowledgePlanChange)

	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/departure", departureHandler.GetDeparture)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/mark-ready", departureHandler.MarkReady)

	// Wrap loader routes with GatewayAuth and Loader/Dispatcher role guard
	loaderProtected := middleware.GatewayAuthMiddleware(
		middleware.RequireLoaderOrDispatcher(loaderMux),
	)
	mux.Handle("/api/loading/", loaderProtected)

	// Wrap root with request logger
	rootHandler := middleware.RequestLogger(logger)(mux)

	// ── HTTP Server Setup ────────────────────────────────────────────────────
	server := &http.Server{
		Addr:         cfg.Server.HTTPPort,
		Handler:      rootHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in background goroutine
	serverErrChan := make(chan error, 1)
	go func() {
		logger.Info(fmt.Sprintf("HTTP Server listening on %s", cfg.Server.HTTPPort))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErrChan <- err
		}
	}()

	// ── Graceful Shutdown ────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErrChan:
		logger.Error("Fatal server error", "error", err)
		os.Exit(1)
	case sig := <-quit:
		logger.Info("Received shutdown signal", "signal", sig.String())
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error("Server forced to shutdown", "error", err)
	}

	logger.Info("Loading & Delivery Service exited cleanly")
}
