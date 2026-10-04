package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"time"
)

func (r *DriverRepository) FindDeliveryConfirmation(ctx context.Context, driverID, stopID, actionID uuid.UUID) (*model.ConfirmDeliveryResponse, error) {
	var response model.ConfirmDeliveryResponse
	var next *uuid.UUID
	err := r.pool.QueryRow(ctx, `SELECT d.outcome::text,d.departed_at,ls.delivery_next_stop_id FROM public.delivery_records d JOIN public.load_stops ls ON ls.stop_id=d.stop_id JOIN public.trips t ON t.trip_id=ls.trip_id WHERE d.operation_id=$1 AND d.stop_id=$2 AND t.driver_id=$3`, actionID, stopID, driverID).Scan(&response.Outcome, &response.CompletedAt, &next)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if next != nil {
		v := next.String()
		response.NextStopID = &v
	}
	return &response, nil
}

func (r *DriverRepository) GetPODContext(ctx context.Context, driverID, stopID uuid.UUID) (model.PODContext, error) {
	var x model.PODContext
	var removed bool
	var arrival *string
	var delivery string
	err := r.pool.QueryRow(ctx, `SELECT ls.stop_id,ls.trip_id,t.driver_id,ls.outlet_id,ls.outlet_name,t.vehicle_id,ls.arrived_at,ls.removed_from_plan,ls.arrival_status,COALESCE(ls.delivery_status,'') FROM public.load_stops ls JOIN public.trips t ON t.trip_id=ls.trip_id WHERE ls.stop_id=$1`, stopID).Scan(&x.StopID, &x.TripID, &x.DriverID, &x.OutletID, &x.OutletName, &x.VehicleID, &x.ArrivedAt, &removed, &arrival, &delivery)
	if errors.Is(err, pgx.ErrNoRows) {
		return x, model.ErrNotFound("Stop not found")
	}
	if err != nil {
		return x, err
	}
	if x.DriverID != driverID {
		return x, model.ErrForbidden("Stop belongs to another driver")
	}
	if removed || delivery != "" {
		return x, model.NewAppError(model.ErrCodeConflict, "Stop is already finished or removed", 409)
	}
	if arrival == nil || *arrival != "ARRIVED" {
		return x, model.NewAppError(model.ErrCodeConflict, "Stop must be ARRIVED before proof of delivery", 409)
	}
	rows, err := r.pool.Query(ctx, `SELECT item_id::text,name,expected_qty,expected_qty,'PENDING' FROM public.load_items WHERE stop_id=$1 ORDER BY name`, stopID)
	if err != nil {
		return x, err
	}
	defer rows.Close()
	x.Items = []model.PODItem{}
	for rows.Next() {
		var i model.PODItem
		if err := rows.Scan(&i.ItemID, &i.Name, &i.OrderedQty, &i.DeliveredQty, &i.Status); err != nil {
			return x, err
		}
		x.Items = append(x.Items, i)
	}
	x.SignatureURLs = map[string]bool{}
	x.PhotoURLs = map[string]bool{}
	uploads, err := r.pool.Query(ctx, `SELECT file_url,pod_type FROM public.pod_uploads WHERE stop_id=$1 AND driver_id=$2`, stopID, driverID)
	if err != nil {
		return x, err
	}
	defer uploads.Close()
	for uploads.Next() {
		var url, kind string
		if err := uploads.Scan(&url, &kind); err != nil {
			return x, err
		}
		if kind == "SIGNATURE" {
			x.SignatureURLs[url] = true
		} else {
			x.PhotoURLs[url] = true
		}
	}
	return x, uploads.Err()
}

