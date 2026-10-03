// Package messaging provides the RabbitMQ consumer for the notification service.
package messaging

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// EventHandler is called for each successfully consumed message.
// eventType is the AMQP message Type header (e.g. "FLAG_RAISED").
// payload is the raw message body.
type EventHandler func(ctx context.Context, eventType string, payload []byte) error

// Consumer subscribes to one or more queues on a RabbitMQ exchange and
// dispatches messages to the registered EventHandler.
//
// It auto-reconnects on connection loss with exponential back-off.
type Consumer struct {
	amqpURL    string
	exchange   string
	queues     map[string]string // queueName → routingKey
	handler    EventHandler
	logger     *slog.Logger
	stopCh     chan struct{}
	wg         sync.WaitGroup
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
) *Consumer {
	if exchange == "" {
		exchange = "waypoint.events"
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Consumer{
		amqpURL:  amqpURL,
		exchange: exchange,
		queues:   queues,
		handler:  handler,
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

	backoff := time.Second
	for {
		if err := c.consume(); err != nil {
			c.logger.Warn("Consumer error; reconnecting", "error", err, "in", backoff)
		}

		select {
		case <-c.stopCh:
			return
		case <-time.After(backoff):
		}

		if backoff < 30*time.Second {
			backoff *= 2
		}
	}
}

// consume establishes a connection and processes messages until the connection
// drops or Stop() is called.
func (c *Consumer) consume() error {
	conn, err := amqp.Dial(c.amqpURL)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("channel: %w", err)
	}
	defer ch.Close()

	// Declare the exchange (idempotent).
	if err := ch.ExchangeDeclare(c.exchange, "topic", true, false, false, false, nil); err != nil {
		return fmt.Errorf("exchange declare: %w", err)
	}

	// Set prefetch to process one message at a time per connection.
	if err := ch.Qos(1, 0, false); err != nil {
		return fmt.Errorf("qos: %w", err)
	}

	// Declare + bind each queue.
	var deliveries []<-chan amqp.Delivery
	for queueName, routingKey := range c.queues {
		q, err := ch.QueueDeclare(queueName, true, false, false, false, nil)
		if err != nil {
			return fmt.Errorf("queue declare %s: %w", queueName, err)
		}
		if err := ch.QueueBind(q.Name, routingKey, c.exchange, false, nil); err != nil {
			return fmt.Errorf("queue bind %s → %s: %w", q.Name, routingKey, err)
		}

		msgs, err := ch.Consume(q.Name, "", false, false, false, false, nil)
		if err != nil {
			return fmt.Errorf("consume %s: %w", queueName, err)
		}
		deliveries = append(deliveries, msgs)
		c.logger.Info("Subscribed to queue", "queue", q.Name, "routingKey", routingKey)
	}

	// Fan-in all delivery channels into a single channel.
	merged := fanIn(c.stopCh, deliveries...)

	// Notify on connection close so we can reconnect.
	connClose := conn.NotifyClose(make(chan *amqp.Error, 1))

	c.logger.Info("RabbitMQ consumer ready", "exchange", c.exchange)

	for {
		select {
		case <-c.stopCh:
			return nil

		case amqpErr := <-connClose:
			if amqpErr != nil {
				return fmt.Errorf("connection closed: %s", amqpErr.Error())
			}
			return nil

		case d, ok := <-merged:
			if !ok {
				return fmt.Errorf("delivery channel closed")
			}

			eventType := d.Type
			if eventType == "" {
				// Fall back to routing key if Type header is missing.
				eventType = routingKeyToEventType(d.RoutingKey)
			}

			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			err := c.handler(ctx, eventType, d.Body)
			cancel()

			if err != nil {
				c.logger.Error("Handler error; nacking message",
					"event_type", eventType, "error", err, "routing_key", d.RoutingKey)
				// Nack without requeue — avoid poison-pill loops.
				_ = d.Nack(false, false)
			} else {
				_ = d.Ack(false)
				c.logger.Info("Processed event", "event_type", eventType, "routing_key", d.RoutingKey)
			}
		}
	}
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
					out <- d
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
