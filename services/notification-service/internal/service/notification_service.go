// Package service contains the notification fan-out business logic.
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/waypoint/notification-service/internal/messaging"
	"github.com/waypoint/notification-service/internal/model"
)

// ErrPersistenceUnavailable is returned when no notification store is
// configured. It is transient: the consumer retries and never acknowledges an
// event that was not durably recorded.
var ErrPersistenceUnavailable = errors.New("notification persistence unavailable")

// Store persists notifications idempotently. *repository.NotificationRepository
// implements this interface.
type Store interface {
	CreateForRolesOnce(ctx context.Context, eventKey string, roles []string,
		eventType, title, body, payloadJSON string) (inserted int, duplicate bool, err error)
}

// Broadcaster is the interface used by NotificationService to push real-time
// messages to WebSocket clients.  *handler.Hub implements this interface.
type Broadcaster interface {
	BroadcastToRoles(roles []string, message []byte) int
	BroadcastToUser(userID string, message []byte) int
}

// NotificationService coordinates persistence and real-time fan-out for all
// incoming RabbitMQ events.
type NotificationService struct {
	repo        Store
	broadcaster Broadcaster
	logger      *slog.Logger
}

// NewNotificationService creates a NotificationService. Pass an untyped nil
// store (not a typed nil pointer) when persistence is unavailable.
func NewNotificationService(
	repo Store,
	broadcaster Broadcaster,
	logger *slog.Logger,
) *NotificationService {
	if logger == nil {
		logger = slog.Default()
	}
	return &NotificationService{
		repo:        repo,
		broadcaster: broadcaster,
		logger:      logger.With(slog.String("component", "notification_service")),
	}
}

// HandleEvent processes a decoded RabbitMQ event: persists notifications for
// the target roles and broadcasts a real-time push via the WebSocket hub.
//
// eventType must be one of the model.EventType* constants.
// eventKey is the idempotency key; an already-recorded key is a no-op.
// payloadJSON is the raw event body (stored as context in the notification record).
//
// A non-nil error means the event was NOT durably recorded and must not be
// acknowledged. The broadcast happens only after a first-time commit, so
// retries and redeliveries do not push duplicates.
func (s *NotificationService) HandleEvent(ctx context.Context, eventType, eventKey string, rawPayload []byte) error {
	if eventType == model.EventTypeDriverNotification {
		var push struct {
			UserID  string          `json:"user_id"`
			Type    string          `json:"type"`
			Title   string          `json:"title"`
			Body    string          `json:"body"`
			Payload json.RawMessage `json:"payload"`
		}
		if err := json.Unmarshal(rawPayload, &push); err != nil {
			return messaging.Permanent(fmt.Errorf("decode driver notification: %w", err))
		}
		message, _ := json.Marshal(map[string]any{"type": "notification", "eventType": push.Type, "title": push.Title, "body": push.Body, "payload": push.Payload})
		s.broadcaster.BroadcastToUser(push.UserID, message)
		return nil
	}
	title, body, err := s.buildNotificationText(eventType, rawPayload)
	if err != nil {
		s.logger.Warn("Could not build notification text; using generic message",
			"event_type", eventType, "error", err)
		title = fmt.Sprintf("Waypoint: %s", eventType)
		body = string(rawPayload)
	}

	targetRoles, ok := model.EventToTargetRoles[eventType]
	if !ok {
		s.logger.Warn("No target roles configured for event type", "event_type", eventType)
		return nil
	}

	payloadStr := string(rawPayload)

	// 1. Persist to database for all users of the target roles. Failure is
	// returned so the consumer retries or dead-letters rather than acking.
	inserted, duplicate, err := s.persistForRoles(ctx, eventKey, targetRoles, eventType, title, body, payloadStr)
	if err != nil {
		return fmt.Errorf("persist %s notifications: %w", eventType, err)
	}
	if duplicate {
		s.logger.Info("Duplicate event ignored", "event_type", eventType, "event_key", eventKey)
		return nil
	}
	s.logger.Info("Persisted notifications", "event_type", eventType, "count", inserted)

	// 2. Real-time broadcast to all connected WebSocket clients of target roles.
	pushMsg, _ := json.Marshal(map[string]any{
		"type":      "notification",
		"eventType": eventType,
		"title":     title,
		"body":      body,
		"payload":   json.RawMessage(rawPayload),
	})
	reached := s.broadcaster.BroadcastToRoles(targetRoles, pushMsg)
	s.logger.Info("Broadcast notification", "event_type", eventType, "ws_clients_reached", reached)

	return nil
}

// persistForRoles is a thin wrapper that fails when repo is nil (degraded mode)
// instead of silently reporting success.
func (s *NotificationService) persistForRoles(
	ctx context.Context, eventKey string, roles []string,
	eventType, title, body, payloadJSON string,
) (int, bool, error) {
	if s.repo == nil {
		return 0, false, ErrPersistenceUnavailable
	}
	return s.repo.CreateForRolesOnce(ctx, eventKey, roles, eventType, title, body, payloadJSON)
}

// buildNotificationText produces human-readable title and body from a raw event payload.
func (s *NotificationService) buildNotificationText(eventType string, payload []byte) (title, body string, err error) {
	switch eventType {
	case model.EventTypeFlagRaised:
		var ev model.FlagRaisedEvent
		if err = json.Unmarshal(payload, &ev); err != nil {
			return
		}
		title = fmt.Sprintf("⚠️ Shortfall Reported — %s", ev.TripCode)
		body = fmt.Sprintf(
			"Item %s (%s) flagged on trip %s. Reason: %s. Ref: %s",
			ev.ItemName, ev.ItemSKU, ev.TripCode, ev.Reason, ev.ShortfallRef,
		)

	case model.EventTypeOrderDeferred:
		var ev model.OrderDeferredEvent
		if err = json.Unmarshal(payload, &ev); err != nil {
			return
		}
		title = fmt.Sprintf("📋 Order Deferred — %s", ev.OrderRef)
		body = fmt.Sprintf(
			"Order %s for %s has been deferred. Reason: %s",
			ev.OrderRef, ev.OutletName, ev.Reason,
		)

	case model.EventTypeAllocationCompleted:
		var ev model.AllocationCompletedEvent
		if err = json.Unmarshal(payload, &ev); err != nil {
			return
		}
		title = fmt.Sprintf("✅ Allocation Ready — %s", ev.TripCode)
		body = fmt.Sprintf(
			"Trip %s to %s is allocated and ready for loading (%d stops).",
			ev.TripCode, ev.Destination, ev.StopCount,
		)

	case model.EventTypeDeliveryCompleted:
		var ev model.DeliveryCompletedEvent
		if err = json.Unmarshal(payload, &ev); err != nil {
			return
		}
		title = fmt.Sprintf("🚚 Delivery Completed — %s", ev.TripCode)
		body = fmt.Sprintf(
			"Trip %s has completed delivery to %s.",
			ev.TripCode, ev.Destination,
		)

	default:
		title = fmt.Sprintf("Waypoint Notification (%s)", eventType)
		body = string(payload)
	}
	return
}
