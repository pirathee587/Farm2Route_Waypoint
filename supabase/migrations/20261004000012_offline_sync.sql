CREATE TABLE IF NOT EXISTS public.sync_actions (
  client_action_id UUID PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.user_profiles(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('ARRIVAL','DELIVERY','ISSUE')),
  stop_id UUID NOT NULL REFERENCES public.load_stops(stop_id),
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('SYNCED','CONFLICT','FAILED')),
  error_code TEXT,
  result JSONB NOT NULL DEFAULT '{}',
  payload JSONB NOT NULL DEFAULT '{}',
  pod_media_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (pod_media_status IN ('NOT_REQUIRED','PENDING','COMPLETE')),
  signature_url TEXT,
  photo_url TEXT,
  recorded_offline BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_actions_driver ON public.sync_actions(driver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sync_conflict_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_action_id UUID NOT NULL UNIQUE REFERENCES public.sync_actions(client_action_id),
  driver_id UUID NOT NULL REFERENCES public.user_profiles(id),
  stop_id UUID NOT NULL REFERENCES public.load_stops(stop_id),
  trip_id UUID NOT NULL REFERENCES public.trips(trip_id),
  outlet_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  conflict_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFLICT_REVIEW',
  payload JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.route_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(trip_id),
  stop_id UUID REFERENCES public.load_stops(stop_id),
  type TEXT NOT NULL CHECK (type IN ('STOP_REMOVED','STOP_ADDED','STOP_REORDERED')),
  actor TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_route_change_log_trip_time ON public.route_change_log(trip_id, occurred_at);

ALTER TABLE public.delivery_records
  ADD COLUMN IF NOT EXISTS recorded_offline BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pod_media_status TEXT NOT NULL DEFAULT 'COMPLETE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_proof_of_delivery_kind ON public.proof_of_delivery(delivery_id,pod_type);

ALTER TABLE public.deferral_records
  ADD COLUMN IF NOT EXISTS recorded_offline BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ;

ALTER TABLE public.load_stops ADD COLUMN IF NOT EXISTS original_driver_id UUID REFERENCES public.user_profiles(id);
UPDATE public.load_stops s SET original_driver_id=t.driver_id FROM public.trips t
WHERE t.trip_id=s.trip_id AND s.original_driver_id IS NULL;

-- Conflict scenario B is intentionally not part of the main demo seed. Tests create
-- a removed OUT014 fixture and matching route_change_log row transactionally.
