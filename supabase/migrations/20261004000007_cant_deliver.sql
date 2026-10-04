-- Driver non-delivery outcome and idempotent deferral context.
ALTER TABLE public.load_stops
  ADD COLUMN IF NOT EXISTS delivery_status TEXT,
  ADD COLUMN IF NOT EXISTS cant_deliver_reason TEXT,
  ADD COLUMN IF NOT EXISTS cant_deliver_note TEXT,
  ADD COLUMN IF NOT EXISTS cant_deliver_reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cant_deliver_device_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cant_deliver_server_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cant_deliver_client_action_id UUID,
  ADD COLUMN IF NOT EXISTS cant_deliver_next_stop_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_load_stops_cant_deliver_action
  ON public.load_stops(cant_deliver_client_action_id)
  WHERE cant_deliver_client_action_id IS NOT NULL;

ALTER TABLE public.load_stops DROP CONSTRAINT IF EXISTS chk_load_stops_delivery_status;
ALTER TABLE public.load_stops ADD CONSTRAINT chk_load_stops_delivery_status
  CHECK (delivery_status IS NULL OR delivery_status='NOT_DELIVERED');

ALTER TABLE public.deferral_records
  ADD COLUMN IF NOT EXISTS outlet_id TEXT REFERENCES public.outlets(outlet_id),
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS vehicle_id TEXT REFERENCES public.vehicles(vehicle_id),
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(trip_id),
  ADD COLUMN IF NOT EXISTS stop_id UUID REFERENCES public.load_stops(stop_id),
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_action_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_deferral_client_action
  ON public.deferral_records(client_action_id)
  WHERE client_action_id IS NOT NULL;
