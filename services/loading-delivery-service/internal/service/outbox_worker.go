package service

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	outboxBatchSize   = 10
	outboxMaxAttempts = 5
	outboxPollEvery   = 500 * time.Millisecond
	outboxConfirmWait = 5 * time.Second
)

// OutboxWorker periodically polls public.outbox_events and reliably publishes
// them to RabbitMQ (transactional outbox pattern).
//
//   - Rows are claimed with SELECT ... FOR UPDATE SKIP LOCKED so several service
//     replicas can run the worker concurrently without double-publishing.
//   - The channel is in confirm mode; a row is marked PUBLISHED only after the
//     broker acks the message.
//   - Failures increment retry_count. A failed row becomes eligible again only
//     after an exponential backoff (2^retry_count seconds, measured from
//     created_at); after outboxMaxAttempts it is parked as FAILED.
type OutboxWorker struct {
	pool       *pgxpool.Pool
	amqpURL    string
	exchange   string
	routingKey string
	logger     *slog.Logger
	stopChan   chan struct{}
	wg         sync.WaitGroup
}

// amqpSession bundles a confirm-mode channel with its (single) confirmation listener.
type amqpSession struct {
	conn     *amqp.Connection
	ch       *amqp.Channel
	confirms chan amqp.Confirmation
}

func (s *amqpSession) close() {
	if s == nil {
		return
	}
	if s.ch != nil {
		_ = s.ch.Close()
	}
	if s.conn != nil {
		_ = s.conn.Close()
	}
}

func (s *amqpSession) healthy() bool {
	return s != nil && s.conn != nil && !s.conn.IsClosed() && s.ch != nil && !s.ch.IsClosed()
}

// NewOutboxWorker creates a new transactional outbox worker
func NewOutboxWorker(pool *pgxpool.Pool, amqpURL, exchange, routingKey string, logger *slog.Logger) *OutboxWorker {
	if exchange == "" {
		exchange = "waypoint.events"
	}
	if routingKey == "" {
		routingKey = "flag.raised"
	}
	return &OutboxWorker{
		pool:       pool,
		amqpURL:    amqpURL,
		exchange:   exchange,
		routingKey: routingKey,
		logger:     logger.With(slog.String("component", "outbox_worker")),
		stopChan:   make(chan struct{}),
	}
}

// Start launches the background publishing loop
func (w *OutboxWorker) Start() {
	if w.amqpURL == "" {
		w.logger.Warn("RabbitMQ URL is empty; outbox worker disabled")
		return
	}
	w.wg.Add(1)
	go w.run()
}

// Stop gracefully shuts down the outbox worker
func (w *OutboxWorker) Stop() {
	select {
	case <-w.stopChan:
	default:
		close(w.stopChan)
	}
	w.wg.Wait()
	w.logger.Info("Outbox worker stopped cleanly")
}

// ProcessPendingEvents synchronously connects, processes one batch of pending
// events, and disconnects. Used for on-demand flushes and deterministic tests.
func (w *OutboxWorker) ProcessPendingEvents(ctx context.Context) error {
	sess, err := w.connect()
	if err != nil {
		return err
	}
	defer sess.close()
	return w.processBatch(ctx, sess)
}

func (w *OutboxWorker) run() {
	defer w.wg.Done()

	var sess *amqpSession
	defer func() { sess.close() }()

	reconnectDelay := time.Second
	ticker := time.NewTicker(outboxPollEvery)
	defer ticker.Stop()

	for {
		select {
		case <-w.stopChan:
			return
		case <-ticker.C:
			if !sess.healthy() {
				sess.close()
				var err error
				sess, err = w.connect()
				if err != nil {
					w.logger.Warn("RabbitMQ unavailable; will retry", "error", err, "retryIn", reconnectDelay.String())
					select {
					case <-w.stopChan:
						return
					case <-time.After(reconnectDelay):
					}
					if reconnectDelay < 30*time.Second {
						reconnectDelay *= 2
					}
					continue
				}
				reconnectDelay = time.Second
			}

			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			if err := w.processBatch(ctx, sess); err != nil {
				w.logger.Warn("Error processing outbox batch", "error", err)
			}
			cancel()
		}
	}
}

