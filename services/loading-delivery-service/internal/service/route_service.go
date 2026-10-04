package service

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"
)

type RouteDataRepository interface {
	GetTripRoute(context.Context, uuid.UUID, uuid.UUID) (model.RouteTripData, error)
	FallbackTravel(context.Context, string, string, bool, time.Time) (float64, int, error)
}
type cachedDirection struct {
	value   directionResult
	expires time.Time
}
type RouteService struct {
	repo                           RouteDataRepository
	token, trafficBaseURL, baseURL string
	client                         *http.Client
	now                            func() time.Time
	mu                             sync.Mutex
	cache                          map[string]cachedDirection
}
type directionResult struct {
	Geometry    model.GeoJSONLineString
	DistanceKm  float64
	ETAMin      int
	Instruction *model.RouteInstruction
}

func NewRouteService(repo RouteDataRepository, token string) *RouteService {
	return &RouteService{repo: repo, token: token, trafficBaseURL: "https://api.mapbox.com/directions/v5/mapbox/driving-traffic", baseURL: "https://api.mapbox.com/directions/v5/mapbox/driving", client: &http.Client{Timeout: 5 * time.Second}, now: time.Now, cache: map[string]cachedDirection{}}
}
func (s *RouteService) Route(ctx context.Context, driverID, tripID uuid.UUID, current *model.Coordinate) (*model.TripRouteResponse, error) {
	data, err := s.repo.GetTripRoute(ctx, driverID, tripID)
	if err != nil {
		return nil, err
	}
	stops, next, progress := deriveRouteStops(data.Stops)
	origin := model.Coordinate{Lat: data.Depot.Lat, Lng: data.Depot.Lng}
	fromDepot := true
	// Browsers running on a developer machine can report a real GPS position
	// thousands of kilometres away from the assigned Sri Lankan trip. Using it
	// produces an ocean-spanning line and meaningless distance/ETA values. Only
	// use device GPS when it is plausibly within the trip's operating area.
	if current != nil && validCoordinate(*current) && (!validCoordinate(origin) || haversine(origin, *current) <= 250) {
		origin = *current
		fromDepot = false
	} else {
		for i := len(stops) - 1; i >= 0; i-- {
			if routeCompleted(stops[i].Status) {
				origin = model.Coordinate{Lat: stops[i].Lat, Lng: stops[i].Lng}
				fromDepot = false
				break
			}
		}
	}
	response := &model.TripRouteResponse{TripNumber: data.TripNumber, VehicleID: data.VehicleID, TripTabs: data.Tabs, Depot: data.Depot, Stops: stops, Progress: progress, RouteSource: "fallback"}
	if next == nil {
		return response, nil
	}
	nextStop := &model.RouteNextStop{StopID: next.StopID, OutletID: next.OutletID, Name: next.Name, District: next.District, Status: next.Status, WindowOpen: next.WindowOpen, WindowClose: next.WindowClose, Temperature: next.Temperature, Constraint: next.Constraint}
	response.NextStop = nextStop
	dest := model.Coordinate{Lat: next.Lat, Lng: next.Lng}
	// Four-decimal cache coordinates (~11m) prevent harmless GPS jitter from
	// consuming another Directions request while preserving route accuracy.
	key := fmt.Sprintf("%.4f,%.4f:%.4f,%.4f:%s", origin.Lat, origin.Lng, dest.Lat, dest.Lng, next.Status)
	if result, ok := s.directions(ctx, s.trafficBaseURL, []model.Coordinate{origin, dest}, key); ok {
		nextStop.DistanceKm = result.DistanceKm
		nextStop.ETAMin = result.ETAMin
		response.RouteGeometry = &result.Geometry
		response.NextInstruction = result.Instruction
		response.RouteSource = "mapbox"
	} else {
		distance, eta, _ := s.repo.FallbackTravel(ctx, data.Depot.Name, next.District, fromDepot, s.now())
		if distance == 0 {
			distance = haversine(origin, dest)
		}
		nextStop.DistanceKm = math.Round(distance*10) / 10
		nextStop.ETAMin = eta
		if eta == 0 {
			nextStop.ETAMin = int(distance/30*60 + 0.5)
		}
		response.RouteGeometry = straightGeometry([]model.Coordinate{origin, dest})
	}
	return response, nil
}
func (s *RouteService) Geometry(ctx context.Context, driverID, tripID uuid.UUID) (*model.RouteGeometryResponse, error) {
	data, err := s.repo.GetTripRoute(ctx, driverID, tripID)
	if err != nil {
		return nil, err
	}
	stops, _, _ := deriveRouteStops(data.Stops)
	points := []model.Coordinate{}
	statusParts := []string{}
	depotCoordinate := model.Coordinate{Lat: data.Depot.Lat, Lng: data.Depot.Lng}
	if validCoordinate(depotCoordinate) {
		points = append(points, depotCoordinate)
		statusParts = append(statusParts, "depot")
	}
	for _, stop := range stops {
		// A missing database coordinate is returned as 0,0 by the repository.
		// Never send it to Mapbox: it expands the route across the globe.
		if !routeCompleted(stop.Status) && validCoordinate(model.Coordinate{Lat: stop.Lat, Lng: stop.Lng}) {
			points = append(points, model.Coordinate{Lat: stop.Lat, Lng: stop.Lng})
			statusParts = append(statusParts, stop.Status)
		}
	}
	response := &model.RouteGeometryResponse{RouteSource: "fallback", RouteGeometry: straightGeometry(points)}
	if len(points) < 2 {
		return response, nil
	}
	if geometry, ok := s.fullDrivingGeometry(ctx, points, statusParts); ok {
		response.RouteGeometry = geometry
		response.RouteSource = "mapbox"
	}
	return response, nil
}

