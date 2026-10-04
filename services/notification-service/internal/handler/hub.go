// Package handler provides the WebSocket hub and HTTP handlers for the notification service.
package handler

import (
	"log/slog"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// client represents a single WebSocket connection with its user metadata.
type client struct {
	conn   *websocket.Conn
	userID string
	role   string
	send   chan []byte
	hub    *Hub
}

// Hub maintains the registry of active WebSocket clients and broadcasts messages
// to connected clients filtered by role.
//
// The Hub is safe for concurrent use from multiple goroutines.
type Hub struct {
	mu      sync.RWMutex
	clients map[*client]struct{}
	logger  *slog.Logger

	// ping/pong configuration
	pingInterval time.Duration
	pongWait     time.Duration
}

// NewHub creates a new WebSocket hub with the given timing configuration.
func NewHub(pingInterval, pongWait time.Duration, logger *slog.Logger) *Hub {
	if pingInterval <= 0 {
		pingInterval = 30 * time.Second
	}
	if pongWait <= 0 {
		pongWait = 60 * time.Second
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Hub{
		clients:      make(map[*client]struct{}),
		logger:       logger.With(slog.String("component", "ws_hub")),
		pingInterval: pingInterval,
		pongWait:     pongWait,
	}
}

// register adds a client to the hub.
func (h *Hub) register(c *client) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	h.logger.Info("WebSocket client connected", "userID", c.userID, "role", c.role)
}

// unregister removes a client from the hub and closes its send channel.
func (h *Hub) unregister(c *client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		delete(h.clients, c)
		close(c.send)
	}
	h.mu.Unlock()
	h.logger.Info("WebSocket client disconnected", "userID", c.userID, "role", c.role)
}

// BroadcastToRoles sends a JSON message to all connected clients whose role
// is in the targetRoles list. Returns the number of clients that received it.
func (h *Hub) BroadcastToRoles(targetRoles []string, message []byte) int {
	roleSet := make(map[string]struct{}, len(targetRoles))
	for _, r := range targetRoles {
		roleSet[r] = struct{}{}
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	sent := 0
	for c := range h.clients {
		if _, ok := roleSet[c.role]; !ok {
			continue
		}
		select {
		case c.send <- message:
			sent++
		default:
			// Client's send buffer is full — drop the message for this client.
			h.logger.Warn("Client send buffer full; dropping message",
				"userID", c.userID, "role", c.role)
		}
	}
	return sent
}

// BroadcastToUser sends a JSON message to all connections belonging to a specific user.
func (h *Hub) BroadcastToUser(userID string, message []byte) int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	sent := 0
	for c := range h.clients {
		if c.userID != userID {
			continue
		}
		select {
		case c.send <- message:
			sent++
		default:
			h.logger.Warn("Client send buffer full; dropping user message", "userID", c.userID)
		}
	}
	return sent
}

// ConnectedCount returns the total number of connected WebSocket clients.
func (h *Hub) ConnectedCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// ─── Per-client read/write pumps ──────────────────────────────────────────────

const clientSendBufSize = 64

// writePump pumps messages from the client's send channel to the WebSocket connection.
// It also sends periodic ping frames to detect dead connections.
func (c *client) writePump() {
	ticker := time.NewTicker(c.hub.pingInterval)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub closed the channel — send close frame.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// readPump reads from the WebSocket connection. It handles pong frames and
// unregisters the client when the connection closes.
//
// The notification service only pushes data; the read pump exists to keep
// the connection alive and detect client disconnects.
func (c *client) readPump() {
	defer func() {
		c.hub.unregister(c)
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(c.hub.pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(c.hub.pongWait))
	})

	for {
		// We don't process inbound messages — just drain them to detect close.
		if _, _, err := c.conn.ReadMessage(); err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.hub.logger.Warn("WebSocket unexpected close", "userID", c.userID, "error", err)
			}
			return
		}
	}
}
