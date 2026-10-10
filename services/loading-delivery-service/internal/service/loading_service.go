package service

import (
	"context"
	"log/slog"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
)

// reeferStubTempC returns the STUBBED reefer sensor reading.
// There is no telemetry integration yet: currentTempC is taken from the
// REEFER_STUB_TEMP_C env/config value (e.g. "4.2"). When unset/invalid, 0 is
// returned and model.DeriveReeferZone falls back to its built-in defaults
// (4.2C for chilled, -17.5C for frozen). Replace with real telemetry later.
func reeferStubTempC() float64 {
	if v := os.Getenv("REEFER_STUB_TEMP_C"); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return 0
}

// LoadingService coordinates business operations for warehouse loading workflows
type LoadingService struct {
	loadingRepo    *repository.LoadingRepository
	loaderRepo     *repository.LoaderRepository
	planningClient PlanningClientInterface
	allocationRepo *repository.AllocationRepository
	logger         *slog.Logger
}

func (s *LoadingService) SetAllocationRepository(repo *repository.AllocationRepository) {
	s.allocationRepo = repo
}

func NewLoadingService(
	loadingRepo *repository.LoadingRepository,
	loaderRepo *repository.LoaderRepository,
	planningClient PlanningClientInterface,
	logger *slog.Logger,
) *LoadingService {
	if logger == nil {
		logger = slog.Default()
	}
	return &LoadingService{
		loadingRepo:    loadingRepo,
		loaderRepo:     loaderRepo,
		planningClient: planningClient,
		logger:         logger,
	}
}

// GetTodayLoads returns Today's Loads overview with summary, meta, and filtered/sorted trips
func (s *LoadingService) GetTodayLoads(ctx context.Context, filter model.TripsFilter) (*model.TodayLoadsResponse, error) {
	dateStr := filter.Date
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	rawTrips, err := s.loaderRepo.FetchRawTripsForDateAndDepot(ctx, dateStr, filter.Depot)
	if err != nil {
		return nil, err
	}

	summary := model.TodayLoadsSummary{
		TripsToday:     len(rawTrips),
		AddedThisShift: 2, // 2 trips added during shift A
	}

	allProcessedTrips := make([]model.TripItemDTO, 0, len(rawTrips))

	for _, raw := range rawTrips {
		// progressPct = round(100 * CHECKED items / total items)
		progressPct := model.ComputeProgressPct(raw.CheckedItems, raw.TotalItems)
		derivedStatus := model.DeriveLoadingStatus(raw.HasOpenIssues, raw.ConfStatus, raw.HasReadyAt, progressPct)

		// Summary counts are strictly independent of active filters
		switch derivedStatus {
		case model.DerivedStatusIssue:
			summary.IssuesNeedReview++
			// Issue is a pending departure state. Keep it in the pending total
			// while exposing the review subset separately.
			summary.Pending++
		case model.DerivedStatusReady:
			summary.Loaded++
		case model.DerivedStatusLoading:
			summary.InProgress++
		case model.DerivedStatusNotStarted:
			summary.Pending++
		}

		allProcessedTrips = append(allProcessedTrips, model.TripItemDTO{
			TripID:      raw.TripID.String(),
			TripCode:    raw.TripCode,
			VehicleID:   raw.VehicleID,
			Status:      derivedStatus,
			ProgressPct: progressPct,
			LoadedKg:    raw.LoadedKg,
			CapacityKg:  raw.CapacityKg,
			Origin:      raw.Origin,
			Destination: raw.Destination,
			StopCount:   raw.StopCount,
			Dock:        raw.Dock,
			DriverName:  raw.DriverName,
		})
	}

	// ── Filter matching ───────────────────────────────────────────────────────
	dockFilterSet := make(map[string]bool)
	for _, d := range filter.Docks {
		cleaned := strings.ToLower(strings.TrimSpace(d))
		if cleaned != "" {
			dockFilterSet[cleaned] = true
		}
	}

	statusFilterSet := make(map[string]bool)
	for _, st := range filter.Statuses {
		cleaned := strings.ToLower(strings.TrimSpace(st))
		if cleaned != "" {
			statusFilterSet[cleaned] = true
		}
	}

	qClean := strings.ToLower(strings.TrimSpace(filter.Q))

	filtered := make([]model.TripItemDTO, 0, len(allProcessedTrips))
	for _, trip := range allProcessedTrips {
		// Dock filter
		if len(dockFilterSet) > 0 && !dockFilterSet[strings.ToLower(trip.Dock)] {
			continue
		}
		// Status filter
		if len(statusFilterSet) > 0 && !statusFilterSet[strings.ToLower(trip.Status)] {
			continue
		}
		// Search query filter: vehicleId, destination, driverName
		if qClean != "" {
			vMatch := strings.Contains(strings.ToLower(trip.VehicleID), qClean)
			destMatch := strings.Contains(strings.ToLower(trip.Destination), qClean)
			driverMatch := strings.Contains(strings.ToLower(trip.DriverName), qClean)
			if !vMatch && !destMatch && !driverMatch {
				continue
			}
		}
		filtered = append(filtered, trip)
	}

	// ── Sorting ───────────────────────────────────────────────────────────────
	// Sort order: Issue (1), Loading (2), Not Started (3), Ready (4)
	statusWeight := func(st string) int {
		switch st {
		case model.DerivedStatusIssue:
			return 1
		case model.DerivedStatusLoading:
			return 2
		case model.DerivedStatusNotStarted:
			return 3
		case model.DerivedStatusReady:
			return 4
		default:
			return 5
		}
	}

	sort.SliceStable(filtered, func(i, j int) bool {
		wI := statusWeight(filtered[i].Status)
		wJ := statusWeight(filtered[j].Status)
		if wI != wJ {
			return wI < wJ
		}
		return filtered[i].VehicleID < filtered[j].VehicleID
	})

	// ── Pagination ────────────────────────────────────────────────────────────
	totalFiltered := len(filtered)
	start := filter.Offset
	if start < 0 {
		start = 0
	}
	if start > totalFiltered {
		start = totalFiltered
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 20
	}
	end := start + limit
	if end > totalFiltered {
		end = totalFiltered
	}

	pagedTrips := filtered[start:end]

	resp := &model.TodayLoadsResponse{
		Meta: model.TodayLoadsMeta{
			Shift:      "Shift A",
			ShiftStart: "06:00",
			ShiftEnd:   "14:00",
			Depot:      depotDisplayName(filter.Depot, rawTrips),
			Date:       dateStr,
		},
		Summary: summary,
		Trips:   pagedTrips,
	}

	return resp, nil
}

