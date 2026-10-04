// Package service contains the notification fan-out business logic.
package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/waypoint/notification-service/internal/model"
	"github.com/waypoint/notification-service/internal/repository"
)

// Broadcaster is the interface used by NotificationService to push real-time
// messages to WebSocket clients.  *handler.Hub implements this interface.
type Broadcaster interface {
	BroadcastToRoles(roles []string, message []byte) int
	BroadcastToUser(userID string, message []byte) int
}

// NotificationService coordinates persistence and real-time fan-out for all
// incoming RabbitMQ events.
type NotificationService struct {
	repo        *repository.NotificationRepository
	broadcaster Broadcaster
	logger      *slog.Logger
}

// NewNotificationService creates a NotificationService.
func NewNotificationService(
	repo *repository.NotificationRepository,
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
// payloadJSON is the raw event body (stored as context in the notification record).
func (s *NotificationService) HandleEvent(ctx context.Context, eventType string, rawPayload []byte) error {
	if eventType == model.EventTypeDriverNotification {
		var push struct {
			UserID  string          `json:"user_id"`
			Type    string          `json:"type"`
			Title   string          `json:"title"`
			Body    string          `json:"body"`
			Payload json.RawMessage `json:"payload"`
		}
		if err := json.Unmarshal(rawPayload, &push); err != nil {
			return err
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

	// 1. Persist to database for all users of the target roles.
	inserted, err := s.persistForRoles(ctx, targetRoles, eventType, title, body, payloadStr)
	if err != nil {
		// Log and continue — real-time push should still happen even if DB is degraded.
		s.logger.Error("Failed to persist notifications", "event_type", eventType, "error", err)
	} else {
		s.logger.Info("Persisted notifications", "event_type", eventType, "count", inserted)
	}

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

// persistForRoles is a thin wrapper that skips DB work when repo is nil (degraded mode).
func (s *NotificationService) persistForRoles(
	ctx context.Context, roles []string,
	eventType, title, body, payloadJSON string,
) (int, error) {
	if s.repo == nil {
		return 0, nil
	}
	return s.repo.CreateForRoles(ctx, roles, eventType, title, body, payloadJSON)
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
