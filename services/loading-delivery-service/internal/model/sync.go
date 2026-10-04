package model

import (
	"encoding/json"
	"time"
)

type SyncAction struct {
	ClientActionID  string          `json:"client_action_id"`
	Type            string          `json:"type"`
	StopID          string          `json:"stop_id"`
	ClientTimestamp time.Time       `json:"client_timestamp"`
	Payload         json.RawMessage `json:"payload"`
}
type SyncRequest struct {
	Actions []SyncAction `json:"actions"`
}
type SyncResult struct {
	ClientActionID string `json:"client_action_id"`
	Type           string `json:"type"`
	StopID         string `json:"stop_id"`
	Label          string `json:"label"`
	Status         string `json:"status"`
	ErrorCode      string `json:"error_code,omitempty"`
	Message        string `json:"message,omitempty"`
}
type RouteChange struct {
	Type       string    `json:"type"`
	TripID     string    `json:"trip_id"`
	StopSeq    int       `json:"stop_seq"`
	OutletID   string    `json:"outlet_id"`
	OutletName string    `json:"outlet_name"`
	ChangedAt  time.Time `json:"changed_at"`
	ChangedBy  string    `json:"changed_by"`
}
type SyncConflict struct {
	ClientActionID       string `json:"client_action_id"`
	StopID               string `json:"stop_id"`
	OutletID             string `json:"outlet_id"`
	Code                 string `json:"code"`
	Message              string `json:"message"`
	RequiresDriverAction bool   `json:"requires_driver_action"`
}
type SyncResponse struct {
	Results               []SyncResult   `json:"results"`
	SyncedCount           int            `json:"synced_count"`
	DuplicateCount        int            `json:"duplicate_count"`
	ConflictCount         int            `json:"conflict_count"`
	FailedCount           int            `json:"failed_count"`
	Total                 int            `json:"total"`
	RouteChanges          []RouteChange  `json:"route_changes"`
	Conflicts             []SyncConflict `json:"conflicts"`
	PendingMediaActionIDs []string       `json:"pending_media_action_ids"`
	LastSyncedAt          time.Time      `json:"last_synced_at"`
}
type SyncVerifyRequest struct {
	ClientActionIDs []string `json:"client_action_ids"`
}
type SyncVerifyItem struct {
	ClientActionID string `json:"client_action_id"`
	Status         string `json:"status"`
}
type SyncMediaResponse struct {
	ClientActionID string `json:"client_action_id"`
	PodMediaStatus string `json:"pod_media_status"`
	SignatureURL   string `json:"signature_url"`
	PhotoURL       string `json:"photo_url"`
}
type SyncConflictRecord struct {
	ClientActionID string          `json:"client_action_id"`
	StopID         string          `json:"stop_id"`
	TripID         string          `json:"trip_id"`
	OutletID       string          `json:"outlet_id"`
	Type           string          `json:"type"`
	Code           string          `json:"code"`
	Status         string          `json:"status"`
	RecordedAt     time.Time       `json:"recorded_at"`
	Payload        json.RawMessage `json:"payload"`
}
