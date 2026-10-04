package service

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
)

type syncRepository interface {
	Existing(context.Context, uuid.UUID, uuid.UUID) (*model.SyncResult, bool, error)
	StopState(context.Context, uuid.UUID) (repository.SyncStopState, error)
	SaveResult(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, string, time.Time, time.Time, []byte, model.SyncResult, string) error
	SaveConflict(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, string, string, string, time.Time, time.Time, []byte) (model.SyncConflict, error)
	PreviousSync(context.Context, uuid.UUID) (*time.Time, error)
	Finish(context.Context, uuid.UUID, time.Time) error
	RouteChanges(context.Context, uuid.UUID, time.Time) ([]model.RouteChange, error)
	Verify(context.Context, uuid.UUID, []uuid.UUID) (map[uuid.UUID]string, error)
	Conflicts(context.Context, uuid.UUID) ([]model.SyncConflictRecord, error)
	MediaTarget(context.Context, uuid.UUID, uuid.UUID) (uuid.UUID, string, string, error)
	CompleteMedia(context.Context, uuid.UUID, uuid.UUID, string, string, time.Time) error
}
type offlineDriver interface {
	ArriveOffline(context.Context, uuid.UUID, uuid.UUID, uuid.UUID, time.Time, time.Time) (*model.ArrivalResponse, error)
	CantDeliverOffline(context.Context, uuid.UUID, uuid.UUID, model.CantDeliverRequest) (*model.CantDeliverResponse, error)
	ConfirmDeliveryOffline(context.Context, uuid.UUID, uuid.UUID, model.ConfirmDeliveryRequest, bool) (*model.ConfirmDeliveryResponse, error)
}
type SyncService struct {
	repo   syncRepository
	driver offlineDriver
	now    func() time.Time
}

