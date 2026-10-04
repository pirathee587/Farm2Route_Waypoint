package service

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
)

type fakeDriverRepo struct {
	forbidden       bool
	stopErr         error
	previous        *model.PreviousSkip
	stop            model.DriverStopDetailRecord
	arrivalErr      error
	arrivalAction   uuid.UUID
	arrivalRecord   model.ArrivalRecord
	arrivalCalls    int
	cantErr         error
	cantAction      uuid.UUID
	cantCalls       int
	cantResponse    model.CantDeliverResponse
	eventWritten    bool
	deferralSaved   bool
	pod             model.PODContext
	confirmErr      error
	confirmCalls    int
	confirmAction   uuid.UUID
	confirmResponse model.ConfirmDeliveryResponse
}

func (f *fakeDriverRepo) Arrive(_ context.Context, _ uuid.UUID, _ uuid.UUID, action uuid.UUID, _ *time.Time, _ time.Time, effective time.Time) (model.ArrivalRecord, error) {
	if f.arrivalErr != nil {
		return model.ArrivalRecord{}, f.arrivalErr
	}
	if f.arrivalAction == action && f.arrivalCalls > 0 {
		return f.arrivalRecord, nil
	}
	f.arrivalCalls++
	f.arrivalAction = action
	r := f.arrivalRecord
	r.ArrivedAt = effective
	if effective.Before(r.WindowOpensAt) {
		r.Status = "WAITING_FOR_WINDOW"
	} else {
		r.Status = "ARRIVED"
		r.Late = effective.After(r.WindowClosesAt)
	}
	f.arrivalRecord = r
	return r, nil
}
func (f *fakeDriverRepo) GetWindowStatus(context.Context, uuid.UUID, uuid.UUID, time.Time) (model.WindowStatusResponse, error) {
	return model.WindowStatusResponse{}, nil
}
func (f *fakeDriverRepo) CantDeliver(_ context.Context, _ uuid.UUID, _ uuid.UUID, action uuid.UUID, _ string, _ string, _ *time.Time, _ time.Time, _ time.Time) (model.CantDeliverResponse, error) {
	if f.cantErr != nil {
		return model.CantDeliverResponse{}, f.cantErr
	}
	if f.cantAction == action && f.cantCalls > 0 {
		return f.cantResponse, nil
	}
	f.cantAction = action
	f.cantCalls++
	f.eventWritten = true
	f.deferralSaved = true
	if f.cantResponse.Status == "" {
		f.cantResponse = model.CantDeliverResponse{Status: "NOT_DELIVERED", RecordSent: true}
	}
	return f.cantResponse, nil
}
func (f *fakeDriverRepo) GetPODContext(context.Context, uuid.UUID, uuid.UUID) (model.PODContext, error) {
	if f.confirmErr != nil {
		return model.PODContext{}, f.confirmErr
	}
	return f.pod, nil
}
func (f *fakeDriverRepo) SavePODUpload(context.Context, uuid.UUID, uuid.UUID, string, string, string, time.Time) (model.PODUploadResponse, error) {
	return model.PODUploadResponse{}, nil
}
func (f *fakeDriverRepo) ConfirmDelivery(_ context.Context, _ uuid.UUID, _ uuid.UUID, action uuid.UUID, _ model.ConfirmDeliveryRequest, effective, _ time.Time, outcome string) (model.ConfirmDeliveryResponse, error) {
	if f.confirmAction == action && f.confirmCalls > 0 {
		return f.confirmResponse, nil
	}
	f.confirmAction = action
	f.confirmCalls++
	f.eventWritten = true
	if f.confirmResponse.Outcome == "" {
		f.confirmResponse = model.ConfirmDeliveryResponse{Outcome: outcome, CompletedAt: effective}
	}
	return f.confirmResponse, f.confirmErr
}
func (f *fakeDriverRepo) FindDeliveryConfirmation(_ context.Context, _ uuid.UUID, _ uuid.UUID, action uuid.UUID) (*model.ConfirmDeliveryResponse, error) {
	if f.confirmAction == action && f.confirmCalls > 0 {
		x := f.confirmResponse
		return &x, nil
	}
	return nil, nil
}

