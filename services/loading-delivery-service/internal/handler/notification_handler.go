package handler

import (
	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
	"net/http"
)

type DriverNotificationHandler struct {
	service *service.DriverNotificationService
}

func NewDriverNotificationHandler(s *service.DriverNotificationService) *DriverNotificationHandler {
	return &DriverNotificationHandler{service: s}
}
func (h *DriverNotificationHandler) Today(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.service.Today(r.Context(), user.UserID)
	writeDriverResponse(w, response, err)
}
func (h *DriverNotificationHandler) Review(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		model.ErrBadRequest("invalid notification id").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	err = h.service.Review(r.Context(), user.UserID, id)
	if err != nil {
		writeDriverResponse(w, nil, err)
		return
	}
	writeDriverResponse(w, map[string]bool{"reviewed": true}, nil)
}
func (h *DriverNotificationHandler) ReadAll(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r.Context())
	err := h.service.ReadAll(r.Context(), user.UserID)
	if err != nil {
		writeDriverResponse(w, nil, err)
		return
	}
	writeDriverResponse(w, map[string]bool{"updated": true}, nil)
}
func (h *DriverNotificationHandler) History(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r.Context())
	q := r.URL.Query()
	response, err := h.service.History(r.Context(), user.UserID, q.Get("from"), q.Get("to"), q.Get("page"))
	writeDriverResponse(w, response, err)
}