func NewSyncService(repo syncRepository, driver offlineDriver) *SyncService {
	return &SyncService{repo: repo, driver: driver, now: time.Now}
}
func syncRank(t string) int {
	if t == "ARRIVAL" {
		return 0
	}
	return 1
}
func (s *SyncService) Sync(ctx context.Context, driverID uuid.UUID, req model.SyncRequest) (*model.SyncResponse, error) {
	if len(req.Actions) > 100 {
		return nil, model.ErrBadRequest("actions must not exceed 100")
	}
	received := s.now()
	previous, err := s.repo.PreviousSync(ctx, driverID)
	if err != nil {
		return nil, err
	}
	actions := append([]model.SyncAction(nil), req.Actions...)
	sort.SliceStable(actions, func(i, j int) bool {
		if actions[i].ClientTimestamp.Equal(actions[j].ClientTimestamp) {
			return syncRank(actions[i].Type) < syncRank(actions[j].Type)
		}
		return actions[i].ClientTimestamp.Before(actions[j].ClientTimestamp)
	})
	resp := &model.SyncResponse{Results: []model.SyncResult{}, Conflicts: []model.SyncConflict{}, PendingMediaActionIDs: []string{}, Total: len(actions)}
	arrivalFailed := map[string]bool{}
	for _, a := range actions {
		res, conflict, pending := s.process(ctx, driverID, a, received, arrivalFailed[a.StopID])
		resp.Results = append(resp.Results, res)
		switch res.Status {
		case "SYNCED":
			resp.SyncedCount++
		case "DUPLICATE":
			resp.DuplicateCount++
		case "CONFLICT":
			resp.ConflictCount++
			if conflict != nil {
				resp.Conflicts = append(resp.Conflicts, *conflict)
			}
		default:
			resp.FailedCount++
			if a.Type == "ARRIVAL" {
				arrivalFailed[a.StopID] = true
			}
		}
		if pending {
			resp.PendingMediaActionIDs = append(resp.PendingMediaActionIDs, a.ClientActionID)
		}
	}
	since := time.Unix(0, 0)
	if previous != nil {
		since = *previous
	}
	resp.RouteChanges, err = s.repo.RouteChanges(ctx, driverID, since)
	if err != nil {
		return nil, err
	}
	if err = s.repo.Finish(ctx, driverID, received); err != nil {
		return nil, err
	}
	resp.LastSyncedAt = received
	return resp, nil
}
func (s *SyncService) process(ctx context.Context, driver uuid.UUID, a model.SyncAction, received time.Time, dependencyFailed bool) (model.SyncResult, *model.SyncConflict, bool) {
	label := syncLabelService(a.Type)
	base := model.SyncResult{ClientActionID: a.ClientActionID, Type: a.Type, StopID: a.StopID, Label: label}
	actionID, e1 := uuid.Parse(a.ClientActionID)
	stopID, e2 := uuid.Parse(a.StopID)
	if e1 != nil || e2 != nil {
		return s.failed(ctx, driver, actionID, stopID, a, received, base, "BAD_REQUEST", "client_action_id and stop_id must be valid UUIDs")
	}
	if old, ok, err := s.repo.Existing(ctx, driver, actionID); err == nil && ok {
		old.Status = "DUPLICATE"
		return *old, nil, false
	} else if err != nil {
		return s.failed(ctx, driver, actionID, stopID, a, received, base, "INTERNAL_ERROR", err.Error())
	}
	if a.Type != "ARRIVAL" && a.Type != "DELIVERY" && a.Type != "ISSUE" {
		return s.failed(ctx, driver, actionID, stopID, a, received, base, "BAD_REQUEST", "invalid action type")
	}
	if a.ClientTimestamp.After(received.Add(5 * time.Minute)) {
		return s.failed(ctx, driver, actionID, stopID, a, received, base, "FUTURE_TIMESTAMP", "client_timestamp is more than 5 minutes in the future")
	}
	if dependencyFailed && (a.Type == "DELIVERY" || a.Type == "ISSUE") {
		return s.failed(ctx, driver, actionID, stopID, a, received, base, "DEPENDENCY_FAILED", "Arrival record for this stop failed")
	}
	state, err := s.repo.StopState(ctx, stopID)
	if err != nil {
		return s.failed(ctx, driver, actionID, stopID, a, received, base, errorCode(err), errorMessage(err))
	}
	if state.Owner != driver {
		if state.OriginalOwner == driver && (a.Type == "DELIVERY" || a.Type == "ISSUE") {
			return s.conflict(ctx, driver, actionID, stopID, a, received, state, "STOP_REASSIGNED")
		}
		return s.failed(ctx, driver, actionID, stopID, a, received, base, "FORBIDDEN", "Stop belongs to another driver")
	}
	if a.Type == "DELIVERY" || a.Type == "ISSUE" {
		if state.Removed {
			return s.conflict(ctx, driver, actionID, stopID, a, received, state, "STOP_ALREADY_COMPLETED")
		}
		if state.DeliveryStatus != "" {
			return s.conflict(ctx, driver, actionID, stopID, a, received, state, "STOP_ALREADY_HAS_OUTCOME")
		}
	}
	var opErr error
	pending := false
	switch a.Type {
	case "ARRIVAL":
		_, opErr = s.driver.ArriveOffline(ctx, driver, stopID, actionID, a.ClientTimestamp, received)
	case "ISSUE":
		var p struct {
			Reason string `json:"reason"`
			Note   string `json:"note"`
		}
		if json.Unmarshal(a.Payload, &p) != nil {
			opErr = model.ErrBadRequest("invalid issue payload")
		} else {
			t := a.ClientTimestamp
			_, opErr = s.driver.CantDeliverOffline(ctx, driver, stopID, model.CantDeliverRequest{ClientActionID: a.ClientActionID, Reason: p.Reason, Note: p.Note, ReportedAt: &t})
		}
	case "DELIVERY":
		var p struct {
			model.ConfirmDeliveryRequest
			MediaPending bool `json:"media_pending"`
		}
		if json.Unmarshal(a.Payload, &p) != nil {
			opErr = model.ErrBadRequest("invalid delivery payload")
		} else {
			p.ClientActionID = a.ClientActionID
			p.CompletedAt = &a.ClientTimestamp
			pending = p.MediaPending
			_, opErr = s.driver.ConfirmDeliveryOffline(ctx, driver, stopID, p.ConfirmDeliveryRequest, p.MediaPending)
		}
	}
	if opErr != nil {
		return s.failed(ctx, driver, actionID, stopID, a, received, base, errorCode(opErr), errorMessage(opErr))
	}
	base.Status = "SYNCED"
	media := "NOT_REQUIRED"
	if pending {
		media = "PENDING"
	}
	_ = s.repo.SaveResult(ctx, driver, actionID, stopID, a.Type, a.ClientTimestamp, received, a.Payload, base, media)
	return base, nil, pending
}
func (s *SyncService) failed(ctx context.Context, driver, action, stop uuid.UUID, a model.SyncAction, received time.Time, r model.SyncResult, code, msg string) (model.SyncResult, *model.SyncConflict, bool) {
	r.Status = "FAILED"
	r.ErrorCode = code
	r.Message = msg
	if action != uuid.Nil && stop != uuid.Nil {
		_ = s.repo.SaveResult(ctx, driver, action, stop, a.Type, a.ClientTimestamp, received, a.Payload, r, "NOT_REQUIRED")
	}
	return r, nil, false
}
func (s *SyncService) conflict(ctx context.Context, driver, action, stop uuid.UUID, a model.SyncAction, received time.Time, state repository.SyncStopState, code string) (model.SyncResult, *model.SyncConflict, bool) {
	msg := "Offline record conflicts with the current route and has been kept for review."
	if code == "STOP_ALREADY_COMPLETED" {
		msg = "You delivered to " + state.OutletID + " while offline, but the dispatcher removed it from today's plan. Your delivery record has been kept and sent for review."
	}
	c, err := s.repo.SaveConflict(ctx, driver, action, stop, a.Type, code, msg, a.ClientTimestamp, received, a.Payload)
	r := model.SyncResult{ClientActionID: a.ClientActionID, Type: a.Type, StopID: a.StopID, Label: syncLabelService(a.Type), Status: "CONFLICT", ErrorCode: code, Message: msg}
	if err != nil {
		r.Status = "FAILED"
		r.ErrorCode = "INTERNAL_ERROR"
		r.Message = err.Error()
		return r, nil, false
	}
	var p struct {
		MediaPending bool `json:"media_pending"`
	}
	_ = json.Unmarshal(a.Payload, &p)
	return r, &c, p.MediaPending
}
func syncLabelService(t string) string {
	return map[string]string{"ARRIVAL": "Arrival record", "DELIVERY": "Delivery outcome", "ISSUE": "Issue Reported"}[t]
}
func errorCode(err error) string {
	var a *model.AppError
	if errors.As(err, &a) {
		return a.Code
	}
	return "INTERNAL_ERROR"
}
func errorMessage(err error) string {
	var a *model.AppError
	if errors.As(err, &a) {
		return a.Message
	}
	return err.Error()
}
func (s *SyncService) Verify(ctx context.Context, driver uuid.UUID, raw []string) ([]model.SyncVerifyItem, error) {
	ids := []uuid.UUID{}
	for _, v := range raw {
		id, err := uuid.Parse(v)
		if err != nil {
			return nil, model.ErrBadRequest("client_action_ids must be valid UUIDs")
		}
		ids = append(ids, id)
	}
	found, err := s.repo.Verify(ctx, driver, ids)
	if err != nil {
		return nil, err
	}
	out := make([]model.SyncVerifyItem, 0, len(ids))
	for _, id := range ids {
		status := found[id]
		if status == "" {
			status = "UNKNOWN"
		}
		out = append(out, model.SyncVerifyItem{ClientActionID: id.String(), Status: status})
	}
	return out, nil
}
func (s *SyncService) Conflicts(ctx context.Context, driver uuid.UUID) ([]model.SyncConflictRecord, error) {
	return s.repo.Conflicts(ctx, driver)
}
func (s *SyncService) MediaTarget(ctx context.Context, driver, action uuid.UUID) (uuid.UUID, string, string, error) {
	return s.repo.MediaTarget(ctx, driver, action)
}
func (s *SyncService) CompleteMedia(ctx context.Context, driver, action uuid.UUID, sig, photo string) (model.SyncMediaResponse, error) {
	stop, oldSig, oldPhoto, err := s.repo.MediaTarget(ctx, driver, action)
	_ = stop
	if err != nil {
		return model.SyncMediaResponse{}, err
	}
	if oldSig != "" {
		sig = oldSig
	}
	if oldPhoto != "" {
		photo = oldPhoto
	}
	if sig == "" || photo == "" {
		return model.SyncMediaResponse{}, model.ErrBadRequest("signature and photo are required")
	}
	if err = s.repo.CompleteMedia(ctx, driver, action, sig, photo, s.now()); err != nil {
		return model.SyncMediaResponse{}, err
	}
	return model.SyncMediaResponse{ClientActionID: action.String(), PodMediaStatus: "COMPLETE", SignatureURL: sig, PhotoURL: photo}, nil
}
