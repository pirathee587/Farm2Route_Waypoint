package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/waypoint/loading-delivery-service/internal/model"
	"github.com/waypoint/loading-delivery-service/internal/repository"
)

const (
	allocationRoutingKey = "allocation.completed"
	allocationQueue      = "loading.allocation"
	allocationDLX        = "waypoint.events.dlx"
	allocationDLQ        = "loading.allocation.dlq"
	allocationDeadKey    = "loading.allocation.dead"
)

type AllocationConsumer struct {
	repo     *repository.AllocationRepository
	amqpURL  string
	exchange string
	logger   *slog.Logger
	cancel   context.CancelFunc
	wg       sync.WaitGroup
}

func NewAllocationConsumer(repo *repository.AllocationRepository, amqpURL, exchange string, logger *slog.Logger) *AllocationConsumer {
	if logger == nil {
		logger = slog.Default()
	}
	if exchange == "" {
		exchange = "waypoint.events"
	}
	return &AllocationConsumer{repo: repo, amqpURL: amqpURL, exchange: exchange, logger: logger.With("component", "allocation_consumer")}
}

func (c *AllocationConsumer) Start() {
	if c.repo == nil || c.amqpURL == "" {
		c.logger.Warn("allocation consumer disabled: repository or RabbitMQ URL missing")
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	c.cancel = cancel
	c.wg.Add(1)
	go func() {
		defer c.wg.Done()
		for {
			if err := c.consume(ctx); err != nil && ctx.Err() == nil {
				c.logger.Error("allocation consumer disconnected", "error", err)
			}
			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Second):
			}
		}
	}()
}

func (c *AllocationConsumer) Stop() {
	if c.cancel != nil {
		c.cancel()
		c.wg.Wait()
	}
}

func (c *AllocationConsumer) consume(ctx context.Context) error {
	conn, err := amqp.Dial(c.amqpURL)
	if err != nil {
		return err
	}
	defer conn.Close()
	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()
	if err = c.declareTopology(ch); err != nil {
		return err
	}
	deliveries, err := ch.Consume(allocationQueue, "", false, false, false, false, nil)
	if err != nil {
		return err
	}
	c.logger.Info("consuming allocation events", "queue", allocationQueue, "routingKey", allocationRoutingKey)
	for {
		select {
		case <-ctx.Done():
			return nil
		case d, ok := <-deliveries:
			if !ok {
				return fmt.Errorf("delivery channel closed")
			}
			if err := c.HandleMessage(ctx, d.Body); err != nil {
				c.logger.Error("allocation event rejected to DLQ", "error", err)
				_ = d.Nack(false, false)
			} else {
				_ = d.Ack(false)
			}
		}
	}
}

func (c *AllocationConsumer) declareTopology(ch *amqp.Channel) error {
	if err := ch.ExchangeDeclare(c.exchange, "topic", true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.ExchangeDeclare(allocationDLX, "topic", true, false, false, false, nil); err != nil {
		return err
	}
	if _, err := ch.QueueDeclare(allocationDLQ, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(allocationDLQ, allocationDeadKey, allocationDLX, false, nil); err != nil {
		return err
	}
	args := amqp.Table{"x-dead-letter-exchange": allocationDLX, "x-dead-letter-routing-key": allocationDeadKey}
	if _, err := ch.QueueDeclare(allocationQueue, true, false, false, false, args); err != nil {
		return err
	}
	if err := ch.QueueBind(allocationQueue, allocationRoutingKey, c.exchange, false, nil); err != nil {
		return err
	}
	return ch.Qos(1, 0, false)
}

func (c *AllocationConsumer) HandleMessage(ctx context.Context, body []byte) error {
	var event model.AllocationCompletedEvent
	if err := json.Unmarshal(body, &event); err != nil {
		return fmt.Errorf("decode ALLOCATION_COMPLETED: %w", err)
	}
	if err := c.repo.ApplyAllocation(ctx, event); err != nil {
		return fmt.Errorf("apply ALLOCATION_COMPLETED: %w", err)
	}
	return nil
}
