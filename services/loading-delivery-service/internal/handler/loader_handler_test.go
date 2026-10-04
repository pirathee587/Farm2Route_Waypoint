package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

func TestParseMultiParam(t *testing.T) {
	tests := []struct {
		name     string
		input    []string
		expected []string
	}{
		{
			name:     "comma separated values",
			input:    []string{"Dock A5,Dock B2, Dock C1"},
			expected: []string{"Dock A5", "Dock B2", "Dock C1"},
		},
		{
			name:     "repeated query keys",
			input:    []string{"Dock A5", "Dock B2"},
			expected: []string{"Dock A5", "Dock B2"},
		},
		{
			name:     "mixed repeated and comma separated",
			input:    []string{"Dock A5, Dock B2", "Dock C1", "  Dock C3  "},
			expected: []string{"Dock A5", "Dock B2", "Dock C1", "Dock C3"},
		},
		{
			name:     "empty input",
			input:    []string{},
			expected: nil,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := parseMultiParam(tc.input)
			if len(actual) != len(tc.expected) {
				t.Fatalf("expected len %d, got %d", len(tc.expected), len(actual))
			}
			for i := range actual {
				if actual[i] != tc.expected[i] {
					t.Errorf("at index %d: expected %q, got %q", i, tc.expected[i], actual[i])
				}
			}
		})
	}
}

func TestResetDemoEndpoint(t *testing.T) {
	testUserID := uuid.New()

	t.Run("Returns 404 when demo mode is disabled", func(t *testing.T) {
		h := NewLoaderHandler(nil, nil, false)

		req := httptest.NewRequest(http.MethodPost, "/api/loading/dev/reset-demo", nil)
		rec := httptest.NewRecorder()

		h.ResetDemo(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Fatalf("expected 404, got %d", rec.Code)
		}

		var appErr model.AppError
		_ = json.Unmarshal(rec.Body.Bytes(), &appErr)
		if appErr.Code != model.ErrCodeNotFound {
			t.Errorf("expected code NOT_FOUND, got %s", appErr.Code)
		}
	})

	t.Run("Rejects non-POST methods even in demo mode", func(t *testing.T) {
		h := NewLoaderHandler(nil, nil, true)

		req := httptest.NewRequest(http.MethodGet, "/api/loading/dev/reset-demo", nil)
		rec := httptest.NewRecorder()

		h.ResetDemo(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Fatalf("expected 405, got %d", rec.Code)
		}
	})

	t.Run("Rejects DISPATCHER role with 403 Forbidden for reset-demo", func(t *testing.T) {
		h := NewLoaderHandler(nil, nil, true)
		mux := http.NewServeMux()
		mux.HandleFunc("/api/loading/dev/reset-demo", h.ResetDemo)
		secured := middleware.GatewayAuthMiddleware(middleware.RequireLoaderOrDispatcher(mux))

		req := httptest.NewRequest(http.MethodPost, "/api/loading/dev/reset-demo", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DISPATCHER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
	})

	t.Run("Rejects DRIVER role with 403 Forbidden", func(t *testing.T) {
		h := NewLoaderHandler(nil, nil, true)
		mux := http.NewServeMux()
		mux.HandleFunc("/api/loading/dev/reset-demo", h.ResetDemo)
		secured := middleware.GatewayAuthMiddleware(middleware.RequireLoaderOrDispatcher(mux))

		req := httptest.NewRequest(http.MethodPost, "/api/loading/dev/reset-demo", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DRIVER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)

		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
	})
}

func TestLoaderRoleGuardIntegration(t *testing.T) {
	testUserID := uuid.New()
	svc := service.NewLoadingService(nil, nil, nil, nil)
	h := NewLoaderHandler(svc, nil, false)
	_ = h

	mux := http.NewServeMux()
	mux.HandleFunc("/api/loading/trips", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	mux.HandleFunc("/api/loading/trips/", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	secured := middleware.GatewayAuthMiddleware(middleware.RequireLoaderOrDispatcher(mux))

	t.Run("Missing X-Gateway-Verified header returns 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/loading/trips", nil)
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("LOADER role allows GET /api/loading/trips", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/loading/trips", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "LOADER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("DISPATCHER role allows GET /api/loading/trips", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/loading/trips", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DISPATCHER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("DRIVER role is forbidden from GET /api/loading/trips", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/loading/trips", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DRIVER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}
	})

	// P3 tests:
	t.Run("DISPATCHER role can read GET /api/loading/trips/WPT-204", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/loading/trips/WPT-204", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DISPATCHER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
	})

	t.Run("DISPATCHER role is forbidden from POST start stop loading (read-only guard)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/loading/trips/WPT-204/stops/s1/start", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DISPATCHER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusForbidden, rec.Code)
	})

	t.Run("LOADER role is allowed to POST start stop loading", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/loading/trips/WPT-204/stops/s1/start", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "LOADER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
	})
}
