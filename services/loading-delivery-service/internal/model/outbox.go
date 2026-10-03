package model

import (
	"time"

	"github.com/google/uuid"
)

// Outbox statuses
const (
	OutboxStatusPending   = "PENDING"
	OutboxStatusPublished = "PUBLISHED"
	OutboxStatusFailed    = "FAILED"
)

// Outbox aggregates and events
const (
	AggregateTrip      = "TRIP"
	AggregateIssueFlag = "ISSUE_FLAG"
	AggregateDelivery  = "DELIVERY"

	EventAllocationCompleted = "ALLOCATION_COMPLETED"
	EventDeliveryCompleted   = "DELIVERY_COMPLETED"
	EventFlagRaised          = "FLAG_RAISED"
	EventLoadingCompleted    = "LOADING_COMPLETED"
	EventTripLoaded          = "TRIP_LOADED"
	EventPlanAcknowledged    = "PLAN_ACKNOWLEDGED"
)

// OutboxEvent represents a transactional outbox row (table: public.outbox_events)
type OutboxEvent struct {
	ID            uuid.UUID  `json:"id"`
	AggregateType string     `json:"aggregate_type"` // TRIP | ISSUE_FLAG | DELIVERY
	AggregateID   string     `json:"aggregate_id"`
	EventType     string     `json:"event_type"` // ALLOCATION_COMPLETED | DELIVERY_COMPLETED | FLAG_RAISED
	Payload       []byte     `json:"payload"`    // JSONB
	Status        string     `json:"status"`     // PENDING | PUBLISHED | FAILED
	RetryCount    int        `json:"retry_count"`
	CreatedAt     time.Time  `json:"created_at"`
	PublishedAt   *time.Time `json:"published_at,omitempty"`
}
