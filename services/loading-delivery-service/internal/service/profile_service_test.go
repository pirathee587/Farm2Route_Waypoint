package service

import (
	"context"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"testing"
	"time"
)

type fakeProfileRepo struct {
	profile      model.DriverProfileRecord
	heartbeatErr error
	heartbeatAt  time.Time
	historyOwner uuid.UUID
	history      []model.HistoryTrip
}

func (f *fakeProfileRepo) GetProfile(context.Context, uuid.UUID) (model.DriverProfileRecord, error) {
	return f.profile, nil
}
func (f *fakeProfileRepo) Heartbeat(_ context.Context, _ uuid.UUID, at time.Time, _ int) error {
	f.heartbeatAt = at
	return f.heartbeatErr
}
func (f *fakeProfileRepo) Location(context.Context, uuid.UUID, model.LocationUpdateRequest, time.Time) error {
	return nil
}
func (f *fakeProfileRepo) History(_ context.Context, id uuid.UUID, _ time.Time, _ time.Time, _, _ int) ([]model.HistoryTrip, int, error) {
	f.historyOwner = id
	return f.history, len(f.history), nil
}
func TestProfileAssignedAndUnassigned(t *testing.T) {
	now := time.Now()
	assigned := &fakeProfileRepo{profile: model.DriverProfileRecord{Driver: model.ProfileDriver{ID: "id"}, Vehicle: model.ProfileVehicle{ID: "VEH014", Status: "ASSIGNED"}, LastSeenAt: &now}}
	s := NewProfileService(assigned)
	s.now = func() time.Time { return now }
	got, err := s.Profile(context.Background(), uuid.New())
	require.NoError(t, err)
	require.Equal(t, "ASSIGNED", got.Vehicle.Status)
	unassigned := &fakeProfileRepo{profile: model.DriverProfileRecord{Vehicle: model.ProfileVehicle{Status: "UNASSIGNED"}}}
	got, err = NewProfileService(unassigned).Profile(context.Background(), uuid.New())
	require.NoError(t, err)
	require.Equal(t, "UNASSIGNED", got.Vehicle.Status)
}
func TestProfileOnlineOfflineThreshold(t *testing.T) {
	now := time.Now()
	for _, tc := range []struct {
		name string
		seen time.Time
		want string
	}{{"online", now.Add(-2 * time.Minute), "ONLINE"}, {"offline", now.Add(-2*time.Minute - time.Second), "OFFLINE"}} {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeProfileRepo{profile: model.DriverProfileRecord{LastSeenAt: &tc.seen}}
			s := NewProfileService(repo)
			s.now = func() time.Time { return now }
			got, err := s.Profile(context.Background(), uuid.New())
			require.NoError(t, err)
			require.Equal(t, tc.want, got.Connection.Status)
		})
	}
}
func TestHeartbeatPreservesLastSyncedAndRateLimit(t *testing.T) {
	now := time.Now()
	synced := now.Add(-time.Hour)
	repo := &fakeProfileRepo{profile: model.DriverProfileRecord{LastSyncedAt: &synced}}
	s := NewProfileService(repo)
	s.now = func() time.Time { return now }
	_, err := s.Heartbeat(context.Background(), uuid.New(), model.HeartbeatRequest{ClientTime: now.Add(-3 * time.Second), PendingActionsCount: 2})
	require.NoError(t, err)
	require.Equal(t, synced, *repo.profile.LastSyncedAt)
	repo.heartbeatErr = model.NewAppError("RATE_LIMITED", "Heartbeat rate limit exceeded", 429)
	_, err = s.Heartbeat(context.Background(), uuid.New(), model.HeartbeatRequest{ClientTime: now})
	require.Equal(t, 429, err.(*model.AppError).Status)
}
func TestHistoryRangeValidationAndOwnership(t *testing.T) {
	repo := &fakeProfileRepo{history: []model.HistoryTrip{{TripID: "own"}}}
	s := NewProfileService(repo)
	s.now = func() time.Time { return time.Date(2026, 10, 4, 12, 0, 0, 0, time.UTC) }
	_, err := s.History(context.Background(), uuid.New(), "2026-08-01", "2026-10-04", "")
	require.Equal(t, 400, err.(*model.AppError).Status)
	driver := uuid.New()
	got, err := s.History(context.Background(), driver, "2026-09-20", "2026-10-04", "1")
	require.NoError(t, err)
	require.Equal(t, driver, repo.historyOwner)
	require.Equal(t, "own", got.Trips[0].TripID)
}
