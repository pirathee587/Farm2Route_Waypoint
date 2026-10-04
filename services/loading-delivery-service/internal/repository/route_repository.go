package repository

import (
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"time"
)

type RouteRepository struct{ pool *pgxpool.Pool }

func NewRouteRepository(pool *pgxpool.Pool) *RouteRepository { return &RouteRepository{pool: pool} }
func (r *RouteRepository) GetTripRoute(ctx context.Context, driverID, tripID uuid.UUID) (model.RouteTripData, error) {
	var x model.RouteTripData
	err := r.pool.QueryRow(ctx, `SELECT t.trip_id,t.trip_number,t.vehicle_id,t.delivery_date::text,v.depot,COALESCE(v.depot_lat,0)::float8,COALESCE(v.depot_lng,0)::float8 FROM public.trips t JOIN public.vehicles v ON v.vehicle_id=t.vehicle_id WHERE t.trip_id=$1 AND t.driver_id=$2`, tripID, driverID).Scan(&x.TripID, &x.TripNumber, &x.VehicleID, &x.DeliveryDate, &x.Depot.Name, &x.Depot.Lat, &x.Depot.Lng)
	if errors.Is(err, pgx.ErrNoRows) {
		var exists bool
		if e := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.trips WHERE trip_id=$1)`, tripID).Scan(&exists); e != nil {
			return x, e
		}
		if exists {
			return x, model.ErrForbidden("Trip belongs to another driver")
		}
		return x, model.ErrNotFound("Trip not found")
	}
	if err != nil {
		return x, err
	}
	rows, err := r.pool.Query(ctx, `SELECT trip_number FROM public.trips WHERE vehicle_id=$1 AND delivery_date=$2::date AND driver_id=$3 ORDER BY trip_number`, x.VehicleID, x.DeliveryDate, driverID)
	if err != nil {
		return x, err
	}
	for rows.Next() {
		var n int
		if err := rows.Scan(&n); err != nil {
			rows.Close()
			return x, err
		}
		x.Tabs = append(x.Tabs, model.TripTab{TripNumber: n, Label: fmt.Sprintf("Trip %d", n)})
	}
	rows.Close()
	x.Stops = []model.RouteStop{}
	rows, err = r.pool.Query(ctx, `SELECT ls.stop_id::text,ls.stop_no,ls.outlet_id,COALESCE(NULLIF(o.name,''),ls.outlet_name),COALESCE(NULLIF(o.district,''),ls.district,''),COALESCE(o.lat,0)::float8,COALESCE(o.lng,0)::float8,ls.removed_from_plan,COALESCE(ls.arrival_status,''),COALESCE(ls.delivery_status,''),COALESCE((SELECT d.outcome::text FROM public.delivery_records d WHERE d.trip_id=ls.trip_id AND d.outlet_id=ls.outlet_id ORDER BY d.created_at DESC LIMIT 1),''),COALESCE((SELECT to_char(MIN(ord.window_open),'HH24:MI') FROM public.allocations a JOIN public.orders ord ON ord.order_id=a.order_id WHERE a.trip_id=ls.trip_id AND ord.outlet_id=ls.outlet_id),'00:00'),COALESCE((SELECT to_char(MAX(ord.window_close),'HH24:MI') FROM public.allocations a JOIN public.orders ord ON ord.order_id=a.order_id WHERE a.trip_id=ls.trip_id AND ord.outlet_id=ls.outlet_id),'00:00'),CASE WHEN EXISTS(SELECT 1 FROM public.load_items li JOIN public.orders ord ON ord.order_id=li.order_id WHERE li.stop_id=ls.stop_id AND ord.temp_requirement='CHILLED') THEN 'chilled' ELSE 'ambient' END,CASE WHEN o.parking_constraint='van_only' THEN 'van_only' ELSE 'normal' END FROM public.load_stops ls JOIN public.outlets o ON o.outlet_id=ls.outlet_id WHERE ls.trip_id=$1 ORDER BY ls.stop_no`, tripID)
	if err != nil {
		return x, err
	}
	defer rows.Close()
	for rows.Next() {
		var s model.RouteStop
		if err := rows.Scan(&s.StopID, &s.Seq, &s.OutletID, &s.Name, &s.District, &s.Lat, &s.Lng, &s.Removed, &s.ArrivalStatus, &s.DeliveryStatus, &s.Outcome, &s.WindowOpen, &s.WindowClose, &s.Temperature, &s.Constraint); err != nil {
			return x, err
		}
		x.Stops = append(x.Stops, s)
	}
	return x, rows.Err()
}

func (r *RouteRepository) FallbackTravel(ctx context.Context, depot, district string, fromDepot bool, at time.Time) (float64, int, error) {
	var distance float64
	var depotMin, interMin int
	err := r.pool.QueryRow(ctx, `SELECT distance_km::float8,depot_to_district_freeflow_min,inter_stop_freeflow_min FROM public.district_travel WHERE depot=$1 AND district=$2`, depot, district).Scan(&distance, &depotMin, &interMin)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, 0, nil
	}
	if err != nil {
		return 0, 0, err
	}
	speed := 1.0
	_ = r.pool.QueryRow(ctx, `SELECT speed_index::float8 FROM public.traffic_speed WHERE observed_hour=$1`, at.Hour()).Scan(&speed)
	minutes := interMin
	if fromDepot {
		minutes = depotMin
	}
	if speed <= 0 {
		speed = 1
	}
	return distance, int(float64(minutes)/speed + 0.5), nil
}
