package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/waypoint/loading-delivery-service/internal/model"
)

// LoadingRepository handles queries for the base loading & delivery tables:
// loading_confirmations, delivery_records, proof_of_delivery, sync_queue
type LoadingRepository struct {
	pool *pgxpool.Pool
}

func NewLoadingRepository(pool *pgxpool.Pool) *LoadingRepository {
	return &LoadingRepository{pool: pool}
}

// ── loading_confirmations ───────────────────────────────────────────────────

func (r *LoadingRepository) GetConfirmationByTripID(ctx context.Context, tripID uuid.UUID) (*model.LoadingConfirmation, error) {
	query := `
		SELECT id, trip_id, loader_id, status, confirmed_order_ids, unloaded_items,
		       dock, plan_revision, ready_at, ready_by, version, loaded_at, created_at, updated_at
		FROM public.loading_confirmations
		WHERE trip_id = $1
	`
	row := r.pool.QueryRow(ctx, query, tripID)

	var c model.LoadingConfirmation
	var confirmedOrderUUIDs []uuid.UUID
	var unloadedBytes []byte

	err := row.Scan(
		&c.ID, &c.TripID, &c.LoaderID, &c.Status, &confirmedOrderUUIDs, &unloadedBytes,
		&c.Dock, &c.PlanRevision, &c.ReadyAt, &c.ReadyBy, &c.Version, &c.LoadedAt, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get confirmation for trip %s: %w", tripID, err)
	}

	c.ConfirmedOrderIDs = make([]string, len(confirmedOrderUUIDs))
	for i, u := range confirmedOrderUUIDs {
		c.ConfirmedOrderIDs[i] = u.String()
	}
	c.UnloadedItems = unloadedBytes

	return &c, nil
}

func (r *LoadingRepository) UpsertConfirmation(ctx context.Context, c *model.LoadingConfirmation) error {
	orderUUIDs := make([]uuid.UUID, 0, len(c.ConfirmedOrderIDs))
	for _, idStr := range c.ConfirmedOrderIDs {
		if parsed, err := uuid.Parse(idStr); err == nil {
			orderUUIDs = append(orderUUIDs, parsed)
		}
	}

	unloadedJSON := c.UnloadedItems
	if len(unloadedJSON) == 0 {
		unloadedJSON = []byte("[]")
	}

	query := `
		INSERT INTO public.loading_confirmations (
			trip_id, loader_id, status, confirmed_order_ids, unloaded_items,
			dock, plan_revision, ready_at, ready_by, version, loaded_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		ON CONFLICT (trip_id) DO UPDATE SET
			status = EXCLUDED.status,
			confirmed_order_ids = EXCLUDED.confirmed_order_ids,
			unloaded_items = EXCLUDED.unloaded_items,
			dock = COALESCE(EXCLUDED.dock, public.loading_confirmations.dock),
			plan_revision = EXCLUDED.plan_revision,
			ready_at = EXCLUDED.ready_at,
			ready_by = EXCLUDED.ready_by,
			version = public.loading_confirmations.version + 1,
			loaded_at = EXCLUDED.loaded_at,
			updated_at = NOW()
		RETURNING id, version, updated_at
	`
	return r.pool.QueryRow(ctx, query,
		c.TripID, c.LoaderID, c.Status, orderUUIDs, unloadedJSON,
		c.Dock, c.PlanRevision, c.ReadyAt, c.ReadyBy, c.Version, c.LoadedAt,
	).Scan(&c.ID, &c.Version, &c.UpdatedAt)
}

func (r *LoadingRepository) UpdateConfirmationStatus(ctx context.Context, tripID uuid.UUID, status string) error {
	query := `
		UPDATE public.loading_confirmations
		SET status = $2, updated_at = NOW()
		WHERE trip_id = $1
	`
	_, err := r.pool.Exec(ctx, query, tripID, status)
	return err
}

// ── delivery_records ────────────────────────────────────────────────────────

func (r *LoadingRepository) CreateDeliveryRecord(ctx context.Context, rec *model.DeliveryRecord) error {
	query := `
		INSERT INTO public.delivery_records (
			trip_id, order_id, driver_id, outlet_id, outcome,
			arrived_at, departed_at, received_by, notes, lat, lng,
			operation_id, synced_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		ON CONFLICT (operation_id) DO NOTHING
		RETURNING delivery_id, created_at, updated_at
	`
	err := r.pool.QueryRow(ctx, query,
		rec.TripID, rec.OrderID, rec.DriverID, rec.OutletID, rec.Outcome,
		rec.ArrivedAt, rec.DepartedAt, rec.ReceivedBy, rec.Notes, rec.Lat, rec.Lng,
		rec.OperationID, rec.SyncedAt,
	).Scan(&rec.DeliveryID, &rec.CreatedAt, &rec.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Idempotent duplicate: fetch existing
			return r.populateExistingDelivery(ctx, rec)
		}
		return fmt.Errorf("failed to create delivery record: %w", err)
	}
	return nil
}

func (r *LoadingRepository) populateExistingDelivery(ctx context.Context, rec *model.DeliveryRecord) error {
	query := `
		SELECT delivery_id, created_at, updated_at
		FROM public.delivery_records
		WHERE operation_id = $1
	`
	return r.pool.QueryRow(ctx, query, rec.OperationID).Scan(&rec.DeliveryID, &rec.CreatedAt, &rec.UpdatedAt)
}

