package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

// DepartureHandler handles HTTP requests for the P7 departure screen.
type DepartureHandler struct {
	departureService *service.DepartureService
}

func NewDepartureHandler(departureService *service.DepartureService) *DepartureHandler {
	return &DepartureHandler{
		departureService: departureService,
	}
}

// GetDeparture handles GET /api/loading/trips/{tripId}/departure
func (h *DepartureHandler) GetDeparture(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	tripID := r.PathValue("tripId")
	if tripID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			tripID = parts[2]
		}
	}

	resp, err := h.departureService.GetDeparture(r.Context(), tripID)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			appErr.WriteJSON(w)
			return
		}
		model.ErrInternal(err.Error()).WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// MarkReady handles POST /api/loading/trips/{tripId}/mark-ready
func (h *DepartureHandler) MarkReady(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "LOADER" && user.Role != "ADMIN") {
		model.ErrForbidden("Forbidden: only loaders can mark a trip ready").WriteJSON(w)
		return
	}

	tripID := r.PathValue("tripId")
	if tripID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			tripID = parts[2]
		}
	}

	resp, err := h.departureService.MarkReady(r.Context(), tripID, user.UserID.String())
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			appErr.WriteJSON(w)
			return
		}
		model.ErrInternal(err.Error()).WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
