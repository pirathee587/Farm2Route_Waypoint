// Package messaging provides the RabbitMQ consumer for the notification service.
package messaging

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// EventHandler is called for each successfully consumed message.
// eventType is the AMQP message Type header (e.g. "FLAG_RAISED").
// eventKey is a stable idempotency key for the message (see EventKey).
// payload is the raw message body.
//
// Returning nil acknowledges the message. Returning an error causes bounded
// retries; errors wrapped with Permanent skip retries. Messages that still fail
// are published to the dead-letter queue before being acknowledged.
type EventHandler func(ctx context.Context, eventType, eventKey string, payload []byte) error

// ReadinessGate is checked before each delivery is handled. When it fails the
// message is requeued untouched and the consumer reconnects with back-off, so a
// dependency outage (e.g. database down) does not drain the queue into the DLQ.
type ReadinessGate func(ctx context.Context) error

// DefaultDeadLetterQueue is the durable queue that receives messages which
// exhausted their retries or failed permanently.
const DefaultDeadLetterQueue = "notification.dead-letter"

// Dead-letter header names. They allow inspection and manual replay.
const (
	HeaderOriginalExchange   = "x-original-exchange"
	HeaderOriginalRoutingKey = "x-original-routing-key"
	HeaderEventType          = "x-event-type"
	HeaderEventKey           = "x-event-key"
	HeaderFailureReason      = "x-failure-reason"
	HeaderAttempts           = "x-attempts"
	HeaderFailedAt           = "x-failed-at"
)

const maxFailureReasonLen = 512

// RetryPolicy bounds in-process retries for a single delivery.
type RetryPolicy struct {
	MaxAttempts    int           // total handler attempts, including the first
	InitialBackoff time.Duration // delay after the first failure
	MaxBackoff     time.Duration // cap for the exponential delay
	AttemptTimeout time.Duration // per-attempt handler deadline
}

// DefaultRetryPolicy returns the production defaults: 5 attempts with 0.5s,
// 1s, 2s, 4s delays (≈7.5s total back-off) and a 10s per-attempt deadline.
func DefaultRetryPolicy() RetryPolicy {
	return RetryPolicy{MaxAttempts: 5, InitialBackoff: 500 * time.Millisecond, MaxBackoff: 8 * time.Second, AttemptTimeout: 10 * time.Second}
}

func (p RetryPolicy) normalized() RetryPolicy {
	d := DefaultRetryPolicy()
	if p.MaxAttempts < 1 {
		p.MaxAttempts = d.MaxAttempts
	}
	if p.InitialBackoff <= 0 {
		p.InitialBackoff = d.InitialBackoff
	}
	if p.MaxBackoff < p.InitialBackoff {
		p.MaxBackoff = p.InitialBackoff
	}
	if p.AttemptTimeout <= 0 {
		p.AttemptTimeout = d.AttemptTimeout
	}
	return p
}

// Options configures optional consumer behaviour.
type Options struct {
	Retry           RetryPolicy
	DeadLetterQueue string
	Gate            ReadinessGate
}

// deadLetterPublisher publishes a failed delivery to the DLQ and returns only
// after the broker has confirmed it.
type deadLetterPublisher interface {
	PublishDeadLetter(ctx context.Context, d amqp.Delivery, eventType, eventKey, reason string, attempts int) error
}

// errStopping is returned when a delivery was requeued because Stop was called.
var errStopping = errors.New("consumer stopping")

