package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

// LoaderRepository handles database access for loader workflow tables:
// load_stops, load_items, load_activity_log, plan_changes, outbox_events, issue_flags
type LoaderRepository struct {
	pool *pgxpool.Pool
}

func NewLoaderRepository(pool *pgxpool.Pool) *LoaderRepository {
	return &LoaderRepository{pool: pool}
}

// ── load_stops ──────────────────────────────────────────────────────────────

func (r *LoaderRepository) GetStopsByTripID(ctx context.Context, tripID uuid.UUID) ([]model.LoadStop, error) {
	query := `
		SELECT stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name,
		       COALESCE(district, ''), COALESCE(bay_info, ''), status, COALESCE(tag, ''),
		       COALESCE(dock_note, ''), total_units, total_crates,
		       total_items, loaded_items, total_weight_kg, created_at, updated_at
		FROM public.v_load_stop_progress
		WHERE trip_id = $1
		ORDER BY load_order ASC
	`
	rows, err := r.pool.Query(ctx, query, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query load stops for trip %s: %w", tripID, err)
	}
	defer rows.Close()

	var stops []model.LoadStop
	for rows.Next() {
		var s model.LoadStop
		err := rows.Scan(
			&s.StopID, &s.TripID, &s.StopNo, &s.LoadOrder, &s.OutletID, &s.OutletName,
			&s.District, &s.BayInfo, &s.Status, &s.Tag,
			&s.DockNote, &s.TotalUnits, &s.TotalCrates,
			&s.TotalItems, &s.LoadedItems, &s.TotalWeightKg, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan load stop: %w", err)
		}
		stops = append(stops, s)
	}
	return stops, rows.Err()
}

