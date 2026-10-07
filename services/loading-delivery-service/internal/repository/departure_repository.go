package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

// DepartureRepository handles all DB queries for the departure screen (P7).
type DepartureRepository struct {
	pool *pgxpool.Pool
}

func NewDepartureRepository(pool *pgxpool.Pool) *DepartureRepository {
	return &DepartureRepository{pool: pool}
}

// ── Departure screen queries ─────────────────────────────────────────────────

// GetDepartureSummary returns live DB counts for a trip.
func (r *DepartureRepository) GetDepartureSummary(ctx context.Context, tripID uuid.UUID) (model.DepartureLoadSummary, error) {
	var s model.DepartureLoadSummary

	// Item counts
	err := r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'CHECKED') AS items_loaded,
			COUNT(*)                                   AS items_total
		FROM public.load_items
		WHERE trip_id = $1
	`, tripID).Scan(&s.ItemsLoaded, &s.ItemsTotal)
	if err != nil {
		return s, fmt.Errorf("departure: item counts: %w", err)
	}

	// Stop counts
	err = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'LOADED') AS stops_complete,
			COUNT(*)                                  AS stops_total
		FROM public.load_stops
		WHERE trip_id = $1 AND removed_from_plan=FALSE
	`, tripID).Scan(&s.StopsComplete, &s.StopsTotal)
	if err != nil {
		return s, fmt.Errorf("departure: stop counts: %w", err)
	}

	// Open issue_flags (unresolved)
	err = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM public.issue_flags
		WHERE trip_id = $1 AND resolved = false
	`, tripID).Scan(&s.IssuesFlagged)
	if err != nil {
		return s, fmt.Errorf("departure: issue count: %w", err)
	}

	return s, nil
}

// GetDepartureBlockerNames returns only rows that actually prevent departure.
func (r *DepartureRepository) GetDepartureBlockerNames(ctx context.Context, tripID uuid.UUID) ([]string, []string, []string, error) {
	pendingItems := []string{}
	rows, err := r.pool.Query(ctx, `SELECT name FROM public.load_items WHERE trip_id = $1 AND status NOT IN ('CHECKED', 'ISSUE') ORDER BY name`, tripID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("departure: pending items: %w", err)
	}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			rows.Close()
			return nil, nil, nil, err
		}
		pendingItems = append(pendingItems, name)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, nil, nil, err
	}
	rows.Close()

	unloadedStops := []string{}
	rows, err = r.pool.Query(ctx, `SELECT outlet_name FROM public.load_stops WHERE trip_id = $1 AND removed_from_plan=FALSE AND status <> 'LOADED' ORDER BY load_order`, tripID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("departure: unloaded stops: %w", err)
	}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			rows.Close()
			return nil, nil, nil, err
		}
		unloadedStops = append(unloadedStops, name)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return nil, nil, nil, err
	}
	rows.Close()

	unnotified := []string{}
	rows, err = r.pool.Query(ctx, `SELECT COALESCE(li.name, f.ref, 'Shortfall') FROM public.issue_flags f LEFT JOIN public.load_items li ON li.item_id = f.item_id WHERE f.trip_id = $1 AND f.resolved = FALSE ORDER BY f.created_at`, tripID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("departure: unresolved shortfalls: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, nil, nil, err
		}
		unnotified = append(unnotified, name)
	}
	return pendingItems, unloadedStops, unnotified, rows.Err()
}

// GetActivityLog returns the chronological activity log for a trip,
// formatted as HH:mm in Asia/Colombo timezone.
func (r *DepartureRepository) GetActivityLog(ctx context.Context, tripID uuid.UUID) ([]model.DepartureActivityEntry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			logged_at AT TIME ZONE 'Asia/Colombo' AS local_time,
			event_type,
			title,
			COALESCE(description, '') AS description
		FROM public.load_activity_log
		WHERE trip_id = $1
		ORDER BY logged_at ASC
	`, tripID)
	if err != nil {
		return nil, fmt.Errorf("departure: activity log: %w", err)
	}
	defer rows.Close()

	var entries []model.DepartureActivityEntry
	for rows.Next() {
		var localTime time.Time
		var e model.DepartureActivityEntry
		if err := rows.Scan(&localTime, &e.Type, &e.Title, &e.Description); err != nil {
			return nil, fmt.Errorf("departure: scan activity log: %w", err)
		}
		e.Time = localTime.Format("15:04")
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if entries == nil {
		entries = []model.DepartureActivityEntry{}
	}
	return entries, nil
}