func (w *OutboxWorker) connect() (*amqpSession, error) {
	conn, err := amqp.Dial(w.amqpURL)
	if err != nil {
		return nil, fmt.Errorf("failed to dial rabbitmq: %w", err)
	}
	ch, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("failed to open rabbitmq channel: %w", err)
	}
	if err := ch.ExchangeDeclare(w.exchange, "topic", true, false, false, false, nil); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("failed to declare exchange %s: %w", w.exchange, err)
	}
	if err := ch.Confirm(false); err != nil {
		_ = ch.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("failed to put channel in confirm mode: %w", err)
	}
	// Register the confirmation listener exactly once per channel. The buffer
	// must cover a full batch, otherwise the amqp library blocks.
	confirms := ch.NotifyPublish(make(chan amqp.Confirmation, outboxBatchSize))

	w.logger.Info("Connected to RabbitMQ with publisher confirms", "exchange", w.exchange)
	return &amqpSession{conn: conn, ch: ch, confirms: confirms}, nil
}

func (w *OutboxWorker) processBatch(ctx context.Context, sess *amqpSession) error {
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	rows, err := tx.Query(ctx, `
		SELECT id, aggregate_id, event_type, payload, retry_count
		FROM public.outbox_events
		WHERE status = 'PENDING'
		  AND (retry_count = 0
		       OR created_at + make_interval(secs => power(2, retry_count)) <= NOW())
		ORDER BY created_at ASC
		LIMIT $1
		FOR UPDATE SKIP LOCKED
	`, outboxBatchSize)
	if err != nil {
		return fmt.Errorf("failed to query outbox_events: %w", err)
	}

	type pendingEvent struct {
		id          string
		aggregateID string
		eventType   string
		payload     []byte
		retryCount  int
	}
	var events []pendingEvent
	for rows.Next() {
		var ev pendingEvent
		if err := rows.Scan(&ev.id, &ev.aggregateID, &ev.eventType, &ev.payload, &ev.retryCount); err != nil {
			rows.Close()
			return fmt.Errorf("failed to scan outbox event: %w", err)
		}
		events = append(events, ev)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	if len(events) == 0 {
		return nil
	}

	// eventRoutingKeys maps event_type → RabbitMQ routing key on waypoint.events.
	eventRoutingKeys := map[string]string{
		"FLAG_RAISED":              "flag.raised",
		"LOADING_COMPLETED":        "loading.completed",
		"ALLOCATION_COMPLETED":     "allocation.completed",
		"DELIVERY_COMPLETED":       "delivery.completed",
		"TRIP_COMPLETED":           "trip.completed",
		"DELIVERY_WINDOW_OPEN":     "delivery.window.open",
		"DRIVER_NOTIFICATION_PUSH": "driver.notification",
		"ORDER_DEFERRED":           "order.deferred",
		"ROUTE_RESEQUENCED":        "loading.resequenced",
	}

	for _, ev := range events {
		rk := eventRoutingKeys[ev.eventType]
		if rk == "" {
			rk = w.routingKey // fallback
		}
		pubErr := sess.ch.PublishWithContext(ctx, w.exchange, rk, false, false, amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			MessageId:    ev.aggregateID, // e.g. SR-0482 — lets consumers dedupe
			Body:         ev.payload,
			Timestamp:    time.Now().UTC(),
			Type:         ev.eventType,
		})

		acked := false
		if pubErr == nil {
			select {
			case c, ok := <-sess.confirms:
				if !ok {
					pubErr = fmt.Errorf("confirm channel closed")
				} else if c.Ack {
					acked = true
				} else {
					pubErr = fmt.Errorf("broker nacked message")
				}
			case <-time.After(outboxConfirmWait):
				pubErr = fmt.Errorf("publisher confirm timeout")
			}
		}

		if acked {
			if _, err := tx.Exec(ctx, `
				UPDATE public.outbox_events
				SET status = 'PUBLISHED', published_at = NOW()
				WHERE id = $1
			`, ev.id); err != nil {
				return fmt.Errorf("failed to mark outbox event %s published: %w", ev.id, err)
			}
			w.logger.Info("Published outbox event", "ref", ev.aggregateID, "eventType", ev.eventType, "routingKey", rk)
			continue
		}

		newRetries := ev.retryCount + 1
		newStatus := "PENDING"
		if newRetries >= outboxMaxAttempts {
			newStatus = "FAILED"
		}
		w.logger.Warn("Failed to publish outbox event", "ref", ev.aggregateID, "attempt", newRetries, "status", newStatus, "error", pubErr)
		if _, err := tx.Exec(ctx, `
			UPDATE public.outbox_events SET retry_count = $1, status = $2 WHERE id = $3
		`, newRetries, newStatus, ev.id); err != nil {
			return fmt.Errorf("failed to record outbox retry for %s: %w", ev.id, err)
		}
		// A broken channel invalidates the rest of the batch; stop and let the loop reconnect.
		if !sess.healthy() {
			break
		}
	}

	return tx.Commit(ctx)
}
