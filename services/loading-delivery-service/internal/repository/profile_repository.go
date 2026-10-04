package repository

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"time"
)

type ProfileRepository struct{ pool *pgxpool.Pool }

func NewProfileRepository(pool *pgxpool.Pool) *ProfileRepository {
	return &ProfileRepository{pool: pool}
}
func (r *ProfileRepository) GetProfile(ctx context.Context, driverID uuid.UUID) (model.DriverProfileRecord, error) {
	var x model.DriverProfileRecord
	var vehicleID, vehicleType, depot *string
	err := r.pool.QueryRow(ctx, `SELECT p.id::text,p.full_name,COALESCE(p.driver_code,''),v.vehicle_id,v.type::text,v.depot,s.last_seen_at,s.last_synced_at,COALESCE(s.pending_actions_count,0) FROM public.user_profiles p LEFT JOIN LATERAL(SELECT vehicle_id,type,depot FROM public.vehicles WHERE driver_id=p.id AND is_active=TRUE ORDER BY vehicle_id LIMIT 1)v ON TRUE LEFT JOIN public.driver_sessions s ON s.driver_id=p.id WHERE p.id=$1 AND p.role='DRIVER'`, driverID).Scan(&x.Driver.ID, &x.Driver.Name, &x.Driver.DriverID, &vehicleID, &vehicleType, &depot, &x.LastSeenAt, &x.LastSyncedAt, &x.PendingActionsCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return x, model.ErrNotFound("Driver profile not found")
	}
	if err != nil {
		return x, err
	}
	x.Driver.RoleLabel = "Waypoint Driver"
	x.Vehicle.Status = "UNASSIGNED"
	if vehicleID != nil {
		x.Vehicle.ID = *vehicleID
		x.Vehicle.Type = *vehicleType
		x.Vehicle.Depot = *depot
		x.Vehicle.Status = "ASSIGNED"
	}
	return x, nil
}
func (r *ProfileRepository) Heartbeat(ctx context.Context, driverID uuid.UUID, server time.Time, pending int) error {
	var id uuid.UUID
	err := r.pool.QueryRow(ctx, `INSERT INTO public.driver_sessions(driver_id,last_seen_at,pending_actions_count,updated_at) VALUES($1,$2,$3,$2) ON CONFLICT(driver_id) DO UPDATE SET last_seen_at=EXCLUDED.last_seen_at,pending_actions_count=EXCLUDED.pending_actions_count,updated_at=EXCLUDED.updated_at WHERE driver_sessions.last_seen_at IS NULL OR driver_sessions.last_seen_at <= $2-INTERVAL '10 seconds' RETURNING driver_id`, driverID, server, pending).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.NewAppError("RATE_LIMITED", "Heartbeat rate limit exceeded", 429)
	}
	return err
}

func (r *ProfileRepository) Location(ctx context.Context, driverID uuid.UUID, request model.LocationUpdateRequest, recordedAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO public.driver_sessions(
			driver_id, last_seen_at, latitude, longitude, accuracy_meters, heading, speed_meters_per_sec, updated_at
		) VALUES($1,$2,$3,$4,$5,$6,$7,$2)
		ON CONFLICT(driver_id) DO UPDATE SET
			last_seen_at=EXCLUDED.last_seen_at,
			latitude=EXCLUDED.latitude,
			longitude=EXCLUDED.longitude,
			accuracy_meters=EXCLUDED.accuracy_meters,
			heading=EXCLUDED.heading,
			speed_meters_per_sec=EXCLUDED.speed_meters_per_sec,
			updated_at=EXCLUDED.updated_at
	`, driverID, recordedAt, request.Latitude, request.Longitude, request.AccuracyMeters, request.Heading, request.SpeedMetersPerSec)
	return err
}
func (r *ProfileRepository) History(ctx context.Context, driverID uuid.UUID, from, to time.Time, page, pageSize int) ([]model.HistoryTrip, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.trips WHERE driver_id=$1 AND delivery_date BETWEEN $2::date AND $3::date`, driverID, from.Format("2006-01-02"), to.Format("2006-01-02")).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `SELECT t.trip_id::text,t.delivery_date::text,t.trip_number,t.vehicle_id,
 COUNT(s.stop_id) FILTER(WHERE s.removed_from_plan=FALSE),
 COUNT(s.stop_id) FILTER(WHERE s.removed_from_plan=FALSE AND (s.delivery_status='DELIVERED' OR EXISTS(SELECT 1 FROM public.delivery_records d WHERE d.trip_id=t.trip_id AND d.outlet_id=s.outlet_id AND d.outcome='DELIVERED'))),
 COUNT(s.stop_id) FILTER(WHERE s.removed_from_plan=FALSE AND (s.delivery_status='NOT_DELIVERED' OR EXISTS(SELECT 1 FROM public.delivery_records d WHERE d.trip_id=t.trip_id AND d.outlet_id=s.outlet_id AND d.outcome IN ('ATTEMPTED','NOT_HOME','REFUSED')))),
 COUNT(s.stop_id) FILTER(WHERE s.removed_from_plan=FALSE AND (s.delivery_status='PARTIAL' OR EXISTS(SELECT 1 FROM public.delivery_records d WHERE d.trip_id=t.trip_id AND d.outlet_id=s.outlet_id AND d.outcome='PARTIAL'))),t.status::text
 FROM public.trips t LEFT JOIN public.load_stops s ON s.trip_id=t.trip_id WHERE t.driver_id=$1 AND t.delivery_date BETWEEN $2::date AND $3::date GROUP BY t.trip_id ORDER BY t.delivery_date DESC,t.trip_number DESC LIMIT $4 OFFSET $5`, driverID, from.Format("2006-01-02"), to.Format("2006-01-02"), pageSize, (page-1)*pageSize)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []model.HistoryTrip{}
	for rows.Next() {
		var x model.HistoryTrip
		if err := rows.Scan(&x.TripID, &x.Date, &x.TripNumber, &x.VehicleID, &x.TotalStops, &x.Delivered, &x.NotDelivered, &x.Partial, &x.Status); err != nil {
			return nil, 0, err
		}
		items = append(items, x)
	}
	return items, total, rows.Err()
}
