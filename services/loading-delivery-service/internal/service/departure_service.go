package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
)

// DepartureService coordinates P7 departure workflows (mark-ready).
type DepartureService struct {
	departureRepo *repository.DepartureRepository
	loaderRepo    *repository.LoaderRepository // reused to get derived loading status
	logger        *slog.Logger
}

func NewDepartureService(
	departureRepo *repository.DepartureRepository,
	loaderRepo *repository.LoaderRepository,
	logger *slog.Logger,
) *DepartureService {
	if logger == nil {
		logger = slog.Default()
	}
	return &DepartureService{
		departureRepo: departureRepo,
		loaderRepo:    loaderRepo,
		logger:        logger,
	}
}

// GetDeparture fetches all data for the final departure screen.
func (s *DepartureService) GetDeparture(ctx context.Context, tripIDStr string) (*model.DepartureResponse, error) {
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("invalid tripId format")
	}

	// 1. Get raw trip state to calculate loading status
	rawTrip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, tripID.String())
	if err != nil {
		return nil, err // Returns 404 AppError if not found
	}

	// 2. Load the pieces from DB
	log, err := s.departureRepo.GetActivityLog(ctx, tripID)
	if err != nil {
		return nil, err
	}

	summary, err := s.departureRepo.GetDepartureSummary(ctx, tripID)
	if err != nil {
		return nil, err
	}

	shortfalls, err := s.departureRepo.GetShortfalls(ctx, tripID)
	if err != nil {
		return nil, err
	}

	pendingItems, unloadedStops, unnotifiedShortfalls, err := s.departureRepo.GetDepartureBlockerNames(ctx, tripID)
	if err != nil {
		return nil, err
	}

	// ISSUE items are reviewed; only unnotified shortfalls block departure.
	allChecksPassed, blockers := model.EvaluateDepartureChecks(pendingItems, unloadedStops, unnotifiedShortfalls)

	// Calculate overall UI status using business logic
	progressPct := model.ComputeProgressPct(rawTrip.CheckedItems, rawTrip.TotalItems)
	derivedStatus := model.DeriveLoadingStatus(
		rawTrip.HasOpenIssues,
		rawTrip.ConfStatus,
		rawTrip.HasReadyAt,
		progressPct,
	)

	return &model.DepartureResponse{
		ActivityLog: log,
		LoadSummary: summary,
		Shortfalls:  shortfalls,
		Confirmation: model.DepartureConfirmation{
			ServerTimestamp: time.Now().UTC().Format(time.RFC3339),
			AllChecksPassed: allChecksPassed,
			Blockers:        blockers,
		},
		Status: derivedStatus,
	}, nil
}

// MarkReady validates that all stops are LOADED, then transitions the trip to LOADED.
// Idempotent: safe to call repeatedly (returns existing timestamp).
func (s *DepartureService) MarkReady(ctx context.Context, tripIDStr string, loaderIDStr string) (*model.MarkReadyResponse, error) {
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("invalid tripId format")
	}
	loaderID, err := uuid.Parse(loaderIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("invalid loaderId format")
	}

	res, err := s.departureRepo.MarkReady(ctx, tripID, loaderID)
	if err != nil {
		return nil, err
	}

	if res.AlreadySet {
		s.logger.Info("MarkReady: already LOADED (idempotent skip)", "tripId", tripIDStr)
	} else {
		s.logger.Info("MarkReady: success", "tripId", tripIDStr, "readyBy", res.ReadyByName)
	}

	return &model.MarkReadyResponse{
		TripCode:       res.TripCode,
		VehicleID:      res.VehicleID,
		ReadyAt:        res.ReadyAt,
		ReadyBy:        res.ReadyByName,
		ItemsLoaded:    res.ItemsLoaded,
		ItemsTotal:     res.ItemsTotal,
		IssuesFlagged:  res.IssueCount,
		DriverNotified: true,
	}, nil
}
