package service

import (
	"context"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"testing"
	"time"
)

type fakeNotificationRepo struct {
	items        []model.DriverNotification
	unread       int
	reviewErr    error
	reviewCalls  int
	readAllCalls int
	history      []model.DriverNotification
}

func (f *fakeNotificationRepo) Today(context.Context, uuid.UUID, time.Time) ([]model.DriverNotification, int, error) {
	return append([]model.DriverNotification(nil), f.items...), f.unread, nil
}
func (f *fakeNotificationRepo) Review(context.Context, uuid.UUID, uuid.UUID, time.Time) error {
	f.reviewCalls++
	return f.reviewErr
}
func (f *fakeNotificationRepo) ReadAll(context.Context, uuid.UUID, time.Time) error {
	f.readAllCalls++
	for i := range f.items {
		if f.items[i].Type != "ROUTE_UPDATED" {
			f.items[i].IsRead = true
		}
	}
	return nil
}
func (f *fakeNotificationRepo) History(context.Context, uuid.UUID, time.Time, time.Time, int, int) ([]model.DriverNotification, int, error) {
	return f.history, len(f.history), nil
}
func TestNotificationPinnedAndUnread(t *testing.T) {
	now := time.Now()
	repo := &fakeNotificationRepo{unread: 3, items: []model.DriverNotification{{ID: "new", Type: "ROUTE_UPDATED", CreatedAt: now}, {ID: "old", Type: "ROUTE_UPDATED", CreatedAt: now.Add(-time.Minute)}, {ID: "item", Type: "LOAD_SHORTFALL", CreatedAt: now}}}
	got, err := NewDriverNotificationService(repo).Today(context.Background(), uuid.New())
	require.NoError(t, err)
	require.Equal(t, "new", got.Pinned.ID)
	require.Equal(t, 2, got.PinnedCount)
	require.Equal(t, 3, got.UnreadCount)
	require.Len(t, got.Items, 2)
}
func TestNotificationReviewIdempotencyAndOwnership(t *testing.T) {
	repo := &fakeNotificationRepo{}
	s := NewDriverNotificationService(repo)
	id := uuid.New()
	require.NoError(t, s.Review(context.Background(), uuid.New(), id))
	require.NoError(t, s.Review(context.Background(), uuid.New(), id))
	repo.reviewErr = model.ErrForbidden("Notification belongs to another driver")
	require.Equal(t, 403, s.Review(context.Background(), uuid.New(), id).(*model.AppError).Status)
}
func TestReadAllLeavesRouteUpdated(t *testing.T) {
	repo := &fakeNotificationRepo{items: []model.DriverNotification{{Type: "ROUTE_UPDATED"}, {Type: "LOAD_SHORTFALL"}}}
	require.NoError(t, NewDriverNotificationService(repo).ReadAll(context.Background(), uuid.New()))
	require.False(t, repo.items[0].IsRead)
	require.True(t, repo.items[1].IsRead)
}
func TestNotificationHistoryRange(t *testing.T) {
	s := NewDriverNotificationService(&fakeNotificationRepo{})
	s.now = func() time.Time { return time.Date(2026, 10, 4, 0, 0, 0, 0, time.UTC) }
	_, err := s.History(context.Background(), uuid.New(), "2026-08-01", "2026-10-04", "1")
	require.Equal(t, 400, err.(*model.AppError).Status)
}
func TestNotificationEventMappingAndDuplicate(t *testing.T) {
	mapping := map[string]string{"ROUTE_UPDATED": "ROUTE_UPDATED", "ALLOCATION_COMPLETED": "ROUTE_UPDATED", "LOAD_SHORTFALL": "LOAD_SHORTFALL", "FLAG_RAISED": "LOAD_SHORTFALL", "ISSUE_ACKNOWLEDGED": "ISSUE_ACKNOWLEDGED", "LOADING_COMPLETED": "TRIP_DEPARTURE_CONFIRMED"}
	for event, want := range mapping {
		require.Equal(t, want, notificationKindForEvent(event))
	}
	seen := map[uuid.UUID]bool{}
	id := uuid.New()
	insert := func() bool {
		if seen[id] {
			return false
		}
		seen[id] = true
		return true
	}
	require.True(t, insert())
	require.False(t, insert())
}