func (r *DriverRepository) SavePODUpload(ctx context.Context, driverID, stopID uuid.UUID, kind, url, receiver string, uploaded time.Time) (model.PODUploadResponse, error) {
	_, err := r.GetPODContext(ctx, driverID, stopID)
	if err != nil {
		return model.PODUploadResponse{}, err
	}
	err = r.pool.QueryRow(ctx, `INSERT INTO public.pod_uploads(stop_id,driver_id,pod_type,file_url,receiver_name,uploaded_at) VALUES($1,$2,$3,$4,NULLIF($5,''),$6) RETURNING uploaded_at`, stopID, driverID, kind, url, receiver, uploaded).Scan(&uploaded)
	return model.PODUploadResponse{URL: url, UploadedAt: uploaded}, err
}

func (r *DriverRepository) ConfirmDelivery(ctx context.Context, driverID, stopID, actionID uuid.UUID, request model.ConfirmDeliveryRequest, effective, server time.Time, outcome string) (model.ConfirmDeliveryResponse, error) {
	shortfallJSON, _ := json.Marshal(request.Shortfalls)
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.ConfirmDeliveryResponse{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var owner, tripID uuid.UUID
	var outletID, vehicleID string
	var arrived *time.Time
	var removed bool
	var deliveryStatus string
	err = tx.QueryRow(ctx, `SELECT t.driver_id,t.trip_id,ls.outlet_id,t.vehicle_id,ls.arrived_at,ls.removed_from_plan,COALESCE(ls.delivery_status,'') FROM public.load_stops ls JOIN public.trips t ON t.trip_id=ls.trip_id WHERE ls.stop_id=$1 FOR UPDATE OF ls`, stopID).Scan(&owner, &tripID, &outletID, &vehicleID, &arrived, &removed, &deliveryStatus)
	if errors.Is(err, pgx.ErrNoRows) {
		return model.ConfirmDeliveryResponse{}, model.ErrNotFound("Stop not found")
	}
	if err != nil {
		return model.ConfirmDeliveryResponse{}, err
	}
	if owner != driverID {
		return model.ConfirmDeliveryResponse{}, model.ErrForbidden("Stop belongs to another driver")
	}
	var existingOutcome string
	var existingAt time.Time
	var existingNext *uuid.UUID
	err = tx.QueryRow(ctx, `SELECT outcome::text,departed_at,(SELECT delivery_next_stop_id FROM public.load_stops WHERE stop_id=$2) FROM public.delivery_records WHERE operation_id=$1`, actionID, stopID).Scan(&existingOutcome, &existingAt, &existingNext)
	if err == nil {
		var next *string
		if existingNext != nil {
			v := existingNext.String()
			next = &v
		}
		_ = tx.Commit(ctx)
		return model.ConfirmDeliveryResponse{Outcome: existingOutcome, CompletedAt: existingAt, NextStopID: next}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return model.ConfirmDeliveryResponse{}, err
	}
	if removed || deliveryStatus != "" {
		return model.ConfirmDeliveryResponse{}, model.NewAppError(model.ErrCodeConflict, "Stop is already finished or removed", 409)
	}
	var orderID uuid.UUID
	if err := tx.QueryRow(ctx, `SELECT a.order_id FROM public.allocations a JOIN public.orders o ON o.order_id=a.order_id WHERE a.trip_id=$1 AND o.outlet_id=$2 ORDER BY a.stop_index LIMIT 1`, tripID, outletID).Scan(&orderID); err != nil {
		return model.ConfirmDeliveryResponse{}, err
	}
	var deliveryID uuid.UUID
	err = tx.QueryRow(ctx, `INSERT INTO public.delivery_records(trip_id,order_id,driver_id,outlet_id,outcome,arrived_at,departed_at,received_by,notes,operation_id,synced_at,stop_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING delivery_id`, tripID, orderID, driverID, outletID, outcome, arrived, effective, request.ReceiverName, request.Note, actionID, server, stopID).Scan(&deliveryID)
	if err != nil {
		return model.ConfirmDeliveryResponse{}, err
	}
	for _, item := range request.Items {
		status := "DELIVERED"
		for _, sf := range request.Shortfalls {
			if sf.ItemID == item.ItemID {
				status = "SHORTFALL"
				_, err = tx.Exec(ctx, `INSERT INTO public.delivery_shortfalls(delivery_id,item_id,qty,type,note) VALUES($1,$2,$3,$4,$5)`, deliveryID, sf.ItemID, sf.Qty, sf.Type, sf.Note)
				if err != nil {
					return model.ConfirmDeliveryResponse{}, err
				}
			}
		}
		_, err = tx.Exec(ctx, `INSERT INTO public.delivery_item_results(delivery_id,item_id,ordered_qty,delivered_qty,status) SELECT $1,item_id,expected_qty,$3,$4 FROM public.load_items WHERE item_id=$2 AND stop_id=$5`, deliveryID, item.ItemID, item.DeliveredQty, status, stopID)
		if err != nil {
			return model.ConfirmDeliveryResponse{}, err
		}
	}
	for _, u := range []struct{ url, kind string }{{request.SignatureURL, "SIGNATURE"}, {request.PhotoURL, "PHOTO"}} {
		_, err = tx.Exec(ctx, `INSERT INTO public.proof_of_delivery(delivery_id,file_url,pod_type,uploaded_at) SELECT $1,file_url,$3,uploaded_at FROM public.pod_uploads WHERE stop_id=$2 AND file_url=$4 AND pod_type=$3`, deliveryID, stopID, u.kind, u.url)
		if err != nil {
			return model.ConfirmDeliveryResponse{}, err
		}
	}
	var nextID *uuid.UUID
	_ = tx.QueryRow(ctx, `SELECT stop_id FROM public.load_stops s WHERE trip_id=$1 AND stop_no>(SELECT stop_no FROM public.load_stops WHERE stop_id=$2) AND removed_from_plan=FALSE AND COALESCE(delivery_status,'')='' ORDER BY stop_no LIMIT 1`, tripID, stopID).Scan(&nextID)
	_, err = tx.Exec(ctx, `UPDATE public.load_stops SET delivery_status=$2,delivery_next_stop_id=$3,updated_at=$4 WHERE stop_id=$1`, stopID, outcome, nextID, server)
	if err != nil {
		return model.ConfirmDeliveryResponse{}, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO public.outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,created_at) VALUES(uuid_generate_v5($1,'delivery-completed'),'DELIVERY',$2::text,'DELIVERY_COMPLETED',jsonb_build_object('trip_id',$3,'trip_code',$3::text,'destination',$4,'completed_at',$5,'outcome',$6,'shortfalls',$7::jsonb),'PENDING',$5) ON CONFLICT(id) DO NOTHING`, actionID, deliveryID, tripID, outletID, effective, outcome, string(shortfallJSON))
	if err != nil {
		return model.ConfirmDeliveryResponse{}, fmt.Errorf("delivery outbox: %w", err)
	}
	if outcome == "PARTIAL" {
		_, err = tx.Exec(ctx, `INSERT INTO public.notifications(notification_id,user_id,event_type,title,body,payload_json,created_at) SELECT uuid_generate_v5($1,p.id::text),p.id::text,'DELIVERY_SHORTFALL','Partial delivery recorded',$2,$3,$4 FROM public.user_profiles p WHERE p.role='DISPATCHER' AND p.is_active=TRUE ON CONFLICT(notification_id) DO NOTHING`, actionID, fmt.Sprintf("Shortfall at outlet %s", outletID), string(shortfallJSON), effective)
		if err != nil {
			return model.ConfirmDeliveryResponse{}, err
		}
	}
	if _, err = tx.Exec(ctx, `SELECT public.complete_trip_if_ready($1,$2)`, tripID, server); err != nil {
		return model.ConfirmDeliveryResponse{}, fmt.Errorf("complete trip: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return model.ConfirmDeliveryResponse{}, err
	}
	var next *string
	if nextID != nil {
		v := nextID.String()
		next = &v
	}
	return model.ConfirmDeliveryResponse{Outcome: outcome, CompletedAt: effective, NextStopID: next}, nil
}
