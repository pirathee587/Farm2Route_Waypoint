package service

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
)

type DriverTodayRepository interface {
	GetDriverVehicle(context.Context, uuid.UUID) (model.DriverSummary, model.DriverVehicle, error)
	GetTrips(context.Context, uuid.UUID, string, time.Time) ([]model.DriverTripRecord, error)
	GetTrip(context.Context, uuid.UUID, uuid.UUID) (model.DriverTripRecord, error)
	GetStops(context.Context, uuid.UUID) ([]model.DriverStopRecord, error)
	GetDispatcherContact(context.Context, uuid.UUID) (model.DispatcherContact, error)
	GetStopDetail(context.Context, uuid.UUID, uuid.UUID) (model.DriverStopDetailRecord, error)
	GetStopItems(context.Context, uuid.UUID) ([]model.StopItem, error)
	GetPreviousSkip(context.Context, uuid.UUID, string) (*model.PreviousSkip, error)
	Arrive(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, *time.Time, time.Time, time.Time) (model.ArrivalRecord, error)
	GetWindowStatus(context.Context, uuid.UUID, uuid.UUID, time.Time) (model.WindowStatusResponse, error)
	CantDeliver(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, string, string, *time.Time, time.Time, time.Time) (model.CantDeliverResponse, error)
	GetPODContext(context.Context, uuid.UUID, uuid.UUID) (model.PODContext, error)
	SavePODUpload(context.Context, uuid.UUID, uuid.UUID, string, string, string, time.Time) (model.PODUploadResponse, error)
	ConfirmDelivery(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, model.ConfirmDeliveryRequest, time.Time, time.Time, string) (model.ConfirmDeliveryResponse, error)
	FindDeliveryConfirmation(context.Context, uuid.UUID, uuid.UUID, uuid.UUID) (*model.ConfirmDeliveryResponse, error)
}

func (s *DriverService) GetPOD(ctx context.Context, driverID, stopID uuid.UUID) (*model.PODResponse, error) {
	x, err := s.repo.GetPODContext(ctx, driverID, stopID)
	if err != nil {
		return nil, err
	}
	all := true
	for _, i := range x.Items {
		if i.DeliveredQty != i.OrderedQty {
			all = false
		}
	}
	return &model.PODResponse{Outlet: model.PODOutlet{ID: x.OutletID, Name: x.OutletName}, ArrivedAt: x.ArrivedAt.In(s.location), Items: x.Items, AllItemsDelivered: all}, nil
}
func (s *DriverService) SavePODUpload(ctx context.Context, driverID, stopID uuid.UUID, kind, url, receiver string) (model.PODUploadResponse, error) {
	return s.repo.SavePODUpload(ctx, driverID, stopID, kind, url, receiver, s.now())
}
func (s *DriverService) ConfirmDelivery(ctx context.Context, driverID, stopID uuid.UUID, request model.ConfirmDeliveryRequest) (*model.ConfirmDeliveryResponse, error) {
	return s.confirmDelivery(ctx, driverID, stopID, request, false, false)
}
func (s *DriverService) ConfirmDeliveryOffline(ctx context.Context, driverID, stopID uuid.UUID, request model.ConfirmDeliveryRequest, mediaPending bool) (*model.ConfirmDeliveryResponse, error) {
	return s.confirmDelivery(ctx, driverID, stopID, request, true, mediaPending)
}
func (s *DriverService) confirmDelivery(ctx context.Context, driverID, stopID uuid.UUID, request model.ConfirmDeliveryRequest, offline, mediaPending bool) (*model.ConfirmDeliveryResponse, error) {
	action, err := uuid.Parse(request.ClientActionID)
	if err != nil {
		return nil, model.ErrBadRequest("client_action_id must be a valid UUID")
	}
	if request.CompletedAt == nil {
		return nil, model.ErrBadRequest("completed_at is required")
	}
	if existing, err := s.repo.FindDeliveryConfirmation(ctx, driverID, stopID, action); err != nil {
		return nil, err
	} else if existing != nil {
		existing.CompletedAt = existing.CompletedAt.In(s.location)
		return existing, nil
	}
	x, err := s.repo.GetPODContext(ctx, driverID, stopID)
	if err != nil {
		return nil, err
	}
	if !mediaPending && (!x.SignatureURLs[request.SignatureURL] || !x.PhotoURLs[request.PhotoURL]) {
		return nil, model.NewAppError(model.ErrCodeValidationFailed, "signature_url and photo_url must belong to this stop", 422)
	}
	ordered := map[string]int{}
	for _, i := range x.Items {
		ordered[i.ItemID] = i.OrderedQty
	}
	delivered := map[string]int{}
	for _, i := range request.Items {
		max, ok := ordered[i.ItemID]
		if !ok || i.DeliveredQty < 0 || i.DeliveredQty > max {
			return nil, model.NewAppError(model.ErrCodeValidationFailed, "delivered_qty must be between zero and ordered_qty", 422)
		}
		delivered[i.ItemID] = i.DeliveredQty
	}
	short := map[string]int{}
	for _, sf := range request.Shortfalls {
		if _, ok := ordered[sf.ItemID]; !ok || sf.Qty < 0 {
			return nil, model.NewAppError(model.ErrCodeValidationFailed, "invalid shortfall item or quantity", 422)
		}
		if sf.Type != "shortage" && sf.Type != "damage" {
			return nil, model.NewAppError(model.ErrCodeValidationFailed, "shortfall type must be shortage or damage", 422)
		}
		short[sf.ItemID] += sf.Qty
	}
	for id, max := range ordered {
		qty, ok := delivered[id]
		if !ok {
			return nil, model.NewAppError(model.ErrCodeValidationFailed, "delivered quantity required for every item", 422)
		}
		if short[id] != max-qty {
			return nil, model.NewAppError(model.ErrCodeValidationFailed, "shortfall qty must equal ordered_qty minus delivered_qty", 422)
		}
	}
	outcome := "DELIVERED"
	if len(request.Shortfalls) > 0 {
		outcome = "PARTIAL"
	}
	server := s.now()
	effective := server
	delta := request.CompletedAt.Sub(server)
	if delta < 0 {
		delta = -delta
	}
	if offline || delta <= 5*time.Minute {
		effective = *request.CompletedAt
	}
	response, err := s.repo.ConfirmDelivery(ctx, driverID, stopID, action, request, effective, server, outcome)
	if err != nil {
		return nil, err
	}
	response.CompletedAt = response.CompletedAt.In(s.location)
	return &response, nil
}

