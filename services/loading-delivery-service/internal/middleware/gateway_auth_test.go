package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

func TestGatewayAuthMiddleware(t *testing.T) {
	testUserID := uuid.New()

	okHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := GetUserFromContext(r.Context())
		if !ok {
			http.Error(w, "no user in context", http.StatusInternalServerError)
			return
		}
		if user.UserID != testUserID || user.Role != "LOADER" || user.Email != "loader@waypoint.lk" {
			http.Error(w, "context user mismatch", http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	handlerToTest := GatewayAuthMiddleware(okHandler)

	t.Run("Rejects missing X-Gateway-Verified header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		rec := httptest.NewRecorder()

		handlerToTest.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}

		var appErr model.AppError
		if err := json.Unmarshal(rec.Body.Bytes(), &appErr); err != nil {
			t.Fatalf("failed to parse error response: %v", err)
		}
		if appErr.Code != model.ErrCodeGatewayUnverified {
			t.Errorf("expected code %s, got %s", model.ErrCodeGatewayUnverified, appErr.Code)
		}
	})

	t.Run("Rejects false X-Gateway-Verified header", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "false")
		rec := httptest.NewRecorder()

		handlerToTest.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("Rejects missing user headers when verified", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		rec := httptest.NewRecorder()

		handlerToTest.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("Rejects malformed user ID UUID", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", "not-a-valid-uuid")
		req.Header.Set("X-User-Role", "LOADER")
		rec := httptest.NewRecorder()

		handlerToTest.ServeHTTP(rec, req)

		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", rec.Code)
		}
	})

	t.Run("Accepts verified request with valid headers and propagates context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "LOADER")
		req.Header.Set("X-User-Email", "loader@waypoint.lk")
		rec := httptest.NewRecorder()

		handlerToTest.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d. Body: %s", rec.Code, rec.Body.String())
		}
	})
}

func TestRequireLoaderOrDispatcher(t *testing.T) {
	testUserID := uuid.New()

	okHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	secured := GatewayAuthMiddleware(RequireLoaderOrDispatcher(okHandler))

	t.Run("LOADER can make GET request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "LOADER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("LOADER can make POST request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "LOADER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("DISPATCHER can make GET request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DISPATCHER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", rec.Code)
		}
	})

	t.Run("DISPATCHER is forbidden from making POST request (read-only)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/test", nil)
		req.Header.Set("X-Gateway-Verified", "true")
		req.Header.Set("X-User-Id", testUserID.String())
		req.Header.Set("X-User-Role", "DISPATCHER")
		rec := httptest.NewRecorder()

		secured.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("expected 403, got %d", rec.Code)
		}

		var appErr model.AppError
		_ = json.Unmarshal(rec.Body.Bytes(), &appErr)
		if appErr.Code != model.ErrCodeForbidden {
			t.Errorf("expected code %s, got %s", model.ErrCodeForbidden, appErr.Code)
		}
	})

	t.Run("DRIVER role is rejected with 403 Forbidden", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
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
