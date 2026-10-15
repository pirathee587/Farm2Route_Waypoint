package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/waypoint/notification-service/internal/messaging"
	"github.com/waypoint/notification-service/internal/model"
)

type fakeStore struct {
	err   error
	seen  map[string]bool
	calls int
}

func (f *fakeStore) CreateForRolesOnce(_ context.Context, key string, _ []string, _, _, _, _ string) (int, bool, error) {
	f.calls++
	if f.err != nil {
		return 0, false, f.err
	}
	if f.seen == nil {
		f.seen = map[string]bool{}
	}
	if f.seen[key] {
		return 0, true, nil
	}
	f.seen[key] = true
	return 2, false, nil
}

type fakeBroadcaster struct{ roles, users int }

func (b *fakeBroadcaster) BroadcastToRoles([]string, []byte) int { b.roles++; return 1 }
func (b *fakeBroadcaster) BroadcastToUser(string, []byte) int    { b.users++; return 1 }

func newSvc(store Store, b Broadcaster) *NotificationService {
	return NewNotificationService(store, b, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

var flagPayload = []byte(`{"shortfall_ref":"SR-1","trip_code":"T1"}`)

func TestHandleEventReturnsPersistenceFailure(t *testing.T) {
	b := &fakeBroadcaster{}
	err := newSvc(&fakeStore{err: errors.New("db down")}, b).HandleEvent(context.Background(), model.EventTypeFlagRaised, "k1", flagPayload)
	if err == nil {
		t.Fatal("persistence failure must not be reported as success")
	}
	if messaging.IsPermanent(err) {
		t.Fatal("DB failures are transient and must be retried")
	}
	if b.roles != 0 {
		t.Fatal("must not broadcast an event that was not persisted")
	}
}

func TestHandleEventNilStoreIsTransientFailure(t *testing.T) {
	err := newSvc(nil, &fakeBroadcaster{}).HandleEvent(context.Background(), model.EventTypeFlagRaised, "k1", flagPayload)
	if !errors.Is(err, ErrPersistenceUnavailable) || messaging.IsPermanent(err) {
		t.Fatalf("expected transient ErrPersistenceUnavailable, got %v", err)
	}
}

func TestHandleEventIdempotent(t *testing.T) {
	store, b := &fakeStore{}, &fakeBroadcaster{}
	svc := newSvc(store, b)
	for i := 0; i < 2; i++ {
		if err := svc.HandleEvent(context.Background(), model.EventTypeFlagRaised, "same-key", flagPayload); err != nil {
			t.Fatal(err)
		}
	}
	if store.calls != 2 || len(store.seen) != 1 {
		t.Fatalf("calls=%d stored=%d", store.calls, len(store.seen))
	}
	if b.roles != 1 {
		t.Fatalf("duplicate delivery must not re-broadcast; broadcasts=%d", b.roles)
	}
}

func TestHandleEventMalformedDriverPushIsPermanent(t *testing.T) {
	err := newSvc(&fakeStore{}, &fakeBroadcaster{}).HandleEvent(context.Background(), model.EventTypeDriverNotification, "k", []byte("{not json"))
	if !messaging.IsPermanent(err) {
		t.Fatalf("expected permanent error, got %v", err)
	}
}
