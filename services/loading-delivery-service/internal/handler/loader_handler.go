package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/middleware"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
	"github.com/waypoint/loading-delivery-service/internal/service"
)

// LoaderHandler handles HTTP requests for loader operations
type LoaderHandler struct {
	loadingService *service.LoadingService
	storageService service.StorageService
	demoMode       bool
}

func NewLoaderHandler(loadingService *service.LoadingService, storageService service.StorageService, demoMode bool) *LoaderHandler {
	if storageService == nil {
		storageService = service.NewStorageServiceFromEnv()
	}
	return &LoaderHandler{
		loadingService: loadingService,
		storageService: storageService,
		demoMode:       demoMode,
	}
}

// GetTodayLoads handles GET /api/loading/trips
func (h *LoaderHandler) GetTodayLoads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query()
	dateStr := query.Get("date")
	docks := parseMultiParam(query["dock"])
	statuses := parseMultiParam(query["status"])
	q := query.Get("q")
	depot := ""
	if user, ok := middleware.GetUserFromContext(r.Context()); ok && user.Role == "LOADER" {
		resolved, resolveErr := h.loadingService.ResolveLoaderDepot(r.Context(), user.UserID)
		if resolveErr != nil {
			model.ErrInternal("Failed to resolve loader depot").WriteJSON(w)
			return
		}
		depot = resolved
	}

	limit := 20
	if lStr := query.Get("limit"); lStr != "" {
		if parsed, err := strconv.Atoi(lStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	offset := 0
	if oStr := query.Get("offset"); oStr != "" {
		if parsed, err := strconv.Atoi(oStr); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	filter := model.TripsFilter{
		Date:     dateStr,
		Depot:    depot,
		Docks:    docks,
		Statuses: statuses,
		Q:        q,
		Limit:    limit,
		Offset:   offset,
	}

	resp, err := h.loadingService.GetTodayLoads(r.Context(), filter)
	if err != nil {
		model.ErrInternal("Failed to retrieve today's loads: " + err.Error()).WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *LoaderHandler) GetCantDeliverReviews(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "DISPATCHER" && user.Role != "ADMIN") {
		model.ErrForbidden("Only dispatchers can review can't-deliver reports").WriteJSON(w)
		return
	}
	items, err := h.loadingService.ListCantDeliverReviews(r.Context(), strings.TrimSpace(r.URL.Query().Get("date")))
	if err != nil { model.ErrInternal("Failed to retrieve can't-deliver reports: " + err.Error()).WriteJSON(w); return }
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(items)
}

// UpdateRouteOrder handles PUT /api/loading/trips/{tripId}/route-order.
func (h *LoaderHandler) UpdateRouteOrder(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || user.Role != "LOADER" {
		model.ErrForbidden("Forbidden: only loaders can change loading sequence").WriteJSON(w)
		return
	}
	tripID := r.PathValue("tripId")
	var req model.RouteOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.ErrBadRequest("Invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}
	versionRaw := r.URL.Query().Get("version")
	version, err := strconv.Atoi(versionRaw)
	if err != nil || version < 0 {
		model.ErrBadRequest("version query parameter is required and must be non-negative").WriteJSON(w)
		return
	}
	stops, err := h.loadingService.ResequenceRoute(r.Context(), tripID, req.StopIDs, version, user.UserID)
	if err != nil {
		if appErr, yes := err.(*model.AppError); yes {
			appErr.WriteJSON(w)
			return
		}
		model.ErrInternal(err.Error()).WriteJSON(w)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(stops)
}

// GetFilterOptions handles GET /api/loading/trips/filter-options
func (h *LoaderHandler) GetFilterOptions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	dateStr := r.URL.Query().Get("date")

	resp, err := h.loadingService.GetFilterOptions(r.Context(), dateStr)
	if err != nil {
		model.ErrInternal("Failed to retrieve filter options: " + err.Error()).WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

// GetTripDetails handles GET /api/loading/trips/{tripId}
func (h *LoaderHandler) GetTripDetails(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	tripID := r.PathValue("tripId")
	if tripID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 3 {
			tripID = parts[2]
		}
	}

	resp, err := h.loadingService.GetTripDetails(r.Context(), tripID)
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

func (h *LoaderHandler) GetLatestPlanChange(w http.ResponseWriter, r *http.Request) {
	resp, err := h.loadingService.GetLatestPlanChange(r.Context(), r.PathValue("tripId"))
	if err != nil {
		writeHandlerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *LoaderHandler) AcknowledgePlanChange(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "LOADER" && user.Role != "ADMIN") {
		model.ErrForbidden("Forbidden: only loaders can acknowledge plan changes").WriteJSON(w)
		return
	}
	revision, err := strconv.Atoi(r.PathValue("revision"))
	if err != nil || revision < 1 {
		model.ErrBadRequest("revision must be a positive integer").WriteJSON(w)
		return
	}
	resp, err := h.loadingService.AcknowledgePlanChange(r.Context(), r.PathValue("tripId"), revision, user.UserID)
	if err != nil {
		writeHandlerError(w, err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func writeHandlerError(w http.ResponseWriter, err error) {
	if appErr, ok := err.(*model.AppError); ok {
		appErr.WriteJSON(w)
		return
	}
	model.ErrInternal(err.Error()).WriteJSON(w)
}

// StartStopLoading handles POST /api/loading/trips/{tripId}/stops/{stopId}/start
func (h *LoaderHandler) StartStopLoading(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "LOADER" && user.Role != "ADMIN") {
		appErr := model.NewAppError(
			model.ErrCodeForbidden,
			"Forbidden: only loaders can start loading a stop",
			http.StatusForbidden,
		)
		appErr.WriteJSON(w)
		return
	}

	tripID := r.PathValue("tripId")
	stopID := r.PathValue("stopId")
	if tripID == "" || stopID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 6 {
			tripID = parts[2]
			stopID = parts[4]
		}
	}

	expectedVersion := 0
	if vStr := r.URL.Query().Get("version"); vStr != "" {
		if v, err := strconv.Atoi(vStr); err == nil {
			expectedVersion = v
		}
	}

	updatedStop, err := h.loadingService.StartStopLoading(r.Context(), tripID, stopID, expectedVersion, user.UserID)
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
	_ = json.NewEncoder(w).Encode(updatedStop)
}

// ResetDemo handles POST /api/loading/dev/reset-demo
// Accessible only in DEMO_MODE = true, and restricted to LOADER role
func (h *LoaderHandler) ResetDemo(w http.ResponseWriter, r *http.Request) {
	if !h.demoMode {
		model.ErrNotFound("Endpoint not found").WriteJSON(w)
		return
	}

	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "LOADER" && user.Role != "ADMIN") {
		appErr := model.NewAppError(
			model.ErrCodeForbidden,
			"Forbidden: only loaders can reset demo state",
			http.StatusForbidden,
		)
		appErr.WriteJSON(w)
		return
	}

	if err := h.loadingService.ResetDemo(r.Context()); err != nil {
		model.ErrInternal("Failed to reset demo state: " + err.Error()).WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "Demo state reset successfully for trip WPT-204",
	})
}

// parseMultiParam splits query params by comma and flattens repeated query keys
func parseMultiParam(values []string) []string {
	var result []string
	for _, v := range values {
		parts := strings.Split(v, ",")
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
	}
	return result
}

// GetStopItems handles GET /api/loading/trips/{tripId}/stops/{stopId}/items
func (h *LoaderHandler) GetStopItems(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	tripID := r.PathValue("tripId")
	stopID := r.PathValue("stopId")
	if tripID == "" || stopID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 6 {
			tripID = parts[2]
			stopID = parts[4]
		}
	}

	resp, err := h.loadingService.GetStopItems(r.Context(), tripID, stopID)
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

// CheckItem handles PUT /api/loading/items/{itemId}/check
func (h *LoaderHandler) CheckItem(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "LOADER" && user.Role != "ADMIN") {
		model.ErrForbidden("Forbidden: only loaders can check items").WriteJSON(w)
		return
	}

	itemID := r.PathValue("itemId")
	if itemID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			itemID = parts[2]
		}
	}

	var req model.CheckItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		model.ErrBadRequest("Invalid JSON body: " + err.Error()).WriteJSON(w)
		return
	}

	item, err := h.loadingService.CheckItem(r.Context(), itemID, req.Checked, user.UserID)
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
	_ = json.NewEncoder(w).Encode(item)
}

