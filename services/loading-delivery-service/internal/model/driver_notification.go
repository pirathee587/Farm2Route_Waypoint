package model

import (
	"encoding/json"
	"time"
)

type DriverNotification struct {
	ID        string          `json:"id"`
	Type      string          `json:"type"`
	Title     string          `json:"title"`
	Body      string          `json:"body"`
	EntityRef string          `json:"entity_ref"`
	Payload   json.RawMessage `json:"payload"`
	CreatedAt time.Time       `json:"created_at"`
	IsRead    bool            `json:"is_read"`
}
type DriverNotificationsResponse struct {
	UnreadCount int                  `json:"unread_count"`
	Pinned      *DriverNotification  `json:"pinned"`
	PinnedCount int                  `json:"pinned_count,omitempty"`
	Items       []DriverNotification `json:"items"`
}
type NotificationHistoryResponse struct {
	Items    []DriverNotification `json:"items"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"page_size"`
	Total    int                  `json:"total"`
}
