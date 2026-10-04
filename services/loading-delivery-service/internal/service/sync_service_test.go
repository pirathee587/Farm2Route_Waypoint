package service

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
)

type fakeSyncRepo struct {
	existing        map[uuid.UUID]model.SyncResult
	states          map[uuid.UUID]repository.SyncStopState
	saved           []model.SyncResult
	conflictCodes   []string
	conflictPayload []byte
	previous        *time.Time
	changes         []model.RouteChange
	finished        bool
	verify          map[uuid.UUID]string
	mediaStop       uuid.UUID
	sig, photo      string
}

func (f *fakeSyncRepo) Existing(_ context.Context, _ uuid.UUID, id uuid.UUID) (*model.SyncResult, bool, error) {
	x, ok := f.existing[id]
	return &x, ok, nil
}
func (f *fakeSyncRepo) StopState(_ context.Context, id uuid.UUID) (repository.SyncStopState, error) {
	x, ok := f.states[id]
	if !ok {
		return x, model.ErrNotFound("Stop not found")
	}
	return x, nil
}
func (f *fakeSyncRepo) SaveResult(_ context.Context, _, _, _ uuid.UUID, _ string, _, _ time.Time, _ []byte, x model.SyncResult, _ string) error {
	f.saved = append(f.saved, x)
	return nil
}
func (f *fakeSyncRepo) SaveConflict(_ context.Context, _, action, stop uuid.UUID, _, code, msg string, _, _ time.Time, payload []byte) (model.SyncConflict, error) {
	f.conflictCodes = append(f.conflictCodes, code)
	f.conflictPayload = append([]byte(nil), payload...)
	return model.SyncConflict{ClientActionID: action.String(), StopID: stop.String(), Code: code, Message: msg}, nil
}
func (f *fakeSyncRepo) PreviousSync(context.Context, uuid.UUID) (*time.Time, error) {
	return f.previous, nil
}
func (f *fakeSyncRepo) Finish(context.Context, uuid.UUID, time.Time) error {
	f.finished = true
	return nil
}
func (f *fakeSyncRepo) RouteChanges(_ context.Context, _ uuid.UUID, since time.Time) ([]model.RouteChange, error) {
	if f.previous != nil && since != *f.previous {
		return nil, errors.New("wrong sync cursor")
	}
	return f.changes, nil
}
func (f *fakeSyncRepo) Verify(context.Context, uuid.UUID, []uuid.UUID) (map[uuid.UUID]string, error) {
	return f.verify, nil
}
func (f *fakeSyncRepo) Conflicts(context.Context, uuid.UUID) ([]model.SyncConflictRecord, error) {
	return []model.SyncConflictRecord{{Status: "CONFLICT_REVIEW"}}, nil
}
func (f *fakeSyncRepo) MediaTarget(context.Context, uuid.UUID, uuid.UUID) (uuid.UUID, string, string, error) {
	return f.mediaStop, f.sig, f.photo, nil
}
func (f *fakeSyncRepo) CompleteMedia(_ context.Context, _, _ uuid.UUID, sig, photo string, _ time.Time) error {
	f.sig, f.photo = sig, photo
	return nil
}

type fakeOfflineDriver struct {
	calls []string
	fail  map[string]error
}

