-- Planning-service extension tables. Apply after the repository-level planning schema migration.
CREATE TABLE IF NOT EXISTS public.vehicle_planning_state (
  vehicle_id TEXT PRIMARY KEY REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_fuel_quota_l NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_fuel_used_l NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.planning_drafts (
  draft_id UUID PRIMARY KEY,
  delivery_date DATE NOT NULL,
  vehicle_id TEXT REFERENCES public.vehicles(vehicle_id),
  order_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  stop_order_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
