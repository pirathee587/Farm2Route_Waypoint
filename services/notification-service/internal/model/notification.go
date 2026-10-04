package model

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ─── Domain Entity ────────────────────────────────────────────────────────────

// Notification is the persisted notification record in the database.
type Notification struct {
	NotificationID string     `json:"notification_id"`
	UserID         string     `json:"user_id"`
	EventType      string     `json:"event_type"`
	Title          string     `json:"title"`
	Body           string     `json:"body"`
	PayloadJSON    string     `json:"payload_json,omitempty"`
	Read           bool       `json:"read"`
	CreatedAt      time.Time  `json:"created_at"`
	ReadAt         *time.Time `json:"read_at,omitempty"`
}

// ─── Event Types (RabbitMQ routing keys / event_type enum) ───────────────────

const (
	EventTypeOrderDeferred       = "ORDER_DEFERRED"
	EventTypeAllocationCompleted = "ALLOCATION_COMPLETED"
	EventTypeDeliveryCompleted   = "DELIVERY_COMPLETED"
	EventTypeFlagRaised          = "FLAG_RAISED"
	EventTypeSystem              = "SYSTEM"
	EventTypeDriverNotification  = "DRIVER_NOTIFICATION_PUSH"
)

// ─── Target Roles ─────────────────────────────────────────────────────────────

const (
	RoleDispatcher   = "DISPATCHER"
	RoleLoader       = "LOADER"
	RoleDriver       = "DRIVER"
	RoleStoreManager = "STORE_MANAGER"
	RoleAdmin        = "ADMIN"
)

// EventToTargetRoles maps RabbitMQ event types to the roles that should receive them.
var EventToTargetRoles = map[string][]string{
	EventTypeOrderDeferred:       {RoleStoreManager, RoleDispatcher},
	EventTypeAllocationCompleted: {RoleLoader},
	EventTypeDeliveryCompleted:   {RoleStoreManager, RoleDispatcher},
	EventTypeFlagRaised:          {RoleDispatcher},
}

// ─── Incoming RabbitMQ Event Payloads ─────────────────────────────────────────

// FlagRaisedEvent is the payload published by the loading service when a shortfall is created.
type FlagRaisedEvent struct {
	ShortfallRef string `json:"shortfall_ref"`
	TripID       string `json:"trip_id"`
	TripCode     string `json:"trip_code"`
	ItemSKU      string `json:"item_sku"`
	ItemName     string `json:"item_name"`
	Reason       string `json:"reason"`
	ReportedByID string `json:"reported_by_id"`
	CreatedAt    string `json:"created_at"`
}

// OrderDeferredEvent is published by planning service when an order is deferred.
type OrderDeferredEvent struct {
	OrderID    string `json:"order_id"`
	OrderRef   string `json:"order_ref"`
	OutletName string `json:"outlet_name"`
	Reason     string `json:"reason"`
	DeferredAt string `json:"deferred_at"`
}

// AllocationCompletedEvent is published when a trip allocation is finalized.
type AllocationCompletedEvent struct {
	TripID      string `json:"trip_id"`
	TripCode    string `json:"trip_code"`
	Destination string `json:"destination"`
	StopCount   int    `json:"stop_count"`
	AllocatedAt string `json:"allocated_at"`
}

// DeliveryCompletedEvent is published by the loading service when delivery finishes.
type DeliveryCompletedEvent struct {
	TripID      string `json:"trip_id"`
	TripCode    string `json:"trip_code"`
	Destination string `json:"destination"`
	CompletedAt string `json:"completed_at"`
}

// ─── REST API models ──────────────────────────────────────────────────────────

// NotificationListResponse is returned by GET /api/notify/notifications.
type NotificationListResponse struct {
	Notifications []Notification `json:"notifications"`
	Total         int            `json:"total"`
	UnreadCount   int            `json:"unread_count"`
}

// MarkReadRequest is the body for PATCH /api/notify/notifications/read.
type MarkReadRequest struct {
	// Empty slice = mark all as read for the user.
	NotificationIDs []string `json:"notification_ids"`
}

// MarkReadResponse is returned after marking notifications read.
type MarkReadResponse struct {
	MarkedCount int    `json:"marked_count"`
	Message     string `json:"message"`
}

// ─── Error handling ───────────────────────────────────────────────────────────

// AppError is the standard JSON error envelope for this service.
type AppError struct {
	Message string `json:"error"`
	Code    string `json:"code"`
	Status  int    `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// WriteJSON writes the error as a JSON HTTP response.
func (e *AppError) WriteJSON(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	status := e.Status
	if status == 0 {
		status = http.StatusInternalServerError
	}
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(e)
}

const (
	ErrCodeUnauthorized      = "UNAUTHORIZED"
	ErrCodeForbidden         = "FORBIDDEN"
	ErrCodeNotFound          = "NOT_FOUND"
	ErrCodeBadRequest        = "BAD_REQUEST"
	ErrCodeInternal          = "INTERNAL_ERROR"
	ErrCodeGatewayUnverified = "GATEWAY_UNVERIFIED"
)

func newAppError(code, message string, status int) *AppError {
	return &AppError{Code: code, Message: message, Status: status}
}

func ErrUnauthorized(msg string) *AppError {
	if msg == "" {
		msg = "Authentication credentials missing or invalid"
	}
	return newAppError(ErrCodeUnauthorized, msg, http.StatusUnauthorized)
}

func ErrForbidden(msg string) *AppError {
	if msg == "" {
		msg = "Insufficient permissions"
	}
	return newAppError(ErrCodeForbidden, msg, http.StatusForbidden)
}

func ErrNotFound(msg string) *AppError {
	if msg == "" {
		msg = "Resource not found"
	}
	return newAppError(ErrCodeNotFound, msg, http.StatusNotFound)
}

func ErrBadRequest(msg string) *AppError {
	if msg == "" {
		msg = "Invalid request payload or parameters"
	}
	return newAppError(ErrCodeBadRequest, msg, http.StatusBadRequest)
}

func ErrInternal(msg string) *AppError {
	if msg == "" {
		msg = "An unexpected internal error occurred"
	}
	return newAppError(ErrCodeInternal, msg, http.StatusInternalServerError)
}
