package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

func (r *DriverRepository) CantDeliver(ctx context.Context, driverID, stopID, actionID uuid.UUID, reason, note string, deviceTime *time.Time, serverTime, effectiveTime time.Time) (model.CantDeliverResponse, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.CantDeliverResponse{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var owner uuid.UUID
	var tripID uuid.UUID
	var vehicleID, outletID, outletName string
	var removed bool
	var deliveryStatus *string
	var existingAction *uuid.UUID
	var existingNext *uuid.UUID
	err = tx.QueryRow(ctx, `SELECT t.driver_id,t.trip_id,t.vehicle_id,ls.outlet_id,ls.outlet_name,ls.removed_from_plan,ls.delivery_status,ls.cant_deliver_client_action_id,ls.cant_deliver_next_stop_id FROM public.load_stops ls JOIN public.trips t ON t.trip_id=ls.trip_id WHERE ls.stop_id=$1 FOR UPDATE OF ls`, stopID).Scan(&owner, &tripID, &vehicleID, &outletID, &outletName, &removed, &deliveryStatus, &existingAction, &existingNext)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.CantDeliverResponse{}, model.ErrNotFound("Stop not found")
	}
	if err != nil {
		return model.CantDeliverResponse{}, fmt.Errorf("cant-deliver lookup: %w", err)
	}
	if owner != driverID {
		return model.CantDeliverResponse{}, model.ErrForbidden("Stop belongs to another driver")
	}
	if existingAction != nil && *existingAction == actionID && deliveryStatus != nil && *deliveryStatus == "NOT_DELIVERED" {
		var next *string
		if existingNext != nil {
			v := existingNext.String()
			next = &v
		}
		_ = tx.Commit(ctx)
		return model.CantDeliverResponse{Status: "NOT_DELIVERED", RecordSent: true, NextStopID: next}, nil
	}
	if removed || deliveryStatus != nil {
		return model.CantDeliverResponse{}, model.NewAppError(model.ErrCodeConflict, "Stop is already finished or removed", 409)
	}
	var hasOutcome bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.delivery_records WHERE trip_id=$1 AND outlet_id=$2)`, tripID, outletID).Scan(&hasOutcome); err != nil {
		return model.CantDeliverResponse{}, err
	}
	if hasOutcome {
		return model.CantDeliverResponse{}, model.NewAppError(model.ErrCodeConflict, "Stop is already finished", 409)
	}
	var current bool
	err = tx.QueryRow(ctx, `SELECT NOT EXISTS(SELECT 1 FROM public.load_stops p WHERE p.trip_id=$1 AND p.stop_no<(SELECT stop_no FROM public.load_stops WHERE stop_id=$2) AND p.removed_from_plan=FALSE AND COALESCE(p.delivery_status,'')<>'NOT_DELIVERED' AND NOT EXISTS(SELECT 1 FROM public.delivery_records d WHERE d.trip_id=p.trip_id AND d.outlet_id=p.outlet_id))`, tripID, stopID).Scan(&current)
	if err != nil {
		return model.CantDeliverResponse{}, err
	}
	if !current && !isOfflineReplay(ctx) {
		return model.CantDeliverResponse{}, model.NewAppError(model.ErrCodeConflict, "Only the current unfinished stop can be reported", 409)
	}
	var orderID uuid.UUID
	err = tx.QueryRow(ctx, `SELECT a.order_id FROM public.allocations a JOIN public.orders o ON o.order_id=a.order_id WHERE a.trip_id=$1 AND o.outlet_id=$2 AND a.status='ALLOCATED' ORDER BY a.stop_index,a.created_at LIMIT 1`, tripID, outletID).Scan(&orderID)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.CantDeliverResponse{}, model.NewAppError(model.ErrCodeConflict, "Stop has no allocated order", 409)
	}
	if err != nil {
		return model.CantDeliverResponse{}, err
	}
	var nextID *uuid.UUID
	err = tx.QueryRow(ctx, `SELECT s.stop_id FROM public.load_stops s WHERE s.trip_id=$1 AND s.stop_no>(SELECT stop_no FROM public.load_stops WHERE stop_id=$2) AND s.removed_from_plan=FALSE AND COALESCE(s.delivery_status,'')<>'NOT_DELIVERED' AND NOT EXISTS(SELECT 1 FROM public.delivery_records d WHERE d.trip_id=s.trip_id AND d.outlet_id=s.outlet_id) ORDER BY s.stop_no LIMIT 1`, tripID, stopID).Scan(&nextID)
	if errors.Is(err, pgx.ErrNoRows) {
		nextID = nil
	} else if err != nil {
		return model.CantDeliverResponse{}, err
	}
	_, err = tx.Exec(ctx, `UPDATE public.load_stops SET delivery_status='NOT_DELIVERED',cant_deliver_reason=$2,cant_deliver_note=$3,cant_deliver_reported_at=$4,cant_deliver_device_at=$5,cant_deliver_server_at=$6,cant_deliver_client_action_id=$7,cant_deliver_next_stop_id=$8,updated_at=$6 WHERE stop_id=$1`, stopID, reason, note, effectiveTime, deviceTime, serverTime, actionID, nextID)
	if err != nil {
		return model.CantDeliverResponse{}, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO public.deferral_records(order_id,outlet_id,delivery_date,reason,constraint_type,retry_date,notified,note,driver_id,vehicle_id,trip_id,stop_id,reported_at,client_action_id,created_at) VALUES($1,$2,($3 AT TIME ZONE 'Asia/Colombo')::date,$4,'NONE',(($3 AT TIME ZONE 'Asia/Colombo')::date+1),FALSE,$5,$6,$7,$8,$9,$3,$10,$3)`, orderID, outletID, effectiveTime, reason, note, driverID, vehicleID, tripID, stopID, actionID)
	if err != nil {
		return model.CantDeliverResponse{}, fmt.Errorf("save deferral: %w", err)
	}
	payload := `jsonb_build_object('shortfall_ref','CD-'||$1::text,'trip_id',$6,'trip_code',$6::text,'item_sku',$2,'item_name',$3,'reason',$4,'reported_by_id',$8,'created_at',$10,'outlet_id',$2,'note',$5,'stop_id',$7,'driver_id',$8,'vehicle_id',$9,'reported_at',$10)`
	_, err = tx.Exec(ctx, `INSERT INTO public.outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,created_at) VALUES(uuid_generate_v5($1,'flag-raised'),'ISSUE_FLAG',$7,'FLAG_RAISED',`+payload+`,'PENDING',$10) ON CONFLICT(id) DO NOTHING`, actionID, outletID, outletName, reason, note, tripID, stopID, driverID, vehicleID, effectiveTime)
	if err != nil {
		return model.CantDeliverResponse{}, fmt.Errorf("save flag event: %w", err)
	}
	if _, err = tx.Exec(ctx, `SELECT public.complete_trip_if_ready($1,$2)`, tripID, serverTime); err != nil {
		return model.CantDeliverResponse{}, fmt.Errorf("complete trip: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return model.CantDeliverResponse{}, err
	}
	var next *string
	if nextID != nil {
		v := nextID.String()
		next = &v
	}
	return model.CantDeliverResponse{Status: "NOT_DELIVERED", RecordSent: true, NextStopID: next}, nil
}