func (r *LoaderRepository) CreateStop(ctx context.Context, s *model.LoadStop) error {
	query := `
		INSERT INTO public.load_stops (
			trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag,
			dock_note, total_units, total_crates, total_weight_kg
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		ON CONFLICT (trip_id, stop_no) DO UPDATE SET
			load_order = EXCLUDED.load_order,
			outlet_name = EXCLUDED.outlet_name,
			bay_info = EXCLUDED.bay_info,
			status = EXCLUDED.status,
			tag = EXCLUDED.tag,
			dock_note = EXCLUDED.dock_note,
			total_units = EXCLUDED.total_units,
			total_crates = EXCLUDED.total_crates,
			total_weight_kg = EXCLUDED.total_weight_kg,
			updated_at = NOW()
		RETURNING stop_id, created_at, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		s.TripID, s.StopNo, s.LoadOrder, s.OutletID, s.OutletName, s.District, s.BayInfo, s.Status, s.Tag,
		s.DockNote, s.TotalUnits, s.TotalCrates, s.TotalWeightKg,
	).Scan(&s.StopID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *LoaderRepository) UpdateStopStatus(ctx context.Context, stopID uuid.UUID, status string) error {
	query := `
		UPDATE public.load_stops
		SET status = $2, updated_at = NOW()
		WHERE stop_id = $1
	`
	_, err := r.pool.Exec(ctx, query, stopID, status)
	return err
}

// ResequenceRoute atomically changes only load_order; delivery stop_no is immutable.
func (r *LoaderRepository) ResequenceRoute(ctx context.Context, tripID uuid.UUID, stopIDs []uuid.UUID, expectedVersion int, changedBy uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var unack bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.plan_changes WHERE trip_id=$1 AND acknowledged=FALSE)`, tripID).Scan(&unack); err != nil {
		return err
	}
	if unack {
		return model.NewAppError(model.ErrCodePlanUnacknowledged, "Route plan updates require acknowledgment", http.StatusConflict)
	}
	rows, err := tx.Query(ctx, `SELECT stop_id,load_order,status FROM public.load_stops WHERE trip_id=$1 AND removed_from_plan=FALSE ORDER BY load_order FOR UPDATE`, tripID)
	if err != nil {
		return err
	}
	type state struct {
		order  int
		status string
	}
	current := map[uuid.UUID]state{}
	for rows.Next() {
		var id uuid.UUID
		var s state
		if err = rows.Scan(&id, &s.order, &s.status); err != nil {
			rows.Close()
			return err
		}
		current[id] = s
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	if len(stopIDs) != len(current) {
		return model.ErrBadRequest("stopIds must contain every active trip stop exactly once")
	}
	seen := map[uuid.UUID]bool{}
	for i, id := range stopIDs {
		if seen[id] {
			return model.ErrBadRequest("stopIds contains duplicates")
		}
		seen[id] = true
		s, ok := current[id]
		if !ok {
			return model.ErrBadRequest("stopIds contains a stop that does not belong to the trip")
		}
		if s.status != "PENDING" && s.order != i+1 {
			return model.NewAppError(model.ErrCodeStopAlreadyStarted, "A loading or loaded stop cannot be moved", http.StatusConflict)
		}
	}
	result, err := tx.Exec(ctx, `UPDATE public.loading_confirmations SET version=version+1,updated_at=NOW() WHERE trip_id=$1 AND version=$2`, tripID, expectedVersion)
	if err != nil {
		return err
	}
	if result.RowsAffected() != 1 {
		return model.NewAppError(model.ErrCodeVersionConflict, "Loading plan version changed; refresh and retry", http.StatusConflict)
	}
	if _, err = tx.Exec(ctx, `UPDATE public.load_stops SET load_order=100000+load_order WHERE trip_id=$1 AND removed_from_plan=FALSE`, tripID); err != nil {
		return err
	}
	for i, id := range stopIDs {
		if _, err = tx.Exec(ctx, `UPDATE public.load_stops SET load_order=$1,updated_at=NOW() WHERE stop_id=$2`, i+1, id); err != nil {
			return err
		}
	}
	var tripCode, vehicleID string
	if err = tx.QueryRow(ctx, `SELECT COALESCE('WPT-'||substring(vehicle_id from 5),trip_id::text),vehicle_id FROM public.trips WHERE trip_id=$1`, tripID).Scan(&tripCode, &vehicleID); err != nil {
		return err
	}
	now := time.Now().UTC()
	description := "Preferred loading sequence saved"
	if _, err = tx.Exec(ctx, `INSERT INTO public.load_activity_log(trip_id,event_type,title,description,icon_type,logged_at,created_by) VALUES($1,'ROUTE_RESEQUENCED','Loading sequence changed',$2,'route',$3,$4)`, tripID, description, now, changedBy); err != nil {
		return err
	}
	order := make([]string, len(stopIDs))
	for i, id := range stopIDs {
		order[i] = id.String()
	}
	payload, err := json.Marshal(map[string]any{"trip_id": tripID, "trip_code": tripCode, "vehicle_id": vehicleID, "stop_order": order, "changed_by_id": changedBy, "changed_at": now})
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO public.outbox_events(aggregate_type,aggregate_id,event_type,payload,status) VALUES('TRIP',$1,'ROUTE_RESEQUENCED',$2,'PENDING')`, tripID.String(), payload); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ── load_items ──────────────────────────────────────────────────────────────

func (r *LoaderRepository) GetItemsByStopID(ctx context.Context, stopID uuid.UUID) ([]model.LoadItem, error) {
	query := `
		SELECT item_id, stop_id, trip_id, order_id, sku, name, expected_qty, loaded_qty,
		       unit, weight_kg, tags, status, checked_at, checked_by, created_at, updated_at
		FROM public.load_items
		WHERE stop_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, stopID)
	if err != nil {
		return nil, fmt.Errorf("failed to query load items for stop %s: %w", stopID, err)
	}
	defer rows.Close()

	var items []model.LoadItem
	for rows.Next() {
		var it model.LoadItem
		err := rows.Scan(
			&it.ItemID, &it.StopID, &it.TripID, &it.OrderID, &it.SKU, &it.Name,
			&it.ExpectedQty, &it.LoadedQty, &it.Unit, &it.WeightKg, &it.Tags,
			&it.Status, &it.CheckedAt, &it.CheckedBy, &it.CreatedAt, &it.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan load item: %w", err)
		}
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *LoaderRepository) GetItemByID(ctx context.Context, itemID uuid.UUID) (*model.LoadItem, error) {
	query := `
		SELECT item_id, stop_id, trip_id, order_id, sku, name, expected_qty, loaded_qty,
		       unit, weight_kg, tags, status, checked_at, checked_by, created_at, updated_at
		FROM public.load_items
		WHERE item_id = $1
	`
	var it model.LoadItem
	err := r.pool.QueryRow(ctx, query, itemID).Scan(
		&it.ItemID, &it.StopID, &it.TripID, &it.OrderID, &it.SKU, &it.Name,
		&it.ExpectedQty, &it.LoadedQty, &it.Unit, &it.WeightKg, &it.Tags,
		&it.Status, &it.CheckedAt, &it.CheckedBy, &it.CreatedAt, &it.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &it, nil
}

func (r *LoaderRepository) UpdateItemStatus(ctx context.Context, itemID uuid.UUID, status string, loadedQty int, checkedBy uuid.UUID) error {
	query := `
		UPDATE public.load_items
		SET status = $2, loaded_qty = $3, checked_by = $4, checked_at = NOW(), updated_at = NOW()
		WHERE item_id = $1
	`
	_, err := r.pool.Exec(ctx, query, itemID, status, loadedQty, checkedBy)
	return err
}

// ── issue_flags (Shortfall & Damaged Records) ───────────────────────────────

func (r *LoaderRepository) CreateIssueFlag(ctx context.Context, flag *model.IssueFlag) error {
	query := `
		INSERT INTO public.issue_flags (
			trip_id, order_id, flagged_by, issue_type, ref, stop_id, item_id,
			qty_affected, reason, description, evidence_url, weight_delta_kg, dispatcher_notified_at
		) VALUES (
			$1, $2, $3, $4, NULLIF($5, ''), $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING issue_id, ref, created_at
	`
	return r.pool.QueryRow(ctx, query,
		flag.TripID, flag.OrderID, flag.FlaggedBy, flag.IssueType, flag.Ref, flag.StopID, flag.ItemID,
		flag.QtyAffected, flag.Reason, flag.Description, flag.EvidenceURL, flag.WeightDeltaKg, flag.DispatcherNotifiedAt,
	).Scan(&flag.IssueID, &flag.Ref, &flag.CreatedAt)
}

func (r *LoaderRepository) GetOpenIssueFlagsByTripID(ctx context.Context, tripID uuid.UUID) ([]model.IssueFlag, error) {
	query := `
		SELECT issue_id, trip_id, order_id, flagged_by, issue_type, COALESCE(ref, ''),
		       stop_id, item_id, qty_affected, reason, description, evidence_url,
		       COALESCE(weight_delta_kg, 0), dispatcher_notified_at, resolved,
		       resolved_by, resolved_at, resolution_notes, created_at
		FROM public.issue_flags
		WHERE trip_id = $1 AND resolved = FALSE
		ORDER BY created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query open issues for trip %s: %w", tripID, err)
	}
	defer rows.Close()

	var flags []model.IssueFlag
	for rows.Next() {
		var f model.IssueFlag
		err := rows.Scan(
			&f.IssueID, &f.TripID, &f.OrderID, &f.FlaggedBy, &f.IssueType, &f.Ref,
			&f.StopID, &f.ItemID, &f.QtyAffected, &f.Reason, &f.Description, &f.EvidenceURL,
			&f.WeightDeltaKg, &f.DispatcherNotifiedAt, &f.Resolved,
			&f.ResolvedBy, &f.ResolvedAt, &f.ResolutionNotes, &f.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan issue flag: %w", err)
		}
		flags = append(flags, f)
	}
	return flags, rows.Err()
}

func (r *LoaderRepository) ResolveIssueFlag(ctx context.Context, issueID uuid.UUID, resolvedBy uuid.UUID, notes string) error {
	query := `
		UPDATE public.issue_flags
		SET resolved = TRUE, resolved_by = $2, resolved_at = NOW(), resolution_notes = $3
		WHERE issue_id = $1
	`
	_, err := r.pool.Exec(ctx, query, issueID, resolvedBy, notes)
	return err
}

// ── load_activity_log ───────────────────────────────────────────────────────

func (r *LoaderRepository) LogActivity(ctx context.Context, entry *model.LoadActivityLog) error {
	query := `
		INSERT INTO public.load_activity_log (
			trip_id, event_type, title, description, icon_type, created_by
		) VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, logged_at
	`
	return r.pool.QueryRow(ctx, query,
		entry.TripID, entry.EventType, entry.Title, entry.Description, entry.IconType, entry.CreatedBy,
	).Scan(&entry.ID, &entry.LoggedAt)
}

func (r *LoaderRepository) GetActivityLogByTripID(ctx context.Context, tripID uuid.UUID) ([]model.LoadActivityLog, error) {
	query := `
		SELECT id, trip_id, event_type, title, description, icon_type, logged_at, created_by
		FROM public.load_activity_log
		WHERE trip_id = $1
		ORDER BY logged_at ASC
	`
	rows, err := r.pool.Query(ctx, query, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query activity log: %w", err)
	}
	defer rows.Close()

	var logs []model.LoadActivityLog
	for rows.Next() {
		var l model.LoadActivityLog
		if err := rows.Scan(&l.ID, &l.TripID, &l.EventType, &l.Title, &l.Description, &l.IconType, &l.LoggedAt, &l.CreatedBy); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

// ── plan_changes ────────────────────────────────────────────────────────────

func (r *LoaderRepository) GetPendingPlanChanges(ctx context.Context, tripID uuid.UUID) ([]model.PlanChange, error) {
	query := `
		SELECT id, trip_id, revision, summary, details, acknowledged, acknowledged_at, acknowledged_by, created_at
		FROM public.plan_changes
		WHERE trip_id = $1 AND acknowledged = FALSE
		ORDER BY revision DESC
	`
	rows, err := r.pool.Query(ctx, query, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query plan changes: %w", err)
	}
	defer rows.Close()

	var changes []model.PlanChange
	for rows.Next() {
		var pc model.PlanChange
		var raw json.RawMessage
		if err := rows.Scan(&pc.ID, &pc.TripID, &pc.Revision, &pc.Summary, &raw, &pc.Acknowledged, &pc.AcknowledgedAt, &pc.AcknowledgedBy, &pc.CreatedAt); err != nil {
			return nil, err
		}
		pc.Details = raw
		changes = append(changes, pc)
	}
	return changes, rows.Err()
}

func (r *LoaderRepository) AcknowledgePlanChange(ctx context.Context, tripID uuid.UUID, revision int, ackBy uuid.UUID) error {
	query := `
		UPDATE public.plan_changes
		SET acknowledged = TRUE, acknowledged_at = NOW(), acknowledged_by = $3
		WHERE trip_id = $1 AND revision = $2
	`
	_, err := r.pool.Exec(ctx, query, tripID, revision, ackBy)
	return err
}

// ── outbox_events ───────────────────────────────────────────────────────────

func (r *LoaderRepository) InsertOutboxEvent(ctx context.Context, tx pgx.Tx, event *model.OutboxEvent) error {
	if event.Payload == nil {
		event.Payload = []byte("{}")
	}
	query := `
		INSERT INTO public.outbox_events (
			aggregate_type, aggregate_id, event_type, payload, status
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	var row pgx.Row
	if tx != nil {
		row = tx.QueryRow(ctx, query, event.AggregateType, event.AggregateID, event.EventType, event.Payload, event.Status)
	} else {
		row = r.pool.QueryRow(ctx, query, event.AggregateType, event.AggregateID, event.EventType, event.Payload, event.Status)
	}
	return row.Scan(&event.ID, &event.CreatedAt)
}

func (r *LoaderRepository) GetPendingOutboxEvents(ctx context.Context, limit int) ([]model.OutboxEvent, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, aggregate_type, aggregate_id, event_type, payload, status, retry_count, created_at, published_at
		FROM public.outbox_events
		WHERE status = 'PENDING'
		ORDER BY created_at ASC
		LIMIT $1
	`
	rows, err := r.pool.Query(ctx, query, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query pending outbox events: %w", err)
	}
	defer rows.Close()

	var events []model.OutboxEvent
	for rows.Next() {
		var ev model.OutboxEvent
		var raw json.RawMessage
		err := rows.Scan(
			&ev.ID, &ev.AggregateType, &ev.AggregateID, &ev.EventType, &raw,
			&ev.Status, &ev.RetryCount, &ev.CreatedAt, &ev.PublishedAt,
		)
		if err != nil {
			return nil, err
		}
		ev.Payload = raw
		events = append(events, ev)
	}
	return events, rows.Err()
}

func (r *LoaderRepository) MarkOutboxEventPublished(ctx context.Context, eventID uuid.UUID) error {
	query := `
		UPDATE public.outbox_events
		SET status = 'PUBLISHED', published_at = NOW()
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, eventID)
	return err
}

// ── Today's Loads (Overview List with Derived Status) ────────────────────────

type RawTripRecord struct {
	TripID        uuid.UUID
	VehicleID     string
	LoadedKg      float64
	CapacityKg    float64
	TotalItems    int
	CheckedItems  int
	DriverName    string
	Dock          string
	ConfStatus    string
	HasReadyAt    bool
	StopCount     int
	Destination   string
	HasOpenIssues bool
	CreatedAt     time.Time
	Depot         string
	Origin        string
}

// FetchRawTripsForDate retrieves raw trip records with computed loadedKg, item counts, and metadata
func (r *LoaderRepository) FetchRawTripsForDate(ctx context.Context, dateStr string) ([]RawTripRecord, error) {
	return r.FetchRawTripsForDateAndDepot(ctx, dateStr, "")
}

func (r *LoaderRepository) FetchRawTripsForDateAndDepot(ctx context.Context, dateStr, depot string) ([]RawTripRecord, error) {
	query := `
		SELECT
			t.trip_id,
			COALESCE(t.vehicle_id, '') AS vehicle_id,
			COALESCE((
				SELECT SUM(i.weight_kg)
				FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND i.status = 'CHECKED' AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			), 0)::FLOAT8 AS loaded_kg,
			COALESCE(v.weight_cap_kg, 5000)::FLOAT8 AS capacity_kg,
			COALESCE((
				SELECT COUNT(*)
				FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			), 0)::INT AS total_items,
			COALESCE((
				SELECT COUNT(*)
				FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND i.status = 'CHECKED' AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			), 0)::INT AS checked_items,
			COALESCE(u.full_name, 'Unassigned') AS driver_name,
			COALESCE(lc.dock, 'Dock A5') AS dock,
			COALESCE(lc.status::TEXT, 'PENDING') AS conf_status,
			(lc.ready_at IS NOT NULL) AS has_ready_at,
			COALESCE((
				SELECT COUNT(*) FROM public.load_stops s WHERE s.trip_id = t.trip_id AND s.removed_from_plan = FALSE
			), array_length(t.stop_sequence, 1), 0)::INT AS stop_count,
			COALESCE(t.destination_area, (
				SELECT s.outlet_name FROM public.load_stops s
				WHERE s.trip_id = t.trip_id
				ORDER BY s.stop_no DESC LIMIT 1
			), 'Union Place') AS destination,
			EXISTS (
				SELECT 1 FROM public.issue_flags f
				WHERE f.trip_id = t.trip_id AND f.resolved = FALSE
			) AS has_open_issues,
			t.created_at,
			COALESCE(v.depot, '') AS depot,
			CASE WHEN LOWER(COALESCE(v.depot,'')) LIKE '%kandy%' THEN 'Kandy DC' ELSE 'Peliyagoda DC' END AS origin
		FROM public.trips t
		LEFT JOIN public.vehicles v ON t.vehicle_id = v.vehicle_id
		LEFT JOIN public.user_profiles u ON t.driver_id = u.id
		LEFT JOIN public.loading_confirmations lc ON t.trip_id = lc.trip_id
		WHERE ($1 = '' OR t.delivery_date = $1::DATE OR t.delivery_date = CURRENT_DATE
		       OR lc.status::TEXT IN ('PENDING','LOADING'))
		  AND ($2 = '' OR LOWER(COALESCE(v.depot,'')) = LOWER($2)
		       OR ($2 = 'Peliyagoda' AND LOWER(COALESCE(v.depot,'')) IN ('depot-01','peliyagoda'))
		       OR ($2 = 'Kandy' AND LOWER(COALESCE(v.depot,'')) LIKE '%kandy%'))
		ORDER BY t.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, dateStr, depot)
	if err != nil {
		return nil, fmt.Errorf("failed to query trips for date %q: %w", dateStr, err)
	}
	defer rows.Close()

	var records []RawTripRecord
	for rows.Next() {
		var rec RawTripRecord
		err := rows.Scan(
			&rec.TripID, &rec.VehicleID, &rec.LoadedKg, &rec.CapacityKg,
			&rec.TotalItems, &rec.CheckedItems,
			&rec.DriverName, &rec.Dock, &rec.ConfStatus, &rec.HasReadyAt, &rec.StopCount,
			&rec.Destination, &rec.HasOpenIssues, &rec.CreatedAt, &rec.Depot, &rec.Origin,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan trip row: %w", err)
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (r *LoaderRepository) GetUserDepot(ctx context.Context, userID uuid.UUID) (string, error) {
	var depot string
	err := r.pool.QueryRow(ctx, `SELECT COALESCE(depot,'') FROM public.user_profiles WHERE id=$1`, userID).Scan(&depot)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return depot, err
}

// RawTripDetail holds DB fields for GET /api/loading/trips/{tripId}
type RawTripDetail struct {
	TripID         uuid.UUID
	TripCode       string
	VehicleID      string
	CapacityKg     float64
	LoadedKg       float64
	TotalItems     int
	CheckedItems   int
	DriverName     string
	Dock           string
	PlannedStart   string
	Shift          string
	Destination    string
	Origin         string
	ConfStatus     string
	ConfVersion    int
	HasReadyAt     bool
	HasOpenIssues  bool
	TempCapability string
	HasChilled     bool
	HasFrozen      bool
	IssueItems     int
}

// GetTripByTripCodeOrID resolves trip by UUID or code (e.g. WPT-204, TRC-204)
func (r *LoaderRepository) GetTripByTripCodeOrID(ctx context.Context, idOrCode string) (*RawTripDetail, error) {
	query := `
		SELECT
			t.trip_id,
			COALESCE('WPT-' || substring(t.vehicle_id from 5), 'WPT-204') AS trip_code,
			t.vehicle_id,
			COALESCE(v.weight_cap_kg, 5000)::FLOAT8 AS capacity_kg,
			COALESCE((
				SELECT SUM(i.weight_kg)
				FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND i.status = 'CHECKED' AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			), 0)::FLOAT8 AS loaded_kg,
			COALESCE((
				SELECT COUNT(*)
				FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			), 0)::INT AS total_items,
			COALESCE((
				SELECT COUNT(*)
				FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND i.status = 'CHECKED' AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			), 0)::INT AS checked_items,
			COALESCE(u.full_name, 'Unassigned') AS driver_name,
			COALESCE(lc.dock, 'Dock A5') AS dock,
			'07:30' AS planned_start,
			'Shift A' AS shift,
			COALESCE(t.destination_area, 'Union Place') AS destination,
			CASE WHEN LOWER(COALESCE(v.depot,'')) LIKE '%kandy%' THEN 'Kandy DC' ELSE 'Peliyagoda DC' END AS origin,
			COALESCE(lc.status::TEXT, 'PENDING') AS conf_status,
			COALESCE(lc.version, 0)::INT AS conf_version,
			(lc.ready_at IS NOT NULL) AS has_ready_at,
			EXISTS (
				SELECT 1 FROM public.issue_flags f
				WHERE f.trip_id = t.trip_id AND f.resolved = FALSE
			) AS has_open_issues,
			COALESCE(v.temp_capability::TEXT, 'AMBIENT') AS temp_capability,
			EXISTS (
				SELECT 1 FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND 'chilled' = ANY(i.tags) AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			) AS has_chilled,
			EXISTS (
				SELECT 1 FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND 'frozen' = ANY(i.tags) AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			) AS has_frozen,
			COALESCE((
				SELECT COUNT(*) FROM public.load_items i
				WHERE i.trip_id = t.trip_id AND i.status = 'ISSUE' AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=i.stop_id AND active.removed_from_plan=FALSE)
			), 0)::INT AS issue_items
		FROM public.trips t
		LEFT JOIN public.vehicles v ON t.vehicle_id = v.vehicle_id
		LEFT JOIN public.user_profiles u ON t.driver_id = u.id
		LEFT JOIN public.loading_confirmations lc ON t.trip_id = lc.trip_id
		WHERE (
			t.trip_id::TEXT = $1
			OR t.vehicle_id = $1
			OR 'WPT-' || substring(t.vehicle_id from 5) = $1
			OR 'TRC-' || substring($1 from 5) = t.vehicle_id
		)
		LIMIT 1
	`
	var d RawTripDetail
	err := r.pool.QueryRow(ctx, query, idOrCode).Scan(
		&d.TripID, &d.TripCode, &d.VehicleID, &d.CapacityKg, &d.LoadedKg,
		&d.TotalItems, &d.CheckedItems, &d.DriverName, &d.Dock, &d.PlannedStart,
		&d.Shift, &d.Destination, &d.Origin, &d.ConfStatus, &d.ConfVersion,
		&d.HasReadyAt, &d.HasOpenIssues, &d.TempCapability, &d.HasChilled,
		&d.HasFrozen, &d.IssueItems,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get trip by identifier %q: %w", idOrCode, err)
	}
	return &d, nil
}

// GetStopsWithProgressByTripID fetches stops ordered by load_order ascending, deriving dropLabel and nextAction
func (r *LoaderRepository) GetStopsWithProgressByTripID(ctx context.Context, tripID uuid.UUID) ([]model.LoadStopDetailDTO, error) {
	query := `
		SELECT
			s.stop_id,
			s.load_order,
			s.stop_no,
			s.outlet_name,
			COALESCE(s.district, 'Colombo District') AS district,
			COALESCE(s.dock_note, 'Rear dock') AS dock_note,
			s.pending_items,
			s.total_items,
			s.loaded_items,
			s.total_units,
			s.total_crates,
			s.total_weight_kg,
			COALESCE(s.status, 'PENDING') AS status,
			s.change_flag,
			(SELECT COUNT(*) FROM public.load_stops sub WHERE sub.trip_id = s.trip_id)::INT AS total_stops,
			COALESCE(o.brand::text, '') AS outlet_brand,
			EXISTS (SELECT 1 FROM public.load_items li WHERE li.stop_id=s.stop_id AND 'chilled'=ANY(li.tags)) AS has_chilled,
			EXISTS (SELECT 1 FROM public.load_items li WHERE li.stop_id=s.stop_id AND 'frozen'=ANY(li.tags)) AS has_frozen,
			EXISTS (SELECT 1 FROM public.load_items li WHERE li.stop_id=s.stop_id AND 'fragile'=ANY(li.tags)) AS has_fragile,
			EXISTS (SELECT 1 FROM public.load_items li WHERE li.stop_id=s.stop_id AND 'ambient'=ANY(li.tags)) AS has_ambient,
			COALESCE(o.parking_constraint::text, '') AS parking_constraint
		FROM public.v_load_stop_progress s
		LEFT JOIN public.outlets o ON s.outlet_id = o.outlet_id
		WHERE s.trip_id = $1
		  AND EXISTS (SELECT 1 FROM public.load_stops active WHERE active.stop_id=s.stop_id AND active.removed_from_plan=FALSE)
		ORDER BY s.load_order ASC
	`
	rows, err := r.pool.Query(ctx, query, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query stops for trip %s: %w", tripID, err)
	}
	defer rows.Close()

	stopDtos := make([]model.LoadStopDetailDTO, 0)
	earlierStopsLoaded := true

	for rows.Next() {
		var (
			stopID            uuid.UUID
			loadOrder         int
			stopNo            int
			outletName        string
			district          string
			dockNote          string
			pendingItems      int
			totalItems        int
			loadedItems       int
			totalUnits        int
			totalCrates       int
			totalWeight       float64
			status            string
			changeFlag        *string
			totalStops        int
			outletBrand       string
			hasChilled        bool
			hasFrozen         bool
			hasFragile        bool
			hasAmbient        bool
			parkingConstraint string
		)

		err := rows.Scan(
			&stopID, &loadOrder, &stopNo, &outletName, &district, &dockNote,
			&pendingItems, &totalItems, &loadedItems,
			&totalUnits, &totalCrates, &totalWeight,
			&status, &changeFlag, &totalStops,
			&outletBrand, &hasChilled, &hasFrozen, &hasFragile, &hasAmbient, &parkingConstraint,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan stop row: %w", err)
		}

		// Drop label derivation
		var dropLabel *string
		if stopNo == 1 {
			dl := model.DropLabelFirstDrop
			dropLabel = &dl
		} else if stopNo == totalStops {
			dl := model.DropLabelLastDrop
			dropLabel = &dl
		}

		// Stop tags are derived from outlet brand and stop-level handling needs;
		// item tags remain item-specific and are never unioned across a stop.
		tags := make([]string, 0)
		seen := make(map[string]bool)
		if clean := strings.TrimSpace(outletBrand); clean != "" {
			seen[clean] = true
			tags = append(tags, clean)
		}
		if hasChilled {
			seen["chilled"] = true
			tags = append(tags, "chilled")
		}
		if hasFrozen {
			seen["reefer"] = true
			tags = append(tags, "reefer")
		}
		if outletBrand == "Tech" && hasFragile && !seen["fragile"] {
			seen["fragile"] = true
			tags = append(tags, "fragile")
		}
		if outletBrand == "Style" && hasAmbient && !seen["ambient"] {
			seen["ambient"] = true
			tags = append(tags, "ambient")
		}
		if parkingConstraint == "van_only" && !seen["van_only"] {
			tags = append(tags, "van_only")
		}

		// Format area: e.g. "Colombo 02 · Colombo District"
		area := district
		if strings.Contains(outletName, "Union Place") {
			area = "Colombo 02 · Colombo District"
		} else if strings.Contains(outletName, "Galle Face") {
			area = "Colombo 01 · Colombo District"
		} else if strings.Contains(outletName, "Kollupitiya") {
			area = "Colombo 03 · Colombo District"
		} else if strings.Contains(outletName, "Dematagoda") {
			area = "Colombo 09 · Colombo District"
		}

		nextAction := model.DeriveStopNextAction(status, earlierStopsLoaded, pendingItems)

		if status != "LOADED" {
			earlierStopsLoaded = false
		}

		stopDtos = append(stopDtos, model.LoadStopDetailDTO{
			StopID:         stopID.String(),
			LoadOrder:      loadOrder,
			StopNo:         stopNo,
			DropLabel:      dropLabel,
			Outlet:         outletName,
			Area:           area,
			DockNote:       dockNote,
			ItemsRemaining: pendingItems,
			LineItems:      totalItems,
			Units:          totalUnits,
			Crates:         totalCrates,
			WeightKg:       totalWeight,
			Tags:           tags,
			Status:         status,
			NextAction:     nextAction,
			ChangeFlag:     changeFlag,
		})
	}

	return stopDtos, rows.Err()
}

// StartStopLoading starts loading for a specific stop, enforcing sequential loading and optimistic locking
func (r *LoaderRepository) StartStopLoading(ctx context.Context, tripID, stopID uuid.UUID, expectedVersion int, loaderID uuid.UUID) (*model.LoadStopDetailDTO, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 1. Fetch target stop info
	var stopNo, loadOrder int
	var outletName, status string
	err = tx.QueryRow(ctx, `
		SELECT stop_no, load_order, outlet_name, status
		FROM public.load_stops
		WHERE stop_id = $1 AND trip_id = $2
	`, stopID, tripID).Scan(&stopNo, &loadOrder, &outletName, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound("Stop not found for this trip")
		}
		return nil, err
	}

	// 2. Hook for plan change unacknowledged guard (Task P4 preparation)
	var unackChanges int
	_ = tx.QueryRow(ctx, `
		SELECT COUNT(*) FROM public.plan_changes
		WHERE trip_id = $1 AND acknowledged = FALSE
	`, tripID).Scan(&unackChanges)
	if unackChanges > 0 {
		return nil, model.NewAppError(
			model.ErrCodePlanUnacknowledged,
			"Cannot start loading: route plan updates require acknowledgment",
			http.StatusConflict,
		)
	}

	// 3. Out-of-sequence guard: all earlier load_order stops must be LOADED
	var earlierNotLoaded int
	err = tx.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM public.load_stops
		WHERE trip_id = $1 AND load_order < $2 AND status <> 'LOADED'
	`, tripID, loadOrder).Scan(&earlierNotLoaded)
	if err != nil {
		return nil, err
	}

	if earlierNotLoaded > 0 {
		return nil, model.NewAppError(
			model.ErrCodeOutOfSequence,
			"Cannot start stop: previous stop in loading order is not fully loaded",
			http.StatusConflict,
		)
	}

	// 4. Update stop status to LOADING
	if _, err := tx.Exec(ctx, `
		UPDATE public.load_stops
		SET status = 'LOADING', updated_at = NOW()
		WHERE stop_id = $1
	`, stopID); err != nil {
		return nil, fmt.Errorf("failed to update stop status: %w", err)
	}

	// 5. Update loading_confirmations status to LOADING if it was PENDING
	// Optimistic concurrency check if expectedVersion > 0
	var updateConfQuery string
	var args []any
	if expectedVersion > 0 {
		updateConfQuery = `
			UPDATE public.loading_confirmations
			SET status = CASE WHEN status = 'PENDING' THEN 'LOADING' ELSE status END,
			    version = version + 1,
			    updated_at = NOW()
			WHERE trip_id = $1 AND version = $2
		`
		args = []any{tripID, expectedVersion}
	} else {
		updateConfQuery = `
			UPDATE public.loading_confirmations
			SET status = CASE WHEN status = 'PENDING' THEN 'LOADING' ELSE status END,
			    version = version + 1,
			    updated_at = NOW()
			WHERE trip_id = $1
		`
		args = []any{tripID}
	}

	tagRes, err := tx.Exec(ctx, updateConfQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update loading confirmation: %w", err)
	}
	if expectedVersion > 0 && tagRes.RowsAffected() == 0 {
		return nil, model.NewAppError(
			model.ErrCodeConflict,
			"Trip state was updated by another process. Please refresh and retry.",
			http.StatusConflict,
		)
	}

	// 6. Idempotently write to load_activity_log ("Stop N loading opened")
	logTitle := fmt.Sprintf("Stop %d loading opened", stopNo)
	var logExists bool
	_ = tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM public.load_activity_log
			WHERE trip_id = $1 AND title = $2
		)
	`, tripID, logTitle).Scan(&logExists)

	if !logExists {
		logDesc := fmt.Sprintf("%s · load order %d", outletName, loadOrder)
		_, _ = tx.Exec(ctx, `
			INSERT INTO public.load_activity_log (trip_id, event_type, title, description, icon_type, logged_at, created_by)
			SELECT $1, 'STOP_OPENED', $2, $3, 'package', NOW(), u.id
			FROM (SELECT $4::UUID AS id) req
			LEFT JOIN auth.users u ON u.id = req.id
		`, tripID, logTitle, logDesc, loaderID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	// 7. Return refreshed stop DTO
	stops, err := r.GetStopsWithProgressByTripID(ctx, tripID)
	if err != nil {
		return nil, err
	}
	for _, s := range stops {
		if s.StopID == stopID.String() {
			return &s, nil
		}
	}
	return nil, nil
}

// GetStopItems retrieves item checklist data for a specific stop (Task P5)
func (r *LoaderRepository) GetStopItems(ctx context.Context, tripID, stopID uuid.UUID) (*model.StopItemsResponse, error) {
	// Query stop header info
	headerQuery := `
		SELECT
			s.load_order,
			s.stop_no,
			s.outlet_name,
			COALESCE(s.district, 'Colombo District') AS district,
			COALESCE(s.dock_note, 'Rear dock') AS dock_note,
			t.vehicle_id,
			(SELECT COUNT(*) FROM public.load_stops sub WHERE sub.trip_id = s.trip_id AND sub.removed_from_plan=FALSE)::INT AS total_stops
		FROM public.load_stops s
		JOIN public.trips t ON s.trip_id = t.trip_id
		WHERE s.stop_id = $1 AND s.trip_id = $2 AND s.removed_from_plan=FALSE
	`
	var (
		loadOrder  int
		stopNo     int
		outletName string
		district   string
		dockNote   string
		vehicleID  string
		totalStops int
	)
	err := r.pool.QueryRow(ctx, headerQuery, stopID, tripID).Scan(
		&loadOrder, &stopNo, &outletName, &district, &dockNote, &vehicleID, &totalStops,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound("Stop not found for this trip")
		}
		return nil, fmt.Errorf("failed to query stop header: %w", err)
	}

	var dropLabel *string
	if stopNo == 1 {
		dl := model.DropLabelFirstDrop
		dropLabel = &dl
	} else if stopNo == totalStops {
		dl := model.DropLabelLastDrop
		dropLabel = &dl
	}

	area := district
	if strings.Contains(outletName, "Union Place") {
		area = "Colombo 02 · Colombo District"
	} else if strings.Contains(outletName, "Galle Face") {
		area = "Colombo 01 · Colombo District"
	} else if strings.Contains(outletName, "Kollupitiya") {
		area = "Colombo 03 · Colombo District"
	} else if strings.Contains(outletName, "Dematagoda") {
		area = "Colombo 09 · Colombo District"
	}

	// Query items
	itemsQuery := `
		SELECT
			item_id,
			name,
			sku,
			COALESCE(tags, ARRAY[]::TEXT[]) AS tags,
			expected_qty,
			COALESCE(unit, 'units') AS unit,
			status
		FROM public.load_items
		WHERE stop_id = $1 AND trip_id = $2
		ORDER BY created_at ASC, item_id ASC
	`
	rows, err := r.pool.Query(ctx, itemsQuery, stopID, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query load items: %w", err)
	}
	defer rows.Close()

	var items []model.ChecklistItem
	var pendingNames []string
	checkedCount := 0
	issueCount := 0

	for rows.Next() {
		var (
			itemID      uuid.UUID
			name        string
			sku         string
			tags        []string
			expectedQty int
			unit        string
			status      string
		)
		if err := rows.Scan(&itemID, &name, &sku, &tags, &expectedQty, &unit, &status); err != nil {
			return nil, fmt.Errorf("failed to scan load item: %w", err)
		}

		isChecked := status == "CHECKED"
		if isChecked {
			checkedCount++
		} else if status == "ISSUE" {
			issueCount++
		} else {
			pendingNames = append(pendingNames, name)
		}

		items = append(items, model.ChecklistItem{
			ItemID:  itemID.String(),
			Name:    name,
			SKU:     sku,
			Tags:    tags,
			Qty:     expectedQty,
			Unit:    unit,
			Status:  status,
			Checked: isChecked,
		})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error reading load items: %w", err)
	}

	totalItems := len(items)
	pct := model.ComputeProgressPct(checkedCount, totalItems)
	canConfirm := (checkedCount + issueCount) == totalItems

	var blockReason *string
	if !canConfirm {
		var reason string
		if len(pendingNames) == 1 {
			reason = fmt.Sprintf("Check the %s or file a shortfall to continue.", pendingNames[0])
		} else if len(pendingNames) > 1 {
			reason = fmt.Sprintf("Check the %s or file a shortfall to continue.", strings.Join(pendingNames, ", "))
		} else {
			reason = "Check all items or file a shortfall to continue."
		}
		blockReason = &reason
	}

	return &model.StopItemsResponse{
		Header: model.ChecklistHeader{
			LoadOrder: loadOrder,
			StopNo:    stopNo,
			DropLabel: dropLabel,
			Outlet:    outletName,
			Area:      area,
			DockNote:  dockNote,
			VehicleID: vehicleID,
			LineItems: totalItems,
		},
		Items: items,
		Progress: model.ChecklistProgress{
			Checked: checkedCount,
			Total:   totalItems,
			Pct:     pct,
			Label:   fmt.Sprintf("%d of %d checked", checkedCount, totalItems),
		},
		CanConfirm:  canConfirm,
		BlockReason: blockReason,
	}, nil
}

// CheckItem updates the check state of a single load item idempotently (Task P5)
func (r *LoaderRepository) CheckItem(ctx context.Context, itemID uuid.UUID, checked bool, loaderID uuid.UUID) (*model.ChecklistItem, error) {
	// 1. Fetch item current state
	var (
		tripID      uuid.UUID
		stopID      uuid.UUID
		name        string
		sku         string
		tags        []string
		expectedQty int
		unit        string
		currentSt   string
	)
	err := r.pool.QueryRow(ctx, `
		SELECT trip_id, stop_id, name, sku, COALESCE(tags, ARRAY[]::TEXT[]), expected_qty, COALESCE(unit, 'units'), status
		FROM public.load_items
		WHERE item_id = $1
	`, itemID).Scan(&tripID, &stopID, &name, &sku, &tags, &expectedQty, &unit, &currentSt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound("Item not found")
		}
		return nil, fmt.Errorf("failed to query load item: %w", err)
	}

	// 2. Plan-unacknowledged guard hook (Task P4)
	var unackChanges int
	_ = r.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM public.plan_changes
		WHERE trip_id = $1 AND acknowledged = FALSE
	`, tripID).Scan(&unackChanges)
	if unackChanges > 0 {
		return nil, model.NewAppError(
			model.ErrCodePlanUnacknowledged,
			"Cannot check item: route plan updates require acknowledgment",
			http.StatusConflict,
		)
	}

	// 3. Issue state guard: 409 ITEM_HAS_ISSUE if status is ISSUE
	if currentSt == "ISSUE" {
		return nil, model.NewAppError(
			model.ErrCodeItemHasIssue,
			"Cannot check item: an active issue flag is raised on this item",
			http.StatusConflict,
		)
	}

	// 4. Update status (idempotent SET, not toggle)
	var newStatus string
	var newLoadedQty int
	if checked {
		newStatus = "CHECKED"
		newLoadedQty = expectedQty
		_, err = r.pool.Exec(ctx, `
			UPDATE public.load_items
			SET status = $1, loaded_qty = $2, checked_at = NOW(),
			    checked_by = (SELECT id FROM public.user_profiles WHERE id = $3), updated_at = NOW()
			WHERE item_id = $4
		`, newStatus, newLoadedQty, loaderID, itemID)
	} else {
		newStatus = "PENDING"
		newLoadedQty = 0
		_, err = r.pool.Exec(ctx, `
			UPDATE public.load_items
			SET status = $1, loaded_qty = $2, checked_at = NULL, checked_by = NULL, updated_at = NOW()
			WHERE item_id = $4
		`, newStatus, newLoadedQty, itemID)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to update load item check state: %w", err)
	}

	return &model.ChecklistItem{
		ItemID:  itemID.String(),
		Name:    name,
		SKU:     sku,
		Tags:    tags,
		Qty:     expectedQty,
		Unit:    unit,
		Status:  newStatus,
		Checked: checked,
	}, nil
}

