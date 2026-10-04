package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"strings"
	"time"
)

func (r *DriverNotificationRepository) ProcessNotificationEvent(ctx context.Context, eventID uuid.UUID, eventType string, tripID uuid.UUID, removedStopID *uuid.UUID, occurred time.Time, raw []byte) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.notifications WHERE event_id=$1)`, eventID).Scan(&exists); err != nil {
		return false, err
	}
	if exists {
		_ = tx.Commit(ctx)
		return false, nil
	}
	var driverID uuid.UUID
	var tripNumber int
	if err := tx.QueryRow(ctx, `SELECT driver_id,trip_number FROM public.trips WHERE trip_id=$1`, tripID).Scan(&driverID, &tripNumber); errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	} else if err != nil {
		return false, err
	}
	kind, title, body, entity := "", "", "", tripID.String()
	payload := map[string]any{}
	switch eventType {
	case "ROUTE_UPDATED", "ALLOCATION_COMPLETED":
		if removedStopID == nil {
			return false, nil
		}
		var seq, after int
		var outlet string
		if err := tx.QueryRow(ctx, `SELECT stop_no,outlet_name FROM public.load_stops WHERE stop_id=$1 AND trip_id=$2`, *removedStopID, tripID).Scan(&seq, &outlet); err != nil {
			return false, err
		}
		_ = tx.QueryRow(ctx, `SELECT COUNT(*) FROM public.load_stops WHERE trip_id=$1 AND removed_from_plan=FALSE`, tripID).Scan(&after)
		kind = "ROUTE_UPDATED"
		title = "Route updated"
		body = fmt.Sprintf("Stop %d - %s has been removed from Trip %d", seq, outlet, tripNumber)
		payload = map[string]any{"removed_stop_seq": seq, "removed_outlet_name": outlet, "trip_number": tripNumber, "before_count": after + 1, "after_count": after, "route_synced": false}
	case "LOAD_SHORTFALL", "FLAG_RAISED":
		eventPayload := jsonMap(raw)
		// Can't-deliver also raises a dispatcher flag. Only loader shortfalls
		// belong in the driver's LOAD_SHORTFALL notification stream.
		if eventType == "FLAG_RAISED" && strings.HasPrefix(fmt.Sprint(eventPayload["shortfall_ref"]), "CD-") {
			return false, nil
		}
		kind = "LOAD_SHORTFALL"
		title = "Load shortfall"
		body = "A loading shortfall was reported for your trip"
		payload = eventPayload
	case "ISSUE_ACKNOWLEDGED":
		kind = "ISSUE_ACKNOWLEDGED"
		title = "Issue acknowledged"
		body = "Dispatcher acknowledged your reported issue"
		payload = jsonMap(raw)
	case "LOADING_COMPLETED":
		kind = "TRIP_DEPARTURE_CONFIRMED"
		title = "Trip departure confirmed"
		body = "Your loaded trip is confirmed for departure"
		payload = jsonMap(raw)
	default:
		return false, nil
	}
	encoded, _ := json.Marshal(payload)
	_, err = tx.Exec(ctx, `INSERT INTO public.notifications(user_id,event_type,title,body,entity_ref,payload,event_id,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`, driverID.String(), kind, title, body, entity, string(encoded), eventID, occurred)
	if err != nil {
		return false, err
	}
	push, _ := json.Marshal(map[string]any{"user_id": driverID.String(), "type": kind, "title": title, "body": body, "entity_ref": entity, "payload": payload, "created_at": occurred})
	_, err = tx.Exec(ctx, `INSERT INTO public.outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,created_at) VALUES(uuid_generate_v5($1,'driver-push'),'NOTIFICATION',$2,'DRIVER_NOTIFICATION_PUSH',$3::jsonb,'PENDING',$4) ON CONFLICT(id) DO NOTHING`, eventID, driverID.String(), string(push), occurred)
	if err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}
func jsonMap(raw []byte) map[string]any { v := map[string]any{}; _ = json.Unmarshal(raw, &v); return v }
