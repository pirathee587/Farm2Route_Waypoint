-- Arrival workflow state belongs to the trip stop, before a final delivery outcome exists.
ALTER TABLE public.load_stops
  ADD COLUMN IF NOT EXISTS arrival_status TEXT,
  ADD COLUMN IF NOT EXISTS arrival_initial_status TEXT,
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS device_arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS server_arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS arrival_client_action_id UUID,
  ADD COLUMN IF NOT EXISTS window_notification_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_load_stops_arrival_action
  ON public.load_stops(arrival_client_action_id)
  WHERE arrival_client_action_id IS NOT NULL;

ALTER TABLE public.load_stops DROP CONSTRAINT IF EXISTS chk_load_stops_arrival_status;
ALTER TABLE public.load_stops ADD CONSTRAINT chk_load_stops_arrival_status
  CHECK (arrival_status IS NULL OR arrival_status IN ('WAITING_FOR_WINDOW','ARRIVED'));

CREATE INDEX IF NOT EXISTS idx_load_stops_waiting_window
  ON public.load_stops(arrival_status, arrived_at)
  WHERE arrival_status='WAITING_FOR_WINDOW';