// ConfirmStop marks a stop as LOADED when every item is CHECKED or ISSUE (Task P5)
func (r *LoaderRepository) ConfirmStop(ctx context.Context, tripID, stopID uuid.UUID, expectedVersion int, loaderID uuid.UUID) (*model.LoadStopDetailDTO, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 1. Fetch stop details
	var (
		stopNo     int
		loadOrder  int
		outletName string
		currentSt  string
	)
	err = tx.QueryRow(ctx, `
		SELECT stop_no, load_order, outlet_name, status
		FROM public.load_stops
		WHERE stop_id = $1 AND trip_id = $2
	`, stopID, tripID).Scan(&stopNo, &loadOrder, &outletName, &currentSt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound("Stop not found for this trip")
		}
		return nil, err
	}

	// A revised route must be acknowledged before checklist confirmation.
	var unackChanges int
	if err := tx.QueryRow(ctx, `SELECT COUNT(*) FROM public.plan_changes WHERE trip_id=$1 AND acknowledged=FALSE`, tripID).Scan(&unackChanges); err != nil {
		return nil, err
	}
	if unackChanges > 0 {
		return nil, model.NewAppError(model.ErrCodePlanUnacknowledged, "Cannot confirm stop: route plan updates require acknowledgment", http.StatusConflict)
	}

	// 2. Count item statuses
	var (
		pendingCount int
		issueCount   int
		totalCount   int
	)
	err = tx.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status = 'PENDING')::INT,
			COUNT(*) FILTER (WHERE status = 'ISSUE')::INT,
			COUNT(*)::INT
		FROM public.load_items
		WHERE stop_id = $1 AND trip_id = $2
	`, stopID, tripID).Scan(&pendingCount, &issueCount, &totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to query stop item counts: %w", err)
	}

	// 3. Confirm gating: every item must be CHECKED or ISSUE
	if pendingCount > 0 {
		return nil, &model.ChecklistIncompleteError{
			Code:      model.ErrCodeChecklistIncomplete,
			Message:   "Stop checklist incomplete: items are still pending",
			Unchecked: pendingCount,
		}
	}

	// 4. Update stop status to LOADED
	_, err = tx.Exec(ctx, `
		UPDATE public.load_stops
		SET status = 'LOADED', updated_at = NOW()
		WHERE stop_id = $1
	`, stopID)
	if err != nil {
		return nil, fmt.Errorf("failed to mark stop as LOADED: %w", err)
	}

	// 5. Activity log: "Stop N confirmed loaded"
	logTitle := fmt.Sprintf("Stop %d confirmed loaded", stopNo)
	logDesc := "All items checked"
	if issueCount > 0 {
		logDesc = "Issue attached to dispatch manifest"
	}
	var logExists bool
	_ = tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM public.load_activity_log
			WHERE trip_id = $1 AND title = $2
		)
	`, tripID, logTitle).Scan(&logExists)
	if !logExists {
		_, _ = tx.Exec(ctx, `
			INSERT INTO public.load_activity_log (trip_id, event_type, title, description, icon_type, logged_at, created_by)
			SELECT $1, 'STOP_CONFIRMED', $2, $3, 'check', clock_timestamp(), u.id
			FROM (SELECT $4::UUID AS id) req
			LEFT JOIN auth.users u ON u.id = req.id
		`, tripID, logTitle, logDesc, loaderID)
	}

	// 6. Check if ALL stops for this trip are LOADED
	var notLoadedCount, totalStops int
	err = tx.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status <> 'LOADED')::INT,
			COUNT(*)::INT
		FROM public.load_stops
		WHERE trip_id = $1 AND removed_from_plan=FALSE
	`, tripID).Scan(&notLoadedCount, &totalStops)
	if err != nil {
		return nil, fmt.Errorf("failed to count remaining stops: %w", err)
	}

	if notLoadedCount == 0 {
		// All stops completed
		allLogTitle := "All stops completed"
		allLogDesc := fmt.Sprintf("%d of %d stop checklists confirmed", totalStops, totalStops)
		var allLogExists bool
		_ = tx.QueryRow(ctx, `
			SELECT EXISTS(
				SELECT 1 FROM public.load_activity_log
				WHERE trip_id = $1 AND title = $2
			)
		`, tripID, allLogTitle).Scan(&allLogExists)
		if !allLogExists {
			_, _ = tx.Exec(ctx, `
				INSERT INTO public.load_activity_log (trip_id, event_type, title, description, icon_type, logged_at, created_by)
				SELECT $1, 'ALL_CONFIRMED', $2, $3, 'check', clock_timestamp(), u.id
				FROM (SELECT $4::UUID AS id) req
				LEFT JOIN auth.users u ON u.id = req.id
			`, tripID, allLogTitle, allLogDesc, loaderID)
		}

	}

	// Just increment confirmation version
	_, _ = tx.Exec(ctx, `
		UPDATE public.loading_confirmations
		SET version = version + 1, updated_at = NOW()
		WHERE trip_id = $1
	`, tripID)

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit confirm stop transaction: %w", err)
	}

	// Return updated stop
	stops, err := r.GetStopsWithProgressByTripID(ctx, tripID)
	if err != nil {
		return nil, err
	}
	for _, s := range stops {
		if s.StopID == stopID.String() {
			return &s, nil
		}
	}
	return nil, nil
}

// ShortfallParams contains inputs for creating a live shortfall (Task P6)
type ShortfallParams struct {
	TripID      uuid.UUID
	StopID      uuid.UUID
	ItemID      uuid.UUID
	QtyAffected int
	Reason      string
	Note        string
	PhotoURL    *string
	LoaderID    uuid.UUID
	// ReporterName is a display-name fallback (e.g. X-User-Email) used when the
	// loader has no user_profiles row.
	ReporterName string
}

// GetShortfallContext retrieves prefill metadata for shortfall reporting (Task P6)
func (r *LoaderRepository) GetShortfallContext(ctx context.Context, tripID, stopID uuid.UUID, reportedBy string) (*model.ShortfallContextResponse, error) {
	var (
		tripCode  string
		vehicleID string
		dock      string
		stopNo    int
	)
	err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE('WPT-' || substring(t.vehicle_id from 5), 'WPT-204'),
			t.vehicle_id,
			COALESCE(lc.dock, 'Dock A5'),
			s.stop_no
		FROM public.trips t
		LEFT JOIN public.loading_confirmations lc ON t.trip_id = lc.trip_id
		JOIN public.load_stops s ON s.trip_id = t.trip_id
		WHERE t.trip_id = $1 AND s.stop_id = $2
	`, tripID, stopID).Scan(&tripCode, &vehicleID, &dock, &stopNo)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound("Trip or stop not found")
		}
		return nil, fmt.Errorf("failed to query shortfall context: %w", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT item_id, name, sku, expected_qty, COALESCE(unit, 'units')
		FROM public.load_items
		WHERE stop_id = $1 AND trip_id = $2 AND status <> 'ISSUE'
		ORDER BY created_at ASC
	`, stopID, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query stop items: %w", err)
	}
	defer rows.Close()

	var items []model.ShortfallContextItem
	for rows.Next() {
		var (
			itemID      uuid.UUID
			name        string
			sku         string
			expectedQty int
			unit        string
		)
		if err := rows.Scan(&itemID, &name, &sku, &expectedQty, &unit); err != nil {
			return nil, fmt.Errorf("failed to scan item: %w", err)
		}
		items = append(items, model.ShortfallContextItem{
			ItemID:      itemID.String(),
			Name:        name,
			SKU:         sku,
			ExpectedQty: expectedQty,
			Unit:        unit,
		})
	}

	return &model.ShortfallContextResponse{
		Items: items,
		Context: model.ShortfallContextDTO{
			TripCode:   tripCode,
			VehicleID:  vehicleID,
			Dock:       dock,
			StopNo:     stopNo,
			ReportedBy: reportedBy,
		},
	}, nil
}

// CreateShortfall creates an issue flag, marks item as ISSUE, records activity log, and queues outbox event in ONE ACID transaction (Task P6)
func (r *LoaderRepository) CreateShortfall(ctx context.Context, p ShortfallParams) (*model.CreateShortfallResponse, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to begin shortfall transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// 1. Fetch item details
	var (
		itemName    string
		sku         string
		expectedQty int
		unit        string
		itemWeight  float64
		itemStatus  string
	)
	err = tx.QueryRow(ctx, `
		SELECT name, sku, expected_qty, COALESCE(unit, 'units'), weight_kg, status
		FROM public.load_items
		WHERE item_id = $1 AND stop_id = $2 AND trip_id = $3
	`, p.ItemID, p.StopID, p.TripID).Scan(&itemName, &sku, &expectedQty, &unit, &itemWeight, &itemStatus)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, model.ErrNotFound("Target item not found in stop")
		}
		return nil, fmt.Errorf("failed to query target item: %w", err)
	}

	if itemStatus == "ISSUE" {
		return nil, model.NewAppError(model.ErrCodeItemHasIssue, "A shortfall has already been filed for this item", http.StatusConflict)
	}

	if p.QtyAffected < 1 || p.QtyAffected > expectedQty {
		return nil, model.ErrBadRequest(fmt.Sprintf("qtyAffected must be between 1 and %d", expectedQty))
	}

	// Resolve reporter display name (user_profiles.full_name -> header fallback -> user id)
	reportedBy := p.ReporterName
	var profileName *string
	_ = tx.QueryRow(ctx, `SELECT full_name FROM public.user_profiles WHERE id = $1`, p.LoaderID).Scan(&profileName)
	if profileName != nil && *profileName != "" {
		reportedBy = *profileName
	}
	if reportedBy == "" {
		reportedBy = p.LoaderID.String()
	}

	// 2. Fetch trip & stop info for payload
	var (
		tripCode   string
		vehicleID  string
		stopNo     int
		outletName string
		capacityKg float64
		outletID   string
		driverID   string
	)
	err = tx.QueryRow(ctx, `
		SELECT
			COALESCE('WPT-' || substring(t.vehicle_id from 5), 'WPT-204'),
			t.vehicle_id,
			s.stop_no,
			s.outlet_name,
			COALESCE(v.weight_cap_kg, 5000)::FLOAT8,
			s.outlet_id,
			COALESCE(t.driver_id::text, '')
		FROM public.trips t
		LEFT JOIN public.vehicles v ON t.vehicle_id = v.vehicle_id
		JOIN public.load_stops s ON s.trip_id = t.trip_id
		WHERE t.trip_id = $1 AND s.stop_id = $2
	`, p.TripID, p.StopID).Scan(&tripCode, &vehicleID, &stopNo, &outletName, &capacityKg, &outletID, &driverID)
	if err != nil {
		return nil, fmt.Errorf("failed to query trip/stop details: %w", err)
	}

	// 3. Generate reference from sequence (e.g. SR-0482)
	var nextVal int64
	err = tx.QueryRow(ctx, `SELECT nextval('public.issue_flag_ref_seq')`).Scan(&nextVal)
	if err != nil {
		return nil, fmt.Errorf("failed to get next issue flag sequence: %w", err)
	}
	ref := fmt.Sprintf("SR-%04d", nextVal)

	// 4. Weight delta math: delta = item.weight_kg * (qtyAffected / expectedQty)
	weightDeltaKg := (itemWeight / float64(expectedQty)) * float64(p.QtyAffected)
	now := time.Now().UTC()

	// 5. Insert issue_flags
	var issueID uuid.UUID
	err = tx.QueryRow(ctx, `
		INSERT INTO public.issue_flags (
			trip_id, stop_id, item_id, ref, issue_type, qty_affected,
			reason, description, evidence_url, weight_delta_kg,
			dispatcher_notified_at, resolved, flagged_by
		) VALUES (
			$1, $2, $3, $4, 'SHORTAGE', $5,
			$6, $7, $8, $9,
			$10, FALSE, $11
		) RETURNING issue_id
	`, p.TripID, p.StopID, p.ItemID, ref, p.QtyAffected,
		p.Reason, p.Note, p.PhotoURL, -weightDeltaKg,
		now, p.LoaderID).Scan(&issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to insert issue flag: %w", err)
	}

	// 6. Mark item ISSUE with loaded_qty = expected - qtyAffected
	newLoadedQty := expectedQty - p.QtyAffected
	_, err = tx.Exec(ctx, `
		UPDATE public.load_items
		SET status = 'ISSUE', loaded_qty = $1, updated_at = NOW()
		WHERE item_id = $2
	`, newLoadedQty, p.ItemID)
	if err != nil {
		return nil, fmt.Errorf("failed to update item status to ISSUE: %w", err)
	}

	// 7. Write activity log: "Shortfall reported" ("Highland milk crates - 2 crates short-shipped")
	reasonClean := strings.ToLower(strings.ReplaceAll(p.Reason, "_", "-"))
	logDesc := fmt.Sprintf("%s - %d %s %s", itemName, p.QtyAffected, unit, reasonClean)
	_, _ = tx.Exec(ctx, `
		INSERT INTO public.load_activity_log (trip_id, event_type, title, description, icon_type, logged_at, created_by)
		SELECT $1, 'SHORTFALL_REPORTED', 'Shortfall reported', $2, 'alert', $3, u.id
		FROM (SELECT $4::UUID AS id) req
		LEFT JOIN auth.users u ON u.id = req.id
	`, p.TripID, logDesc, now, p.LoaderID)

	// 8. Insert into outbox_events

	outboxPayload := map[string]any{
		"shortfall_ref":  ref,
		"trip_id":        p.TripID.String(),
		"trip_code":      tripCode,
		"item_sku":       sku,
		"item_name":      itemName,
		"reason":         p.Reason,
		"reported_by_id": p.LoaderID.String(),
		"created_at":     now.Format(time.RFC3339),
		"outlet_id":      outletID,
		"driver_id":      driverID,
	}
	payloadBytes, err := json.Marshal(outboxPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal outbox event payload: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO public.outbox_events (aggregate_type, aggregate_id, event_type, payload, status)
		VALUES ('ISSUE_FLAG', $1, 'FLAG_RAISED', $2, 'PENDING')
	`, ref, payloadBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to insert outbox event: %w", err)
	}

	// 9. Calculate manifest impact
	var stopQtyTotal int
	_ = tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(expected_qty), 0)::INT
		FROM public.load_items
		WHERE stop_id = $1
	`, p.StopID).Scan(&stopQtyTotal)

	var tripLoadedKg float64
	_ = tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(weight_kg), 0)::FLOAT8
		FROM public.load_items
		WHERE trip_id = $1 AND status = 'CHECKED'
	`, p.TripID).Scan(&tripLoadedKg)

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("failed to commit shortfall transaction: %w", err)
	}

	return &model.CreateShortfallResponse{
		Ref:                ref,
		SentAt:             now,
		DispatcherNotified: true,
		AffectedItem: model.AffectedItemImpact{
			Name:     itemName,
			SKU:      sku,
			Expected: expectedQty,
			Loaded:   newLoadedQty,
			Delta:    -p.QtyAffected,
		},
		ChecklistUnlocked: true,
		ManifestImpact: model.ManifestImpact{
			StopQtyFrom:         stopQtyTotal,
			StopQtyTo:           stopQtyTotal - p.QtyAffected,
			ItemQtyFrom:         expectedQty,
			ItemQtyTo:           newLoadedQty,
			ItemUnit:            unit,
			WeightDeltaKg:       -weightDeltaKg,
			CapacityWithinLimit: tripLoadedKg <= capacityKg,
		},
	}, nil
}