func (f *fakeOfflineDriver) ArriveOffline(_ context.Context, _, stop, _ uuid.UUID, _, _ time.Time) (*model.ArrivalResponse, error) {
	f.calls = append(f.calls, "ARRIVAL:"+stop.String())
	return &model.ArrivalResponse{}, f.fail["ARRIVAL:"+stop.String()]
}
func (f *fakeOfflineDriver) CantDeliverOffline(_ context.Context, _, stop uuid.UUID, _ model.CantDeliverRequest) (*model.CantDeliverResponse, error) {
	f.calls = append(f.calls, "ISSUE:"+stop.String())
	return &model.CantDeliverResponse{}, f.fail["ISSUE:"+stop.String()]
}
func (f *fakeOfflineDriver) ConfirmDeliveryOffline(_ context.Context, _, stop uuid.UUID, _ model.ConfirmDeliveryRequest, _ bool) (*model.ConfirmDeliveryResponse, error) {
	f.calls = append(f.calls, "DELIVERY:"+stop.String())
	return &model.ConfirmDeliveryResponse{}, f.fail["DELIVERY:"+stop.String()]
}
func syncFixture() (*SyncService, *fakeSyncRepo, *fakeOfflineDriver, uuid.UUID, uuid.UUID, time.Time) {
	driver, stop := uuid.New(), uuid.New()
	now := time.Date(2026, 10, 4, 10, 0, 0, 0, time.UTC)
	repo := &fakeSyncRepo{existing: map[uuid.UUID]model.SyncResult{}, states: map[uuid.UUID]repository.SyncStopState{stop: {Owner: driver, OriginalOwner: driver, OutletID: "OUT014"}}, verify: map[uuid.UUID]string{}, mediaStop: stop}
	d := &fakeOfflineDriver{fail: map[string]error{}}
	s := NewSyncService(repo, d)
	s.now = func() time.Time { return now }
	return s, repo, d, driver, stop, now
}
func action(kind string, stop uuid.UUID, at time.Time) model.SyncAction {
	payload := json.RawMessage(`{}`)
	if kind == "ISSUE" {
		payload = json.RawMessage(`{"reason":"access_denied"}`)
	}
	return model.SyncAction{ClientActionID: uuid.NewString(), Type: kind, StopID: stop.String(), ClientTimestamp: at, Payload: payload}
}