// GetShortfalls returns a brief list of issue_flags for the departure screen.
func (r *DepartureRepository) GetShortfalls(ctx context.Context, tripID uuid.UUID) ([]model.DepartureShortfall, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			COALESCE(li.name, 'Unknown item') AS item,
			COALESCE(f.reason, '')            AS reason,
			COALESCE(f.qty_affected, 0)       AS qty,
			f.ref                             AS ref,
			f.dispatcher_notified_at IS NOT NULL AS notified
		FROM public.issue_flags f
		LEFT JOIN public.load_items li ON li.item_id = f.item_id
		WHERE f.trip_id = $1
		ORDER BY f.created_at ASC
	`, tripID)
	if err != nil {
		return nil, fmt.Errorf("departure: shortfalls: %w", err)
	}
	defer rows.Close()

	var shortfalls []model.DepartureShortfall
	for rows.Next() {
		var s model.DepartureShortfall
		if err := rows.Scan(&s.Item, &s.Reason, &s.Qty, &s.Ref, &s.Notified); err != nil {
			return nil, fmt.Errorf("departure: scan shortfall: %w", err)
		}
		shortfalls = append(shortfalls, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if shortfalls == nil {
		shortfalls = []model.DepartureShortfall{}
	}
	return shortfalls, nil
}

// ── Mark-Ready (P7) ─────────────────────────────────────────────────────────

// MarkReadyResult is the data set returned to the service layer from MarkReady.
type MarkReadyResult struct {
	TripCode    string
	VehicleID   string
	DriverID    string
	ReadyAt     time.Time
	ReadyByName string
	ItemsLoaded int
	ItemsTotal  int
	IssueCount  int
	AlreadySet  bool // true when the row was already LOADED (idempotent call)
}

// MarkReady sets loading_confirmations to LOADED within a single transaction and
// inserts a LOADING_COMPLETED outbox event.  It is idempotent: a second call
// returns the existing readyAt without inserting a second outbox event.
//
// It enforces the business constraint that all stops must be LOADED.
// Returns model.AppError{code STOPS_INCOMPLETE} if not all stops are loaded.
func (r *DepartureRepository) MarkReady(ctx context.Context, tripID uuid.UUID, loaderID uuid.UUID) (*MarkReadyResult, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("mark-ready: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 1. Check all stops are LOADED
	var totalStops, loadedStops int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'LOADED')
		FROM public.load_stops WHERE trip_id = $1 AND removed_from_plan=FALSE
	`, tripID).Scan(&totalStops, &loadedStops); err != nil {
		return nil, fmt.Errorf("mark-ready: stop count query: %w", err)
	}
	if totalStops == 0 {
		return nil, model.ErrNotFound("Trip has no stops")
	}
	if loadedStops < totalStops {
		return nil, model.NewAppError(
			"STOPS_INCOMPLETE",
			fmt.Sprintf("All stops must be LOADED before departure: %d of %d complete", loadedStops, totalStops),
			422,
		)
	}

	// 2. Fetch trip + vehicle info
	var tripCode, vehicleID, driverIDStr string
	if err := tx.QueryRow(ctx, `
		SELECT
			COALESCE('WPT-' || substring(t.vehicle_id from 5), 'WPT-???'),
			t.vehicle_id,
			COALESCE(t.driver_id::text, '')
		FROM public.trips t
		WHERE t.trip_id = $1
	`, tripID).Scan(&tripCode, &vehicleID, &driverIDStr); err != nil {
		return nil, fmt.Errorf("mark-ready: trip query: %w", err)
	}

	// 3. Idempotency check — if already LOADED, return existing readyAt
	var existingStatus string
	var existingReadyAt *time.Time
	_ = tx.QueryRow(ctx, `
		SELECT status, ready_at FROM public.loading_confirmations WHERE trip_id = $1
	`, tripID).Scan(&existingStatus, &existingReadyAt)

	if existingStatus == model.LoadingStatusLoaded && existingReadyAt != nil {
		// Already marked ready — return existing values, skip outbox insert.
		summary := r.summaryFromPool(ctx, tripID)
		loaderName := r.resolveLoaderName(ctx, loaderID)
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("mark-ready: commit (idempotent): %w", err)
		}
		return &MarkReadyResult{
			TripCode:    tripCode,
			VehicleID:   vehicleID,
			DriverID:    driverIDStr,
			ReadyAt:     *existingReadyAt,
			ReadyByName: loaderName,
			ItemsLoaded: summary.ItemsLoaded,
			ItemsTotal:  summary.ItemsTotal,
			IssueCount:  summary.IssuesFlagged,
			AlreadySet:  true,
		}, nil
	}

	// 4. Set to LOADED
	now := time.Now().UTC()
	if _, err := tx.Exec(ctx, `
		UPDATE public.loading_confirmations
		SET status = 'LOADED', ready_at = $2,
		    ready_by = (SELECT id FROM public.user_profiles WHERE id = $3), updated_at = NOW()
		WHERE trip_id = $1
	`, tripID, now, loaderID); err != nil {
		return nil, fmt.Errorf("mark-ready: update confirmation: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.trips
		SET status = 'READY_FOR_LOADING', ready_at = $2, updated_at = NOW()
		WHERE trip_id = $1
	`, tripID, now); err != nil {
		return nil, fmt.Errorf("mark-ready: update trip readiness: %w", err)
	}

	// 5. Resolve loader display name
	loaderName := r.resolveLoaderName(ctx, loaderID)

	// 6. Activity log
	logDesc := loaderName + " completed the final vehicle check"
	if _, err := tx.Exec(ctx, `
		INSERT INTO public.load_activity_log
		    (trip_id, event_type, title, description, icon_type, logged_at, created_by)
		VALUES ($1, 'CONFIRMATION', 'Loading confirmation recorded', $2, 'check', $3,
		        (SELECT id FROM public.user_profiles WHERE id = $4))
	`, tripID, logDesc, now, loaderID); err != nil {
		return nil, fmt.Errorf("mark-ready: activity log: %w", err)
	}

	// 7. Live counts for outbox payload
	summary := r.summaryFromPool(ctx, tripID)

	// 8. Build LOADING_COMPLETED outbox payload (snake_case only)
	payload := map[string]any{
		"trip_id":     tripID.String(),
		"trip_code":   tripCode,
		"vehicle_id":  vehicleID,
		"driver_id":   driverIDStr,
		"ready_at":    now.Format(time.RFC3339),
		"ready_by_id": loaderID.String(),
		"issue_count": summary.IssuesFlagged,
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("mark-ready: marshal outbox payload: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO public.outbox_events
		    (aggregate_type, aggregate_id, event_type, payload, status)
		VALUES ('TRIP', $1, 'LOADING_COMPLETED', $2, 'PENDING')
	`, tripID.String(), string(payloadBytes)); err != nil {
		return nil, fmt.Errorf("mark-ready: outbox insert: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("mark-ready: commit: %w", err)
	}

	return &MarkReadyResult{
		TripCode:    tripCode,
		VehicleID:   vehicleID,
		DriverID:    driverIDStr,
		ReadyAt:     now,
		ReadyByName: loaderName,
		ItemsLoaded: summary.ItemsLoaded,
		ItemsTotal:  summary.ItemsTotal,
		IssueCount:  summary.IssuesFlagged,
	}, nil
}

// summaryFromPool fetches live counts from the pool (used within MarkReady before commit).
func (r *DepartureRepository) summaryFromPool(ctx context.Context, tripID uuid.UUID) model.DepartureLoadSummary {
	var s model.DepartureLoadSummary
	_ = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'CHECKED'),
			COUNT(*)
		FROM public.load_items WHERE trip_id = $1
	`, tripID).Scan(&s.ItemsLoaded, &s.ItemsTotal)
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM public.issue_flags WHERE trip_id = $1 AND resolved = false
	`, tripID).Scan(&s.IssuesFlagged)
	return s
}

// resolveLoaderName looks up the loader's full name from user_profiles.
func (r *DepartureRepository) resolveLoaderName(ctx context.Context, loaderID uuid.UUID) string {
	var name string
	_ = r.pool.QueryRow(ctx, `
		SELECT COALESCE(full_name, '') FROM public.user_profiles WHERE id = $1
	`, loaderID).Scan(&name)
	if name == "" {
		name = loaderID.String()
	}
	return name
}