func (s *DriverService) StopDetail(ctx context.Context, driverID, stopID uuid.UUID) (*model.DriverStopDetail, error) {
	raw, err := s.repo.GetStopDetail(ctx, driverID, stopID)
	if errors.Is(err, repository.ErrDriverTripForbidden) {
		return nil, model.ErrForbidden("Stop belongs to another driver")
	}
	if err != nil {
		return nil, err
	}
	items, err := s.repo.GetStopItems(ctx, stopID)
	if err != nil {
		return nil, err
	}
	previous, err := s.repo.GetPreviousSkip(ctx, raw.TripID, raw.OutletID)
	if err != nil {
		return nil, err
	}
	return buildStopDetail(raw, items, previous), nil
}

func buildStopDetail(raw model.DriverStopDetailRecord, items []model.StopItem, previous *model.PreviousSkip) *model.DriverStopDetail {
	status := "PENDING"
	if raw.Removed {
		status = "REMOVED"
	} else {
		if raw.ArrivalStatus != "" {
			status = raw.ArrivalStatus
		}
		if raw.DeliveryStatus != "" {
			status = raw.DeliveryStatus
		}
		switch raw.Outcome {
		case "DELIVERED":
			status = "DELIVERED"
		case "PARTIAL":
			status = "PARTIAL"
		case "ATTEMPTED", "NOT_HOME", "REFUSED":
			status = "NOT_DELIVERED"
		default:
			if raw.ArrivalStatus == "" && raw.CanArrive {
				status = "IN_PROGRESS"
			}
		}
	}
	reqs := []string{}
	add := func(v string) {
		for _, existing := range reqs {
			if existing == v {
				return
			}
		}
		reqs = append(reqs, v)
	}
	parkingConstraint := strings.ToLower(raw.ParkingConstraint)
	if parkingConstraint == "van_only" {
		add("van_only")
	}
	if parkingConstraint == "mall_dock" {
		add("access_window")
	}
	if dockType := strings.ToLower(raw.DockType); dockType != "" {
		add(dockType)
	}
	if raw.MallWindow != "" {
		add("access_window")
	}
	access := raw.BayInfo
	if raw.MallWindow != "" {
		access = raw.MallWindow
	}
	totals := model.StopTotals{}
	for i := range items {
		item := &items[i]
		totals.Units += item.Units
		totals.WeightKg += item.WeightKg
		item.TempRequirement = strings.ToLower(item.TempRequirement)
		if item.TempRequirement == "chilled" {
			add("chilled")
		}
	}
	return &model.DriverStopDetail{StopNo: raw.StopNo, Status: status, Outlet: model.StopOutlet{ID: raw.OutletID, Name: raw.OutletName, District: raw.District}, DeliveryWindow: model.DeliveryWindow{Open: raw.WindowOpen, Close: raw.WindowClose}, AccessNote: access, Requirements: reqs, Items: items, Totals: totals, PreviousSkip: previous, CanArrive: raw.CanArrive}
}