func (f *fakeDriverRepo) GetDriverVehicle(context.Context, uuid.UUID) (model.DriverSummary, model.DriverVehicle, error) {
	return model.DriverSummary{ID: "driver", Name: "Driver 14"}, model.DriverVehicle{ID: "VEH014", Type: "VAN", Depot: "Peliyagoda"}, nil
}
func (f *fakeDriverRepo) GetTrips(context.Context, uuid.UUID, string, time.Time) ([]model.DriverTripRecord, error) {
	return []model.DriverTripRecord{{ID: "14000000-0000-0000-0000-000000000001", TripNumber: 1, Status: "IN_PROGRESS"}}, nil
}
func (f *fakeDriverRepo) GetTrip(context.Context, uuid.UUID, uuid.UUID) (model.DriverTripRecord, error) {
	if f.forbidden {
		return model.DriverTripRecord{}, repository.ErrDriverTripForbidden
	}
	return model.DriverTripRecord{ID: "14000000-0000-0000-0000-000000000001", TripNumber: 1}, nil
}
func (f *fakeDriverRepo) GetStops(context.Context, uuid.UUID) ([]model.DriverStopRecord, error) {
	result := make([]model.DriverStopRecord, 8)
	for i := range result {
		result[i] = model.DriverStopRecord{Seq: i + 1, OutletID: "OUT", WindowOpen: "08:00", WindowClose: "17:00"}
	}
	result[0].Outcome = "DELIVERED"
	result[1].Outcome = "PARTIAL"
	return result, nil
}
func (f *fakeDriverRepo) GetDispatcherContact(context.Context, uuid.UUID) (model.DispatcherContact, error) {
	return model.DispatcherContact{}, nil
}
func (f *fakeDriverRepo) GetStopDetail(context.Context, uuid.UUID, uuid.UUID) (model.DriverStopDetailRecord, error) {
	if f.stopErr != nil {
		return model.DriverStopDetailRecord{}, f.stopErr
	}
	if f.forbidden {
		return model.DriverStopDetailRecord{}, repository.ErrDriverTripForbidden
	}
	return f.stop, nil
}

func TestStopDetailCanArrive(t *testing.T) {
	for _, tc := range []struct {
		name  string
		value bool
	}{{"current pending", true}, {"later stop", false}} {
		t.Run(tc.name, func(t *testing.T) {
			stop := model.DriverStopDetailRecord{StopID: uuid.New(), TripID: uuid.New(), CanArrive: tc.value}
			got, err := NewDriverService(&fakeDriverRepo{stop: stop}).StopDetail(context.Background(), uuid.New(), stop.StopID)
			require.NoError(t, err)
			require.Equal(t, tc.value, got.CanArrive)
		})
	}
}

func TestStopDetailForbiddenAndNotFound(t *testing.T) {
	t.Run("another driver", func(t *testing.T) {
		_, err := NewDriverService(&fakeDriverRepo{forbidden: true}).StopDetail(context.Background(), uuid.New(), uuid.New())
		app, ok := err.(*model.AppError)
		require.True(t, ok)
		require.Equal(t, 403, app.Status)
	})
	t.Run("unknown stop", func(t *testing.T) {
		_, err := NewDriverService(&fakeDriverRepo{stopErr: model.ErrNotFound("Stop not found")}).StopDetail(context.Background(), uuid.New(), uuid.New())
		app, ok := err.(*model.AppError)
		require.True(t, ok)
		require.Equal(t, 404, app.Status)
	})
}

