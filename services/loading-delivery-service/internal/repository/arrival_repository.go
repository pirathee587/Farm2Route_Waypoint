package repository

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

func (r *DriverRepository) Arrive(ctx context.Context, driverID, stopID, actionID uuid.UUID, deviceTime *time.Time, serverTime, effectiveTime time.Time) (model.ArrivalRecord, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.ArrivalRecord{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var owner uuid.UUID
	var removed bool
	var existingStatus, initialStatus *string
	var existingArrived *time.Time
	var existingLate bool
	var existingAction *uuid.UUID
	var opens, closes time.Time
	err = tx.QueryRow(ctx, `SELECT t.driver_id,ls.removed_from_plan,ls.arrival_status,ls.arrival_initial_status,ls.arrived_at,ls.is_late,ls.arrival_client_action_id,
	 (t.delivery_date+COALESCE((SELECT MIN(o.window_open) FROM public.allocations a JOIN public.orders o ON o.order_id=a.order_id WHERE a.trip_id=t.trip_id AND o.outlet_id=ls.outlet_id AND a.status='ALLOCATED'),TIME '00:00')) AT TIME ZONE 'Asia/Colombo',
	 (t.delivery_date+COALESCE((SELECT MAX(o.window_close) FROM public.allocations a JOIN public.orders o ON o.order_id=a.order_id WHERE a.trip_id=t.trip_id AND o.outlet_id=ls.outlet_id AND a.status='ALLOCATED'),TIME '23:59')) AT TIME ZONE 'Asia/Colombo'
	 FROM public.load_stops ls JOIN public.trips t ON t.trip_id=ls.trip_id WHERE ls.stop_id=$1 FOR UPDATE OF ls`, stopID).Scan(&owner, &removed, &existingStatus, &initialStatus, &existingArrived, &existingLate, &existingAction, &opens, &closes)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.ArrivalRecord{}, model.ErrNotFound("Stop not found")
	}
	if err != nil {
		return model.ArrivalRecord{}, fmt.Errorf("arrive stop lookup: %w", err)
	}
	if owner != driverID {
		return model.ArrivalRecord{}, model.ErrForbidden("Stop belongs to another driver")
	}
	if removed {
		return model.ArrivalRecord{}, model.ErrNotFound("Stop not found")
	}
	if existingAction != nil && *existingAction == actionID && existingStatus != nil && existingArrived != nil {
		status := *existingStatus
		if initialStatus != nil {
			status = *initialStatus
		}
		_ = tx.Commit(ctx)
		return model.ArrivalRecord{Status: status, ArrivedAt: *existingArrived, WindowOpensAt: opens, WindowClosesAt: closes, Late: existingLate}, nil
	}
	if existingStatus != nil {
		return model.ArrivalRecord{}, model.NewAppError(model.ErrCodeConflict, "Stop has already been arrived", 409)
	}
	var current bool
	err = tx.QueryRow(ctx, `SELECT
	 NOT EXISTS(SELECT 1 FROM public.load_stops p WHERE p.trip_id=(SELECT trip_id FROM public.load_stops WHERE stop_id=$1) AND p.stop_no<(SELECT stop_no FROM public.load_stops WHERE stop_id=$1) AND p.removed_from_plan=FALSE AND COALESCE(p.delivery_status,'')<>'NOT_DELIVERED' AND NOT EXISTS(SELECT 1 FROM public.delivery_records d WHERE d.trip_id=p.trip_id AND d.outlet_id=p.outlet_id AND d.outcome::text IN ('DELIVERED','PARTIAL','ATTEMPTED','NOT_HOME','REFUSED')))
	 AND COALESCE((SELECT delivery_status FROM public.load_stops WHERE stop_id=$1),'')<>'NOT_DELIVERED'
	 AND NOT EXISTS(SELECT 1 FROM public.delivery_records d JOIN public.load_stops s ON s.trip_id=d.trip_id AND s.outlet_id=d.outlet_id WHERE s.stop_id=$1 AND d.outcome::text IN ('DELIVERED','PARTIAL','ATTEMPTED','NOT_HOME','REFUSED'))`, stopID).Scan(&current)
	if err != nil {
		return model.ArrivalRecord{}, err
	}
	if !current && !isOfflineReplay(ctx) {
		return model.ArrivalRecord{}, model.NewAppError(model.ErrCodeConflict, "Only the current pending stop can be arrived", 409)
	}
	status := "ARRIVED"
	if effectiveTime.Before(opens) {
		status = "WAITING_FOR_WINDOW"
	}
	late := effectiveTime.After(closes)
	_, err = tx.Exec(ctx, `UPDATE public.load_stops SET arrival_status=$2,arrival_initial_status=$2,arrived_at=$3,device_arrived_at=$4,server_arrived_at=$5,is_late=$6,arrival_client_action_id=$7,updated_at=$5 WHERE stop_id=$1`, stopID, status, effectiveTime, deviceTime, serverTime, late, actionID)
	if err != nil {
		return model.ArrivalRecord{}, fmt.Errorf("save arrival: %w", err)
	}
	if err = tx.Commit(ctx); err != nil {
		return model.ArrivalRecord{}, err
	}
	return model.ArrivalRecord{Status: status, ArrivedAt: effectiveTime, WindowOpensAt: opens, WindowClosesAt: closes, Late: late}, nil
}

