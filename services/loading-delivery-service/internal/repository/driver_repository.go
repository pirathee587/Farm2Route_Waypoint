package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

var ErrDriverTripForbidden = errors.New("trip does not belong to driver")

type DriverRepository struct{ pool *pgxpool.Pool }

func NewDriverRepository(pool *pgxpool.Pool) *DriverRepository { return &DriverRepository{pool: pool} }

func (r *DriverRepository) GetDriverVehicle(ctx context.Context, driverID uuid.UUID) (model.DriverSummary, model.DriverVehicle, error) {
	var d model.DriverSummary
	var v model.DriverVehicle
	err := r.pool.QueryRow(ctx, `
		SELECT p.id::text, p.full_name, v.vehicle_id, v.type::text, v.depot
		FROM public.user_profiles p
		JOIN LATERAL (
			SELECT candidate.vehicle_id FROM (
				SELECT t.vehicle_id, 0 AS priority, t.delivery_date
				FROM public.trips t WHERE t.driver_id=p.id AND (t.delivery_date=CURRENT_DATE OR t.status::text NOT IN ('COMPLETED','CANCELLED'))
				UNION ALL
				SELECT owned.vehicle_id, 1 AS priority, CURRENT_DATE
				FROM public.vehicles owned WHERE owned.driver_id=p.id AND owned.is_active=TRUE
			) candidate ORDER BY candidate.priority, candidate.delivery_date DESC LIMIT 1
		) assigned ON TRUE
		JOIN public.vehicles v ON v.vehicle_id=assigned.vehicle_id AND v.is_active=TRUE
		WHERE p.id=$1 AND p.role='DRIVER' AND p.is_active=TRUE`, driverID).Scan(&d.ID, &d.Name, &v.ID, &v.Type, &v.Depot)
	if errors.Is(err, pgx.ErrNoRows) {
		return d, v, model.ErrNotFound("No active vehicle assigned to driver")
	}
	if err != nil {
		return d, v, fmt.Errorf("get driver vehicle: %w", err)
	}
	return d, v, nil
}

func (r *DriverRepository) GetTrips(ctx context.Context, driverID uuid.UUID, vehicleID string, date time.Time) ([]model.DriverTripRecord, error) {
	rows, err := r.pool.Query(ctx, `SELECT trip_id::text, trip_number, status::text, ready_at FROM public.trips
		WHERE driver_id=$1
		  AND (delivery_date=$2::date OR (ready_at IS NOT NULL AND status::text NOT IN ('COMPLETED','CANCELLED')))
		  AND trip_number IS NOT NULL ORDER BY delivery_date,trip_number`, driverID, date.Format("2006-01-02"))
	if err != nil {
		return nil, fmt.Errorf("get driver trips: %w", err)
	}
	defer rows.Close()
	result := []model.DriverTripRecord{}
	for rows.Next() {
		var x model.DriverTripRecord
		if err := rows.Scan(&x.ID, &x.TripNumber, &x.Status, &x.ReadyAt); err != nil {
			return nil, err
		}
		result = append(result, x)
	}
	return result, rows.Err()
}

