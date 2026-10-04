package model

import "time"

type ProfileDriver struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	DriverID  string `json:"driver_id"`
	RoleLabel string `json:"role_label"`
}
type ProfileVehicle struct {
	ID     string `json:"id"`
	Type   string `json:"type"`
	Depot  string `json:"depot"`
	Status string `json:"status"`
}
type ProfileConnection struct {
	Status       string     `json:"status"`
	LastSyncedAt *time.Time `json:"last_synced_at"`
}
type DriverProfileResponse struct {
	Driver            ProfileDriver     `json:"driver"`
	Vehicle           ProfileVehicle    `json:"vehicle"`
	Connection        ProfileConnection `json:"connection"`
	OfflineQueueCount int               `json:"offline_queue_count"`
}
type DriverProfileRecord struct {
	Driver              ProfileDriver
	Vehicle             ProfileVehicle
	LastSeenAt          *time.Time
	LastSyncedAt        *time.Time
	PendingActionsCount int
}
type HeartbeatRequest struct {
	ClientTime          time.Time `json:"client_time"`
	PendingActionsCount int       `json:"pending_actions_count"`
}

type LocationUpdateRequest struct {
	Latitude           float64 `json:"latitude"`
	Longitude          float64 `json:"longitude"`
	AccuracyMeters     float64 `json:"accuracy_meters"`
	Heading            *float64 `json:"heading,omitempty"`
	SpeedMetersPerSec  *float64 `json:"speed_meters_per_sec,omitempty"`
}

type LocationUpdateResponse struct {
	RecordedAt time.Time `json:"recorded_at"`
}
type HeartbeatResponse struct {
	ServerTime       time.Time `json:"server_time"`
	ClockSkewSeconds int64     `json:"clock_skew_seconds"`
}
type HistoryTrip struct {
	TripID       string `json:"trip_id"`
	Date         string `json:"date"`
	TripNumber   int    `json:"trip_number"`
	VehicleID    string `json:"vehicle_id"`
	TotalStops   int    `json:"total_stops"`
	Delivered    int    `json:"delivered"`
	NotDelivered int    `json:"not_delivered"`
	Partial      int    `json:"partial"`
	Status       string `json:"status"`
}
type HistoryResponse struct {
	Trips    []HistoryTrip `json:"trips"`
	Page     int           `json:"page"`
	PageSize int           `json:"page_size"`
	Total    int           `json:"total"`
}
