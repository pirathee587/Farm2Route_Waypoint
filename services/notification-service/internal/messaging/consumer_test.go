package messaging

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type fakeAck struct {
	mu      sync.Mutex
	acks    int
	nacks   int
	requeue []bool
}

func (f *fakeAck) Ack(uint64, bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.acks++
	return nil
}
func (f *fakeAck) Nack(_ uint64, _ bool, requeue bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.nacks++
	f.requeue = append(f.requeue, requeue)
	return nil
}
func (f *fakeAck) Reject(_ uint64, requeue bool) error { return f.Nack(0, false, requeue) }

type fakeDL struct {
	err      error
	calls    int
	reason   string
	attempts int
	key      string
}

func (f *fakeDL) PublishDeadLetter(_ context.Context, _ amqp.Delivery, _, key, reason string, attempts int) error {
	f.calls++
	f.reason, f.attempts, f.key = reason, attempts, key
	return f.err
}

func testConsumer(h EventHandler, gate ReadinessGate) *Consumer {
	return NewConsumer("amqp://unused", "", nil, h, slog.New(slog.NewTextHandler(io.Discard, nil)), Options{
		Retry: RetryPolicy{MaxAttempts: 3, InitialBackoff: time.Millisecond, MaxBackoff: 2 * time.Millisecond, AttemptTimeout: time.Second},
		Gate:  gate,
	})
}

func delivery(ack amqp.Acknowledger) amqp.Delivery {
	return amqp.Delivery{Acknowledger: ack, Type: "FLAG_RAISED", RoutingKey: "flag.raised", Body: []byte(`{"a":1}`)}
}

func TestProcessAcksOnSuccess(t *testing.T) {
	ack, dl := &fakeAck{}, &fakeDL{}
	var gotKey string
	c := testConsumer(func(_ context.Context, _, key string, _ []byte) error { gotKey = key; return nil }, nil)
	if err := c.process(delivery(ack), dl); err != nil {
		t.Fatal(err)
	}
	if ack.acks != 1 || ack.nacks != 0 || dl.calls != 0 {
		t.Fatalf("acks=%d nacks=%d dl=%d", ack.acks, ack.nacks, dl.calls)
	}
	if gotKey != EventKey("FLAG_RAISED", []byte(`{"a":1}`)) {
		t.Fatalf("unexpected key %q", gotKey)
	}
}

func TestProcessRetriesTransientThenSucceeds(t *testing.T) {
	ack, dl := &fakeAck{}, &fakeDL{}
	calls := 0
	c := testConsumer(func(context.Context, string, string, []byte) error {
		calls++
		if calls < 3 {
			return errors.New("db timeout")
		}
		return nil
	}, nil)
	if err := c.process(delivery(ack), dl); err != nil {
		t.Fatal(err)
	}
	if calls != 3 || ack.acks != 1 || dl.calls != 0 {
		t.Fatalf("calls=%d acks=%d dl=%d", calls, ack.acks, dl.calls)
	}
}

func TestProcessDeadLettersAfterBoundedRetries(t *testing.T) {
	ack, dl := &fakeAck{}, &fakeDL{}
	calls := 0
	c := testConsumer(func(context.Context, string, string, []byte) error { calls++; return errors.New("db down") }, nil)
	if err := c.process(delivery(ack), dl); err != nil {
		t.Fatal(err)
	}
	if calls != 3 {
		t.Fatalf("expected 3 bounded attempts, got %d", calls)
	}
	if dl.calls != 1 || dl.attempts != 3 || dl.reason != "db down" || dl.key == "" {
		t.Fatalf("dead letter = %+v", dl)
	}
	// Acknowledged only after the confirmed dead-letter publish.
	if ack.acks != 1 || ack.nacks != 0 {
		t.Fatalf("acks=%d nacks=%d", ack.acks, ack.nacks)
	}
}

func TestProcessPermanentSkipsRetries(t *testing.T) {
	ack, dl := &fakeAck{}, &fakeDL{}
	calls := 0
	c := testConsumer(func(context.Context, string, string, []byte) error {
		calls++
		return Permanent(errors.New("bad json"))
	}, nil)
	if err := c.process(delivery(ack), dl); err != nil {
		t.Fatal(err)
	}
	if calls != 1 || dl.calls != 1 || dl.attempts != 1 || ack.acks != 1 {
		t.Fatalf("calls=%d dl=%d attempts=%d acks=%d", calls, dl.calls, dl.attempts, ack.acks)
	}
}

func TestProcessRequeuesWhenDeadLetterPublishFails(t *testing.T) {
	ack, dl := &fakeAck{}, &fakeDL{err: errors.New("broker nack")}
	c := testConsumer(func(context.Context, string, string, []byte) error { return errors.New("db down") }, nil)
	if err := c.process(delivery(ack), dl); err == nil {
		t.Fatal("expected error so the loop backs off")
	}
	if ack.acks != 0 || ack.nacks != 1 || !ack.requeue[0] {
		t.Fatalf("message must be requeued, never dropped: acks=%d nacks=%d requeue=%v", ack.acks, ack.nacks, ack.requeue)
	}
}

func TestProcessGateFailureRequeuesWithoutHandling(t *testing.T) {
	ack, dl := &fakeAck{}, &fakeDL{}
	calls := 0
	c := testConsumer(func(context.Context, string, string, []byte) error { calls++; return nil },
		func(context.Context) error { return errors.New("not connected") })
	if err := c.process(delivery(ack), dl); err == nil {
		t.Fatal("expected error")
	}
	if calls != 0 || dl.calls != 0 || ack.acks != 0 || ack.nacks != 1 || !ack.requeue[0] {
		t.Fatalf("calls=%d dl=%d acks=%d nacks=%d", calls, dl.calls, ack.acks, ack.nacks)
	}
}

func TestProcessStopDuringBackoffRequeues(t *testing.T) {
	ack, dl := &fakeAck{}, &fakeDL{}
	c := NewConsumer("amqp://unused", "", nil, nil, slog.New(slog.NewTextHandler(io.Discard, nil)), Options{
		Retry: RetryPolicy{MaxAttempts: 5, InitialBackoff: time.Hour, AttemptTimeout: time.Second},
	})
	c.handler = func(context.Context, string, string, []byte) error { close(c.stopCh); return errors.New("db down") }
	if err := c.process(delivery(ack), dl); !errors.Is(err, errStopping) {
		t.Fatalf("expected errStopping, got %v", err)
	}
	if dl.calls != 0 || ack.acks != 0 || ack.nacks != 1 || !ack.requeue[0] {
		t.Fatalf("dl=%d acks=%d nacks=%d", dl.calls, ack.acks, ack.nacks)
	}
}

func TestEventKeyStableAndDistinct(t *testing.T) {
	a := EventKey("FLAG_RAISED", []byte(`{"id":1}`))
	if a != EventKey("FLAG_RAISED", []byte(`{"id":1}`)) {
		t.Fatal("key must be deterministic for redeliveries")
	}
	if a == EventKey("FLAG_RAISED", []byte(`{"id":2}`)) || a == EventKey("ORDER_DEFERRED", []byte(`{"id":1}`)) {
		t.Fatal("key must differ for different events")
	}
}

func TestPermanentClassification(t *testing.T) {
	if IsPermanent(errors.New("x")) || !IsPermanent(Permanent(errors.New("x"))) {
		t.Fatal("classification mismatch")
	}
	if Permanent(nil) != nil {
		t.Fatal("Permanent(nil) must be nil")
	}
}