func (r *DriverRepository) GetTrip(ctx context.Context, driverID, tripID uuid.UUID) (model.DriverTripRecord, error) {
	var x model.DriverTripRecord
	err := r.pool.QueryRow(ctx, `SELECT trip_id::text, trip_number, status::text, ready_at FROM public.trips WHERE trip_id=$1 AND driver_id=$2`, tripID, driverID).Scan(&x.ID, &x.TripNumber, &x.Status, &x.ReadyAt)
	if errors.Is(err, pgx.ErrNoRows) {
		var exists bool
		if e := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.trips WHERE trip_id=$1)`, tripID).Scan(&exists); e != nil {
			return x, e
		}
		if exists {
			return x, ErrDriverTripForbidden
		}
		return x, model.ErrNotFound("Trip not found")
	}
	return x, err
}

func (r *DriverRepository) StartTrip(ctx context.Context, driverID, tripID, operationID uuid.UUID, at time.Time) (model.TripStartResponse, error) {
	var out model.TripStartResponse
	err := r.pool.QueryRow(ctx, `UPDATE public.trips SET started_at=COALESCE(started_at,$3),departed_at=COALESCE(departed_at,$3),status='IN_PROGRESS',updated_at=$3 WHERE trip_id=$1 AND driver_id=$2 AND ready_at IS NOT NULL RETURNING trip_id::text,status::text,started_at`, tripID, driverID, at).Scan(&out.TripID,&out.Status,&out.StartedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		var owner *uuid.UUID; var ready *time.Time
		if e:=r.pool.QueryRow(ctx,`SELECT driver_id,ready_at FROM public.trips WHERE trip_id=$1`,tripID).Scan(&owner,&ready); errors.Is(e,pgx.ErrNoRows) { return out, model.ErrNotFound("Trip not found") } else if e!=nil{return out,e}
		if owner==nil || *owner!=driverID{return out,ErrDriverTripForbidden}
		return out, model.NewAppError(model.ErrCodeConflict,"Trip is not ready to start",409)
	}
	_ = operationID
	return out, err
}

func (r *DriverRepository) GetStops(ctx context.Context, tripID uuid.UUID) ([]model.DriverStopRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT ls.stop_id::text,ls.stop_no, ls.outlet_id, ls.outlet_name, COALESCE(ls.district,o.district,''),
		       to_char(COALESCE(MIN(ord.window_open), TIME '00:00'),'HH24:MI'), to_char(COALESCE(MAX(ord.window_close), TIME '00:00'),'HH24:MI'),
		       ls.removed_from_plan, COALESCE((ARRAY_AGG(dr.outcome::text ORDER BY dr.created_at DESC) FILTER (WHERE dr.delivery_id IS NOT NULL))[1], ''),COALESCE(ls.arrival_status,''),COALESCE(ls.delivery_status,'')
		FROM public.load_stops ls
		JOIN public.outlets o ON o.outlet_id=ls.outlet_id
		LEFT JOIN public.allocations a ON a.trip_id=ls.trip_id AND a.status='ALLOCATED'
		LEFT JOIN public.orders ord ON ord.order_id=a.order_id AND ord.outlet_id=ls.outlet_id
		LEFT JOIN public.delivery_records dr ON dr.trip_id=ls.trip_id AND dr.outlet_id=ls.outlet_id
		WHERE ls.trip_id=$1
		GROUP BY ls.stop_id,o.district ORDER BY ls.stop_no`, tripID)
	if err != nil {
		return nil, fmt.Errorf("get trip stops: %w", err)
	}
	defer rows.Close()
	result := []model.DriverStopRecord{}
	for rows.Next() {
		var x model.DriverStopRecord
		if err := rows.Scan(&x.StopID, &x.Seq, &x.OutletID, &x.OutletName, &x.District, &x.WindowOpen, &x.WindowClose, &x.Removed, &x.Outcome, &x.ArrivalStatus, &x.DeliveryStatus); err != nil {
			return nil, err
		}
		result = append(result, x)
	}
	return result, rows.Err()
}

func (r *DriverRepository) GetDispatcherContact(ctx context.Context, driverID uuid.UUID) (model.DispatcherContact, error) {
	var c model.DispatcherContact
	err := r.pool.QueryRow(ctx, `SELECT d.full_name,COALESCE(d.phone,'') FROM public.user_profiles d JOIN public.user_profiles p ON p.id=$1 WHERE d.role='DISPATCHER' AND d.is_active=TRUE AND (d.depot=p.depot OR d.depot IS NULL) ORDER BY (d.depot=p.depot) DESC,d.full_name LIMIT 1`, driverID).Scan(&c.Name, &c.Phone)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, model.ErrNotFound("Dispatcher contact not found")
	}
	return c, err
}

