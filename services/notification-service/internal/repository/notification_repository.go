package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/notification-service/internal/model"
)

// NotificationRepository handles all persistence operations for notifications.
type NotificationRepository struct {
	pool *pgxpool.Pool
}

// NewNotificationRepository creates a new NotificationRepository.
func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{pool: pool}
}

// CreateForUsers persists a notification record for each user in userIDs.
// All records share the same event_type, title, body, and payload.
// Returns the number of rows inserted.
func (r *NotificationRepository) CreateForUsers(
	ctx context.Context,
	userIDs []string,
	eventType, title, body, payloadJSON string,
) (int, error) {
	if len(userIDs) == 0 {
		return 0, nil
	}

	const q = `
		INSERT INTO public.notifications
		    (user_id, event_type, title, body, payload_json, read, created_at)
		VALUES ($1, $2, $3, $4, $5, false, NOW())
	`

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("notifications: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	inserted := 0
	for _, uid := range userIDs {
		if _, err := tx.Exec(ctx, q, uid, eventType, title, body, payloadJSON); err != nil {
			return 0, fmt.Errorf("notifications: insert for user %s: %w", uid, err)
		}
		inserted++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("notifications: commit: %w", err)
	}
	return inserted, nil
}

// CreateForRoles persists a notification record for every active user whose role
// is in the targetRoles list.  Uses a single INSERT … SELECT to avoid N+1 queries.
func (r *NotificationRepository) CreateForRoles(
	ctx context.Context,
	targetRoles []string,
	eventType, title, body, payloadJSON string,
) (int, error) {
	if len(targetRoles) == 0 {
		return 0, nil
	}

	// Convert slice to Postgres ANY($1) array
	const q = `
		INSERT INTO public.notifications
		    (user_id, event_type, title, body, payload_json, read, created_at)
		SELECT id::text, $2, $3, $4, $5, false, NOW()
		FROM   public.user_profiles
		WHERE  role = ANY($1)
		  AND  is_active = true
	`

	tag, err := r.pool.Exec(ctx, q, targetRoles, eventType, title, body, payloadJSON)
	if err != nil {
		return 0, fmt.Errorf("notifications: create for roles %v: %w", targetRoles, err)
	}
	return int(tag.RowsAffected()), nil
}

// ListForUser returns paginated notifications for a single user.
// When unreadOnly is true only unread rows are returned.
func (r *NotificationRepository) ListForUser(
	ctx context.Context,
	userID string,
	unreadOnly bool,
	page, pageSize int,
) ([]model.Notification, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}

	// Count query
	countQ := `SELECT COUNT(*) FROM public.notifications WHERE user_id = $1`
	args := []any{userID}
	if unreadOnly {
		countQ += ` AND read = false`
	}
	var total int
	if err := r.pool.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("notifications: count: %w", err)
	}

	// Unread count (always computed)
	var unreadCount int
	if err := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM public.notifications WHERE user_id = $1 AND read = false`,
		userID,
	).Scan(&unreadCount); err != nil {
		return nil, 0, fmt.Errorf("notifications: unread count: %w", err)
	}

	// Data query
	dataQ := `
		SELECT notification_id, user_id, event_type, title, body, payload_json,
		       read, created_at, read_at
		FROM   public.notifications
		WHERE  user_id = $1
	`
	if unreadOnly {
		dataQ += ` AND read = false`
	}
	dataQ += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	offset := (page - 1) * pageSize

	rows, err := r.pool.Query(ctx, dataQ, userID, pageSize, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("notifications: list query: %w", err)
	}
	defer rows.Close()

	var notifications []model.Notification
	for rows.Next() {
		var n model.Notification
		var readAt *time.Time
		if err := rows.Scan(
			&n.NotificationID, &n.UserID, &n.EventType,
			&n.Title, &n.Body, &n.PayloadJSON,
			&n.Read, &n.CreatedAt, &readAt,
		); err != nil {
			return nil, 0, fmt.Errorf("notifications: scan: %w", err)
		}
		n.ReadAt = readAt
		notifications = append(notifications, n)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return notifications, unreadCount, nil
}

// MarkRead marks the specified notification IDs as read for userID.
// When ids is empty, all unread notifications for the user are marked read.
func (r *NotificationRepository) MarkRead(ctx context.Context, userID string, ids []string) (int, error) {
	if len(ids) == 0 {
		// Mark all unread for this user
		result, execErr := r.pool.Exec(ctx, `
			UPDATE public.notifications
			SET    read = true, read_at = NOW()
			WHERE  user_id = $1 AND read = false
		`, userID)
		if execErr != nil {
			return 0, fmt.Errorf("notifications: mark-all-read: %w", execErr)
		}
		return int(result.RowsAffected()), nil
	}

	result, execErr := r.pool.Exec(ctx, `
		UPDATE public.notifications
		SET    read = true, read_at = NOW()
		WHERE  user_id = $1
		  AND  notification_id = ANY($2)
		  AND  read = false
	`, userID, ids)
	if execErr != nil {
		return 0, fmt.Errorf("notifications: mark-read: %w", execErr)
	}
	return int(result.RowsAffected()), nil
}
