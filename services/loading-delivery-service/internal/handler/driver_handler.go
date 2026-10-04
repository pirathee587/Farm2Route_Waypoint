package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

type DriverHandler struct {
	service      *service.DriverService
	storage      service.StorageService
	routeService *service.RouteService
	location     *time.Location
}

func NewDriverHandler(s *service.DriverService, storage ...service.StorageService) *DriverHandler {
	loc, err := time.LoadLocation("Asia/Colombo")
	if err != nil {
		loc = time.FixedZone("Asia/Colombo", 5*3600+30*60)
	}
	var st service.StorageService
	if len(storage) > 0 {
		st = storage[0]
	}
	return &DriverHandler{service: s, storage: st, location: loc}
}
func (h *DriverHandler) SetRouteService(route *service.RouteService) { h.routeService = route }
func (h *DriverHandler) GetRoute(w http.ResponseWriter, r *http.Request) {
	tripID, err := uuid.Parse(r.PathValue("tripId"))
	if err != nil {
		model.ErrBadRequest("invalid tripId format").WriteJSON(w)
		return
	}
	current, err := service.ParseCoordinate(r.URL.Query().Get("lat"), r.URL.Query().Get("lng"))
	if err != nil {
		model.ErrBadRequest(err.Error()).WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.routeService.Route(r.Context(), user.UserID, tripID, current)
	writeDriverResponse(w, response, err)
}
func (h *DriverHandler) GetRouteGeometry(w http.ResponseWriter, r *http.Request) {
	tripID, err := uuid.Parse(r.PathValue("tripId"))
	if err != nil {
		model.ErrBadRequest("invalid tripId format").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.routeService.Geometry(r.Context(), user.UserID, tripID)
	writeDriverResponse(w, response, err)
}
func (h *DriverHandler) GetPOD(w http.ResponseWriter, r *http.Request) {
	stopID, err := uuid.Parse(r.PathValue("stopId"))
	if err != nil {
		model.ErrBadRequest("invalid stopId format").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.service.GetPOD(r.Context(), user.UserID, stopID)
	writeDriverResponse(w, response, err)
}
func (h *DriverHandler) UploadSignature(w http.ResponseWriter, r *http.Request) {
	h.uploadPOD(w, r, "SIGNATURE")
}
func (h *DriverHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	h.uploadPOD(w, r, "PHOTO")
}
func (h *DriverHandler) uploadPOD(w http.ResponseWriter, r *http.Request, kind string) {
	stopID, err := uuid.Parse(r.PathValue("stopId"))
	if err != nil {
		model.ErrBadRequest("invalid stopId format").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	if _, err := h.service.GetPOD(r.Context(), user.UserID, stopID); err != nil {
		writeDriverResponse(w, nil, err)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 6*1024*1024)
	if err := r.ParseMultipartForm(6 * 1024 * 1024); err != nil {
		model.ErrBadRequest("invalid multipart form or image exceeds 5MB").WriteJSON(w)
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		model.ErrBadRequest("image is required").WriteJSON(w)
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, 5*1024*1024+1))
	if err != nil {
		model.ErrBadRequest("unable to read image").WriteJSON(w)
		return
	}
	contentType, err := service.ValidatePODImage(data)
	if err != nil {
		writeDriverResponse(w, nil, err)
		return
	}
	receiver := r.FormValue("receiver_name")
	if kind == "SIGNATURE" && receiver == "" {
		model.ErrBadRequest("receiver_name is required").WriteJSON(w)
		return
	}
	if h.storage == nil {
		model.ErrInternal("storage service is unavailable").WriteJSON(w)
		return
	}
	url, err := h.storage.UploadPOD(r.Context(), stopID.String(), kind, header.Filename, data, contentType)
	if err != nil {
		model.ErrInternal("image upload failed").WriteJSON(w)
		return
	}
	response, err := h.service.SavePODUpload(r.Context(), user.UserID, stopID, kind, url, receiver)
	writeDriverResponse(w, response, err)
}
func (h *DriverHandler) ConfirmDelivery(w http.ResponseWriter, r *http.Request) {
	stopID, err := uuid.Parse(r.PathValue("stopId"))
	if err != nil {
		model.ErrBadRequest("invalid stopId format").WriteJSON(w)
		return
	}
	var request model.ConfirmDeliveryRequest
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
	response, err := h.service.ConfirmDelivery(r.Context(), user.UserID, stopID, request)
	writeDriverResponse(w, response, err)
}

func (h *DriverHandler) GetToday(w http.ResponseWriter, r *http.Request) {
	date := time.Now().In(h.location)
	if value := r.URL.Query().Get("date"); value != "" {
		parsed, err := time.ParseInLocation("2006-01-02", value, h.location)
		if err != nil {
			model.ErrBadRequest("date must use YYYY-MM-DD format").WriteJSON(w)
			return
		}
		date = parsed
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	resp, err := h.service.Today(r.Context(), user.UserID, date)
	writeDriverResponse(w, resp, err)
}
func (h *DriverHandler) GetTripStops(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("tripId"))
	if err != nil {
		model.ErrBadRequest("invalid tripId format").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	resp, err := h.service.TripStops(r.Context(), user.UserID, id)
	writeDriverResponse(w, resp, err)
}
func (h *DriverHandler) GetDispatcherContact(w http.ResponseWriter, r *http.Request) {
	user, _ := middleware.GetUserFromContext(r.Context())
	resp, err := h.service.DispatcherContact(r.Context(), user.UserID)
	writeDriverResponse(w, resp, err)
}
func (h *DriverHandler) GetStopDetail(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("stopId"))
	if err != nil {
		model.ErrBadRequest("invalid stopId format").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	resp, err := h.service.StopDetail(r.Context(), user.UserID, id)
	writeDriverResponse(w, resp, err)
}

func (h *DriverHandler) Arrive(w http.ResponseWriter, r *http.Request) {
	stopID, err := uuid.Parse(r.PathValue("stopId"))
	if err != nil {
		model.ErrBadRequest("invalid stopId format").WriteJSON(w)
		return
	}
	var request model.ArriveRequest
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
	response, err := h.service.Arrive(r.Context(), user.UserID, stopID, request)
	writeDriverResponse(w, response, err)
}

func (h *DriverHandler) GetWindowStatus(w http.ResponseWriter, r *http.Request) {
	stopID, err := uuid.Parse(r.PathValue("stopId"))
	if err != nil {
		model.ErrBadRequest("invalid stopId format").WriteJSON(w)
		return
	}
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.service.WindowStatus(r.Context(), user.UserID, stopID)
	writeDriverResponse(w, response, err)
}

func (h *DriverHandler) GetCantDeliverReasons(w http.ResponseWriter, r *http.Request) {
	writeDriverResponse(w, service.CantDeliverReasons(), nil)
}
func (h *DriverHandler) CantDeliver(w http.ResponseWriter, r *http.Request) {
	stopID, err := uuid.Parse(r.PathValue("stopId"))
	if err != nil {
		model.ErrBadRequest("invalid stopId format").WriteJSON(w)
		return
	}
	var request model.CantDeliverRequest
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
	response, err := h.service.CantDeliver(r.Context(), user.UserID, stopID, request)
	writeDriverResponse(w, response, err)
}

func writeDriverResponse(w http.ResponseWriter, value any, err error) {
	if err != nil {
		var appErr *model.AppError
		if errors.As(err, &appErr) {
			appErr.WriteJSON(w)
		} else {
			model.ErrInternal("An unexpected internal error occurred").WriteJSON(w)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(value)
}
