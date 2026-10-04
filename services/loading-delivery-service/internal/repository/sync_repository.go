package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

type SyncRepository struct{ pool *pgxpool.Pool }

func NewSyncRepository(pool *pgxpool.Pool) *SyncRepository { return &SyncRepository{pool: pool} }

type SyncStopState struct {
	Owner, OriginalOwner, TripID         uuid.UUID
	OutletID, OutletName, DeliveryStatus string
	Removed                              bool
}

func (r *SyncRepository) Existing(ctx context.Context, driver, action uuid.UUID) (*model.SyncResult, bool, error) {
	var raw []byte
	var owner uuid.UUID
	err := r.pool.QueryRow(ctx, `SELECT driver_id,result FROM public.sync_actions WHERE client_action_id=$1`, action).Scan(&owner, &raw)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	if owner != driver {
		return nil, false, model.ErrForbidden("Action belongs to another driver")
	}
	var out model.SyncResult
	if err = json.Unmarshal(raw, &out); err != nil {
		return nil, false, err
	}
	out.Status = "DUPLICATE"
	return &out, true, nil
}
func (r *SyncRepository) StopState(ctx context.Context, stop uuid.UUID) (SyncStopState, error) {
	var s SyncStopState
	err := r.pool.QueryRow(ctx, `SELECT t.driver_id,COALESCE(ls.original_driver_id,t.driver_id),t.trip_id,ls.outlet_id,ls.outlet_name,ls.removed_from_plan,COALESCE(ls.delivery_status,'') FROM public.load_stops ls JOIN public.trips t ON t.trip_id=ls.trip_id WHERE ls.stop_id=$1`, stop).Scan(&s.Owner, &s.OriginalOwner, &s.TripID, &s.OutletID, &s.OutletName, &s.Removed, &s.DeliveryStatus)
	if errors.Is(err, pgx.ErrNoRows) {
		return s, model.ErrNotFound("Stop not found")
	}
	return s, err
}
func (r *SyncRepository) SaveResult(ctx context.Context, driver, action, stop uuid.UUID, kind string, at, received time.Time, payload []byte, result model.SyncResult, media string) error {
	raw, _ := json.Marshal(result)
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	_, err = tx.Exec(ctx, `INSERT INTO public.sync_actions(client_action_id,driver_id,action_type,stop_id,client_timestamp,server_received_at,status,error_code,result,payload,pod_media_status,recorded_offline) VALUES($1,$2,$3,$4,$5,$6,$7,NULLIF($8,''),$9::jsonb,$10::jsonb,$11,TRUE) ON CONFLICT(client_action_id) DO NOTHING`, action, driver, kind, stop, at, received, mapDuplicateStatus(result.Status), result.ErrorCode, string(raw), string(payload), media)
	if err != nil {
		return err
	}
	if result.Status == "SYNCED" && kind == "DELIVERY" {
		_, err = tx.Exec(ctx, `UPDATE public.delivery_records SET recorded_offline=TRUE,server_received_at=$2,pod_media_status=$3 WHERE operation_id=$1`, action, received, media)
	}
	if result.Status == "SYNCED" && kind == "ISSUE" {
		_, err = tx.Exec(ctx, `UPDATE public.deferral_records SET recorded_offline=TRUE,server_received_at=$2 WHERE client_action_id=$1`, action, received)
	}
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func mapDuplicateStatus(s string) string {
	if s == "DUPLICATE" {
		return "SYNCED"
	}
	return s
}
func (r *SyncRepository) SaveConflict(ctx context.Context, driver, action, stop uuid.UUID, kind, code, message string, at, received time.Time, payload []byte) (model.SyncConflict, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return model.SyncConflict{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	var trip uuid.UUID
	var outlet, name string
	if err = tx.QueryRow(ctx, `SELECT ls.trip_id,ls.outlet_id,ls.outlet_name FROM public.load_stops ls WHERE stop_id=$1`, stop).Scan(&trip, &outlet, &name); err != nil {
		return model.SyncConflict{}, err
	}
	result := model.SyncResult{ClientActionID: action.String(), Type: kind, StopID: stop.String(), Label: syncLabel(kind), Status: "CONFLICT", ErrorCode: code, Message: message}
	raw, _ := json.Marshal(result)
	_, err = tx.Exec(ctx, `INSERT INTO public.sync_actions(client_action_id,driver_id,action_type,stop_id,client_timestamp,server_received_at,status,error_code,result,payload,pod_media_status,recorded_offline) VALUES($1,$2,$3,$4,$5,$6,'CONFLICT',$7,$8::jsonb,$9::jsonb,CASE WHEN $3='DELIVERY' AND COALESCE(($9::jsonb->>'media_pending')::boolean,FALSE) THEN 'PENDING' ELSE 'NOT_REQUIRED' END,TRUE)`, action, driver, kind, stop, at, received, code, string(raw), string(payload))
	if err != nil {
		return model.SyncConflict{}, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO public.sync_conflict_records(client_action_id,driver_id,stop_id,trip_id,outlet_id,action_type,conflict_code,payload,recorded_at,server_received_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`, action, driver, stop, trip, outlet, kind, code, string(payload), at, received)
	if err != nil {
		return model.SyncConflict{}, err
	}
	_, err = tx.Exec(ctx, `INSERT INTO public.notifications(notification_id,user_id,event_type,title,body,entity_ref,payload,created_at) SELECT uuid_generate_v5($1,p.id::text),p.id::text,'OFFLINE_SYNC_CONFLICT','Offline delivery conflict',$2,$3::text,jsonb_build_object('client_action_id',$1,'stop_id',$3,'code',$4),$5 FROM public.user_profiles p WHERE p.role='DISPATCHER' AND p.is_active=TRUE ON CONFLICT(notification_id) DO NOTHING`, action, fmt.Sprintf("%s at %s requires dispatcher review", kind, name), stop, code, received)
	if err != nil {
		return model.SyncConflict{}, err
	}
	event := "DELIVERY_COMPLETED"
	if kind == "ISSUE" {
		event = "FLAG_RAISED"
	}
	_, err = tx.Exec(ctx, `INSERT INTO public.outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,created_at) VALUES(uuid_generate_v5($1,'sync-conflict'),'DELIVERY_CONFLICT',$2,$3,jsonb_build_object('client_action_id',$1,'shortfall_ref','CD-CONFLICT-'||$1::text,'trip_id',$4,'stop_id',$5,'outlet_id',$6,'conflict',TRUE,'target_roles',jsonb_build_array('DISPATCHER')),'PENDING',$7) ON CONFLICT(id) DO NOTHING`, action, action.String(), event, trip, stop, outlet, received)
	if err != nil {
		return model.SyncConflict{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return model.SyncConflict{}, err
	}
	return model.SyncConflict{ClientActionID: action.String(), StopID: stop.String(), OutletID: outlet, Code: code, Message: message, RequiresDriverAction: false}, nil
}
func syncLabel(kind string) string {
	return map[string]string{"ARRIVAL": "Arrival record", "DELIVERY": "Delivery outcome", "ISSUE": "Issue Reported"}[kind]
}
func (r *SyncRepository) PreviousSync(ctx context.Context, driver uuid.UUID) (*time.Time, error) {
	var t *time.Time
	err := r.pool.QueryRow(ctx, `SELECT last_synced_at FROM public.driver_sessions WHERE driver_id=$1`, driver).Scan(&t)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return t, err
}
func (r *SyncRepository) Finish(ctx context.Context, driver uuid.UUID, at time.Time) error {
	_, err := r.pool.Exec(ctx, `INSERT INTO public.driver_sessions(driver_id,last_synced_at,updated_at) VALUES($1,$2,$2) ON CONFLICT(driver_id) DO UPDATE SET last_synced_at=$2,updated_at=$2`, driver, at)
	return err
}
func (r *SyncRepository) RouteChanges(ctx context.Context, driver uuid.UUID, since time.Time) ([]model.RouteChange, error) {
	rows, err := r.pool.Query(ctx, `SELECT l.type,l.trip_id::text,COALESCE(s.stop_no,0),COALESCE(s.outlet_id,''),COALESCE(s.outlet_name,''),l.occurred_at FROM public.route_change_log l JOIN public.trips t ON t.trip_id=l.trip_id LEFT JOIN public.load_stops s ON s.stop_id=l.stop_id WHERE t.driver_id=$1 AND l.occurred_at>$2 ORDER BY l.occurred_at`, driver, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.RouteChange{}
	for rows.Next() {
		var x model.RouteChange
		if err = rows.Scan(&x.Type, &x.TripID, &x.StopSeq, &x.OutletID, &x.OutletName, &x.ChangedAt); err != nil {
			return nil, err
		}
		x.ChangedBy = "Dispatcher"
		out = append(out, x)
	}
	return out, rows.Err()
}
func (r *SyncRepository) Verify(ctx context.Context, driver uuid.UUID, ids []uuid.UUID) (map[uuid.UUID]string, error) {
	out := map[uuid.UUID]string{}
	rows, err := r.pool.Query(ctx, `SELECT client_action_id,status FROM public.sync_actions WHERE driver_id=$1 AND client_action_id=ANY($2)`, driver, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id uuid.UUID
		var s string
		if err = rows.Scan(&id, &s); err != nil {
			return nil, err
		}
		out[id] = s
	}
	return out, rows.Err()
}
func (r *SyncRepository) Conflicts(ctx context.Context, driver uuid.UUID) ([]model.SyncConflictRecord, error) {
	rows, err := r.pool.Query(ctx, `SELECT client_action_id::text,stop_id::text,trip_id::text,outlet_id,action_type,conflict_code,status,recorded_at,payload FROM public.sync_conflict_records WHERE driver_id=$1 AND status='CONFLICT_REVIEW' ORDER BY created_at DESC`, driver)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []model.SyncConflictRecord{}
	for rows.Next() {
		var x model.SyncConflictRecord
		if err = rows.Scan(&x.ClientActionID, &x.StopID, &x.TripID, &x.OutletID, &x.Type, &x.Code, &x.Status, &x.RecordedAt, &x.Payload); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}
func (r *SyncRepository) MediaTarget(ctx context.Context, driver, action uuid.UUID) (uuid.UUID, string, string, error) {
	var stop uuid.UUID
	var sig, photo *string
	var status string
	err := r.pool.QueryRow(ctx, `SELECT stop_id,signature_url,photo_url,pod_media_status FROM public.sync_actions WHERE client_action_id=$1 AND driver_id=$2 AND action_type='DELIVERY'`, action, driver).Scan(&stop, &sig, &photo, &status)
	if errors.Is(err, pgx.ErrNoRows) {
		return stop, "", "", model.ErrNotFound("Sync delivery action not found")
	}
	if err != nil {
		return stop, "", "", err
	}
	s, p := "", ""
	if sig != nil {
		s = *sig
	}
	if photo != nil {
		p = *photo
	}
	return stop, s, p, nil
}
func (r *SyncRepository) CompleteMedia(ctx context.Context, driver, action uuid.UUID, sig, photo string, at time.Time) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	tag, err := tx.Exec(ctx, `UPDATE public.sync_actions SET signature_url=$3,photo_url=$4,pod_media_status='COMPLETE',updated_at=$5 WHERE client_action_id=$1 AND driver_id=$2`, action, driver, sig, photo, at)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return model.ErrNotFound("Sync delivery action not found")
	}
	_, err = tx.Exec(ctx, `UPDATE public.delivery_records SET pod_media_status='COMPLETE' WHERE operation_id=$1`, action)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO public.proof_of_delivery(delivery_id,file_url,pod_type,uploaded_at) SELECT delivery_id,$2,'SIGNATURE',$4 FROM public.delivery_records WHERE operation_id=$1 UNION ALL SELECT delivery_id,$3,'PHOTO',$4 FROM public.delivery_records WHERE operation_id=$1 ON CONFLICT(delivery_id,pod_type) DO NOTHING`, action, sig, photo, at)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
