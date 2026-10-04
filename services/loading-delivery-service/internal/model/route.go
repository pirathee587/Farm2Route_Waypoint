package model

import "github.com/google/uuid"

type Coordinate struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}
type RouteDepot struct {
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}
type RouteStop struct {
	StopID         string  `json:"stop_id,omitempty"`
	Seq            int     `json:"seq"`
	OutletID       string  `json:"outlet_id"`
	Name           string  `json:"name"`
	District       string  `json:"district,omitempty"`
	Lat            float64 `json:"lat"`
	Lng            float64 `json:"lng"`
	Status         string  `json:"status"`
	WindowOpen     string  `json:"window_open"`
	WindowClose    string  `json:"window_close"`
	Temperature    string  `json:"-"`
	Constraint     string  `json:"-"`
	Removed        bool    `json:"-"`
	Outcome        string  `json:"-"`
	ArrivalStatus  string  `json:"-"`
	DeliveryStatus string  `json:"-"`
}
type RouteNextStop struct {
	StopID      string  `json:"stop_id"`
	OutletID    string  `json:"outlet_id"`
	Name        string  `json:"name"`
	District    string  `json:"district"`
	Status      string  `json:"status"`
	WindowOpen  string  `json:"window_open"`
	WindowClose string  `json:"window_close"`
	DistanceKm  float64 `json:"distance_km"`
	ETAMin      int     `json:"eta_min"`
	Temperature string  `json:"temperature"`
	Constraint  string  `json:"constraint"`
}
type RouteInstruction struct {
	Text      string  `json:"text"`
	Maneuver  string  `json:"maneuver"`
	DistanceM float64 `json:"distance_m"`
}
type GeoJSONLineString struct {
	Type        string      `json:"type"`
	Coordinates [][]float64 `json:"coordinates"`
}
type RouteProgress struct {
	Completed int `json:"completed"`
	Total     int `json:"total"`
}
type TripTab struct {
	TripNumber int    `json:"trip_number"`
	Label      string `json:"label"`
}
type TripRouteResponse struct {
	TripNumber      int                `json:"trip_number"`
	VehicleID       string             `json:"vehicle_id"`
	TripTabs        []TripTab          `json:"trip_tabs"`
	Depot           RouteDepot         `json:"depot"`
	Stops           []RouteStop        `json:"stops"`
	NextStop        *RouteNextStop     `json:"next_stop"`
	NextInstruction *RouteInstruction  `json:"next_instruction"`
	RouteGeometry   *GeoJSONLineString `json:"route_geometry"`
	Progress        RouteProgress      `json:"progress"`
	RouteSource     string             `json:"route_source"`
}
type RouteGeometryResponse struct {
	RouteGeometry *GeoJSONLineString `json:"route_geometry"`
	RouteSource   string             `json:"route_source"`
}
type RouteTripData struct {
	TripID       uuid.UUID
	TripNumber   int
	VehicleID    string
	DeliveryDate string
	Depot        RouteDepot
	Tabs         []TripTab
	Stops        []RouteStop
}
