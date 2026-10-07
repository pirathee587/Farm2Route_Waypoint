package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

func (h *DriverHandler) CompleteStop(w http.ResponseWriter, r *http.Request) {
	stopID, err := uuid.Parse(r.PathValue("stopId")); if err != nil { model.ErrBadRequest("invalid stopId format").WriteJSON(w); return }
	user, _ := middleware.GetUserFromContext(r.Context())
	r.Body = http.MaxBytesReader(w, r.Body, 11*1024*1024)
	if err = r.ParseMultipartForm(11*1024*1024); err != nil { model.ErrBadRequest("invalid multipart form or upload exceeds 5MB per file").WriteJSON(w); return }
	outcome := strings.ToUpper(strings.TrimSpace(r.FormValue("outcome")))
	if outcome != "DELIVERED" && outcome != "PARTIAL" && outcome != "REFUSED" && outcome != "NOT_HOME" { model.NewAppError(model.ErrCodeValidationFailed,"outcome must be DELIVERED, PARTIAL, REFUSED or NOT_HOME",422).WriteJSON(w); return }
	op := r.Header.Get("Idempotency-Key"); if op=="" { op=r.FormValue("operation_id") }; if op=="" { op=uuid.NewString() }
	completed := time.Now(); if raw:=r.FormValue("clientTime"); raw!="" { if parsed,e:=time.Parse(time.RFC3339,raw); e==nil { completed=parsed } }
	if outcome=="REFUSED" || outcome=="NOT_HOME" {
		reason := "other"; if outcome=="NOT_HOME" { reason="outlet_closed" }
		response,e:=h.service.CantDeliver(r.Context(),user.UserID,stopID,model.CantDeliverRequest{ClientActionID:op,Reason:reason,Note:r.FormValue("note"),ReportedAt:&completed})
		writeDriverResponse(w,response,e); return
	}
	var items []model.ConfirmItem
	if err=json.Unmarshal([]byte(r.FormValue("items")),&items); err!=nil { model.ErrBadRequest("items must be valid JSON").WriteJSON(w); return }
	shortfalls:=[]model.ConfirmShortfall{}
	if raw:=r.FormValue("shortfalls"); raw!="" { if err=json.Unmarshal([]byte(raw),&shortfalls); err!=nil { model.ErrBadRequest("shortfalls must be valid JSON").WriteJSON(w); return } }
	upload := func(field, kind string) (string,error) {
		file,head,e:=r.FormFile(field); if e==http.ErrMissingFile{return "",nil}; if e!=nil{return "",e}; defer file.Close()
		data,e:=io.ReadAll(io.LimitReader(file,5*1024*1024+1)); if e!=nil{return "",e}; contentType,e:=service.ValidatePODImage(data); if e!=nil{return "",e}
		url,e:=h.storage.UploadPOD(r.Context(),stopID.String(),kind,head.Filename,data,contentType); if e!=nil{return "",e}
		_,e=h.service.SavePODUpload(r.Context(),user.UserID,stopID,kind,url,r.FormValue("receivedBy")); return url,e
	}
	signature,e:=upload("signature","SIGNATURE"); if e!=nil{writeDriverResponse(w,nil,e);return}; photo,e:=upload("photo","PHOTO"); if e!=nil{writeDriverResponse(w,nil,e);return}
	request:=model.ConfirmDeliveryRequest{ClientActionID:op,Items:items,Shortfalls:shortfalls,ReceiverName:r.FormValue("receivedBy"),SignatureURL:signature,PhotoURL:photo,Note:r.FormValue("note"),CompletedAt:&completed,Outcome:outcome}
	response,e:=h.service.ConfirmDeliveryFlexible(r.Context(),user.UserID,stopID,request); writeDriverResponse(w,response,e)
}

func (h *DriverHandler) IssueStop(w http.ResponseWriter, r *http.Request) {
	stopID, err := uuid.Parse(r.PathValue("stopId")); if err != nil { model.ErrBadRequest("invalid stopId format").WriteJSON(w); return }
	var body struct { Type string `json:"type"`; Description string `json:"description"`; Note string `json:"note"`; CapturedAt *time.Time `json:"captured_at"`; OperationID string `json:"operation_id"` }
	if err=json.NewDecoder(r.Body).Decode(&body); err!=nil { model.ErrBadRequest("invalid request body").WriteJSON(w); return }
	allowed:=map[string]bool{"DAMAGE":true,"ACCESS":true,"TEMPERATURE":true,"VEHICLE":true,"OTHER":true}; body.Type=strings.ToUpper(body.Type)
	if !allowed[body.Type] { model.NewAppError(model.ErrCodeValidationFailed,"invalid issue type",422).WriteJSON(w); return }
	op:=r.Header.Get("Idempotency-Key"); if op==""{op=body.OperationID}; if op==""{op=uuid.NewString()}; at:=time.Now(); if body.CapturedAt!=nil{at=*body.CapturedAt}
	reason:=map[string]string{"ACCESS":"access_denied","TEMPERATURE":"wrong_vehicle_temperature"}[body.Type]; if reason==""{reason="other"}
	note:=strings.TrimSpace(body.Description+" "+body.Note); user,_:=middleware.GetUserFromContext(r.Context())
	response,e:=h.service.CantDeliver(r.Context(),user.UserID,stopID,model.CantDeliverRequest{ClientActionID:op,Reason:reason,Note:note,ReportedAt:&at})
	writeDriverResponse(w,response,e)
}

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
func (h *DriverHandler) StartTrip(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("tripId")); if err != nil { model.ErrBadRequest("invalid tripId format").WriteJSON(w); return }
	op := r.Header.Get("Idempotency-Key"); if op == "" { op = uuid.NewString() }
	user, _ := middleware.GetUserFromContext(r.Context())
	response, err := h.service.StartTrip(r.Context(), user.UserID, id, op)
	writeDriverResponse(w, response, err)
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
	if request.ClientActionID == "" { request.ClientActionID = r.Header.Get("Idempotency-Key") }
	if request.ClientActionID == "" { request.ClientActionID = uuid.NewString() }
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
