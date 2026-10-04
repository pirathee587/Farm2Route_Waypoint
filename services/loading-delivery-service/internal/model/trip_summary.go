package model

import "time"

type TripOutcome struct {
	StopID      string    `json:"stop_id"`
	Seq         int       `json:"seq"`
	OutletID    string    `json:"outlet_id"`
	OutletName  string    `json:"outlet_name"`
	Outcome     string    `json:"outcome"`
	CompletedAt time.Time `json:"completed_at"`
}
type AttentionRecord struct {
	Type       string `json:"type"`
	OutletID   string `json:"outlet_id"`
	OutletName string `json:"outlet_name"`
	Detail     string `json:"detail"`
	Sent       bool   `json:"sent"`
}
type TripSummary struct {
	TripID            string            `json:"trip_id"`
	TripNumber        int               `json:"trip_number"`
	VehicleID         string            `json:"vehicle_id"`
	Date              string            `json:"date"`
	Status            string            `json:"status"`
	TotalStops        int               `json:"total_stops"`
	Delivered         int               `json:"delivered"`
	NotDelivered      int               `json:"not_delivered"`
	Partial           int               `json:"partial"`
	CompletionPercent int               `json:"completion_percent"`
	Outcomes          []TripOutcome     `json:"outcomes"`
	MoreOutcomesCount int               `json:"more_outcomes_count"`
	AttentionRecords  []AttentionRecord `json:"attention_records"`
}
type TripOutcomePage struct {
	Items      []TripOutcome `json:"items"`
	Page       int           `json:"page"`
	PageSize   int           `json:"page_size"`
	Total      int           `json:"total"`
	TotalPages int           `json:"total_pages"`
}
