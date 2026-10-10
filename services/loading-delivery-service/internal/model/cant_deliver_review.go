package model

import "time"

type CantDeliverReview struct {
	DeferralID string    `json:"deferralId"`
	TripID     string    `json:"tripId"`
	TripCode   string    `json:"tripCode"`
	StopID     string    `json:"stopId"`
	OrderID    string    `json:"orderId"`
	OutletID   string    `json:"outletId"`
	OutletName string    `json:"outletName"`
	Reason     string    `json:"reason"`
	Note       string    `json:"note"`
	DriverID   string    `json:"driverId"`
	DriverName string    `json:"driverName"`
	VehicleID  string    `json:"vehicleId"`
	ReportedAt time.Time `json:"reportedAt"`
	Status     string    `json:"status"`
}