func (r *DriverRepository) GetStopDetail(ctx context.Context, driverID, stopID uuid.UUID) (model.DriverStopDetailRecord, error) {
	var x model.DriverStopDetailRecord
	err := r.pool.QueryRow(ctx, `
		SELECT ls.stop_id,ls.trip_id,ls.stop_no,ls.outlet_id,ls.outlet_name,COALESCE(ls.district,o.district,''),
		       COALESCE((SELECT to_char(MIN(ord.window_open),'HH24:MI') FROM public.allocations a JOIN public.orders ord ON ord.order_id=a.order_id WHERE a.trip_id=ls.trip_id AND ord.outlet_id=ls.outlet_id AND a.status='ALLOCATED'),'00:00'),
		       COALESCE((SELECT to_char(MAX(ord.window_close),'HH24:MI') FROM public.allocations a JOIN public.orders ord ON ord.order_id=a.order_id WHERE a.trip_id=ls.trip_id AND ord.outlet_id=ls.outlet_id AND a.status='ALLOCATED'),'00:00'),
		       COALESCE(o.parking_constraint::text,''),COALESCE(o.dock_type::text,''),COALESCE(o.mall_window,''),COALESCE(ls.bay_info,''),ls.removed_from_plan,COALESCE(ls.arrival_status,''),COALESCE(ls.delivery_status,''),
		       COALESCE((SELECT dr.outcome::text FROM public.delivery_records dr WHERE dr.trip_id=ls.trip_id AND dr.outlet_id=ls.outlet_id ORDER BY dr.created_at DESC LIMIT 1),''),
		       NOT ls.removed_from_plan AND NOT EXISTS (
		         SELECT 1 FROM public.load_stops prior
		         WHERE prior.trip_id=ls.trip_id AND prior.removed_from_plan=FALSE AND prior.stop_no<ls.stop_no AND COALESCE(prior.delivery_status,'')<>'NOT_DELIVERED'
		           AND NOT EXISTS (SELECT 1 FROM public.delivery_records done WHERE done.trip_id=prior.trip_id AND done.outlet_id=prior.outlet_id AND done.outcome::text IN ('DELIVERED','PARTIAL','ATTEMPTED','NOT_HOME','REFUSED'))
		       ) AND COALESCE(ls.delivery_status,'')<>'NOT_DELIVERED' AND NOT EXISTS (SELECT 1 FROM public.delivery_records self_done WHERE self_done.trip_id=ls.trip_id AND self_done.outlet_id=ls.outlet_id AND self_done.outcome::text IN ('DELIVERED','PARTIAL','ATTEMPTED','NOT_HOME','REFUSED'))
		FROM public.load_stops ls
		JOIN public.trips t ON t.trip_id=ls.trip_id
		JOIN public.outlets o ON o.outlet_id=ls.outlet_id
		WHERE ls.stop_id=$1 AND t.driver_id=$2`, stopID, driverID).Scan(
		&x.StopID, &x.TripID, &x.StopNo, &x.OutletID, &x.OutletName, &x.District, &x.WindowOpen, &x.WindowClose,
		&x.ParkingConstraint, &x.DockType, &x.MallWindow, &x.BayInfo, &x.Removed, &x.ArrivalStatus, &x.DeliveryStatus, &x.Outcome, &x.CanArrive)
	if errors.Is(err, pgx.ErrNoRows) {
		var exists bool
		if e := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.load_stops WHERE stop_id=$1)`, stopID).Scan(&exists); e != nil {
			return x, e
		}
		if exists {
			return x, ErrDriverTripForbidden
		}
		return x, model.ErrNotFound("Stop not found")
	}
	if err != nil {
		return x, fmt.Errorf("get stop detail: %w", err)
	}
	return x, nil
}

func (r *DriverRepository) GetStopItems(ctx context.Context, stopID uuid.UUID) ([]model.StopItem, error) {
	rows, err := r.pool.Query(ctx, `SELECT li.name,li.expected_qty,li.weight_kg::float8,lower(COALESCE(ord.temp_requirement::text,'AMBIENT')) FROM public.load_items li LEFT JOIN public.orders ord ON ord.order_id=li.order_id WHERE li.stop_id=$1 ORDER BY li.name`, stopID)
	if err != nil {
		return nil, fmt.Errorf("get stop items: %w", err)
	}
	defer rows.Close()
	items := []model.StopItem{}
	for rows.Next() {
		var x model.StopItem
		if err := rows.Scan(&x.Name, &x.Units, &x.WeightKg, &x.TempRequirement); err != nil {
			return nil, err
		}
		items = append(items, x)
	}
	return items, rows.Err()
}

func (r *DriverRepository) GetPreviousSkip(ctx context.Context, tripID uuid.UUID, outletID string) (*model.PreviousSkip, error) {
	var x model.PreviousSkip
	err := r.pool.QueryRow(ctx, `
		SELECT reason,to_char(event_at AT TIME ZONE 'Asia/Colombo','YYYY-MM-DD') FROM (
		  SELECT d.reason,d.created_at event_at FROM public.deferral_records d JOIN public.orders o ON o.order_id=d.order_id WHERE o.outlet_id=$1
		  UNION ALL
		  SELECT COALESCE(NULLIF(dr.notes,''),'NOT_DELIVERED'),dr.created_at FROM public.delivery_records dr WHERE dr.outlet_id=$1 AND dr.trip_id<>$2 AND dr.outcome::text IN ('ATTEMPTED','NOT_HOME','REFUSED')
		) skips ORDER BY event_at DESC LIMIT 1`, outletID, tripID).Scan(&x.Reason, &x.Date)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get previous skip: %w", err)
	}
	return &x, nil
}
