package handler

import (
	"context"
	"errors"
	"net/http/httptest"
	"testing"
)

type fixturePing struct{ err error }

func (p fixturePing) Ping(context.Context) error { return p.err }
func TestOriginAllowlist(t *testing.T) {
	t.Setenv("WS_ALLOWED_ORIGINS", "https://farm2-route-waypoint.vercel.app")
	for _, origin := range []string{"", "https://evil.example", "https://farm2-route-waypoint.vercel.app.evil.example", "https://farm2-route-waypoint.vercel.app"} {
		r := httptest.NewRequest("GET", "/api/notify/ws", nil)
		r.Header.Set("Origin", origin)
		if allowedOrigin(r) != (origin == "https://farm2-route-waypoint.vercel.app") {
			t.Fatalf("unexpected origin decision for %q", origin)
		}
	}
}
func TestReadinessRequiresDatabaseAndBroker(t *testing.T) {
	for _, tt := range []struct {
		db     error
		broker bool
		want   int
	}{{nil, true, 200}, {errors.New("unavailable"), true, 503}, {nil, false, 503}} {
		h := NewHealthHandler(fixturePing{tt.db}, func() bool { return tt.broker })
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", "/health", nil))
		if rec.Code != tt.want {
			t.Fatalf("want %d got %d", tt.want, rec.Code)
		}
	}
	rec := httptest.NewRecorder()
	NewHealthHandler(nil).ServeHTTP(rec, httptest.NewRequest("GET", "/health", nil))
	if rec.Code != 503 {
		t.Fatal("nil DB must fail readiness")
	}
}
