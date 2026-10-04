package handler

import (
	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
	"net/http"
)

type TripSummaryHandler struct{ service *service.TripSummaryService }

func NewTripSummaryHandler(s *service.TripSummaryService) *TripSummaryHandler {
	return &TripSummaryHandler{service: s}
}
func summaryTripID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue("tripId"))
	if err != nil {
		model.ErrBadRequest("invalid tripId format").WriteJSON(w)
		return id, false
	}
	return id, true
}
func (h *TripSummaryHandler) Summary(w http.ResponseWriter, r *http.Request) {
	id, ok := summaryTripID(w, r)
	if !ok {
		return
	}
	u, _ := middleware.GetUserFromContext(r.Context())
	x, err := h.service.Summary(r.Context(), u.UserID, id)
	writeDriverResponse(w, x, err)
}
func (h *TripSummaryHandler) Outcomes(w http.ResponseWriter, r *http.Request) {
	id, ok := summaryTripID(w, r)
	if !ok {
		return
	}
	u, _ := middleware.GetUserFromContext(r.Context())
	x, err := h.service.Outcomes(r.Context(), u.UserID, id, r.URL.Query().Get("page"))
	writeDriverResponse(w, x, err)
}
func (h *TripSummaryHandler) Complete(w http.ResponseWriter, r *http.Request) {
	id, ok := summaryTripID(w, r)
	if !ok {
		return
	}
	u, _ := middleware.GetUserFromContext(r.Context())
	x, err := h.service.Complete(r.Context(), u.UserID, id)
	writeDriverResponse(w, x, err)
}
