package model

import "github.com/google/uuid"

import "time"

type DriverSummary struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type DriverVehicle struct {
	ID    string `json:"id"`
	Type  string `json:"type"`
	Depot string `json:"depot"`
}

type DriverStop struct {
	StopID      string `json:"stop_id"`
	Seq         int    `json:"seq"`
	OutletID    string `json:"outlet_id"`
	OutletName  string `json:"outlet_name"`
	District    string `json:"district"`
	WindowOpen  string `json:"window_open"`
	WindowClose string `json:"window_close"`
	Status      string `json:"status"`
}

type DriverTrip struct {
	ID              string       `json:"trip_id"`
	TripNumber      int          `json:"trip_number"`
	Status          string       `json:"status"`
	TotalStops      int          `json:"total_stops"`
	CompletedStops  int          `json:"completed_stops"`
	ProgressPercent int          `json:"progress_percent"`
	Stops           []DriverStop `json:"stops"`
}

type DriverTodayResponse struct {
	Driver  DriverSummary `json:"driver"`
	Vehicle DriverVehicle `json:"vehicle"`
	Trips   []DriverTrip  `json:"trips"`
}

type DriverTripRecord struct {
	ID         string
	TripNumber int
	Status     string
}

type DriverStopRecord struct {
	StopID         string
	Seq            int
	OutletID       string
	OutletName     string
	District       string
	WindowOpen     string
	WindowClose    string
	Removed        bool
	Outcome        string
	ArrivalStatus  string
	DeliveryStatus string
}

type DispatcherContact struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type StopOutlet struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	District string `json:"district"`
}

type DeliveryWindow struct {
	Open  string `json:"open"`
	Close string `json:"close"`
}

type StopItem struct {
	Name            string  `json:"name"`
	Units           int     `json:"units"`
	WeightKg        float64 `json:"weight_kg"`
	TempRequirement string  `json:"temp_requirement"`
}

type StopTotals struct {
	Units    int     `json:"units"`
	WeightKg float64 `json:"weight_kg"`
}

type PreviousSkip struct {
	Reason string `json:"reason"`
	Date   string `json:"date"`
}

type DriverStopDetail struct {
	StopNo         int            `json:"stop_no"`
	Status         string         `json:"status"`
	Outlet         StopOutlet     `json:"outlet"`
	DeliveryWindow DeliveryWindow `json:"delivery_window"`
	AccessNote     string         `json:"access_note"`
	Requirements   []string       `json:"requirements"`
	Items          []StopItem     `json:"items"`
	Totals         StopTotals     `json:"totals"`
	PreviousSkip   *PreviousSkip  `json:"previous_skip"`
	CanArrive      bool           `json:"can_arrive"`
}

type DriverStopDetailRecord struct {
	StopID            uuid.UUID
	TripID            uuid.UUID
	StopNo            int
	OutletID          string
	OutletName        string
	District          string
	WindowOpen        string
	WindowClose       string
	ParkingConstraint string
	DockType          string
	MallWindow        string
	BayInfo           string
	Removed           bool
	Outcome           string
	ArrivalStatus     string
	DeliveryStatus    string
	CanArrive         bool
}

type ArriveRequest struct {
	ClientActionID string     `json:"client_action_id"`
	ArrivedAt      *time.Time `json:"arrived_at,omitempty"`
}

type ArrivalRecord struct {
	Status         string
	ArrivedAt      time.Time
	WindowOpensAt  time.Time
	WindowClosesAt time.Time
	Late           bool
}

type ArrivalResponse struct {
	Status                   string     `json:"status"`
	ArrivedAt                time.Time  `json:"arrived_at"`
	WindowOpensAt            *time.Time `json:"window_opens_at,omitempty"`
	MinutesUntilOpen         *int       `json:"minutes_until_open,omitempty"`
	ArrivedActionAvailableAt *time.Time `json:"arrived_action_available_at,omitempty"`
	Late                     bool       `json:"late,omitempty"`
}

type WindowStatusResponse struct {
	CurrentTime      time.Time `json:"current_time"`
	WindowOpensAt    time.Time `json:"window_opens_at"`
	MinutesUntilOpen int       `json:"minutes_until_open"`
	CanMarkArrived   bool      `json:"can_mark_arrived"`
	Status           string    `json:"status"`
}

type CantDeliverReason struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}
type CantDeliverRequest struct {
	ClientActionID string     `json:"client_action_id"`
	Reason         string     `json:"reason"`
	Note           string     `json:"note,omitempty"`
	ReportedAt     *time.Time `json:"reported_at"`
}
type CantDeliverResponse struct {
	Status     string  `json:"status"`
	RecordSent bool    `json:"record_sent"`
	NextStopID *string `json:"next_stop_id"`
}

type PODItem struct {
	ItemID       string `json:"item_id"`
	Name         string `json:"name"`
	OrderedQty   int    `json:"ordered_qty"`
	DeliveredQty int    `json:"delivered_qty"`
	Status       string `json:"status"`
}
type PODOutlet struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
type PODResponse struct {
	Outlet            PODOutlet `json:"outlet"`
	ArrivedAt         time.Time `json:"arrived_at"`
	Items             []PODItem `json:"items"`
	AllItemsDelivered bool      `json:"all_items_delivered"`
}
type PODUploadResponse struct {
	URL        string    `json:"url"`
	UploadedAt time.Time `json:"uploaded_at"`
}
type ConfirmItem struct {
	ItemID       string `json:"item_id"`
	DeliveredQty int    `json:"delivered_qty"`
}
type ConfirmShortfall struct {
	ItemID string `json:"item_id"`
	Qty    int    `json:"qty"`
	Type   string `json:"type"`
	Note   string `json:"note"`
}
type ConfirmDeliveryRequest struct {
	ClientActionID string             `json:"client_action_id"`
	Items          []ConfirmItem      `json:"items"`
	Shortfalls     []ConfirmShortfall `json:"shortfalls"`
	ReceiverName   string             `json:"receiver_name"`
	SignatureURL   string             `json:"signature_url"`
	PhotoURL       string             `json:"photo_url"`
	Note           string             `json:"note"`
	CompletedAt    *time.Time         `json:"completed_at"`
}
type ConfirmDeliveryResponse struct {
	Outcome     string    `json:"outcome"`
	CompletedAt time.Time `json:"completed_at"`
	NextStopID  *string   `json:"next_stop_id"`
}
type PODContext struct {
	StopID        uuid.UUID
	TripID        uuid.UUID
	DriverID      uuid.UUID
	OutletID      string
	OutletName    string
	VehicleID     string
	ArrivedAt     time.Time
	Items         []PODItem
	SignatureURLs map[string]bool
	PhotoURLs     map[string]bool
}
