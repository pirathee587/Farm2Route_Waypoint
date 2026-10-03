package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

type AllocationRepository struct{ pool *pgxpool.Pool }

func NewAllocationRepository(pool *pgxpool.Pool) *AllocationRepository {
	return &AllocationRepository{pool: pool}
}

type planChangeDetails struct {
	UpdatedBy string                   `json:"updatedBy"`
	Previous  []model.PlanStopSnapshot `json:"previous"`
	Updated   []model.PlanStopSnapshot `json:"updated"`
}

func (r *AllocationRepository) ApplyAllocation(ctx context.Context, event model.AllocationCompletedEvent) error {
	if event.Revision < 1 || len(event.Trips) == 0 {
		return fmt.Errorf("allocation event requires revision >= 1 and at least one trip")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, trip := range event.Trips {
		if err := r.applyTrip(ctx, tx, event, trip); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *AllocationRepository) applyTrip(ctx context.Context, tx pgx.Tx, event model.AllocationCompletedEvent, trip model.AllocationTrip) error {
	tripID, err := uuid.Parse(trip.TripID)
	if err != nil {
		return fmt.Errorf("invalid trip_id %q: %w", trip.TripID, err)
	}
	if trip.VehicleID == "" || len(trip.Stops) == 0 {
		return fmt.Errorf("trip %s requires vehicle_id and stops", trip.TripID)
	}

	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.trips WHERE trip_id=$1)`, tripID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("trip %s must be persisted by planning-service before publication", trip.TripID)
	}

	var receipt bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.allocation_event_receipts WHERE trip_id=$1 AND plan_revision=$2)`, tripID, event.Revision).Scan(&receipt); err != nil {
		return err
	}
	if receipt {
		return nil
	}

	var currentRevision int
	err = tx.QueryRow(ctx, `SELECT plan_revision FROM public.loading_confirmations WHERE trip_id=$1 FOR UPDATE`, tripID).Scan(&currentRevision)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if errors.Is(err, pgx.ErrNoRows) {
		currentRevision = 0
	}
	if currentRevision > 0 && event.Revision <= currentRevision {
		_, err = tx.Exec(ctx, `INSERT INTO public.allocation_event_receipts(trip_id,plan_revision) VALUES($1,$2) ON CONFLICT DO NOTHING`, tripID, event.Revision)
		return err
	}

	previous, err := loadPlanSnapshots(ctx, tx, tripID)
	if err != nil {
		return err
	}
	updated, err := normalizeStops(tripID, trip.Stops)
	if err != nil {
		return err
	}
	for i := range updated {
		for _, old := range previous {
			if old.OutletID == updated[i].OutletID {
				updated[i].StopID = old.StopID
				break
			}
		}
	}
	classifyChanges(previous, updated)

	if currentRevision == 0 {
		_, err = tx.Exec(ctx, `INSERT INTO public.loading_confirmations(trip_id,loader_id,status,dock,plan_revision) VALUES($1,NULL,'PENDING',$2,$3)`, tripID, nullIfEmpty(trip.Dock), event.Revision)
	} else if event.Revision > currentRevision {
		_, err = tx.Exec(ctx, `UPDATE public.loading_confirmations SET plan_revision=$2,dock=COALESCE(NULLIF($3,''),dock),version=version+1,updated_at=NOW() WHERE trip_id=$1`, tripID, event.Revision, trip.Dock)
	}
	if err != nil {
		return fmt.Errorf("upsert loading confirmation: %w", err)
	}

	if event.Revision > currentRevision && currentRevision > 0 {
		details, _ := json.Marshal(planChangeDetails{UpdatedBy: event.UpdatedBy, Previous: previous, Updated: updated})
		_, err = tx.Exec(ctx, `INSERT INTO public.plan_changes(trip_id,revision,summary,details,acknowledged) VALUES($1,$2,$3,$4,FALSE) ON CONFLICT(trip_id,revision) DO NOTHING`, tripID, event.Revision, summarizeChanges(updated), details)
		if err != nil {
			return fmt.Errorf("insert plan change: %w", err)
		}
	}

	// Move every historical and active sequence out of the target range first.
	// Staging only active rows can collide with a stop removed by an earlier revision.
	if _, err = tx.Exec(ctx, `UPDATE public.load_stops SET removed_from_plan=TRUE,stop_no=1000000+stop_no,load_order=1000000+load_order,updated_at=NOW() WHERE trip_id=$1`, tripID); err != nil {
		return err
	}

	existingByOutlet := map[string]uuid.UUID{}
	rows, err := tx.Query(ctx, `SELECT outlet_id,stop_id FROM public.load_stops WHERE trip_id=$1`, tripID)
	if err != nil {
		return err
	}
	for rows.Next() {
		var outlet string
		var id uuid.UUID
		if err := rows.Scan(&outlet, &id); err != nil {
			rows.Close()
			return err
		}
		existingByOutlet[outlet] = id
	}
	rows.Close()

	for i, stop := range trip.Stops {
		stopID := updated[i].StopID
		parsedStopID, _ := uuid.Parse(stopID)
		if old, ok := existingByOutlet[stop.OutletID]; ok {
			parsedStopID = old
			updated[i].StopID = old.String()
		}
		units, weight := stopTotals(stop)
		_, err = tx.Exec(ctx, `
			INSERT INTO public.load_stops(stop_id,trip_id,stop_no,load_order,outlet_id,outlet_name,district,bay_info,status,tag,total_units,total_weight_kg,removed_from_plan)
			VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',$9,$10,$11,FALSE)
			ON CONFLICT(stop_id) DO UPDATE SET stop_no=EXCLUDED.stop_no,load_order=EXCLUDED.load_order,outlet_id=EXCLUDED.outlet_id,outlet_name=EXCLUDED.outlet_name,district=EXCLUDED.district,bay_info=EXCLUDED.bay_info,tag=EXCLUDED.tag,total_units=EXCLUDED.total_units,total_weight_kg=EXCLUDED.total_weight_kg,removed_from_plan=FALSE,updated_at=NOW()
		`, parsedStopID, tripID, stop.Sequence, len(trip.Stops)-stop.Sequence+1, stop.OutletID, stop.Outlet, nullIfEmpty(stop.District), nullIfEmpty(stop.BayInfo), nullIfEmpty(stop.Tag), units, weight)
		if err != nil {
			return fmt.Errorf("upsert stop %s: %w", stop.OutletID, err)
		}

		for _, order := range stop.Orders {
			orderID, err := uuid.Parse(order.OrderID)
			if err != nil {
				return fmt.Errorf("invalid order_id %q: %w", order.OrderID, err)
			}
			for _, item := range order.Items {
				itemID := stableUUID(tripID, order.OrderID+":"+item.SKU)
				if item.ItemID != "" {
					itemID, err = uuid.Parse(item.ItemID)
					if err != nil {
						return fmt.Errorf("invalid item_id %q: %w", item.ItemID, err)
					}
				}
				unit := item.Unit
				if unit == "" {
					unit = "units"
				}
				_, err = tx.Exec(ctx, `
					INSERT INTO public.load_items(item_id,stop_id,trip_id,order_id,sku,name,expected_qty,loaded_qty,unit,weight_kg,tags,status)
					VALUES($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10,'PENDING')
					ON CONFLICT(item_id) DO UPDATE SET stop_id=EXCLUDED.stop_id,order_id=EXCLUDED.order_id,sku=EXCLUDED.sku,name=EXCLUDED.name,expected_qty=EXCLUDED.expected_qty,unit=EXCLUDED.unit,weight_kg=EXCLUDED.weight_kg,tags=EXCLUDED.tags,updated_at=NOW()
				`, itemID, parsedStopID, tripID, orderID, item.SKU, item.Name, item.ExpectedQty, unit, item.WeightKg, item.Tags)
				if err != nil {
					return fmt.Errorf("upsert item %s: %w", item.SKU, err)
				}
			}
		}
	}

	_, err = tx.Exec(ctx, `INSERT INTO public.allocation_event_receipts(trip_id,plan_revision) VALUES($1,$2) ON CONFLICT DO NOTHING`, tripID, event.Revision)
	return err
}