func (s *LoadingService) ListCantDeliverReviews(ctx context.Context, date string) ([]model.CantDeliverReview, error) {
	return s.loaderRepo.ListCantDeliverReviews(ctx, date)
}

func depotDisplayName(scope string, trips []repository.RawTripRecord) string {
	if strings.EqualFold(scope, "Kandy") {
		return "Kandy Distribution Center"
	}
	if strings.EqualFold(scope, "Peliyagoda") {
		return "Peliyagoda Distribution Center"
	}
	if len(trips) > 0 && strings.Contains(strings.ToLower(trips[0].Depot), "kandy") {
		return "Kandy Distribution Center"
	}
	if len(trips) > 0 {
		return "Peliyagoda Distribution Center"
	}
	return scope
}

func (s *LoadingService) ResolveLoaderDepot(ctx context.Context, userID uuid.UUID) (string, error) {
	depot, err := s.loaderRepo.GetUserDepot(ctx, userID)
	if err != nil {
		return "", err
	}
	if strings.Contains(strings.ToLower(depot), "kandy") {
		return "Kandy", nil
	}
	if depot != "" {
		return "Peliyagoda", nil
	}
	for _, entry := range strings.Split(os.Getenv("LOADER_DEPOT_MAP"), ",") {
		parts := strings.SplitN(entry, "=", 2)
		if len(parts) == 2 && strings.EqualFold(strings.TrimSpace(parts[0]), userID.String()) {
			return strings.TrimSpace(parts[1]), nil
		}
	}
	return "Peliyagoda", nil
}

// GetFilterOptions returns unique docks and derived statuses available for the date
func (s *LoadingService) GetFilterOptions(ctx context.Context, dateStr string) (*model.FilterOptionsResponse, error) {
	if dateStr == "" {
		dateStr = time.Now().Format("2006-01-02")
	}

	rawTrips, err := s.loaderRepo.FetchRawTripsForDate(ctx, dateStr)
	if err != nil {
		return nil, err
	}

	dockMap := make(map[string]bool)
	statusMap := make(map[string]bool)

	for _, raw := range rawTrips {
		if raw.Dock != "" {
			dockMap[raw.Dock] = true
		}
		progressPct := model.ComputeProgressPct(raw.CheckedItems, raw.TotalItems)
		derivedStatus := model.DeriveLoadingStatus(raw.HasOpenIssues, raw.ConfStatus, raw.HasReadyAt, progressPct)
		statusMap[derivedStatus] = true
	}

	docks := make([]string, 0, len(dockMap))
	for d := range dockMap {
		docks = append(docks, d)
	}
	sort.Strings(docks)

	statuses := make([]string, 0, len(statusMap))
	for st := range statusMap {
		statuses = append(statuses, st)
	}

	statusOrder := map[string]int{
		model.DerivedStatusIssue:      1,
		model.DerivedStatusLoading:    2,
		model.DerivedStatusNotStarted: 3,
		model.DerivedStatusReady:      4,
	}
	sort.Slice(statuses, func(i, j int) bool {
		return statusOrder[statuses[i]] < statusOrder[statuses[j]]
	})

	return &model.FilterOptionsResponse{
		Docks:    docks,
		Statuses: statuses,
	}, nil
}

