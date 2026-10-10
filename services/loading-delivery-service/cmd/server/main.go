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
		cfg, err = config.Load("/config/config.yaml")
	}
	if err != nil {
		logger.Warn("Could not load config file, falling back to environment variables", "error", err)
		cfg = &config.Config{
			Server: config.ServerConfig{
				HTTPPort: ":8080",
				GRPCPort: ":9090",
				Env:      os.Getenv("APP_ENV"),
			},
			Database: config.DatabaseConfig{
				Host:         os.Getenv("SUPABASE_DB_HOST"),
				Port:         os.Getenv("SUPABASE_DB_PORT"),
				Name:         os.Getenv("SUPABASE_DB_NAME"),
				User:         os.Getenv("SUPABASE_DB_USER"),
				Password:     os.Getenv("SUPABASE_DB_PASSWORD"),
				SSLMode:      "require",
				MaxOpenConns: 10,
				MaxIdleConns: 2,
			},
			RabbitMQ: config.RabbitMQConfig{
				URL:      os.Getenv("RABBITMQ_URL"),
				Exchange: "waypoint.events",
			},
			JWT: config.JWTConfig{
				Secret: os.Getenv("JWT_SECRET"),
				Issuer: os.Getenv("JWT_ISSUER"),
			},
			Supabase: config.SupabaseConfig{
				URL:            os.Getenv("SUPABASE_URL"),
				ServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
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
	var driverRepo *repository.DriverRepository
	var routeRepo *repository.RouteRepository
	var profileRepo *repository.ProfileRepository
	var notificationRepo *repository.DriverNotificationRepository
	var syncRepo *repository.SyncRepository
	var tripSummaryRepo *repository.TripSummaryRepository

	if pgDB != nil && pgDB.Pool != nil {
		loadingRepo = repository.NewLoadingRepository(pgDB.Pool)
		loaderRepo = repository.NewLoaderRepository(pgDB.Pool)
		departureRepo = repository.NewDepartureRepository(pgDB.Pool)
		allocationRepo = repository.NewAllocationRepository(pgDB.Pool)
		driverRepo = repository.NewDriverRepository(pgDB.Pool)
		routeRepo = repository.NewRouteRepository(pgDB.Pool)
		profileRepo = repository.NewProfileRepository(pgDB.Pool)
		notificationRepo = repository.NewDriverNotificationRepository(pgDB.Pool)
		syncRepo = repository.NewSyncRepository(pgDB.Pool)
		tripSummaryRepo = repository.NewTripSummaryRepository(pgDB.Pool)
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
	driverService := service.NewDriverService(driverRepo)
	driverHandler := handler.NewDriverHandler(driverService, storageService)
	driverHandler.SetRouteService(service.NewRouteService(routeRepo, os.Getenv("MAPBOX_ACCESS_TOKEN")))
	profileHandler := handler.NewProfileHandler(service.NewProfileService(profileRepo))
	notificationHandler := handler.NewDriverNotificationHandler(service.NewDriverNotificationService(notificationRepo))
	syncHandler := handler.NewSyncHandler(service.NewSyncService(syncRepo, driverService), storageService)
	tripSummaryHandler := handler.NewTripSummaryHandler(service.NewTripSummaryService(tripSummaryRepo))

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

		arrivalWorker := service.NewArrivalWorker(pgDB.Pool, logger)
		arrivalWorker.Start()
		defer arrivalWorker.Stop()

		driverNotificationConsumer := service.NewDriverNotificationConsumer(notificationRepo, amqpURL, cfg.RabbitMQ.Exchange, logger)
		driverNotificationConsumer.Start()
		defer driverNotificationConsumer.Stop()
	}

	// ── Routing Setup ────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// 1. Public Health Check
	healthH := handler.NewHealthHandler(pgDB)
	mux.Handle("/health", healthH)

	// 2. Loader Routes (/api/loading/**)
	loaderMux := http.NewServeMux()
	loaderMux.HandleFunc("GET /api/loading/trips/filter-options", loaderHandler.GetFilterOptions)
	loaderMux.HandleFunc("GET /api/loading/cant-deliver", loaderHandler.GetCantDeliverReviews)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/stops/{stopId}/items", loaderHandler.GetStopItems)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/stops/{stopId}/confirm", loaderHandler.ConfirmStop)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/stops/{stopId}/start", loaderHandler.StartStopLoading)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/shortfall-context", loaderHandler.GetShortfallContext)
	loaderMux.HandleFunc("POST /api/loading/trips/{tripId}/shortfalls", loaderHandler.CreateShortfall)
	loaderMux.HandleFunc("GET /api/loading/trips/{tripId}/shortfalls", loaderHandler.GetShortfalls)
	loaderMux.HandleFunc("POST /api/loading/shortfalls/{issueId}/resolve", loaderHandler.ResolveShortfall)
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

	// 3. Driver Today routes (/api/delivery/driver/**)
	driverMux := http.NewServeMux()
	driverMux.HandleFunc("GET /api/delivery/driver/today", driverHandler.GetToday)
	driverMux.HandleFunc("GET /api/delivery/driver/trips/{tripId}/stops", driverHandler.GetTripStops)
	driverMux.HandleFunc("GET /api/delivery/driver/dispatcher-contact", driverHandler.GetDispatcherContact)
	driverMux.HandleFunc("GET /api/delivery/driver/stops/{stopId}", driverHandler.GetStopDetail)
	driverMux.HandleFunc("POST /api/delivery/driver/stops/{stopId}/arrive", driverHandler.Arrive)
	driverMux.HandleFunc("GET /api/delivery/driver/stops/{stopId}/window-status", driverHandler.GetWindowStatus)
	driverMux.HandleFunc("GET /api/delivery/driver/cant-deliver/reasons", driverHandler.GetCantDeliverReasons)
	driverMux.HandleFunc("POST /api/delivery/driver/stops/{stopId}/cant-deliver", driverHandler.CantDeliver)
	driverMux.HandleFunc("GET /api/delivery/driver/stops/{stopId}/pod", driverHandler.GetPOD)
	driverMux.HandleFunc("POST /api/delivery/driver/stops/{stopId}/pod/signature", driverHandler.UploadSignature)
	driverMux.HandleFunc("POST /api/delivery/driver/stops/{stopId}/pod/photo", driverHandler.UploadPhoto)
	driverMux.HandleFunc("POST /api/delivery/driver/stops/{stopId}/confirm", driverHandler.ConfirmDelivery)
	driverMux.HandleFunc("GET /api/delivery/driver/trips/{tripId}/route", driverHandler.GetRoute)
	driverMux.HandleFunc("GET /api/delivery/driver/trips/{tripId}/route/geometry", driverHandler.GetRouteGeometry)
	driverMux.HandleFunc("GET /api/delivery/driver/profile", profileHandler.GetProfile)
	driverMux.HandleFunc("POST /api/delivery/driver/heartbeat", profileHandler.Heartbeat)
	driverMux.HandleFunc("POST /api/delivery/driver/location", profileHandler.Location)
	driverMux.HandleFunc("GET /api/delivery/driver/history", profileHandler.History)
	driverMux.HandleFunc("GET /api/delivery/driver/notifications", notificationHandler.Today)
	driverMux.HandleFunc("POST /api/delivery/driver/notifications/{id}/review", notificationHandler.Review)
	driverMux.HandleFunc("POST /api/delivery/driver/notifications/read-all", notificationHandler.ReadAll)
	driverMux.HandleFunc("GET /api/delivery/driver/notifications/history", notificationHandler.History)
	driverMux.HandleFunc("POST /api/delivery/driver/sync", syncHandler.Sync)
	driverMux.HandleFunc("POST /api/delivery/driver/sync/verify", syncHandler.Verify)
	driverMux.HandleFunc("GET /api/delivery/driver/sync/conflicts", syncHandler.Conflicts)
	driverMux.HandleFunc("POST /api/delivery/driver/sync/media/{client_action_id}", syncHandler.Media)
	driverMux.HandleFunc("GET /api/delivery/driver/trips/{tripId}/summary", tripSummaryHandler.Summary)
	driverMux.HandleFunc("GET /api/delivery/driver/trips/{tripId}/outcomes", tripSummaryHandler.Outcomes)
	driverMux.HandleFunc("POST /api/delivery/driver/trips/{tripId}/complete", tripSummaryHandler.Complete)
	mux.Handle("/api/delivery/driver/", middleware.GatewayAuthMiddleware(middleware.RequireDriver(driverMux)))

	// Canonical delivery API. Legacy /driver routes remain for backwards compatibility.
	deliveryMux := http.NewServeMux()
	deliveryMux.HandleFunc("GET /api/delivery/runs/today", driverHandler.GetToday)
	deliveryMux.HandleFunc("POST /api/delivery/trips/{tripId}/start", driverHandler.StartTrip)
	deliveryMux.HandleFunc("POST /api/delivery/trips/{tripId}/stops/{stopId}/arrive", driverHandler.Arrive)
	deliveryMux.HandleFunc("POST /api/delivery/trips/{tripId}/stops/{stopId}/complete", driverHandler.CompleteStop)
	deliveryMux.HandleFunc("POST /api/delivery/trips/{tripId}/stops/{stopId}/issue", driverHandler.IssueStop)
	deliveryMux.HandleFunc("POST /api/delivery/sync", syncHandler.Sync)
	mux.Handle("/api/delivery/runs/", middleware.GatewayAuthMiddleware(middleware.RequireDeliveryAccess(deliveryMux)))
	mux.Handle("/api/delivery/trips/", middleware.GatewayAuthMiddleware(middleware.RequireDeliveryAccess(deliveryMux)))
	mux.Handle("/api/delivery/sync", middleware.GatewayAuthMiddleware(middleware.RequireDeliveryAccess(deliveryMux)))

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