func loadPlanSnapshots(ctx context.Context, tx pgx.Tx, tripID uuid.UUID) ([]model.PlanStopSnapshot, error) {
	rows, err := tx.Query(ctx, `SELECT stop_id,outlet_id,outlet_name,stop_no,load_order FROM public.load_stops WHERE trip_id=$1 AND removed_from_plan=FALSE ORDER BY stop_no`, tripID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []model.PlanStopSnapshot{}
	for rows.Next() {
		var s model.PlanStopSnapshot
		if err := rows.Scan(&s.StopID, &s.OutletID, &s.Outlet, &s.Sequence, &s.LoadOrder); err != nil {
			return nil, err
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func normalizeStops(tripID uuid.UUID, stops []model.AllocationStop) ([]model.PlanStopSnapshot, error) {
	seen := map[int]bool{}
	result := make([]model.PlanStopSnapshot, len(stops))
	for i, stop := range stops {
		if stop.Sequence < 1 || stop.Sequence > len(stops) || seen[stop.Sequence] || stop.OutletID == "" || stop.Outlet == "" {
			return nil, fmt.Errorf("trip %s has invalid/duplicate stop sequence or outlet", tripID)
		}
		seen[stop.Sequence] = true
		id := stableUUID(tripID, stop.OutletID).String()
		if stop.StopID != "" {
			parsed, err := uuid.Parse(stop.StopID)
			if err != nil {
				return nil, fmt.Errorf("invalid stop_id %q: %w", stop.StopID, err)
			}
			id = parsed.String()
		}
		result[i] = model.PlanStopSnapshot{StopID: id, OutletID: stop.OutletID, Outlet: stop.Outlet, Sequence: stop.Sequence, LoadOrder: len(stops) - stop.Sequence + 1}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].Sequence < result[j].Sequence })
	return result, nil
}

func classifyChanges(previous, updated []model.PlanStopSnapshot) {
	old := map[string]int{}
	next := map[string]bool{}
	for _, s := range previous {
		old[s.OutletID] = s.Sequence
	}
	for i := range updated {
		next[updated[i].OutletID] = true
		if seq, ok := old[updated[i].OutletID]; !ok {
			updated[i].Change = "NEW"
		} else if seq != updated[i].Sequence {
			updated[i].Change = "REORDERED"
		}
	}
	for i := range previous {
		if !next[previous[i].OutletID] {
			previous[i].Change = "REMOVED"
		}
	}
}

func summarizeChanges(updated []model.PlanStopSnapshot) string {
	counts := map[string]int{}
	for _, s := range updated {
		if s.Change != "" {
			counts[s.Change]++
		}
	}
	parts := []string{}
	for _, k := range []string{"REORDERED", "NEW"} {
		if counts[k] > 0 {
			parts = append(parts, fmt.Sprintf("%d %s", counts[k], strings.ToLower(k)))
		}
	}
	if len(parts) == 0 {
		return "Plan updated"
	}
	return "Plan updated — " + strings.Join(parts, ", ")
}

func stopTotals(stop model.AllocationStop) (int, float64) {
	units := 0
	weight := 0.0
	for _, o := range stop.Orders {
		for _, i := range o.Items {
			units += i.ExpectedQty
			weight += i.WeightKg
		}
	}
	return units, weight
}
func stableUUID(namespace uuid.UUID, value string) uuid.UUID {
	return uuid.NewSHA1(namespace, []byte(value))
}
func nullIfEmpty(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func (r *AllocationRepository) GetLatestPlanChange(ctx context.Context, tripID uuid.UUID) (*model.PlanChangeResponse, error) {
	var revision int
	var created time.Time
	var acknowledged bool
	var raw []byte
	err := r.pool.QueryRow(ctx, `SELECT revision,created_at,acknowledged,details FROM public.plan_changes WHERE trip_id=$1 ORDER BY revision DESC LIMIT 1`, tripID).Scan(&revision, &created, &acknowledged, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, model.ErrNotFound("No plan changes found for trip")
	}
	if err != nil {
		return nil, err
	}
	var d planChangeDetails
	if err := json.Unmarshal(raw, &d); err != nil {
		return nil, err
	}
	if d.Previous == nil {
		d.Previous = []model.PlanStopSnapshot{}
	}
	if d.Updated == nil {
		d.Updated = []model.PlanStopSnapshot{}
	}
	return &model.PlanChangeResponse{Revision: revision, UpdatedAt: created, UpdatedBy: d.UpdatedBy, Previous: d.Previous, Updated: d.Updated, Acknowledged: acknowledged}, nil
}

func (r *AllocationRepository) AcknowledgePlanChange(ctx context.Context, tripID uuid.UUID, revision int, userID uuid.UUID) (*model.PlanChangeResponse, error) {
	result, err := r.pool.Exec(ctx, `UPDATE public.plan_changes SET acknowledged=TRUE,acknowledged_at=COALESCE(acknowledged_at,NOW()),acknowledged_by=COALESCE(acknowledged_by,$3) WHERE trip_id=$1 AND revision=$2`, tripID, revision, userID)
	if err != nil {
		return nil, err
	}
	if result.RowsAffected() == 0 {
		return nil, model.ErrNotFound("Plan change revision not found")
	}
	return r.GetLatestPlanChange(ctx, tripID)
}