// GetShortfallsByTrip retrieves all issue flags for a trip (Task P6)
func (r *LoaderRepository) GetShortfallsByTrip(ctx context.Context, tripID uuid.UUID) ([]model.ShortfallDetailDTO, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT
			issue_id, trip_id, order_id, stop_id, item_id, ref,
			COALESCE(issue_type, 'SHORTAGE'),
			COALESCE(qty_affected, 0),
			COALESCE(reason, 'SHORT_SHIPPED'),
			COALESCE(description, ''),
			evidence_url,
			COALESCE(weight_delta_kg, 0)::FLOAT8,
			COALESCE(dispatcher_notified_at, created_at),
			resolved,
			flagged_by
		FROM public.issue_flags
		WHERE trip_id = $1
		ORDER BY created_at DESC
	`, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query issue flags: %w", err)
	}

	defer rows.Close()

	var flags []model.ShortfallDetailDTO
	for rows.Next() {
		var (
			issueID    uuid.UUID
			trID       uuid.UUID
			orderID    *uuid.UUID
			stID       *uuid.UUID
			itID       *uuid.UUID
			ref        string
			issueType  string
			qty        int
			reason     string
			desc       string
			evidence   *string
			deltaKg    float64
			notifiedAt time.Time
			resolved   bool
			flaggedBy  uuid.UUID
		)
		err := rows.Scan(
			&issueID, &trID, &orderID, &stID, &itID, &ref, &issueType, &qty,
			&reason, &desc, &evidence, &deltaKg, &notifiedAt, &resolved, &flaggedBy,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan issue flag row: %w", err)
		}
		var orderIDStr, stIDStr, itIDStr *string
		if orderID != nil {
			s := orderID.String()
			orderIDStr = &s
		}
		if stID != nil {
			s := stID.String()
			stIDStr = &s
		}
		if itID != nil {
			i := itID.String()
			itIDStr = &i
		}
		flags = append(flags, model.ShortfallDetailDTO{
			IssueID:              issueID.String(),
			TripID:               trID.String(),
			OrderID:             orderIDStr,
			StopID:               stIDStr,
			ItemID:               itIDStr,
			Ref:                  ref,
			IssueType:            issueType,
			QtyAffected:          qty,
			Reason:               reason,
			Description:          desc,
			EvidenceURL:          evidence,
			WeightDeltaKg:        deltaKg,
			DispatcherNotifiedAt: notifiedAt,
			Resolved:             resolved,
			FlaggedBy:            flaggedBy.String(),
		})
	}
	return flags, rows.Err()
}

func (r *LoaderRepository) ResolveShortfall(ctx context.Context, issueID uuid.UUID, resolvedBy uuid.UUID, notes string) error {
	command, err := r.pool.Exec(ctx, `
		UPDATE public.issue_flags
		SET resolved = TRUE, resolved_by = $2, resolved_at = NOW(), resolution_notes = $3
		WHERE issue_id = $1 AND resolved = FALSE
	`, issueID, resolvedBy, notes)
	if err != nil {
		return fmt.Errorf("failed to resolve shortfall: %w", err)
	}
	if command.RowsAffected() == 0 {
		return model.ErrNotFound("Shortfall not found or already resolved")
	}
	return nil
}

// ResetDemoState restores trip WPT-204 AND every other demo trip (TRC-176, TRC-189, etc.) to initial demo state
func (r *LoaderRepository) ResetDemoState(ctx context.Context) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin demo reset transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	vTrip204 := "20400000-0000-0000-0000-000000000204"
	vLoaderID := "11111111-1111-1111-1111-111111111101"
	vItemMilk := "20441000-0000-0000-0000-000000000001"
	vStop4 := "20440000-0000-0000-0000-000000000004"

	// 1. Clear issue flags for WPT-204 and any live shortfall (ref >= SR-0482)
	if _, err := tx.Exec(ctx, `DELETE FROM public.issue_flags WHERE trip_id = $1 OR ref >= 'SR-0482'`, vTrip204); err != nil {
		return fmt.Errorf("failed to clear issue flags: %w", err)
	}

	// 2. Clear outbox events
	if _, err := tx.Exec(ctx, `DELETE FROM public.outbox_events`); err != nil {
		return fmt.Errorf("failed to clear outbox events: %w", err)
	}
	// Remove the allocation-consumer integration fixture if it was created in
	// this database, so reset-demo always returns exactly the canonical 12
	// Peliyagoda trips (plus the separately scoped Kandy trip).
	if _, err := tx.Exec(ctx, `DELETE FROM public.trips WHERE trip_id='44444444-4444-4444-4444-444444444404'`); err != nil {
		return fmt.Errorf("failed to clear non-demo allocation fixture: %w", err)
	}

	// 3. Clear plan changes for WPT-204
	if _, err := tx.Exec(ctx, `DELETE FROM public.plan_changes WHERE trip_id = $1`, vTrip204); err != nil {
		return fmt.Errorf("failed to delete plan changes: %w", err)
	}

	// 4. Reset loading confirmation for WPT-204
	if _, err := tx.Exec(ctx, `
		UPDATE public.loading_confirmations
		SET status = 'LOADING', ready_at = NULL, ready_by = NULL, version = 0, updated_at = NOW()
		WHERE trip_id = $1
	`, vTrip204); err != nil {
		return fmt.Errorf("failed to reset loading confirmation: %w", err)
	}

	// 5. Reset activity log for WPT-204: ONLY "Loading started" and "Stop 4 loading opened"
	if _, err := tx.Exec(ctx, `DELETE FROM public.load_activity_log WHERE trip_id = $1`, vTrip204); err != nil {
		return fmt.Errorf("failed to clear activity log: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		INSERT INTO public.load_activity_log (trip_id, event_type, title, description, icon_type, logged_at, created_by)
		VALUES
			($1, 'START', 'Loading started', 'TRC-204 assigned to Dock A5', 'play', ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date + TIME '07:30') AT TIME ZONE 'Asia/Colombo', $2),
			($1, 'STOP_OPENED', 'Stop 4 loading opened', 'Keells — Union Place · load order 1', 'package', ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date + TIME '08:12') AT TIME ZONE 'Asia/Colombo', $2)
	`, vTrip204, vLoaderID); err != nil {
		return fmt.Errorf("failed to reset activity log: %w", err)
	}

	// 6. Reset stops status for WPT-204
	if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET load_order=100000+load_order WHERE trip_id=$1`, vTrip204); err != nil {
		return fmt.Errorf("failed to stage WPT-204 loading sequence reset: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.load_stops
		SET load_order = 5 - stop_no, removed_from_plan = FALSE, change_flag = NULL, updated_at = NOW()
		WHERE trip_id = $1
	`, vTrip204); err != nil {
		return fmt.Errorf("failed to reset WPT-204 loading sequence: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET status = 'LOADING' WHERE stop_id = $1`, vStop4); err != nil {
		return fmt.Errorf("failed to update stop 4 status: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET status = 'LOADED' WHERE trip_id = $1 AND stop_id <> $2`, vTrip204, vStop4); err != nil {
		return fmt.Errorf("failed to update other stops status: %w", err)
	}

	// 7. Reset items: Stop 4 milk crates PENDING (24 crates, 384 kg), all other items CHECKED
	if _, err := tx.Exec(ctx, `
		UPDATE public.load_items
		SET status = 'PENDING', loaded_qty = 0, weight_kg = 384.00, expected_qty = 24, checked_at = NULL, checked_by = NULL, updated_at = NOW()
		WHERE item_id = $1
	`, vItemMilk); err != nil {
		return fmt.Errorf("failed to reset milk crates item: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE public.load_items
		SET status = 'CHECKED', loaded_qty = expected_qty, checked_at = NOW() - INTERVAL '30 minutes', checked_by = $2, updated_at = NOW()
		WHERE stop_id = $1 AND item_id <> $3
	`, vStop4, vLoaderID, vItemMilk); err != nil {
		return fmt.Errorf("failed to reset stop 4 items: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE public.load_items
		SET status = 'CHECKED', loaded_qty = expected_qty, checked_at = NOW() - INTERVAL '1 hour', checked_by = $2, updated_at = NOW()
		WHERE trip_id = $1 AND stop_id <> $3
	`, vTrip204, vLoaderID, vStop4); err != nil {
		return fmt.Errorf("failed to reset remaining items: %w", err)
	}

	// Restore item-level handling tags. Stop tags are separately derived from
	// the outlet brand and cold-chain/parking requirements.
	if _, err := tx.Exec(ctx, `
		UPDATE public.load_items i
		SET tags = CASE i.item_id
			WHEN '20441000-0000-0000-0000-000000000001' THEN ARRAY['Fresh','chilled']::TEXT[]
			WHEN '20441000-0000-0000-0000-000000000002' THEN ARRAY['Fresh','frozen']::TEXT[]
			WHEN '20441000-0000-0000-0000-000000000003' THEN ARRAY['Tech','fragile']::TEXT[]
			WHEN '20441000-0000-0000-0000-000000000004' THEN ARRAY['Style','ambient']::TEXT[]
			WHEN '20441000-0000-0000-0000-000000000005' THEN ARRAY['Fresh','chilled']::TEXT[]
			ELSE tags
		END,
		updated_at = NOW()
		FROM public.load_stops s
		WHERE i.stop_id=s.stop_id AND s.trip_id=$1
	`, vTrip204); err != nil {
		return fmt.Errorf("failed to reset WPT-204 item tags: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.outlets
		SET parking_constraint = CASE outlet_id
			WHEN 'OUT-FRESHMART-01' THEN 'van_only'
			WHEN 'OUT-STYLEHUB-01' THEN NULL
			ELSE parking_constraint
		END
		WHERE outlet_id IN ('OUT-FRESHMART-01','OUT-STYLEHUB-01')
	`); err != nil {
		return fmt.Errorf("failed to reset outlet parking constraints: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.outlets o SET brand=lower(x.brand)::public.order_brand
		FROM (
			SELECT s.outlet_id,CASE
				WHEN BOOL_OR('Fresh'=ANY(i.tags)) THEN 'Fresh'
				WHEN BOOL_OR('Style'=ANY(i.tags)) THEN 'Style'
				WHEN BOOL_OR('Tech'=ANY(i.tags)) THEN 'Tech'
				WHEN BOOL_OR('Appliance'=ANY(i.tags)) THEN 'Tech'
			END AS brand
			FROM public.load_stops s JOIN public.load_items i ON i.stop_id=s.stop_id
			GROUP BY s.outlet_id
		) x WHERE o.outlet_id=x.outlet_id AND x.brand IS NOT NULL
	`); err != nil {
		return fmt.Errorf("failed to restore seeded outlet brands: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.outlets SET brand=CASE outlet_id
			WHEN 'OUT-KEELLS-01' THEN 'fresh'::public.order_brand
			WHEN 'OUT-SINGER-01' THEN 'tech'::public.order_brand
			WHEN 'OUT-STYLEHUB-01' THEN 'style'::public.order_brand
			WHEN 'OUT-FRESHMART-01' THEN 'fresh'::public.order_brand
			ELSE brand END
		WHERE outlet_id IN ('OUT-KEELLS-01','OUT-SINGER-01','OUT-STYLEHUB-01','OUT-FRESHMART-01')
	`); err != nil {
		return fmt.Errorf("failed to reset outlet brands: %w", err)
	}

	// 8. Restore TRC-176: Stop 4 LOADED, Stop 3 LOADING, Stop 2 & 1 PENDING
	if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET status = 'LOADED' WHERE trip_id = '17600000-0000-0000-0000-000000000176' AND stop_no = 4`); err != nil {
		return fmt.Errorf("failed to restore TRC-176 stops: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET status = 'LOADING' WHERE trip_id = '17600000-0000-0000-0000-000000000176' AND stop_no = 3`); err != nil {
		return fmt.Errorf("failed to restore TRC-176 loading stop: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET status = 'PENDING' WHERE trip_id = '17600000-0000-0000-0000-000000000176' AND stop_no IN (1, 2)`); err != nil {
		return fmt.Errorf("failed to restore TRC-176 pending stops: %w", err)
	}
	if _, err := tx.Exec(ctx, `UPDATE public.loading_confirmations SET status = 'LOADING', ready_at = NULL, ready_by = NULL, version = 0 WHERE trip_id = '17600000-0000-0000-0000-000000000176'`); err != nil {
		return fmt.Errorf("failed to restore TRC-176 confirmation: %w", err)
	}

	// Keep every seeded stop internally coherent without relying on stored
	// counters: PENDING stops have only PENDING items; LOADED stops have no
	// unresolved checklist items (ISSUE remains a reviewed terminal state).
	if _, err := tx.Exec(ctx, `
		UPDATE public.load_items i
		SET status='PENDING', loaded_qty=0, checked_at=NULL, checked_by=NULL, updated_at=NOW()
		FROM public.load_stops s
		WHERE i.stop_id=s.stop_id AND s.status='PENDING' AND i.status<>'PENDING'
	`); err != nil {
		return fmt.Errorf("failed to normalize pending stop items: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.load_items i
		SET status='CHECKED', loaded_qty=expected_qty,
			checked_at=COALESCE(checked_at, NOW()), checked_by=COALESCE(checked_by, $1), updated_at=NOW()
		FROM public.load_stops s
		WHERE i.stop_id=s.stop_id AND s.status='LOADED' AND i.status NOT IN ('CHECKED','ISSUE')
	`, vLoaderID); err != nil {
		return fmt.Errorf("failed to normalize loaded stop items: %w", err)
	}

	// Restore every active demo trip to dispatcher delivery order reversed for loading.
	if _, err := tx.Exec(ctx, `UPDATE public.load_stops SET load_order=1000000+load_order`); err != nil {
		return fmt.Errorf("failed to stage demo loading-order reset: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		WITH counts AS (
			SELECT trip_id,COUNT(*)::INT AS stop_count FROM public.load_stops
			WHERE removed_from_plan=FALSE GROUP BY trip_id
		)
		UPDATE public.load_stops s SET load_order=c.stop_count-s.stop_no+1,updated_at=NOW()
		FROM counts c WHERE s.trip_id=c.trip_id AND s.removed_from_plan=FALSE
	`); err != nil {
		return fmt.Errorf("failed to restore reverse demo loading order: %w", err)
	}
	if _, err := tx.Exec(ctx, `
		UPDATE public.loading_confirmations SET version=0,updated_at=NOW()
		WHERE trip_id IN (
			'18900000-0000-0000-0000-000000000189',
			'19800000-0000-0000-0000-000000000198',
			'20400000-0000-0000-0000-000000000204',
			'21100000-0000-0000-0000-000000000211',
			'22000000-0000-0000-0000-000000000220',
			'30100000-0000-0000-0000-000000000301'
		)
	`); err != nil {
		return fmt.Errorf("failed to restore demo confirmation versions: %w", err)
	}

	// 9. Reapply the complete DB-owned loader demo fixture. This restores all
	// twelve Peliyagoda trips, the Kandy-independent scope, TRC-162 plan changes,
	// fixed Colombo clock times, and every derived item/stop state in one place.
	if _, err := tx.Exec(ctx, `SELECT public.seed_loader_demo_data()`); err != nil {
		return fmt.Errorf("failed to restore complete loader demo data: %w", err)
	}

	// 10. Reset sequence to 481 so next live shortfall generates SR-0482
	if _, err := tx.Exec(ctx, `SELECT setval('public.issue_flag_ref_seq', 481, true)`); err != nil {
		return fmt.Errorf("failed to reset sequence: %w", err)
	}

	return tx.Commit(ctx)
}
