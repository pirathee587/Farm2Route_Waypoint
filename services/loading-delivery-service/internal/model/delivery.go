package model

import (
	"time"

	"github.com/google/uuid"
)

// Delivery outcomes
const (
	DeliveryOutcomeDelivered = "DELIVERED"
	DeliveryOutcomeAttempted = "ATTEMPTED"
	DeliveryOutcomeNotHome   = "NOT_HOME"
	DeliveryOutcomeRefused   = "REFUSED"
	DeliveryOutcomePartial   = "PARTIAL"
)

// Sync statuses for offline-first queue
const (
	SyncStatusPending  = "PENDING"
	SyncStatusSynced   = "SYNCED"
	SyncStatusFailed   = "FAILED"
	SyncStatusConflict = "CONFLICT"
)

// DeliveryRecord represents an outlet delivery attempt by a driver (table: public.delivery_records)
type DeliveryRecord struct {
	DeliveryID  uuid.UUID  `json:"delivery_id"`
	TripID      uuid.UUID  `json:"trip_id"`
	OrderID     uuid.UUID  `json:"order_id"`
	DriverID    uuid.UUID  `json:"driver_id"`
	OutletID    string     `json:"outlet_id"`
	Outcome     string     `json:"outcome"` // DELIVERED | ATTEMPTED | etc.
	ArrivedAt   time.Time  `json:"arrived_at"`
	DepartedAt  *time.Time `json:"departed_at,omitempty"`
	ReceivedBy  *string    `json:"received_by,omitempty"`
	Notes       *string    `json:"notes,omitempty"`
	Lat         *float64   `json:"lat,omitempty"`
	Lng         *float64   `json:"lng,omitempty"`
	OperationID uuid.UUID  `json:"operation_id"` // Client-generated idempotency key
	SyncedAt    *time.Time `json:"synced_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// ProofOfDelivery represents signature or photo attachments (table: public.proof_of_delivery)
type ProofOfDelivery struct {
	PodID      uuid.UUID `json:"pod_id"`
	DeliveryID uuid.UUID `json:"delivery_id"`
	FileURL    string    `json:"file_url"`
	PodType    string    `json:"pod_type"` // SIGNATURE | PHOTO | DOCUMENT
	UploadedAt time.Time `json:"uploaded_at"`
}

// SyncQueueItem represents an offline delivery record queued for sync (table: public.sync_queue)
type SyncQueueItem struct {
	ID            uuid.UUID  `json:"id"`
	DriverID      uuid.UUID  `json:"driver_id"`
	OperationID   uuid.UUID  `json:"operation_id"`
	OperationType string     `json:"operation_type"` // DELIVERY | POD | FLAG
	Payload       []byte     `json:"payload"`        // JSONB
	CapturedAt    time.Time  `json:"captured_at"`
	SyncStatus    string     `json:"sync_status"`
	SyncedAt      *time.Time `json:"synced_at,omitempty"`
	ErrorMessage  *string    `json:"error_message,omitempty"`
	RetryCount    int        `json:"retry_count"`
	CreatedAt     time.Time  `json:"created_at"`
}
