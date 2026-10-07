package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

type SyncHandler struct {
	service *service.SyncService
	storage service.StorageService
}

func NewSyncHandler(s *service.SyncService, storage service.StorageService) *SyncHandler {
	return &SyncHandler{service: s, storage: storage}
}
func decodeSyncJSON(w http.ResponseWriter, r *http.Request, v any) bool {
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if d.Decode(v) != nil {
		model.ErrBadRequest("invalid request body").WriteJSON(w)
		return false
	}
	var extra any
	if d.Decode(&extra) != io.EOF {
		model.ErrBadRequest("request body must contain one JSON object").WriteJSON(w)
		return false
	}
	return true
}
func (h *SyncHandler) Sync(w http.ResponseWriter, r *http.Request) {
	var req model.SyncRequest
	raw, err := io.ReadAll(http.MaxBytesReader(w,r.Body,2*1024*1024)); if err!=nil { model.ErrBadRequest("invalid request body").WriteJSON(w); return }
	if len(raw)>0 && raw[0]=='[' {
		var batch []struct { OperationID string `json:"operation_id"`; Type string `json:"type"`; StopID string `json:"stop_id"`; Payload json.RawMessage `json:"payload"`; CapturedAt time.Time `json:"captured_at"` }
		if err=json.Unmarshal(raw,&batch); err!=nil { model.ErrBadRequest("invalid request body").WriteJSON(w); return }
		for _,x:=range batch { req.Actions=append(req.Actions,model.SyncAction{ClientActionID:x.OperationID,Type:x.Type,StopID:x.StopID,Payload:x.Payload,ClientTimestamp:x.CapturedAt}) }
	} else if err=json.Unmarshal(raw,&req); err!=nil { model.ErrBadRequest("invalid request body").WriteJSON(w); return }
	u, _ := middleware.GetUserFromContext(r.Context())
	out, err := h.service.Sync(r.Context(), u.UserID, req)
	writeDriverResponse(w, out, err)
}
func (h *SyncHandler) Verify(w http.ResponseWriter, r *http.Request) {
	var req model.SyncVerifyRequest
	if !decodeSyncJSON(w, r, &req) {
		return
	}
	u, _ := middleware.GetUserFromContext(r.Context())
	out, err := h.service.Verify(r.Context(), u.UserID, req.ClientActionIDs)
	writeDriverResponse(w, map[string]any{"items": out}, err)
}
func (h *SyncHandler) Conflicts(w http.ResponseWriter, r *http.Request) {
	u, _ := middleware.GetUserFromContext(r.Context())
	out, err := h.service.Conflicts(r.Context(), u.UserID)
	writeDriverResponse(w, map[string]any{"items": out}, err)
}
func (h *SyncHandler) Media(w http.ResponseWriter, r *http.Request) {
	action, err := uuid.Parse(r.PathValue("client_action_id"))
	if err != nil {
		model.ErrBadRequest("invalid client_action_id").WriteJSON(w)
		return
	}
	u, _ := middleware.GetUserFromContext(r.Context())
	stop, oldSig, oldPhoto, err := h.service.MediaTarget(r.Context(), u.UserID, action)
	if err != nil {
		writeDriverResponse(w, nil, err)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 11*1024*1024)
	if err = r.ParseMultipartForm(11 * 1024 * 1024); err != nil {
		model.ErrBadRequest("invalid multipart form or image exceeds 5MB").WriteJSON(w)
		return
	}
	upload := func(field, kind, old string) (string, error) {
		if old != "" {
			return old, nil
		}
		f, head, e := r.FormFile(field)
		if e != nil {
			return "", model.ErrBadRequest(field + " is required")
		}
		defer f.Close()
		data, e := io.ReadAll(io.LimitReader(f, 5*1024*1024+1))
		if e != nil {
			return "", e
		}
		ct, e := service.ValidatePODImage(data)
		if e != nil {
			return "", e
		}
		return h.storage.UploadPOD(r.Context(), stop.String(), kind, head.Filename, data, ct)
	}
	sig, err := upload("signature", "SIGNATURE", oldSig)
	if err != nil {
		writeDriverResponse(w, nil, err)
		return
	}
	photo, err := upload("photo", "PHOTO", oldPhoto)
	if err != nil {
		writeDriverResponse(w, nil, err)
		return
	}
	out, err := h.service.CompleteMedia(r.Context(), u.UserID, action, sig, photo)
	writeDriverResponse(w, out, err)
}