// ConfirmStop handles POST /api/loading/trips/{tripId}/stops/{stopId}/confirm
func (h *LoaderHandler) ConfirmStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "LOADER" && user.Role != "ADMIN") {
		model.ErrForbidden("Forbidden: only loaders can confirm stop loading").WriteJSON(w)
		return
	}

	tripID := r.PathValue("tripId")
	stopID := r.PathValue("stopId")
	if tripID == "" || stopID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 6 {
			tripID = parts[2]
			stopID = parts[4]
		}
	}

	expectedVersion := 0
	if vStr := r.URL.Query().Get("version"); vStr != "" {
		if v, err := strconv.Atoi(vStr); err == nil {
			expectedVersion = v
		}
	}

	updatedStop, err := h.loadingService.ConfirmStop(r.Context(), tripID, stopID, expectedVersion, user.UserID)
	if err != nil {
		if incErr, ok := err.(*model.ChecklistIncompleteError); ok {
			incErr.WriteJSON(w)
			return
		}
		if appErr, ok := err.(*model.AppError); ok {
			appErr.WriteJSON(w)
			return
		}
		model.ErrInternal(err.Error()).WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(updatedStop)
}

// GetShortfallContext handles GET /api/loading/trips/{tripId}/shortfall-context?stopId=
func (h *LoaderHandler) GetShortfallContext(w http.ResponseWriter, r *http.Request) {
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

	stopID := r.URL.Query().Get("stopId")
	if stopID == "" {
		model.ErrBadRequest("Missing required stopId query parameter").WriteJSON(w)
		return
	}

	reportedBy := "Kumar S."
	if user, ok := middleware.GetUserFromContext(r.Context()); ok {
		if user.Email != "" {
			reportedBy = user.Email
		}
	}

	resp, err := h.loadingService.GetShortfallContext(r.Context(), tripID, stopID, reportedBy)
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

// CreateShortfall handles POST /api/loading/trips/{tripId}/shortfalls (multipart/form-data)
func (h *LoaderHandler) CreateShortfall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "LOADER" && user.Role != "ADMIN") {
		model.ErrForbidden("Forbidden: only loaders can report shortfalls").WriteJSON(w)
		return
	}

	tripID := r.PathValue("tripId")
	if tripID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 4 {
			tripID = parts[2]
		}
	}

	// Parse multipart form up to 15MB
	if err := r.ParseMultipartForm(15 * 1024 * 1024); err != nil {
		model.ErrBadRequest("Failed to parse multipart form: " + err.Error()).WriteJSON(w)
		return
	}

	stopIDStr := r.FormValue("stopId")
	stopID, err := uuid.Parse(stopIDStr)
	if err != nil {
		model.ErrBadRequest("Invalid or missing stopId").WriteJSON(w)
		return
	}

	itemIDStr := r.FormValue("itemId")
	itemID, err := uuid.Parse(itemIDStr)
	if err != nil {
		model.ErrBadRequest("Invalid or missing itemId").WriteJSON(w)
		return
	}

	qtyStr := r.FormValue("qtyAffected")
	qtyAffected, err := strconv.Atoi(qtyStr)
	if err != nil || qtyAffected <= 0 {
		model.ErrBadRequest("qtyAffected must be a positive integer").WriteJSON(w)
		return
	}

	reason := strings.ToUpper(strings.TrimSpace(r.FormValue("reason")))
	if reason != "MISSING" && reason != "DAMAGED" && reason != "SHORT_SHIPPED" {
		model.ErrBadRequest("Invalid reason: must be MISSING, DAMAGED, or SHORT_SHIPPED").WriteJSON(w)
		return
	}

	note := r.FormValue("note")
	if len(note) > 500 {
		model.ErrBadRequest("note cannot exceed 500 characters").WriteJSON(w)
		return
	}

	// Handle optional photo upload
	var photoURL *string
	file, fileHeader, err := r.FormFile("photo")
	if err == nil && file != nil {
		defer file.Close()
		fileData, readErr := io.ReadAll(file)
		if readErr != nil {
			model.ErrBadRequest("Failed to read photo upload: " + readErr.Error()).WriteJSON(w)
			return
		}

		contentType, valErr := service.ValidatePhotoBytes(fileData)
		if valErr != nil {
			if appErr, ok := valErr.(*model.AppError); ok {
				appErr.WriteJSON(w)
				return
			}
			model.ErrBadRequest(valErr.Error()).WriteJSON(w)
			return
		}

		uploadedURL, upErr := h.storageService.UploadShortfallPhoto(r.Context(), fileHeader.Filename, fileData, contentType)
		if upErr != nil {
			model.ErrInternal("Failed to upload photo: " + upErr.Error()).WriteJSON(w)
			return
		}
		photoURL = &uploadedURL
	}

	params := repository.ShortfallParams{
		StopID:       stopID,
		ItemID:       itemID,
		QtyAffected:  qtyAffected,
		Reason:       reason,
		Note:         note,
		PhotoURL:     photoURL,
		LoaderID:     user.UserID,
		ReporterName: user.Email,
	}

	resp, err := h.loadingService.CreateShortfall(r.Context(), tripID, params)
	if err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			appErr.WriteJSON(w)
			return
		}
		model.ErrInternal(err.Error()).WriteJSON(w)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// GetShortfalls handles GET /api/loading/trips/{tripId}/shortfalls
func (h *LoaderHandler) GetShortfalls(w http.ResponseWriter, r *http.Request) {
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

	resp, err := h.loadingService.GetShortfalls(r.Context(), tripID)
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

func (h *LoaderHandler) ResolveShortfall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok || (user.Role != "DISPATCHER" && user.Role != "ADMIN") {
		model.ErrForbidden("Forbidden: only dispatchers can resolve shortfalls").WriteJSON(w)
		return
	}
	var payload struct {
		Notes string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		model.ErrBadRequest("Invalid request body").WriteJSON(w)
		return
	}
	if len(strings.TrimSpace(payload.Notes)) > 500 {
		model.ErrBadRequest("notes cannot exceed 500 characters").WriteJSON(w)
		return
	}
	issueID := r.PathValue("issueId")
	if issueID == "" {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 5 {
			issueID = parts[3]
		}
	}
	if err := h.loadingService.ResolveShortfall(r.Context(), issueID, user.UserID, strings.TrimSpace(payload.Notes)); err != nil {
		if appErr, ok := err.(*model.AppError); ok {
			appErr.WriteJSON(w)
			return
		}
		model.ErrInternal(err.Error()).WriteJSON(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