// GetTripDetails retrieves full trip cargo and stops data (Task P3)
func (s *LoadingService) GetTripDetails(ctx context.Context, idOrCode string) (*model.TripDetailResponse, error) {
	// 1. Fetch raw trip from PostgreSQL
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}

	// 2. Planning service gRPC sync check with fallback
	stale := false
	if s.planningClient != nil {
		_, err := s.planningClient.FetchTripDetails(ctx, trip.TripID.String())
		stale = PlanningSnapshotStale(err)
		if stale {
			s.logger.Warn("PlanningService gRPC unavailable; serving local snapshot with stale=true", "error", err)
			stale = true
		}
	}

	// 3. Fetch stops in reverse load order (1..N)
	stops, err := s.loaderRepo.GetStopsWithProgressByTripID(ctx, trip.TripID)
	if err != nil {
		return nil, err
	}

	progressPct := model.ComputeProgressPct(trip.CheckedItems, trip.TotalItems)
	// vehicle.loadPct on trip detail = same item-based progressPct as Today's Loads (round(100*CHECKED/total items))
	loadPct := progressPct
	status := model.DeriveLoadingStatus(trip.HasOpenIssues, trip.ConfStatus, trip.HasReadyAt, progressPct)

	// 4. Reefer zone calculation (only present if trip requires chilled/frozen transport)
	// targetTempC 4 when trip has chilled items (-18 only if it has frozen items and no chilled), currentTempC stubbed, status "Stable"|"Alert" by +/-2C
	reeferZone := model.DeriveReeferZone(trip.HasChilled, trip.HasFrozen, reeferStubTempC())

	resp := &model.TripDetailResponse{
		Header: model.TripDetailHeader{
			TripCode:    trip.TripCode,
			Origin:      trip.Origin,
			Destination: trip.Destination,
			Status:      status,
		},
		Vehicle: model.TripDetailVehicle{
			VehicleID:  trip.VehicleID,
			CapacityKg: trip.CapacityKg,
			LoadedKg:   trip.LoadedKg,
			LoadPct:    loadPct,
			ReeferZone: reeferZone,
		},
		Driver: model.TripDetailDriver{
			Name: trip.DriverName,
		},
		Dock:         trip.Dock,
		PlannedStart: trip.PlannedStart,
		Shift:        trip.Shift,
		Totals: model.TripDetailTotals{
			Stops:        len(stops),
			LineItems:    trip.TotalItems,
			ItemsChecked: trip.CheckedItems,
			ItemsTotal:   trip.TotalItems,
			Exceptions:   trip.IssueItems,
		},
		PlanBanner: nil,
		Stops:      stops,
		Version:    trip.ConfVersion,
		Stale:      stale,
	}
	if s.allocationRepo != nil {
		if banner, bannerErr := s.allocationRepo.GetLatestPlanChange(ctx, trip.TripID); bannerErr == nil && !banner.Acknowledged {
			resp.PlanBanner = banner
		}
	}

	return resp, nil
}

func PlanningSnapshotStale(err error) bool { return err != nil }

func (s *LoadingService) ResequenceRoute(ctx context.Context, idOrCode string, stopIDs []string, version int, userID uuid.UUID) (*model.RouteOrderResponse, error) {
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}
	ids := make([]uuid.UUID, len(stopIDs))
	for i, raw := range stopIDs {
		id, parseErr := uuid.Parse(raw)
		if parseErr != nil {
			return nil, model.ErrBadRequest("stopIds must contain valid UUIDs")
		}
		ids[i] = id
	}
	if err = s.loaderRepo.ResequenceRoute(ctx, trip.TripID, ids, version, userID); err != nil {
		return nil, err
	}
	stops, err := s.loaderRepo.GetStopsWithProgressByTripID(ctx, trip.TripID)
	if err != nil {
		return nil, err
	}
	updatedTrip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, trip.TripID.String())
	if err != nil {
		return nil, err
	}
	return &model.RouteOrderResponse{Version: updatedTrip.ConfVersion, Stops: stops}, nil
}

