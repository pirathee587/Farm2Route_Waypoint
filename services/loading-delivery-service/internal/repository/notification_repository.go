package repository

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"time"
)

type DriverNotificationRepository struct{ pool *pgxpool.Pool }

func NewDriverNotificationRepository(pool *pgxpool.Pool) *DriverNotificationRepository {
	return &DriverNotificationRepository{pool: pool}
}
func scanNotifications(rows pgx.Rows) ([]model.DriverNotification, error) {
	items := []model.DriverNotification{}
	for rows.Next() {
		var x model.DriverNotification
		var payload []byte
		if err := rows.Scan(&x.ID, &x.Type, &x.Title, &x.Body, &x.EntityRef, &payload, &x.CreatedAt, &x.IsRead); err != nil {
			return nil, err
		}
		x.Payload = json.RawMessage(payload)
		items = append(items, x)
	}
	return items, rows.Err()
}

const notificationSelect = `SELECT notification_id::text,event_type,title,body,COALESCE(entity_ref,''),payload,created_at,read FROM public.notifications`

func (r *DriverNotificationRepository) Today(ctx context.Context, driverID uuid.UUID, day time.Time) ([]model.DriverNotification, int, error) {
	var unread int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.notifications WHERE user_id=$1 AND read=FALSE`, driverID.String()).Scan(&unread); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, notificationSelect+` WHERE user_id=$1 AND (created_at AT TIME ZONE 'Asia/Colombo')::date=$2::date ORDER BY created_at DESC`, driverID.String(), day.Format("2006-01-02"))
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items, err := scanNotifications(rows)
	return items, unread, err
}
func (r *DriverNotificationRepository) Review(ctx context.Context, driverID, notificationID uuid.UUID, now time.Time) error {
	tag, err := r.pool.Exec(ctx, `UPDATE public.notifications SET read=TRUE,reviewed_at=COALESCE(reviewed_at,$3),read_at=COALESCE(read_at,$3) WHERE notification_id=$1 AND user_id=$2`, notificationID, driverID.String(), now)
	if err != nil {
		return err
	}
	if tag.RowsAffected() > 0 {
		return nil
	}
	var exists bool
	if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM public.notifications WHERE notification_id=$1)`, notificationID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return model.ErrForbidden("Notification belongs to another driver")
	}
	return model.ErrNotFound("Notification not found")
}
func (r *DriverNotificationRepository) ReadAll(ctx context.Context, driverID uuid.UUID, now time.Time) error {
	_, err := r.pool.Exec(ctx, `UPDATE public.notifications SET read=TRUE,read_at=COALESCE(read_at,$2) WHERE user_id=$1 AND event_type<>'ROUTE_UPDATED' AND read=FALSE`, driverID.String(), now)
	return err
}
func (r *DriverNotificationRepository) History(ctx context.Context, driverID uuid.UUID, from, to time.Time, page, size int) ([]model.DriverNotification, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM public.notifications WHERE user_id=$1 AND (created_at AT TIME ZONE 'Asia/Colombo')::date BETWEEN $2::date AND $3::date`, driverID.String(), from.Format("2006-01-02"), to.Format("2006-01-02")).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, notificationSelect+` WHERE user_id=$1 AND (created_at AT TIME ZONE 'Asia/Colombo')::date BETWEEN $2::date AND $3::date ORDER BY created_at DESC LIMIT $4 OFFSET $5`, driverID.String(), from.Format("2006-01-02"), to.Format("2006-01-02"), size, (page-1)*size)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items, err := scanNotifications(rows)
	return items, total, err
}
func (r *DriverNotificationRepository) InsertEvent(ctx context.Context, eventID, driverID uuid.UUID, eventType, title, body, entity string, payload []byte, created time.Time) (bool, error) {
	tag, err := r.pool.Exec(ctx, `INSERT INTO public.notifications(user_id,event_type,title,body,entity_ref,payload,event_id,created_at) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8) ON CONFLICT(event_id) DO NOTHING`, driverID.String(), eventType, title, body, entity, string(payload), eventID, created)
	return err == nil && tag.RowsAffected() > 0, err
}

var _ = errors.Is
