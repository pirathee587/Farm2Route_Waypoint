package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	h := NewHealthHandler(nil)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var resp HealthResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.Status != "UP" {
		t.Errorf("expected status UP, got %s", resp.Status)
	}
	if resp.Service != "loading-delivery-service" {
		t.Errorf("expected service loading-delivery-service, got %s", resp.Service)
	}
	if resp.Database != "UNCONFIGURED" {
		t.Errorf("expected database UNCONFIGURED, got %s", resp.Database)
	}
}