func TestSyncSortsAndContinuesAfterFailure(t *testing.T) {
	s, r, d, driver, stop, now := syncFixture()
	other := uuid.New()
	r.states[other] = repository.SyncStopState{Owner: driver, OriginalOwner: driver}
	d.fail["ARRIVAL:"+stop.String()] = model.ErrBadRequest("bad arrival")
	req := model.SyncRequest{Actions: []model.SyncAction{action("ISSUE", stop, now.Add(-time.Minute)), action("ARRIVAL", other, now.Add(-2*time.Minute)), action("ARRIVAL", stop, now.Add(-time.Minute))}}
	out, err := s.Sync(context.Background(), driver, req)
	require.NoError(t, err)
	require.Equal(t, "ARRIVAL", out.Results[0].Type)
	require.Equal(t, "FAILED", out.Results[1].Status)
	require.Equal(t, "DEPENDENCY_FAILED", out.Results[2].ErrorCode)
	require.Equal(t, 1, out.SyncedCount)
	require.True(t, r.finished)
}
func TestSyncScenarioANormalOfflineBatch(t *testing.T) {
	s, r, _, driver, out014, now := syncFixture()
	out027, out032 := uuid.New(), uuid.New()
	r.states[out027] = repository.SyncStopState{Owner: driver, OriginalOwner: driver, OutletID: "OUT027"}
	r.states[out032] = repository.SyncStopState{Owner: driver, OriginalOwner: driver, OutletID: "OUT032"}
	delivery := action("DELIVERY", out014, now.Add(-3*time.Minute))
	delivery.Payload = json.RawMessage(`{"items":[],"shortfalls":[{"item_id":"bread","qty":2,"type":"shortage"}]}`)
	req := model.SyncRequest{Actions: []model.SyncAction{action("ISSUE", out032, now.Add(-time.Minute)), action("ARRIVAL", out027, now.Add(-2*time.Minute)), delivery}}
	out, err := s.Sync(context.Background(), driver, req)
	require.NoError(t, err)
	require.Equal(t, 3, out.SyncedCount)
	require.Equal(t, []string{"DELIVERY", "ARRIVAL", "ISSUE"}, []string{out.Results[0].Type, out.Results[1].Type, out.Results[2].Type})
}
func TestSyncDuplicateNoNewOperation(t *testing.T) {
	s, r, d, driver, stop, now := syncFixture()
	a := action("ARRIVAL", stop, now)
	id := uuid.MustParse(a.ClientActionID)
	r.existing[id] = model.SyncResult{ClientActionID: a.ClientActionID, Type: "ARRIVAL", StopID: a.StopID, Status: "SYNCED"}
	out, err := s.Sync(context.Background(), driver, model.SyncRequest{Actions: []model.SyncAction{a}})
	require.NoError(t, err)
	require.Equal(t, 1, out.DuplicateCount)
	require.Empty(t, d.calls)
	require.Empty(t, r.saved)
}
func TestSyncConflictsKeepAllThreePaths(t *testing.T) {
	for _, tc := range []struct {
		name, code string
		state      repository.SyncStopState
	}{{"removed", "STOP_ALREADY_COMPLETED", repository.SyncStopState{Removed: true}}, {"reassigned", "STOP_REASSIGNED", repository.SyncStopState{}}, {"outcome", "STOP_ALREADY_HAS_OUTCOME", repository.SyncStopState{DeliveryStatus: "DELIVERED"}}} {
		t.Run(tc.name, func(t *testing.T) {
			s, r, _, driver, stop, now := syncFixture()
			tc.state.OutletID = "OUT014"
			if tc.code == "STOP_REASSIGNED" {
				tc.state.OriginalOwner = driver
				tc.state.Owner = uuid.New()
			} else {
				tc.state.Owner = driver
				tc.state.OriginalOwner = driver
			}
			r.states[stop] = tc.state
			delivery := action("DELIVERY", stop, now)
			delivery.Payload = json.RawMessage(`{"items":[{"name":"Milk","delivered_qty":20},{"name":"Bread","delivered_qty":28},{"name":"Vegetables","delivered_qty":15}],"shortfalls":[{"name":"Bread","qty":2,"type":"shortage"}]}`)
			out, err := s.Sync(context.Background(), driver, model.SyncRequest{Actions: []model.SyncAction{delivery}})
			require.NoError(t, err)
			require.Equal(t, tc.code, out.Results[0].ErrorCode)
			require.Equal(t, []string{tc.code}, r.conflictCodes)
			require.Contains(t, string(r.conflictPayload), "Bread")
		})
	}
}
func TestSyncValidationLimitsFutureAndForbidden(t *testing.T) {
	s, r, _, driver, stop, now := syncFixture()
	tooMany := make([]model.SyncAction, 101)
	_, err := s.Sync(context.Background(), driver, model.SyncRequest{Actions: tooMany})
	require.Equal(t, 400, err.(*model.AppError).Status)
	future := action("ARRIVAL", stop, now.Add(6*time.Minute))
	out, _ := s.Sync(context.Background(), driver, model.SyncRequest{Actions: []model.SyncAction{future}})
	require.Equal(t, "FUTURE_TIMESTAMP", out.Results[0].ErrorCode)
	r.states[stop] = repository.SyncStopState{Owner: uuid.New(), OriginalOwner: uuid.New()}
	out, _ = s.Sync(context.Background(), driver, model.SyncRequest{Actions: []model.SyncAction{action("DELIVERY", stop, now)}})
	require.Equal(t, "FORBIDDEN", out.Results[0].ErrorCode)
}
func TestSyncMediaVerifyCursorAndRouteChanges(t *testing.T) {
	s, r, _, driver, stop, now := syncFixture()
	previous := now.Add(-time.Hour)
	r.previous = &previous
	r.changes = []model.RouteChange{{Type: "STOP_REMOVED"}}
	a := action("DELIVERY", stop, now)
	a.Payload = json.RawMessage(`{"media_pending":true}`)
	out, err := s.Sync(context.Background(), driver, model.SyncRequest{Actions: []model.SyncAction{a}})
	require.NoError(t, err)
	require.Equal(t, []string{a.ClientActionID}, out.PendingMediaActionIDs)
	require.Len(t, out.RouteChanges, 1)
	id := uuid.MustParse(a.ClientActionID)
	r.verify[id] = "SYNCED"
	unknown := uuid.New()
	verified, err := s.Verify(context.Background(), driver, []string{id.String(), unknown.String()})
	require.NoError(t, err)
	require.Equal(t, "SYNCED", verified[0].Status)
	require.Equal(t, "UNKNOWN", verified[1].Status)
	media, err := s.CompleteMedia(context.Background(), driver, id, "sig", "photo")
	require.NoError(t, err)
	require.Equal(t, "COMPLETE", media.PodMediaStatus)
}