func (s *LoadingService) GetLatestPlanChange(ctx context.Context, idOrCode string) (*model.PlanChangeResponse, error) {
	if s.allocationRepo == nil {
		return nil, model.ErrInternal("Plan change repository unavailable")
	}
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}
	return s.allocationRepo.GetLatestPlanChange(ctx, trip.TripID)
}

func (s *LoadingService) AcknowledgePlanChange(ctx context.Context, idOrCode string, revision int, userID uuid.UUID) (*model.PlanChangeResponse, error) {
	if revision < 1 {
		return nil, model.ErrBadRequest("revision must be a positive integer")
	}
	if s.allocationRepo == nil {
		return nil, model.ErrInternal("Plan change repository unavailable")
	}
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}
	return s.allocationRepo.AcknowledgePlanChange(ctx, trip.TripID, revision, userID)
}

// StartStopLoading starts loading for a stop after verifying sequence constraints
func (s *LoadingService) StartStopLoading(ctx context.Context, idOrCode, stopIDStr string, expectedVersion int, loaderID uuid.UUID) (*model.LoadStopDetailDTO, error) {
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}

	stopID, err := uuid.Parse(stopIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("Invalid stop UUID")
	}

	return s.loaderRepo.StartStopLoading(ctx, trip.TripID, stopID, expectedVersion, loaderID)
}

// GetStopItems retrieves item checklist for a stop (Task P5)
func (s *LoadingService) GetStopItems(ctx context.Context, idOrCode, stopIDStr string) (*model.StopItemsResponse, error) {
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}

	stopID, err := uuid.Parse(stopIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("Invalid stop UUID")
	}

	return s.loaderRepo.GetStopItems(ctx, trip.TripID, stopID)
}

// CheckItem updates the check status of an item (Task P5)
func (s *LoadingService) CheckItem(ctx context.Context, itemIDStr string, checked bool, loaderID uuid.UUID) (*model.ChecklistItem, error) {
	itemID, err := uuid.Parse(itemIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("Invalid item UUID")
	}

	return s.loaderRepo.CheckItem(ctx, itemID, checked, loaderID)
}

// ConfirmStop marks a stop as loaded after verifying all items are CHECKED or ISSUE (Task P5)
func (s *LoadingService) ConfirmStop(ctx context.Context, idOrCode, stopIDStr string, expectedVersion int, loaderID uuid.UUID) (*model.LoadStopDetailDTO, error) {
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}

	stopID, err := uuid.Parse(stopIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("Invalid stop UUID")
	}

	return s.loaderRepo.ConfirmStop(ctx, trip.TripID, stopID, expectedVersion, loaderID)
}

// GetShortfallContext retrieves prefill metadata for shortfall reporting (Task P6)
func (s *LoadingService) GetShortfallContext(ctx context.Context, idOrCode, stopIDStr string, reportedBy string) (*model.ShortfallContextResponse, error) {
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}

	stopID, err := uuid.Parse(stopIDStr)
	if err != nil {
		return nil, model.ErrBadRequest("Invalid stop UUID")
	}

	return s.loaderRepo.GetShortfallContext(ctx, trip.TripID, stopID, reportedBy)
}

// CreateShortfall creates a shortfall and queues an outbox event (Task P6)
func (s *LoadingService) CreateShortfall(ctx context.Context, idOrCode string, p repository.ShortfallParams) (*model.CreateShortfallResponse, error) {
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}

	p.TripID = trip.TripID
	return s.loaderRepo.CreateShortfall(ctx, p)
}

// GetShortfalls retrieves all issue flags for a trip (Task P6)
func (s *LoadingService) GetShortfalls(ctx context.Context, idOrCode string) ([]model.ShortfallDetailDTO, error) {
	trip, err := s.loaderRepo.GetTripByTripCodeOrID(ctx, idOrCode)
	if err != nil {
		return nil, err
	}
	if trip == nil {
		return nil, model.ErrNotFound("Trip not found")
	}

	return s.loaderRepo.GetShortfallsByTrip(ctx, trip.TripID)
}

func (s *LoadingService) ResolveShortfall(ctx context.Context, issueID string, resolvedBy uuid.UUID, notes string) error {
	id, err := uuid.Parse(issueID)
	if err != nil {
		return model.ErrBadRequest("Invalid shortfall ID")
	}
	return s.loaderRepo.ResolveShortfall(ctx, id, resolvedBy, notes)
}

// ResetDemo restores all demo trips and sequence state
func (s *LoadingService) ResetDemo(ctx context.Context) error {
	return s.loaderRepo.ResetDemoState(ctx)
}