func TestArrivalEarlyOnTimeAndLate(t *testing.T) {
	loc := time.FixedZone("Asia/Colombo", 19800)
	date := func(hour, minute int) time.Time { return time.Date(2026, 10, 4, hour, minute, 0, 0, loc) }
	for _, tc := range []struct {
		name    string
		now     time.Time
		status  string
		late    bool
		minutes int
	}{{"early", date(9, 12), "WAITING_FOR_WINDOW", false, 18}, {"on-time", date(9, 35), "ARRIVED", false, 0}, {"late", date(10, 10), "ARRIVED", true, 0}} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeDriverRepo{arrivalRecord: model.ArrivalRecord{WindowOpensAt: date(9, 30), WindowClosesAt: date(10, 0)}}
			s := NewDriverService(repo)
			s.now = func() time.Time { return tc.now }
			got, err := s.Arrive(context.Background(), uuid.New(), uuid.New(), model.ArriveRequest{ClientActionID: uuid.NewString()})
			require.NoError(t, err)
			require.Equal(t, tc.status, got.Status)
			require.Equal(t, tc.late, got.Late)
			if got.MinutesUntilOpen != nil {
				require.Equal(t, tc.minutes, *got.MinutesUntilOpen)
			}
		})
	}
}

func TestArrivalDuplicateClientActionID(t *testing.T) {
	loc := time.FixedZone("Asia/Colombo", 19800)
	now := time.Date(2026, 10, 4, 9, 12, 0, 0, loc)
	repo := &fakeDriverRepo{arrivalRecord: model.ArrivalRecord{WindowOpensAt: time.Date(2026, 10, 4, 9, 30, 0, 0, loc), WindowClosesAt: time.Date(2026, 10, 4, 10, 0, 0, 0, loc)}}
	s := NewDriverService(repo)
	s.now = func() time.Time { return now }
	action := uuid.NewString()
	first, err := s.Arrive(context.Background(), uuid.New(), uuid.New(), model.ArriveRequest{ClientActionID: action})
	require.NoError(t, err)
	second, err := s.Arrive(context.Background(), uuid.New(), uuid.New(), model.ArriveRequest{ClientActionID: action})
	require.NoError(t, err)
	require.Equal(t, first, second)
	require.Equal(t, 1, repo.arrivalCalls)
}

func TestArrivalWrongOrderAndCrossDriver(t *testing.T) {
	for _, tc := range []struct {
		name   string
		err    error
		status int
	}{{"wrong order", model.NewAppError(model.ErrCodeConflict, "Only the current pending stop can be arrived", 409), 409}, {"cross driver", model.ErrForbidden("Stop belongs to another driver"), 403}} {
		t.Run(tc.name, func(t *testing.T) {
			s := NewDriverService(&fakeDriverRepo{arrivalErr: tc.err})
			_, err := s.Arrive(context.Background(), uuid.New(), uuid.New(), model.ArriveRequest{ClientActionID: uuid.NewString()})
			app, ok := err.(*model.AppError)
			require.True(t, ok)
			require.Equal(t, tc.status, app.Status)
		})
	}
}

func TestWaitingJobTransitionRule(t *testing.T) {
	opens := time.Date(2026, 10, 4, 9, 30, 0, 0, time.UTC)
	require.False(t, windowReached(opens.Add(-time.Second), opens))
	require.True(t, windowReached(opens, opens))
	require.True(t, windowReached(opens.Add(time.Second), opens))
}

