-- Driver delivery contract additions. Additive and safe to re-run.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.load_stops
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrival_lat NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS arrival_lng NUMERIC(10,7);

ALTER TABLE public.issue_flags
  ADD COLUMN IF NOT EXISTS stop_id UUID REFERENCES public.load_stops(stop_id),
  ADD COLUMN IF NOT EXISTS operation_id UUID,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_flags_operation_id
  ON public.issue_flags(operation_id) WHERE operation_id IS NOT NULL;

-- Keep the original sync_queue as the durable audit of client operations.
ALTER TABLE public.sync_queue
  ADD COLUMN IF NOT EXISTS result JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_queue_operation_id
  ON public.sync_queue(operation_id);

CREATE INDEX IF NOT EXISTS idx_delivery_records_stop
  ON public.delivery_records(stop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_trips_today
  ON public.trips(driver_id, delivery_date, trip_number);

-- Existing loader readiness is authoritative for older rows.
UPDATE public.trips t SET ready_at=lc.ready_at
FROM public.loading_confirmations lc
WHERE lc.trip_id=t.trip_id AND t.ready_at IS NULL;
