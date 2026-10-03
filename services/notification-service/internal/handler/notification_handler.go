package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/websocket"
	"github.com/waypoint/notification-service/internal/middleware"
	"github.com/waypoint/notification-service/internal/model"
	"github.com/waypoint/notification-service/internal/repository"
)

// upgrader is the gorilla/websocket upgrader. CheckOrigin is permissive here
// because JWT validation is handled upstream by the API Gateway.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Gateway strips the raw JWT and injects X-Gateway-Verified; trust that.
		return true
	},
}

// NotificationHandler handles all REST endpoints and the WebSocket upgrade endpoint.
type NotificationHandler struct {
	hub  *Hub
	repo *repository.NotificationRepository
}

// NewNotificationHandler creates a handler wired to the given hub and repository.
func NewNotificationHandler(hub *Hub, repo *repository.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{hub: hub, repo: repo}
}

// ─── WebSocket Endpoint ───────────────────────────────────────────────────────

// ServeWS upgrades an HTTP request to a WebSocket connection, registers the
// client with the hub, and starts its read/write pumps.
//
// Route: GET /api/notify/ws
func (h *NotificationHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		model.ErrUnauthorized("Gateway user context missing").WriteJSON(w)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		// upgrader writes the HTTP error response if the upgrade fails.
		return
	}

	c := &client{
		conn:   conn,
		userID: user.UserID,
		role:   user.Role,
		send:   make(chan []byte, clientSendBufSize),
		hub:    h.hub,
	}
	h.hub.register(c)

	// Pump goroutines run for the lifetime of the connection.
	go c.writePump()
	c.readPump() // blocks until client disconnects
}

// ─── REST Endpoints ───────────────────────────────────────────────────────────

// GetNotifications handles GET /api/notify/notifications
//
// Query params:
//
//	unread_only=true
//	page=1
//	page_size=20
func (h *NotificationHandler) GetNotifications(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		model.ErrUnauthorized("").WriteJSON(w)
		return
	}

	q := r.URL.Query()
	unreadOnly := strings.ToLower(q.Get("unread_only")) == "true"

	page := 1
	if v := q.Get("page"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	}
	pageSize := 20
	if v := q.Get("page_size"); v != "" {
		if ps, err := strconv.Atoi(v); err == nil && ps > 0 && ps <= 100 {
			pageSize = ps
		}
	}

	notifications, unreadCount, err := h.repo.ListForUser(r.Context(), user.UserID, unreadOnly, page, pageSize)
	if err != nil {
		model.ErrInternal("Failed to retrieve notifications: "+err.Error()).WriteJSON(w)
		return
	}
	if notifications == nil {
		notifications = []model.Notification{}
	}

	resp := model.NotificationListResponse{
		Notifications: notifications,
		Total:         len(notifications),
		UnreadCount:   unreadCount,
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// MarkRead handles PATCH /api/notify/notifications/read
//
// Body (optional): { "notification_ids": ["id1", "id2"] }
// Empty ids or missing body → marks ALL unread notifications as read.
func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		model.ErrUnauthorized("").WriteJSON(w)
		return
	}

	var req model.MarkReadRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			model.ErrBadRequest("Invalid JSON body").WriteJSON(w)
			return
		}
	}

	count, err := h.repo.MarkRead(r.Context(), user.UserID, req.NotificationIDs)
	if err != nil {
		model.ErrInternal("Failed to mark notifications as read: "+err.Error()).WriteJSON(w)
		return
	}

	resp := model.MarkReadResponse{
		MarkedCount: count,
		Message:     "Notifications marked as read",
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// ─── Health ───────────────────────────────────────────────────────────────────

// HealthHandler returns a 200 with basic service status.
type HealthHandler struct {
	pool interface{ Ping(context.Context) error }
}

// NewHealthHandler creates a health handler. pool may be nil (degraded mode).
func NewHealthHandler(pool interface{ Ping(context.Context) error }) *HealthHandler {
	return &HealthHandler{pool: pool}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	status := "ok"
	dbStatus := "ok"
	if h.pool != nil {
		if err := h.pool.Ping(r.Context()); err != nil {
			dbStatus = "degraded: " + err.Error()
		}
	} else {
		dbStatus = "not connected"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"status":   status,
		"database": dbStatus,
		"service":  "notification-service",
	})
}