func (r *LoadingRepository) GetDeliveriesByTripID(ctx context.Context, tripID uuid.UUID) ([]model.DeliveryRecord, error) {
	query := `
		SELECT delivery_id, trip_id, order_id, driver_id, outlet_id, outcome,
		       arrived_at, departed_at, received_by, notes, lat, lng,
		       operation_id, synced_at, created_at, updated_at
		FROM public.delivery_records
		WHERE trip_id = $1
		ORDER BY arrived_at ASC
	`
	rows, err := r.pool.Query(ctx, query, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to query delivery records: %w", err)
	}
	defer rows.Close()

	var records []model.DeliveryRecord
	for rows.Next() {
		var rec model.DeliveryRecord
		err := rows.Scan(
			&rec.DeliveryID, &rec.TripID, &rec.OrderID, &rec.DriverID, &rec.OutletID, &rec.Outcome,
			&rec.ArrivedAt, &rec.DepartedAt, &rec.ReceivedBy, &rec.Notes, &rec.Lat, &rec.Lng,
			&rec.OperationID, &rec.SyncedAt, &rec.CreatedAt, &rec.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan delivery record: %w", err)
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

// ── proof_of_delivery ───────────────────────────────────────────────────────

func (r *LoadingRepository) CreatePOD(ctx context.Context, pod *model.ProofOfDelivery) error {
	query := `
		INSERT INTO public.proof_of_delivery (delivery_id, file_url, pod_type)
		VALUES ($1, $2, $3)
		RETURNING pod_id, uploaded_at
	`
	return r.pool.QueryRow(ctx, query, pod.DeliveryID, pod.FileURL, pod.PodType).
		Scan(&pod.PodID, &pod.UploadedAt)
}

func (r *LoadingRepository) GetPODsByDeliveryID(ctx context.Context, deliveryID uuid.UUID) ([]model.ProofOfDelivery, error) {
	query := `
		SELECT pod_id, delivery_id, file_url, pod_type, uploaded_at
		FROM public.proof_of_delivery
		WHERE delivery_id = $1
		ORDER BY uploaded_at ASC
	`
	rows, err := r.pool.Query(ctx, query, deliveryID)
	if err != nil {
		return nil, fmt.Errorf("failed to query PODs: %w", err)
	}
	defer rows.Close()

	var pods []model.ProofOfDelivery
	for rows.Next() {
		var pod model.ProofOfDelivery
		if err := rows.Scan(&pod.PodID, &pod.DeliveryID, &pod.FileURL, &pod.PodType, &pod.UploadedAt); err != nil {
			return nil, err
		}
		pods = append(pods, pod)
	}
	return pods, rows.Err()
}

// ── sync_queue ─────────────────────────────────────────────────────────────

func (r *LoadingRepository) EnqueueSyncItem(ctx context.Context, item *model.SyncQueueItem) error {
	if item.Payload == nil {
		item.Payload = []byte("{}")
	}
	query := `
		INSERT INTO public.sync_queue (
			driver_id, operation_id, operation_type, payload, captured_at, sync_status
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (operation_id) DO UPDATE SET
			sync_status = EXCLUDED.sync_status,
			retry_count = public.sync_queue.retry_count + 1
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query,
		item.DriverID, item.OperationID, item.OperationType, item.Payload, item.CapturedAt, item.SyncStatus,
	).Scan(&item.ID, &item.CreatedAt)
}

func (r *LoadingRepository) GetPendingSyncItems(ctx context.Context, driverID uuid.UUID, limit int) ([]model.SyncQueueItem, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT id, driver_id, operation_id, operation_type, payload, captured_at,
		       sync_status, synced_at, error_message, retry_count, created_at
		FROM public.sync_queue
		WHERE driver_id = $1 AND sync_status = 'PENDING'
		ORDER BY captured_at ASC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, driverID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.SyncQueueItem
	for rows.Next() {
		var it model.SyncQueueItem
		var raw json.RawMessage
		err := rows.Scan(
			&it.ID, &it.DriverID, &it.OperationID, &it.OperationType, &raw,
			&it.CapturedAt, &it.SyncStatus, &it.SyncedAt, &it.ErrorMessage, &it.RetryCount, &it.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		it.Payload = raw
		items = append(items, it)
	}
	return items, rows.Err()
}

func (r *LoadingRepository) MarkSyncItemCompleted(ctx context.Context, operationID uuid.UUID) error {
	query := `
		UPDATE public.sync_queue
		SET sync_status = 'SYNCED', synced_at = NOW()
		WHERE operation_id = $1
	`
	_, err := r.pool.Exec(ctx, query, operationID)
	return err
}

func (r *LoadingRepository) MarkSyncItemFailed(ctx context.Context, operationID uuid.UUID, errMsg string) error {
	query := `
		UPDATE public.sync_queue
		SET sync_status = 'FAILED', error_message = $2
		WHERE operation_id = $1
	`
	_, err := r.pool.Exec(ctx, query, operationID, errMsg)
	return err
}
