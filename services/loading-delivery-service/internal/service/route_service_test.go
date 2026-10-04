package service

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type fakeRouteRepo struct {
	data model.RouteTripData
	err  error
}

func (f *fakeRouteRepo) GetTripRoute(context.Context, uuid.UUID, uuid.UUID) (model.RouteTripData, error) {
	return f.data, f.err
}
func (f *fakeRouteRepo) FallbackTravel(context.Context, string, string, bool, time.Time) (float64, int, error) {
	return 12.5, 18, nil
}
func routeFixture() model.RouteTripData {
	return model.RouteTripData{TripNumber: 1, VehicleID: "VEH014", Depot: model.RouteDepot{Name: "Peliyagoda", Lat: 6.96, Lng: 79.878}, Stops: []model.RouteStop{{StopID: uuid.NewString(), Seq: 1, OutletID: "OUT001", Name: "FreshMart", District: "Colombo", Lat: 6.92, Lng: 79.86, DeliveryStatus: "DELIVERED"}, {StopID: uuid.NewString(), Seq: 2, OutletID: "REM", Removed: true}, {StopID: uuid.NewString(), Seq: 3, OutletID: "OUT027", Name: "Style Mall", District: "Kandy", Lat: 7.29, Lng: 80.63, Temperature: "ambient", Constraint: "van_only"}}}
}
func TestRouteSelectionRemovedAndProgress(t *testing.T) {
	s := NewRouteService(&fakeRouteRepo{data: routeFixture()}, "")
	got, err := s.Route(context.Background(), uuid.New(), uuid.New(), nil)
	require.NoError(t, err)
	require.Len(t, got.Stops, 2)
	require.Equal(t, "OUT027", got.NextStop.OutletID)
	require.Equal(t, 1, got.Progress.Completed)
	require.Equal(t, 2, got.Progress.Total)
	require.Equal(t, "fallback", got.RouteSource)
}
func TestMapboxSuccessAndCache(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"routes":[{"distance":12500,"duration":1080,"geometry":{"type":"LineString","coordinates":[[79.878,6.96],[80.63,7.29]]},"legs":[{"steps":[{"distance":500,"maneuver":{"instruction":"Continue on A9","type":"turn"}}]}]}]}`))
	}))
	defer server.Close()
	s := NewRouteService(&fakeRouteRepo{data: routeFixture()}, "test-token")
	s.trafficBaseURL = server.URL
	s.client = server.Client()
	first, err := s.Route(context.Background(), uuid.New(), uuid.New(), nil)
	require.NoError(t, err)
	require.Equal(t, "mapbox", first.RouteSource)
	require.Equal(t, "Continue on A9", first.NextInstruction.Text)
	_, err = s.Route(context.Background(), uuid.New(), uuid.New(), nil)
	require.NoError(t, err)
	require.Equal(t, int32(1), atomic.LoadInt32(&calls))
}
func TestMapboxProfileAndRoundedGPSCache(t *testing.T) {
	var calls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		_, _ = w.Write([]byte(`{"routes":[{"distance":1000,"duration":60,"geometry":{"type":"LineString","coordinates":[[79.878,6.96],[80.63,7.29]]},"legs":[{"steps":[]}]}]}`))
	}))
	defer server.Close()
	s := NewRouteService(&fakeRouteRepo{data: routeFixture()}, "masked-test-token")
	require.Contains(t, s.trafficBaseURL, "/driving-traffic")
	require.True(t, strings.HasSuffix(s.baseURL, "/driving"))
	s.trafficBaseURL, s.client = server.URL, server.Client()
	_, err := s.Route(context.Background(), uuid.New(), uuid.New(), &model.Coordinate{Lat: 6.96001, Lng: 79.87801})
	require.NoError(t, err)
	_, err = s.Route(context.Background(), uuid.New(), uuid.New(), &model.Coordinate{Lat: 6.96002, Lng: 79.87802})
	require.NoError(t, err)
	require.Equal(t, int32(1), atomic.LoadInt32(&calls))
}
func TestMapboxProfilesAndGeometryChunks(t *testing.T) {
	var trafficCalls, drivingCalls int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.URL.Path, "/driving-traffic/") {
			atomic.AddInt32(&trafficCalls, 1)
		}
		if strings.Contains(r.URL.Path, "/driving/") {
			atomic.AddInt32(&drivingCalls, 1)
		}
		parts := strings.Split(r.URL.Path[strings.LastIndex(r.URL.Path, "/")+1:], ";")
		coords := make([]string, 0, len(parts))
		for _, p := range parts {
			xy := strings.Split(p, ",")
			coords = append(coords, "["+xy[0]+","+xy[1]+"]")
		}
		_, _ = w.Write([]byte(`{"routes":[{"distance":1000,"duration":60,"geometry":{"type":"LineString","coordinates":[` + strings.Join(coords, ",") + `]},"legs":[{"steps":[]}]}]}`))
	}))
	defer server.Close()
	data := routeFixture()
	data.Stops = nil
	for i := 0; i < 30; i++ {
		data.Stops = append(data.Stops, model.RouteStop{StopID: uuid.NewString(), Seq: i + 1, OutletID: fmt.Sprintf("OUT%03d", i), Lat: 6.9 + float64(i)/1000, Lng: 79.8 + float64(i)/1000})
	}
	s := NewRouteService(&fakeRouteRepo{data: data}, "token")
	s.trafficBaseURL = server.URL + "/driving-traffic"
	s.baseURL = server.URL + "/driving"
	s.client = server.Client()
	_, err := s.Route(context.Background(), uuid.New(), uuid.New(), nil)
	require.NoError(t, err)
	geometry, err := s.Geometry(context.Background(), uuid.New(), uuid.New())
	require.NoError(t, err)
	require.Equal(t, int32(1), atomic.LoadInt32(&trafficCalls))
	require.Equal(t, int32(2), atomic.LoadInt32(&drivingCalls))
	require.Len(t, geometry.RouteGeometry.Coordinates, 31)
}
func TestMapboxTimeoutFallsBack(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { time.Sleep(100 * time.Millisecond) }))
	defer server.Close()
	s := NewRouteService(&fakeRouteRepo{data: routeFixture()}, "test-token")
	s.trafficBaseURL = server.URL
	s.client = &http.Client{Timeout: 10 * time.Millisecond}
	got, err := s.Route(context.Background(), uuid.New(), uuid.New(), nil)
	require.NoError(t, err)
	require.Equal(t, "fallback", got.RouteSource)
	require.Equal(t, 18, got.NextStop.ETAMin)
}
func TestMissingMapboxTokenFallsBack(t *testing.T) {
	s := NewRouteService(&fakeRouteRepo{data: routeFixture()}, "")
	got, err := s.Route(context.Background(), uuid.New(), uuid.New(), nil)
	require.NoError(t, err)
	require.Equal(t, "fallback", got.RouteSource)
}
func TestRouteOwnershipErrors(t *testing.T) {
	for _, tc := range []struct {
		name   string
		err    error
		status int
	}{{"cross driver", model.ErrForbidden("Trip belongs to another driver"), 403}, {"unknown trip", model.ErrNotFound("Trip not found"), 404}} {
		t.Run(tc.name, func(t *testing.T) {
			s := NewRouteService(&fakeRouteRepo{err: tc.err}, "")
			_, err := s.Route(context.Background(), uuid.New(), uuid.New(), nil)
			require.Equal(t, tc.status, err.(*model.AppError).Status)
		})
	}
}