type DriverService struct {
	repo     DriverTodayRepository
	now      func() time.Time
	location *time.Location
}

func NewDriverService(repo DriverTodayRepository) *DriverService {
	loc, err := time.LoadLocation("Asia/Colombo")
	if err != nil {
		loc = time.FixedZone("Asia/Colombo", 19800)
	}
	return &DriverService{repo: repo, now: time.Now, location: loc}
}

func (s *DriverService) Arrive(ctx context.Context, driverID, stopID uuid.UUID, request model.ArriveRequest) (*model.ArrivalResponse, error) {
	actionID, err := uuid.Parse(request.ClientActionID)
	if err != nil {
		return nil, model.ErrBadRequest("client_action_id must be a valid UUID")
	}
	serverTime := s.now()
	effectiveTime := serverTime
	if request.ArrivedAt != nil {
		delta := request.ArrivedAt.Sub(serverTime)
		if delta < 0 {
			delta = -delta
		}
		if delta <= 5*time.Minute {
			effectiveTime = *request.ArrivedAt
		}
	}
	record, err := s.repo.Arrive(ctx, driverID, stopID, actionID, request.ArrivedAt, serverTime, effectiveTime)
	if err != nil {
		return nil, err
	}
	return arrivalResponse(record, s.location), nil
}

func (s *DriverService) ArriveOffline(ctx context.Context, driverID, stopID, actionID uuid.UUID, recordedAt, receivedAt time.Time) (*model.ArrivalResponse, error) {
	ctx = repository.WithOfflineReplay(ctx)
	record, err := s.repo.Arrive(ctx, driverID, stopID, actionID, &recordedAt, receivedAt, recordedAt)
	if err != nil {
		return nil, err
	}
	return arrivalResponse(record, s.location), nil
}

func (s *DriverService) WindowStatus(ctx context.Context, driverID, stopID uuid.UUID) (model.WindowStatusResponse, error) {
	result, err := s.repo.GetWindowStatus(ctx, driverID, stopID, s.now())
	if err == nil {
		result.CurrentTime = result.CurrentTime.In(s.location)
		result.WindowOpensAt = result.WindowOpensAt.In(s.location)
	}
	return result, err
}

func arrivalResponse(record model.ArrivalRecord, location *time.Location) *model.ArrivalResponse {
	response := &model.ArrivalResponse{Status: record.Status, ArrivedAt: record.ArrivedAt.In(location), Late: record.Late}
	if record.Status == "WAITING_FOR_WINDOW" {
		opens := record.WindowOpensAt.In(location)
		minutes := int(record.WindowOpensAt.Sub(record.ArrivedAt) / time.Minute)
		if record.WindowOpensAt.Sub(record.ArrivedAt)%time.Minute != 0 {
			minutes++
		}
		if minutes < 0 {
			minutes = 0
		}
		response.WindowOpensAt = &opens
		response.MinutesUntilOpen = &minutes
		response.ArrivedActionAvailableAt = &opens
	}
	return response
}

var cantDeliverReasons = []model.CantDeliverReason{{Code: "outlet_closed", Label: "Outlet closed"}, {Code: "access_denied", Label: "Access denied"}, {Code: "wrong_vehicle_temperature", Label: "Wrong vehicle / temperature"}, {Code: "wrong_delivery_window", Label: "Wrong delivery window"}, {Code: "other", Label: "Other"}}