func cantRequest() model.CantDeliverRequest {
	reported := time.Now()
	return model.CantDeliverRequest{ClientActionID: uuid.NewString(), Reason: "access_denied", Note: "Mall security refused entry", ReportedAt: &reported}
}
func TestCantDeliverValidation(t *testing.T) {
	s := NewDriverService(&fakeDriverRepo{})
	bad := cantRequest()
	bad.Reason = "invalid"
	_, err := s.CantDeliver(context.Background(), uuid.New(), uuid.New(), bad)
	require.Equal(t, 400, err.(*model.AppError).Status)
	long := cantRequest()
	long.Note = strings.Repeat("a", 301)
	_, err = s.CantDeliver(context.Background(), uuid.New(), uuid.New(), long)
	require.Equal(t, 400, err.(*model.AppError).Status)
}
func TestCantDeliverIdempotentAndWritesRecords(t *testing.T) {
	next := uuid.NewString()
	repo := &fakeDriverRepo{cantResponse: model.CantDeliverResponse{Status: "NOT_DELIVERED", RecordSent: true, NextStopID: &next}}
	s := NewDriverService(repo)
	req := cantRequest()
	first, err := s.CantDeliver(context.Background(), uuid.New(), uuid.New(), req)
	require.NoError(t, err)
	second, err := s.CantDeliver(context.Background(), uuid.New(), uuid.New(), req)
	require.NoError(t, err)
	require.Equal(t, first, second)
	require.Equal(t, 1, repo.cantCalls)
	require.True(t, repo.eventWritten)
	require.True(t, repo.deferralSaved)
	require.Equal(t, next, *first.NextStopID)
}
func TestCantDeliverConflictsAndOwnership(t *testing.T) {
	cases := []struct {
		name   string
		err    error
		status int
	}{{"wrong stop order", model.NewAppError(model.ErrCodeConflict, "wrong order", 409), 409}, {"already finished", model.NewAppError(model.ErrCodeConflict, "finished", 409), 409}, {"cross driver", model.ErrForbidden("Stop belongs to another driver"), 403}}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := NewDriverService(&fakeDriverRepo{cantErr: tc.err}).CantDeliver(context.Background(), uuid.New(), uuid.New(), cantRequest())
			require.Equal(t, tc.status, err.(*model.AppError).Status)
		})
	}
}

func podFixture() (model.PODContext, model.ConfirmDeliveryRequest) {
	now := time.Now()
	pod := model.PODContext{Items: []model.PODItem{{ItemID: "11111111-1111-1111-1111-111111111111", Name: "Milk", OrderedQty: 20}, {ItemID: "22222222-2222-2222-2222-222222222222", Name: "Bread", OrderedQty: 30}}, SignatureURLs: map[string]bool{"sig": true}, PhotoURLs: map[string]bool{"photo": true}}
	req := model.ConfirmDeliveryRequest{ClientActionID: uuid.NewString(), Items: []model.ConfirmItem{{ItemID: pod.Items[0].ItemID, DeliveredQty: 20}, {ItemID: pod.Items[1].ItemID, DeliveredQty: 30}}, SignatureURL: "sig", PhotoURL: "photo", CompletedAt: &now}
	return pod, req
}

func TestConfirmFullAndPartial(t *testing.T) {
	t.Run("full", func(t *testing.T) {
		pod, req := podFixture()
		got, err := NewDriverService(&fakeDriverRepo{pod: pod}).ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
		require.NoError(t, err)
		require.Equal(t, "DELIVERED", got.Outcome)
	})
	t.Run("partial bread shortfall", func(t *testing.T) {
		pod, req := podFixture()
		req.Items[1].DeliveredQty = 28
		req.Shortfalls = []model.ConfirmShortfall{{ItemID: pod.Items[1].ItemID, Qty: 2, Type: "shortage", Note: "Bread short 2"}}
		got, err := NewDriverService(&fakeDriverRepo{pod: pod}).ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
		require.NoError(t, err)
		require.Equal(t, "PARTIAL", got.Outcome)
	})
}

func TestConfirmValidation(t *testing.T) {
	pod, req := podFixture()
	req.Items[0].DeliveredQty = 21
	_, err := NewDriverService(&fakeDriverRepo{pod: pod}).ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
	require.Equal(t, 422, err.(*model.AppError).Status)
	pod, req = podFixture()
	req.Items[1].DeliveredQty = 28
	req.Shortfalls = []model.ConfirmShortfall{{ItemID: pod.Items[1].ItemID, Qty: 1, Type: "shortage"}}
	_, err = NewDriverService(&fakeDriverRepo{pod: pod}).ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
	require.Equal(t, 422, err.(*model.AppError).Status)
	for _, missing := range []string{"signature", "photo"} {
		pod, req = podFixture()
		if missing == "signature" {
			req.SignatureURL = ""
		} else {
			req.PhotoURL = ""
		}
		_, err = NewDriverService(&fakeDriverRepo{pod: pod}).ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
		require.Equal(t, 422, err.(*model.AppError).Status)
	}
}

