-- P4-lite: allocation consumer idempotency and non-destructive plan revisions.
ALTER TABLE public.loading_confirmations ALTER COLUMN loader_id DROP NOT NULL;

ALTER TABLE public.load_stops
  ADD COLUMN IF NOT EXISTS removed_from_plan BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.allocation_event_receipts (
  trip_id       UUID        NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  plan_revision INT         NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trip_id, plan_revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_changes_trip_revision
  ON public.plan_changes(trip_id, revision);

CREATE INDEX IF NOT EXISTS idx_load_stops_active_plan
  ON public.load_stops(trip_id, removed_from_plan, load_order);