func (s *RouteService) fullDrivingGeometry(ctx context.Context, points []model.Coordinate, statuses []string) (*model.GeoJSONLineString, bool) {
	merged := &model.GeoJSONLineString{Type: "LineString", Coordinates: [][]float64{}}
	for start := 0; start < len(points)-1; {
		end := start + 25
		if end > len(points) {
			end = len(points)
		}
		chunk := points[start:end]
		parts := make([]string, 0, len(chunk))
		for _, p := range chunk {
			parts = append(parts, fmt.Sprintf("%.4f,%.4f", p.Lng, p.Lat))
		}
		statusEnd := end
		if statusEnd > len(statuses) {
			statusEnd = len(statuses)
		}
		result, ok := s.directions(ctx, s.baseURL, chunk, "full:"+strings.Join(parts, ";")+":"+strings.Join(statuses[start:statusEnd], ","))
		if !ok {
			return nil, false
		}
		coords := result.Geometry.Coordinates
		if len(merged.Coordinates) > 0 && len(coords) > 0 {
			coords = coords[1:]
		}
		merged.Coordinates = append(merged.Coordinates, coords...)
		if end == len(points) {
			break
		}
		start = end - 1
	}
	return merged, len(merged.Coordinates) > 1
}
func deriveRouteStops(raw []model.RouteStop) ([]model.RouteStop, *model.RouteStop, model.RouteProgress) {
	stops := []model.RouteStop{}
	progress := model.RouteProgress{}
	var next *model.RouteStop
	for _, s := range raw {
		if s.Removed {
			continue
		}
		status := "PENDING"
		if s.ArrivalStatus != "" {
			status = s.ArrivalStatus
		}
		if s.DeliveryStatus != "" {
			status = s.DeliveryStatus
		}
		switch s.Outcome {
		case "DELIVERED":
			status = "DELIVERED"
		case "PARTIAL":
			status = "PARTIAL"
		case "ATTEMPTED", "NOT_HOME", "REFUSED":
			status = "NOT_DELIVERED"
		}
		s.Status = status
		progress.Total++
		if routeCompleted(status) {
			progress.Completed++
		} else if next == nil {
			s.Status = "IN_PROGRESS"
			if status == "WAITING_FOR_WINDOW" || status == "ARRIVED" {
				s.Status = status
			}
			copy := s
			next = &copy
		}
		stops = append(stops, s)
	}
	return stops, next, progress
}
func routeCompleted(s string) bool { return s == "DELIVERED" || s == "PARTIAL" || s == "NOT_DELIVERED" }
func (s *RouteService) directions(ctx context.Context, baseURL string, points []model.Coordinate, key string) (directionResult, bool) {
	if s.token == "" {
		return directionResult{}, false
	}
	s.mu.Lock()
	if c, ok := s.cache[key]; ok && s.now().Before(c.expires) {
		s.mu.Unlock()
		return c.value, true
	}
	s.mu.Unlock()
	coords := []string{}
	for _, p := range points {
		coords = append(coords, fmt.Sprintf("%.6f,%.6f", p.Lng, p.Lat))
	}
	u := baseURL + "/" + strings.Join(coords, ";")
	q := url.Values{"access_token": {s.token}, "geometries": {"geojson"}, "steps": {"true"}, "overview": {"full"}}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u+"?"+q.Encode(), nil)
	if err != nil {
		return directionResult{}, false
	}
	resp, err := s.client.Do(req)
	if err != nil {
		return directionResult{}, false
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return directionResult{}, false
	}
	var body struct {
		Routes []struct {
			Distance, Duration float64
			Geometry           model.GeoJSONLineString
			Legs               []struct {
				Steps []struct {
					Distance float64
					Maneuver struct{ Instruction, Type string }
				}
			}
		}
	}
	if json.NewDecoder(resp.Body).Decode(&body) != nil || len(body.Routes) == 0 {
		return directionResult{}, false
	}
	r := body.Routes[0]
	result := directionResult{Geometry: r.Geometry, DistanceKm: math.Round(r.Distance/100) / 10, ETAMin: int(math.Ceil(r.Duration / 60))}
	if len(r.Legs) > 0 && len(r.Legs[0].Steps) > 0 {
		step := r.Legs[0].Steps[0]
		result.Instruction = &model.RouteInstruction{Text: step.Maneuver.Instruction, Maneuver: step.Maneuver.Type, DistanceM: step.Distance}
	}
	s.mu.Lock()
	s.cache[key] = cachedDirection{value: result, expires: s.now().Add(60 * time.Second)}
	s.mu.Unlock()
	return result, true
}
func straightGeometry(points []model.Coordinate) *model.GeoJSONLineString {
	if len(points) < 2 {
		return nil
	}
	g := &model.GeoJSONLineString{Type: "LineString", Coordinates: [][]float64{}}
	for _, p := range points {
		g.Coordinates = append(g.Coordinates, []float64{p.Lng, p.Lat})
	}
	return g
}
func haversine(a, b model.Coordinate) float64 {
	const earth = 6371
	dLat := (b.Lat - a.Lat) * math.Pi / 180
	dLng := (b.Lng - a.Lng) * math.Pi / 180
	x := math.Sin(dLat/2)*math.Sin(dLat/2) + math.Cos(a.Lat*math.Pi/180)*math.Cos(b.Lat*math.Pi/180)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return earth * 2 * math.Atan2(math.Sqrt(x), math.Sqrt(1-x))
}
func validCoordinate(c model.Coordinate) bool {
	return c.Lat >= -90 && c.Lat <= 90 && c.Lng >= -180 && c.Lng <= 180 && (c.Lat != 0 || c.Lng != 0)
}
func ParseCoordinate(latValue, lngValue string) (*model.Coordinate, error) {
	if latValue == "" && lngValue == "" {
		return nil, nil
	}
	if latValue == "" || lngValue == "" {
		return nil, fmt.Errorf("lat and lng must be supplied together")
	}
	lat, err := strconv.ParseFloat(latValue, 64)
	if err != nil || lat < -90 || lat > 90 {
		return nil, fmt.Errorf("invalid latitude")
	}
	lng, err := strconv.ParseFloat(lngValue, 64)
	if err != nil || lng < -180 || lng > 180 {
		return nil, fmt.Errorf("invalid longitude")
	}
	return &model.Coordinate{Lat: lat, Lng: lng}, nil
}