func TestConfirmIdempotentOutboxNextAndOwnership(t *testing.T) {
	pod, req := podFixture()
	next := uuid.NewString()
	repo := &fakeDriverRepo{pod: pod, confirmResponse: model.ConfirmDeliveryResponse{Outcome: "DELIVERED", CompletedAt: *req.CompletedAt, NextStopID: &next}}
	s := NewDriverService(repo)
	first, err := s.ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
	require.NoError(t, err)
	second, err := s.ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
	require.NoError(t, err)
	require.Equal(t, first, second)
	require.Equal(t, 1, repo.confirmCalls)
	require.True(t, repo.eventWritten)
	require.Equal(t, next, *first.NextStopID)
	repo = &fakeDriverRepo{confirmErr: model.ErrForbidden("Stop belongs to another driver")}
	_, err = NewDriverService(repo).ConfirmDelivery(context.Background(), uuid.New(), uuid.New(), req)
	require.Equal(t, 403, err.(*model.AppError).Status)
}

func TestPODImageValidation(t *testing.T) {
	_, err := ValidatePODImage([]byte("text"))
	require.Equal(t, 400, err.(*model.AppError).Status)
	oversized := make([]byte, 5*1024*1024+1)
	copy(oversized, []byte{0xff, 0xd8, 0xff})
	_, err = ValidatePODImage(oversized)
	require.Equal(t, 400, err.(*model.AppError).Status)
}
func (f *fakeDriverRepo) GetStopItems(context.Context, uuid.UUID) ([]model.StopItem, error) {
	return []model.StopItem{{Name: "Milk", Units: 2, WeightKg: 4, TempRequirement: "CHILLED"}}, nil
}
func (f *fakeDriverRepo) GetPreviousSkip(context.Context, uuid.UUID, string) (*model.PreviousSkip, error) {
	return f.previous, nil
}

func TestTodayProgressTwoOfEight(t *testing.T) {
	s := NewDriverService(&fakeDriverRepo{})
	got, err := s.Today(context.Background(), uuid.New(), time.Now())
	require.NoError(t, err)
	require.Equal(t, 8, got.Trips[0].TotalStops)
	require.Equal(t, 2, got.Trips[0].CompletedStops)
	require.Equal(t, 25, got.Trips[0].ProgressPercent)
	count := 0
	for _, stop := range got.Trips[0].Stops {
		if stop.Status == "IN_PROGRESS" {
			count++
		}
	}
	require.Equal(t, 1, count)
}

func TestOtherDriversTripIsForbidden(t *testing.T) {
	s := NewDriverService(&fakeDriverRepo{forbidden: true})
	_, err := s.TripStops(context.Background(), uuid.New(), uuid.New())
	appErr, ok := err.(*model.AppError)
	require.True(t, ok)
	require.Equal(t, 403, appErr.Status)
}

func TestStopDetailPreviousSkipNullAndNonNull(t *testing.T) {
	base := model.DriverStopDetailRecord{StopID: uuid.New(), TripID: uuid.New(), OutletID: "OUT001", ParkingConstraint: "van_only"}
	t.Run("null", func(t *testing.T) {
		got, err := NewDriverService(&fakeDriverRepo{stop: base}).StopDetail(context.Background(), uuid.New(), base.StopID)
		require.NoError(t, err)
		require.Nil(t, got.PreviousSkip)
		require.Contains(t, got.Requirements, "van_only")
	})
	t.Run("non-null", func(t *testing.T) {
		skip := &model.PreviousSkip{Reason: "Closed", Date: "2026-10-03"}
		got, err := NewDriverService(&fakeDriverRepo{stop: base, previous: skip}).StopDetail(context.Background(), uuid.New(), base.StopID)
		require.NoError(t, err)
		require.Equal(t, skip, got.PreviousSkip)
	})
}
