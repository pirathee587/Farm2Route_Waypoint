package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/waypoint/loading-delivery-service/internal/repository"
)

// HealthResponse represents the health check status response
type HealthResponse struct {
	Status    string `json:"status"`
	Service   string `json:"service"`
	Database  string `json:"database"`
	Timestamp string `json:"timestamp"`
}

// HealthHandler serves the /health endpoint
type HealthHandler struct {
	db *repository.PostgresDB
}

func NewHealthHandler(db *repository.PostgresDB) *HealthHandler {
	return &HealthHandler{db: db}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	dbStatus := "UP"
	if h.db != nil {
		if err := h.db.Ping(r.Context()); err != nil {
			dbStatus = "DOWN"
		}
	} else {
		dbStatus = "UNCONFIGURED"
	}

	overallStatus := "UP"
	if dbStatus == "DOWN" {
		overallStatus = "DEGRADED"
	}

	resp := HealthResponse{
		Status:    overallStatus,
		Service:   "loading-delivery-service",
		Database:  dbStatus,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
