package model

// AllocationCompletedEvent is the planning -> loading RabbitMQ contract.
type AllocationCompletedEvent struct {
	Date      string           `json:"date"`
	Revision  int              `json:"revision"`
	UpdatedBy string           `json:"updated_by"`
	Trips     []AllocationTrip `json:"trips"`
}

type AllocationTrip struct {
	TripID    string           `json:"trip_id"`
	VehicleID string           `json:"vehicle_id"`
	DriverID  string           `json:"driver_id"`
	TripNo    int              `json:"trip_no"`
	Dock      string           `json:"dock"`
	Stops     []AllocationStop `json:"stops"`
}

type AllocationStop struct {
	StopID   string            `json:"stop_id"`
	Sequence int               `json:"sequence"`
	OutletID string            `json:"outlet_id"`
	Outlet   string            `json:"outlet_name"`
	District string            `json:"district"`
	BayInfo  string            `json:"bay_info"`
	Tag      string            `json:"tag"`
	Orders   []AllocationOrder `json:"orders"`
}

type AllocationOrder struct {
	OrderID string           `json:"order_id"`
	Items   []AllocationItem `json:"items"`
}

type AllocationItem struct {
	ItemID      string   `json:"item_id"`
	SKU         string   `json:"sku"`
	Name        string   `json:"name"`
	ExpectedQty int      `json:"expected_qty"`
	Unit        string   `json:"unit"`
	WeightKg    float64  `json:"weight_kg"`
	Tags        []string `json:"tags"`
}