func (r *DriverRepository) GetWindowStatus(ctx context.Context, driverID, stopID uuid.UUID, now time.Time) (model.WindowStatusResponse, error) {
	var owner uuid.UUID
	var removed bool
	var status *string
	var opens time.Time
	var current bool
	err := r.pool.QueryRow(ctx, `SELECT t.driver_id,ls.removed_from_plan,ls.arrival_status,
	 (t.delivery_date+COALESCE((SELECT MIN(o.window_open) FROM public.allocations a JOIN public.orders o ON o.order_id=a.order_id WHERE a.trip_id=t.trip_id AND o.outlet_id=ls.outlet_id AND a.status='ALLOCATED'),TIME '00:00')) AT TIME ZONE 'Asia/Colombo',
	 NOT EXISTS(SELECT 1 FROM public.load_stops p WHERE p.trip_id=ls.trip_id AND p.stop_no<ls.stop_no AND p.removed_from_plan=FALSE AND COALESCE(p.delivery_status,'')<>'NOT_DELIVERED' AND NOT EXISTS(SELECT 1 FROM public.delivery_records d WHERE d.trip_id=p.trip_id AND d.outlet_id=p.outlet_id AND d.outcome::text IN ('DELIVERED','PARTIAL','ATTEMPTED','NOT_HOME','REFUSED')))
	 AND COALESCE(ls.delivery_status,'')<>'NOT_DELIVERED'
	 AND NOT EXISTS(SELECT 1 FROM public.delivery_records self_done WHERE self_done.trip_id=ls.trip_id AND self_done.outlet_id=ls.outlet_id AND self_done.outcome::text IN ('DELIVERED','PARTIAL','ATTEMPTED','NOT_HOME','REFUSED'))
	 FROM public.load_stops ls JOIN public.trips t ON t.trip_id=ls.trip_id WHERE ls.stop_id=$1`, stopID).Scan(&owner, &removed, &status, &opens, &current)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.WindowStatusResponse{}, model.ErrNotFound("Stop not found")
	}
	if err != nil {
		return model.WindowStatusResponse{}, err
	}
	if owner != driverID {
		return model.WindowStatusResponse{}, model.ErrForbidden("Stop belongs to another driver")
	}
	if removed {
		return model.WindowStatusResponse{}, model.ErrNotFound("Stop not found")
	}
	value := "PENDING"
	if status != nil {
		value = *status
	}
	minutes := int(math.Ceil(opens.Sub(now).Minutes()))
	if minutes < 0 {
		minutes = 0
	}
	can := current && value != "ARRIVED" && !now.Before(opens)
	return model.WindowStatusResponse{CurrentTime: now, WindowOpensAt: opens, MinutesUntilOpen: minutes, CanMarkArrived: can, Status: value}, nil
}