// Consumer subscribes to one or more queues on a RabbitMQ exchange and
// dispatches messages to the registered EventHandler.
//
// It auto-reconnects on connection loss with exponential back-off.
type Consumer struct {
	ready    atomic.Bool
	amqpURL  string
	exchange string
	queues   map[string]string // queueName → routingKey
	handler  EventHandler
	retry    RetryPolicy
	dlq      string
	gate     ReadinessGate
	logger   *slog.Logger
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

// NewConsumer creates a Consumer.
//
// queues is a map of queueName → routingKey bindings.
// e.g. {"flag.raised": "flag.raised", "order.deferred": "order.deferred"}
func NewConsumer(
	amqpURL, exchange string,
	queues map[string]string,
	handler EventHandler,
	logger *slog.Logger,
	opts Options,
) *Consumer {
	if exchange == "" {
		exchange = "waypoint.events"
	}
	if logger == nil {
		logger = slog.Default()
	}
	if opts.DeadLetterQueue == "" {
		opts.DeadLetterQueue = DefaultDeadLetterQueue
	}
	return &Consumer{
		amqpURL:  amqpURL,
		exchange: exchange,
		queues:   queues,
		handler:  handler,
		retry:    opts.Retry.normalized(),
		dlq:      opts.DeadLetterQueue,
		gate:     opts.Gate,
		logger:   logger.With(slog.String("component", "amqp_consumer")),
		stopCh:   make(chan struct{}),
	}
}

// Start launches the background consumer loop.
func (c *Consumer) Start() {
	if c.amqpURL == "" {
		c.logger.Warn("RabbitMQ URL is empty; consumer disabled")
		return
	}
	c.wg.Add(1)
	go c.run()
}

// Stop gracefully shuts down the consumer.
func (c *Consumer) Stop() {
	select {
	case <-c.stopCh:
	default:
		close(c.stopCh)
	}
	c.wg.Wait()
	c.logger.Info("RabbitMQ consumer stopped")
}

func (c *Consumer) run() {
	defer c.wg.Done()

	const initialBackoff = time.Second
	backoff := initialBackoff
	for {
		progressed, err := c.consume()
		if err != nil {
			c.logger.Warn("Consumer error; reconnecting", "error", err, "in", backoff)
		}

		select {
		case <-c.stopCh:
			return
		case <-time.After(backoff):
		}

		// Reset after a session that processed messages; otherwise back off further.
		if progressed {
			backoff = initialBackoff
		} else if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

// Ready reports whether the consumer is connected and subscribed.
func (c *Consumer) Ready() bool { return c.ready.Load() }

// consume establishes a connection and processes messages until the connection
// drops or Stop() is called. progressed reports whether any delivery was
// settled successfully during the session.
func (c *Consumer) consume() (progressed bool, err error) {
	defer c.ready.Store(false)
	conn, err := amqp.Dial(c.amqpURL)
	if err != nil {
		return false, fmt.Errorf("dial: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return false, fmt.Errorf("channel: %w", err)
	}
	defer ch.Close()

	// Declare the exchange (idempotent).
	if err := ch.ExchangeDeclare(c.exchange, "topic", true, false, false, false, nil); err != nil {
		return false, fmt.Errorf("exchange declare: %w", err)
	}

	// Set prefetch to process one message at a time per connection.
	if err := ch.Qos(1, 0, false); err != nil {
		return false, fmt.Errorf("qos: %w", err)
	}

	// Dead-letter publishing uses its own confirm-mode channel. The DLQ is a
	// separate queue, so existing source queues keep their declared arguments.
	dl, err := newAMQPDeadLetterPublisher(conn, c.exchange, c.dlq)
	if err != nil {
		return false, err
	}
	defer dl.Close()

	// Declare + bind each queue.
	var deliveries []<-chan amqp.Delivery
	for queueName, routingKey := range c.queues {
		q, err := ch.QueueDeclare(queueName, true, false, false, false, nil)
		if err != nil {
			return false, fmt.Errorf("queue declare %s: %w", queueName, err)
		}
		if err := ch.QueueBind(q.Name, routingKey, c.exchange, false, nil); err != nil {
			return false, fmt.Errorf("queue bind %s → %s: %w", q.Name, routingKey, err)
		}

		msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
		if err != nil {
			return false, fmt.Errorf("consume %s: %w", queueName, err)
		}
		deliveries = append(deliveries, msgs)
		c.logger.Info("Subscribed to queue", "queue", q.Name, "routingKey", routingKey)
	}

	// Fan-in all delivery channels into a single channel.
	merged := fanIn(c.stopCh, deliveries...)

	// Notify on connection close so we can reconnect.
	connClose := conn.NotifyClose(make(chan *amqp.Error, 1))

	c.ready.Store(true)
	c.logger.Info("RabbitMQ consumer ready", "exchange", c.exchange, "dead_letter_queue", c.dlq)

	for {
		select {
		case <-c.stopCh:
			return progressed, nil

		case amqpErr := <-connClose:
			if amqpErr != nil {
				return progressed, fmt.Errorf("connection closed: %s", amqpErr.Error())
			}
			return progressed, nil

		case d, ok := <-merged:
			if !ok {
				return progressed, fmt.Errorf("delivery channel closed")
			}
			if err := c.process(d, dl); err != nil {
				if errors.Is(err, errStopping) {
					return progressed, nil
				}
				// The delivery was requeued; reconnect with back-off.
				return progressed, err
			}
			progressed = true
		}
	}
}

// process settles exactly one delivery. It returns nil once the delivery is
// acknowledged (handled or safely dead-lettered). A non-nil error means the
// delivery was requeued and the caller should back off before continuing.
func (c *Consumer) process(d amqp.Delivery, dl deadLetterPublisher) error {
	eventType := d.Type
	if eventType == "" {
		// Fall back to routing key if Type header is missing.
		eventType = routingKeyToEventType(d.RoutingKey)
	}
	eventKey := EventKey(eventType, d.Body)
	log := c.logger.With("event_type", eventType, "routing_key", d.RoutingKey, "event_key", eventKey)

	if c.gate != nil {
		ctx, cancel := context.WithTimeout(context.Background(), c.retry.AttemptTimeout)
		gateErr := c.gate(ctx)
		cancel()
		if gateErr != nil {
			if nackErr := d.Nack(false, true); nackErr != nil {
				return fmt.Errorf("dependency unavailable (%v); requeue failed: %w", gateErr, nackErr)
			}
			log.Warn("Dependency unavailable; message requeued", "error", gateErr)
			return fmt.Errorf("dependency unavailable: %w", gateErr)
		}
	}

	var lastErr error
	attempts := 0
	backoff := c.retry.InitialBackoff
	for attempts < c.retry.MaxAttempts {
		attempts++
		ctx, cancel := context.WithTimeout(context.Background(), c.retry.AttemptTimeout)
		lastErr = c.handler(ctx, eventType, eventKey, d.Body)
		cancel()

		if lastErr == nil {
			if err := d.Ack(false); err != nil {
				// Unacknowledged deliveries are redelivered by the broker; the
				// idempotency key prevents duplicate persistence.
				return fmt.Errorf("ack: %w", err)
			}
			log.Info("Processed event", "attempts", attempts)
			return nil
		}
		if IsPermanent(lastErr) {
			log.Error("Permanent handler failure", "error", lastErr, "attempt", attempts)
			break
		}
		log.Warn("Handler failed; will retry", "error", lastErr, "attempt", attempts, "max_attempts", c.retry.MaxAttempts)
		if attempts >= c.retry.MaxAttempts {
			break
		}
		select {
		case <-c.stopCh:
			if err := d.Nack(false, true); err != nil {
				return fmt.Errorf("requeue on stop: %w", err)
			}
			log.Info("Stopping; message requeued", "attempts", attempts)
			return errStopping
		case <-time.After(backoff):
		}
		backoff *= 2
		if backoff > c.retry.MaxBackoff {
			backoff = c.retry.MaxBackoff
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), c.retry.AttemptTimeout)
	dlErr := dl.PublishDeadLetter(ctx, d, eventType, eventKey, truncate(lastErr.Error(), maxFailureReasonLen), attempts)
	cancel()
	if dlErr != nil {
		// Never drop: return the message to its queue and let the loop back off.
		if nackErr := d.Nack(false, true); nackErr != nil {
			return fmt.Errorf("dead-letter publish failed (%v); requeue failed: %w", dlErr, nackErr)
		}
		log.Error("Dead-letter publish failed; message requeued", "error", dlErr)
		return fmt.Errorf("dead-letter publish: %w", dlErr)
	}
	if err := d.Ack(false); err != nil {
		return fmt.Errorf("ack after dead-letter: %w", err)
	}
	log.Error("Message dead-lettered", "queue", c.dlq, "attempts", attempts, "error", lastErr)
	return nil
}

// EventKey returns the idempotency key for a message: a SHA-256 digest of the
// event type and the exact body. Redeliveries and outbox re-publishes carry an
// identical body, while publishers embed a unique event id/timestamp in every
// new event. AMQP MessageId is deliberately not used because the loading
// outbox sets it to the aggregate reference, which is not unique per event.
func EventKey(eventType string, body []byte) string {
	h := sha256.New()
	h.Write([]byte(eventType))
	h.Write([]byte{0})
	h.Write(body)
	return "sha256:" + hex.EncodeToString(h.Sum(nil))
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// amqpDeadLetterPublisher publishes to the DLQ through the default exchange on
// a confirm-mode channel.
type amqpDeadLetterPublisher struct {
	ch       *amqp.Channel
	exchange string
	queue    string
}

func newAMQPDeadLetterPublisher(conn *amqp.Connection, exchange, queue string) (*amqpDeadLetterPublisher, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("dead-letter channel: %w", err)
	}
	if _, err := ch.QueueDeclare(queue, true, false, false, false, nil); err != nil {
		_ = ch.Close()
		return nil, fmt.Errorf("dead-letter queue declare %s: %w", queue, err)
	}
	if err := ch.Confirm(false); err != nil {
		_ = ch.Close()
		return nil, fmt.Errorf("dead-letter confirm mode: %w", err)
	}
	return &amqpDeadLetterPublisher{ch: ch, exchange: exchange, queue: queue}, nil
}

func (p *amqpDeadLetterPublisher) Close() { _ = p.ch.Close() }

func (p *amqpDeadLetterPublisher) PublishDeadLetter(ctx context.Context, d amqp.Delivery, eventType, eventKey, reason string, attempts int) error {
	headers := amqp.Table{}
	for k, v := range d.Headers {
		headers[k] = v
	}
	exchange := d.Exchange
	if exchange == "" {
		exchange = p.exchange
	}
	headers[HeaderOriginalExchange] = exchange
	headers[HeaderOriginalRoutingKey] = d.RoutingKey
	headers[HeaderEventType] = eventType
	headers[HeaderEventKey] = eventKey
	headers[HeaderFailureReason] = reason
	headers[HeaderAttempts] = int32(attempts)
	headers[HeaderFailedAt] = time.Now().UTC().Format(time.RFC3339Nano)

	conf, err := p.ch.PublishWithDeferredConfirmWithContext(ctx, "", p.queue, true, false, amqp.Publishing{
		Headers:       headers,
		ContentType:   d.ContentType,
		DeliveryMode:  amqp.Persistent,
		CorrelationId: d.CorrelationId,
		MessageId:     d.MessageId,
		Timestamp:     d.Timestamp,
		Type:          eventType,
		Body:          d.Body,
	})
	if err != nil {
		return err
	}
	if conf == nil {
		return fmt.Errorf("dead-letter channel is not in confirm mode")
	}
	acked, err := conf.WaitContext(ctx)
	if err != nil {
		return err
	}
	if !acked {
		return fmt.Errorf("broker nacked dead-letter publish")
	}
	return nil
}

// fanIn merges multiple delivery channels into one.
func fanIn(stopCh <-chan struct{}, channels ...<-chan amqp.Delivery) <-chan amqp.Delivery {
	out := make(chan amqp.Delivery, 16)
	var wg sync.WaitGroup
	for _, ch := range channels {
		wg.Add(1)
		go func(c <-chan amqp.Delivery) {
			defer wg.Done()
			for {
				select {
				case <-stopCh:
					return
				case d, ok := <-c:
					if !ok {
						return
					}
					select {
					case out <- d:
					case <-stopCh:
						return
					}
				}
			}
		}(ch)
	}
	go func() {
		wg.Wait()
		close(out)
	}()
	return out
}

// routingKeyToEventType converts a dot-notation routing key to the SCREAMING_SNAKE event type.
// e.g. "flag.raised" → "FLAG_RAISED"
func routingKeyToEventType(routingKey string) string {
	result := ""
	for _, c := range routingKey {
		if c == '.' {
			result += "_"
		} else if c >= 'a' && c <= 'z' {
			result += string(c - 32)
		} else {
			result += string(c)
		}
	}
	return result
}
