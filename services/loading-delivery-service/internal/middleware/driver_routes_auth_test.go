package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEveryDriverRouteRequiresVerifiedDriver(t *testing.T) {
	routes := []string{
		"/api/delivery/driver/today", "/api/delivery/driver/trips/x/stops", "/api/delivery/driver/dispatcher-contact",
		"/api/delivery/driver/stops/x", "/api/delivery/driver/stops/x/arrive", "/api/delivery/driver/stops/x/window-status",
		"/api/delivery/driver/cant-deliver/reasons", "/api/delivery/driver/stops/x/cant-deliver", "/api/delivery/driver/stops/x/pod",
		"/api/delivery/driver/stops/x/pod/signature", "/api/delivery/driver/stops/x/pod/photo", "/api/delivery/driver/stops/x/confirm",
		"/api/delivery/driver/trips/x/route", "/api/delivery/driver/trips/x/route/geometry", "/api/delivery/driver/profile",
		"/api/delivery/driver/heartbeat", "/api/delivery/driver/history", "/api/delivery/driver/notifications",
		"/api/delivery/driver/notifications/x/review", "/api/delivery/driver/notifications/read-all", "/api/delivery/driver/notifications/history",
		"/api/delivery/driver/sync", "/api/delivery/driver/sync/verify", "/api/delivery/driver/sync/conflicts",
		"/api/delivery/driver/sync/media/x", "/api/delivery/driver/trips/x/summary", "/api/delivery/driver/trips/x/outcomes",
		"/api/delivery/driver/trips/x/complete",
	}
	h := GatewayAuthMiddleware(RequireDriver(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })))
	for _, route := range routes {
		t.Run(route+"/gateway", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, route, nil)
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)
			require.NotEqual(t, http.StatusNoContent, rr.Code)
		})
		t.Run(route+"/role", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, route, nil)
			req.Header.Set("X-Gateway-Verified", "true")
			req.Header.Set("X-User-Id", "22222222-2222-2222-2222-222222222214")
			req.Header.Set("X-User-Role", "DISPATCHER")
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)
			require.Equal(t, http.StatusForbidden, rr.Code)
		})
	}
}
