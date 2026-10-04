package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

type TripSummaryRepository struct{ pool *pgxpool.Pool }

func NewTripSummaryRepository(p *pgxpool.Pool) *TripSummaryRepository {
	return &TripSummaryRepository{pool: p}
}
func (r *TripSummaryRepository) trip(ctx context.Context, driver, trip uuid.UUID) (model.TripSummary, error) {
	var x model.TripSummary
	var owner uuid.UUID
	var status string
	err := r.pool.QueryRow(ctx, `SELECT trip_id::text,driver_id,trip_number,vehicle_id,delivery_date::text,status::text FROM public.trips WHERE trip_id=$1`, trip).Scan(&x.TripID, &owner, &x.TripNumber, &x.VehicleID, &x.Date, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return x, model.ErrNotFound("Trip not found")
	}
	if err != nil {
		return x, err
	}
	if owner != driver {
		return x, model.ErrForbidden("Trip belongs to another driver")
	}
	x.Status = "IN_PROGRESS"
	if status == "COMPLETED" {
		x.Status = "COMPLETED"
	}
	return x, nil
}
func (r *TripSummaryRepository) Summary(ctx context.Context, driver, trip uuid.UUID) (model.TripSummary, error) {
	x, err := r.trip(ctx, driver, trip)
	if err != nil {
		return x, err
	}
	err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FILTER(WHERE removed_from_plan=FALSE),COUNT(*) FILTER(WHERE removed_from_plan=FALSE AND delivery_status='DELIVERED'),COUNT(*) FILTER(WHERE removed_from_plan=FALSE AND delivery_status='NOT_DELIVERED'),COUNT(*) FILTER(WHERE removed_from_plan=FALSE AND delivery_status='PARTIAL') FROM public.load_stops WHERE trip_id=$1`, trip).Scan(&x.TotalStops, &x.Delivered, &x.NotDelivered, &x.Partial)
	if err != nil {
		return x, err
	}
	var total int
	x.Outcomes, total, err = r.Outcomes(ctx, driver, trip, 1, 4)
	if err != nil {
		return x, err
	}
	x.MoreOutcomesCount = total - len(x.Outcomes)
	if x.MoreOutcomesCount < 0 {
		x.MoreOutcomesCount = 0
	}
	x.AttentionRecords, err = r.attention(ctx, trip)
	return x, err
}
func (r *TripSummaryRepository) Outcomes(ctx context.Context, driver, trip uuid.UUID, page, size int) ([]model.TripOutcome, int, error) {
	if _, err := r.trip(ctx, driver, trip); err != nil {
		return nil, 0, err
	}
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.load_stops WHERE trip_id=$1 AND removed_from_plan=FALSE AND delivery_status IN ('DELIVERED','PARTIAL','NOT_DELIVERED')`, trip).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `SELECT s.stop_id::text,s.stop_no,s.outlet_id,s.outlet_name,s.delivery_status,COALESCE(d.departed_at,s.cant_deliver_reported_at,s.updated_at) FROM public.load_stops s LEFT JOIN LATERAL(SELECT departed_at FROM public.delivery_records WHERE stop_id=s.stop_id ORDER BY created_at DESC LIMIT 1)d ON TRUE WHERE s.trip_id=$1 AND s.removed_from_plan=FALSE AND s.delivery_status IN ('DELIVERED','PARTIAL','NOT_DELIVERED') ORDER BY s.stop_no LIMIT $2 OFFSET $3`, trip, size, (page-1)*size)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []model.TripOutcome{}
	for rows.Next() {
		var x model.TripOutcome
		if err = rows.Scan(&x.StopID, &x.Seq, &x.OutletID, &x.OutletName, &x.Outcome, &x.CompletedAt); err != nil {
			return nil, 0, err
		}
		out = append(out, x)
	}
	return out, total, rows.Err()
}
func (r *TripSummaryRepository) attention(ctx context.Context, trip uuid.UUID) ([]model.AttentionRecord, error) {
	out := []model.AttentionRecord{}
	rows, err := r.pool.Query(ctx, `SELECT d.reason,s.outlet_id,s.outlet_name,COALESCE(NULLIF(d.note,''),replace(d.reason,'_',' ')),EXISTS(SELECT 1 FROM public.outbox_events e WHERE e.event_type='FLAG_RAISED' AND e.status='PUBLISHED' AND (e.payload->>'stop_id')::uuid=s.stop_id) FROM public.deferral_records d JOIN public.load_stops s ON s.stop_id=d.stop_id WHERE d.trip_id=$1 AND s.removed_from_plan=FALSE ORDER BY s.stop_no`, trip)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var x model.AttentionRecord
		if err = rows.Scan(&x.Type, &x.OutletID, &x.OutletName, &x.Detail, &x.Sent); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, x)
	}
	rows.Close()
	rows, err = r.pool.Query(ctx, `SELECT CASE WHEN sf.type='damage' THEN 'damage' ELSE 'shortfall' END,s.outlet_id,s.outlet_name,li.name||CASE WHEN sf.type='damage' THEN ' damaged ' ELSE ' short ' END||sf.qty::text,EXISTS(SELECT 1 FROM public.outbox_events e WHERE e.event_type='DELIVERY_COMPLETED' AND e.status='PUBLISHED' AND e.payload->>'destination'=s.outlet_id) FROM public.delivery_shortfalls sf JOIN public.delivery_records d ON d.delivery_id=sf.delivery_id JOIN public.load_stops s ON s.stop_id=d.stop_id JOIN public.load_items li ON li.item_id=sf.item_id WHERE d.trip_id=$1 AND s.removed_from_plan=FALSE ORDER BY s.stop_no`, trip)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var x model.AttentionRecord
		if err = rows.Scan(&x.Type, &x.OutletID, &x.OutletName, &x.Detail, &x.Sent); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, x)
	}
	rows.Close()
	rows, err = r.pool.Query(ctx, `SELECT c.outlet_id,s.outlet_name,c.payload FROM public.sync_conflict_records c JOIN public.load_stops s ON s.stop_id=c.stop_id WHERE c.trip_id=$1 AND c.status='CONFLICT_REVIEW' AND s.removed_from_plan=TRUE ORDER BY c.recorded_at`, trip)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var outlet, name string
		var ignored []byte
		if err = rows.Scan(&outlet, &name, &ignored); err != nil {
			rows.Close()
			return nil, err
		}
		out = append(out, model.AttentionRecord{Type: "conflict_review", OutletID: outlet, OutletName: name, Detail: "Delivered offline, removed by dispatcher - pending review", Sent: false})
	}
	return out, rows.Err()
}
func (r *TripSummaryRepository) Complete(ctx context.Context, driver, trip uuid.UUID, at time.Time) (model.TripSummary, error) {
	if _, err := r.trip(ctx, driver, trip); err != nil {
		return model.TripSummary{}, err
	}
	var ready bool
	if err := r.pool.QueryRow(ctx, `SELECT public.complete_trip_if_ready($1,$2)`, trip, at).Scan(&ready); err != nil {
		return model.TripSummary{}, err
	}
	if !ready {
		return model.TripSummary{}, model.NewAppError(model.ErrCodeConflict, "Trip has unfinished stops", 409)
	}
	return r.Summary(ctx, driver, trip)
}
func shortfallDetail(name, kind string, qty int) string {
	word := "short"
	if strings.EqualFold(kind, "damage") {
		word = "damaged"
	}
	return fmt.Sprintf("%s %s %d", name, word, qty)
}
