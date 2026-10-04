package service

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
	"log/slog"
	"sync"
	"time"
)

type NotificationEventProcessor interface {
	ProcessNotificationEvent(context.Context, uuid.UUID, string, uuid.UUID, *uuid.UUID, time.Time, []byte) (bool, error)
}

func notificationKindForEvent(event string) string {
	return map[string]string{
		"ROUTE_UPDATED":        "ROUTE_UPDATED",
		"ALLOCATION_COMPLETED": "ROUTE_UPDATED",
		"LOAD_SHORTFALL":       "LOAD_SHORTFALL",
		"FLAG_RAISED":          "LOAD_SHORTFALL",
		"ISSUE_ACKNOWLEDGED":   "ISSUE_ACKNOWLEDGED",
		"LOADING_COMPLETED":    "TRIP_DEPARTURE_CONFIRMED",
	}[event]
}

type DriverNotificationConsumer struct {
	processor     NotificationEventProcessor
	url, exchange string
	logger        *slog.Logger
	stop          chan struct{}
	wg            sync.WaitGroup
}

func NewDriverNotificationConsumer(p NotificationEventProcessor, url, exchange string, logger *slog.Logger) *DriverNotificationConsumer {
	if exchange == "" {
		exchange = "waypoint.events"
	}
	return &DriverNotificationConsumer{processor: p, url: url, exchange: exchange, logger: logger, stop: make(chan struct{})}
}
func (c *DriverNotificationConsumer) Start() {
	if c.url == "" {
		return
	}
	c.wg.Add(1)
	go c.run()
}
func (c *DriverNotificationConsumer) Stop() {
	select {
	case <-c.stop:
	default:
		close(c.stop)
	}
	c.wg.Wait()
}
func (c *DriverNotificationConsumer) run() {
	defer c.wg.Done()
	for {
		if err := c.consume(); err != nil {
			c.logger.Warn("driver notification consumer disconnected", "error", err)
		}
		select {
		case <-c.stop:
			return
		case <-time.After(time.Second):
		}
	}
}
func (c *DriverNotificationConsumer) consume() error {
	conn, err := amqp.Dial(c.url)
	if err != nil {
		return err
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()
	_ = ch.ExchangeDeclare(c.exchange, "topic", true, false, false, false, nil)
	_ = ch.ExchangeDeclare("waypoint.dlx", "topic", true, false, false, false, nil)
	q, err := ch.QueueDeclare("loading.driver-notifications", true, false, false, false, amqp.Table{"x-dead-letter-exchange": "waypoint.dlx", "x-dead-letter-routing-key": "driver.notifications.dead"})
	if err != nil {
		return err
	}
	_, _ = ch.QueueDeclare("loading.driver-notifications.dlq", true, false, false, false, nil)
	_ = ch.QueueBind("loading.driver-notifications.dlq", "driver.notifications.dead", "waypoint.dlx", false, nil)
	for _, key := range []string{"route.updated", "allocation.completed", "loading.shortfall", "flag.raised", "issue.acknowledged", "loading.completed"} {
		if err := ch.QueueBind(q.Name, key, c.exchange, false, nil); err != nil {
			return err
		}
	}
	_ = ch.Qos(1, 0, false)
	messages, err := ch.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		return err
	}
	for {
		select {
		case <-c.stop:
			return nil
		case d, ok := <-messages:
			if !ok {
				return fmt.Errorf("notification queue closed")
			}
			var e struct {
				EventID       string    `json:"event_id"`
				TripID        string    `json:"trip_id"`
				RemovedStopID string    `json:"removed_stop_id"`
				OccurredAt    time.Time `json:"occurred_at"`
			}
			if json.Unmarshal(d.Body, &e) != nil {
				_ = d.Nack(false, false)
				continue
			}
			eventID, e1 := uuid.Parse(e.EventID)
			tripID, e2 := uuid.Parse(e.TripID)
			if e1 != nil || e2 != nil {
				_ = d.Nack(false, false)
				continue
			}
			var removed *uuid.UUID
			if e.RemovedStopID != "" {
				v, err := uuid.Parse(e.RemovedStopID)
				if err != nil {
					_ = d.Nack(false, false)
					continue
				}
				removed = &v
			}
			occurred := e.OccurredAt
			if occurred.IsZero() {
				occurred = time.Now()
			}
			typeName := d.Type
			if typeName == "" {
				typeName = map[string]string{"route.updated": "ROUTE_UPDATED", "allocation.completed": "ALLOCATION_COMPLETED", "loading.shortfall": "LOAD_SHORTFALL", "flag.raised": "FLAG_RAISED", "issue.acknowledged": "ISSUE_ACKNOWLEDGED", "loading.completed": "LOADING_COMPLETED"}[d.RoutingKey]
			}
			inserted, err := c.processor.ProcessNotificationEvent(context.Background(), eventID, typeName, tripID, removed, occurred, d.Body)
			if err != nil {
				_ = d.Nack(false, false)
			} else {
				_ = inserted
				_ = d.Ack(false)
			}
		}
	}
}