func CantDeliverReasons() []model.CantDeliverReason {
	return append([]model.CantDeliverReason(nil), cantDeliverReasons...)
}
func (s *DriverService) CantDeliver(ctx context.Context, driverID, stopID uuid.UUID, request model.CantDeliverRequest) (*model.CantDeliverResponse, error) {
	return s.cantDeliver(ctx, driverID, stopID, request, false)
}
func (s *DriverService) CantDeliverOffline(ctx context.Context, driverID, stopID uuid.UUID, request model.CantDeliverRequest) (*model.CantDeliverResponse, error) {
	return s.cantDeliver(repository.WithOfflineReplay(ctx), driverID, stopID, request, true)
}
func (s *DriverService) cantDeliver(ctx context.Context, driverID, stopID uuid.UUID, request model.CantDeliverRequest, offline bool) (*model.CantDeliverResponse, error) {
	valid := false
	for _, item := range cantDeliverReasons {
		if request.Reason == item.Code {
			valid = true
			break
		}
	}
	if !valid {
		return nil, model.ErrBadRequest("invalid cant-deliver reason")
	}
	if utf8.RuneCountInString(request.Note) > 300 {
		return nil, model.ErrBadRequest("note must not exceed 300 characters")
	}
	if request.ReportedAt == nil {
		return nil, model.ErrBadRequest("reported_at is required")
	}
	actionID, err := uuid.Parse(request.ClientActionID)
	if err != nil {
		return nil, model.ErrBadRequest("client_action_id must be a valid UUID")
	}
	server := s.now()
	effective := server
	delta := request.ReportedAt.Sub(server)
	if delta < 0 {
		delta = -delta
	}
	if offline || delta <= 5*time.Minute {
		effective = *request.ReportedAt
	}
	response, err := s.repo.CantDeliver(ctx, driverID, stopID, actionID, request.Reason, strings.TrimSpace(request.Note), request.ReportedAt, server, effective)
	if err != nil {
		return nil, err
	}
	return &response, nil
}

func (s *DriverService) Today(ctx context.Context, driverID uuid.UUID, date time.Time) (*model.DriverTodayResponse, error) {
	d, v, err := s.repo.GetDriverVehicle(ctx, driverID)
	if err != nil {
		return nil, err
	}
	recs, err := s.repo.GetTrips(ctx, driverID, v.ID, date)
	if err != nil {
		return nil, err
	}
	resp := &model.DriverTodayResponse{Driver: d, Vehicle: v, Trips: []model.DriverTrip{}}
	for _, rec := range recs {
		stops, err := s.repo.GetStops(ctx, mustUUID(rec.ID))
		if err != nil {
			return nil, err
		}
		resp.Trips = append(resp.Trips, buildDriverTrip(rec, stops))
	}
	return resp, nil
}

func (s *DriverService) TripStops(ctx context.Context, driverID, tripID uuid.UUID) (*model.DriverTrip, error) {
	rec, err := s.repo.GetTrip(ctx, driverID, tripID)
	if errors.Is(err, repository.ErrDriverTripForbidden) {
		return nil, model.ErrForbidden("Trip belongs to another driver")
	}
	if err != nil {
		return nil, err
	}
	stops, err := s.repo.GetStops(ctx, tripID)
	if err != nil {
		return nil, err
	}
	x := buildDriverTrip(rec, stops)
	return &x, nil
}
func (s *DriverService) DispatcherContact(ctx context.Context, id uuid.UUID) (model.DispatcherContact, error) {
	return s.repo.GetDispatcherContact(ctx, id)
}

func buildDriverTrip(rec model.DriverTripRecord, raw []model.DriverStopRecord) model.DriverTrip {
	t := model.DriverTrip{ID: rec.ID, TripNumber: rec.TripNumber, Status: rec.Status, Stops: make([]model.DriverStop, 0, len(raw))}
	inProgressSet := false
	for _, r := range raw {
		status := "PENDING"
		if r.Removed {
			status = "REMOVED"
		} else {
			if r.ArrivalStatus != "" {
				status = r.ArrivalStatus
			}
			if r.DeliveryStatus != "" {
				status = r.DeliveryStatus
			}
			switch r.Outcome {
			case "DELIVERED":
				status = "DELIVERED"
			case "PARTIAL":
				status = "PARTIAL"
			case "ATTEMPTED", "NOT_HOME", "REFUSED":
				status = "NOT_DELIVERED"
			}
		}
		completed := status == "DELIVERED" || status == "PARTIAL" || status == "NOT_DELIVERED"
		if !r.Removed {
			t.TotalStops++
			if completed {
				t.CompletedStops++
			} else if !inProgressSet && status == "PENDING" {
				status = "IN_PROGRESS"
				inProgressSet = true
			}
		}
		t.Stops = append(t.Stops, model.DriverStop{StopID: r.StopID, Seq: r.Seq, OutletID: r.OutletID, OutletName: r.OutletName, District: r.District, WindowOpen: r.WindowOpen, WindowClose: r.WindowClose, Status: status})
	}
	if t.TotalStops > 0 {
		t.ProgressPercent = t.CompletedStops * 100 / t.TotalStops
	}
	return t
}
func mustUUID(s string) uuid.UUID { id, _ := uuid.Parse(s); return id }
