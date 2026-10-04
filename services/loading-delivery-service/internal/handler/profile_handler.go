package handler

import (
	"encoding/json"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
	"io"
	"net/http"
)

type ProfileHandler struct{ service *service.ProfileService }

func NewProfileHandler(s *service.ProfileService) *ProfileHandler { return &ProfileHandler{service: s} }
func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.service.Profile(r.Context(), user.UserID)
	writeDriverResponse(w, response, err)
}
func (h *ProfileHandler) Heartbeat(w http.ResponseWriter, r *http.Request) {
	var request model.HeartbeatRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&request); err != nil {
		model.ErrBadRequest("invalid request body").WriteJSON(w)
		return
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		model.ErrBadRequest("request body must contain one JSON object").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.service.Heartbeat(r.Context(), user.UserID, request)
	writeDriverResponse(w, response, err)
}
func (h *ProfileHandler) History(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r.Context())
	q := r.URL.Query()
	response, err := h.service.History(r.Context(), user.UserID, q.Get("from"), q.Get("to"), q.Get("page"))
	writeDriverResponse(w, response, err)
}
