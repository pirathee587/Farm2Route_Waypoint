-- Additive planning engine schema. Base tables are owned by the shared schema.
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS dock_type TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS mall_window_open TIME;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS mall_window_close TIME;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS last_served_date DATE;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS store_manager_id UUID REFERENCES auth.users(id);

ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS km_per_l NUMERIC(8,2) NOT NULL DEFAULT 5;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS weekly_fuel_quota_l NUMERIC(10,2) NOT NULL DEFAULT 500;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS fuel_used_week_l NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS in_workshop BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_value NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS planning_scenario TEXT;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS plan_revision INT NOT NULL DEFAULT 1;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS trip_minutes INT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS planned_start TIME;

CREATE TABLE IF NOT EXISTS public.district_travel (
  depot TEXT NOT NULL,
  district TEXT NOT NULL,
  depot_to_district_freeflow_min INT NOT NULL,
  inter_stop_freeflow_min INT NOT NULL,
  distance_km NUMERIC(10,2) NOT NULL,
  PRIMARY KEY(depot,district)
);

CREATE TABLE IF NOT EXISTS public.service_allowance (
  brand TEXT NOT NULL,
  dock_type TEXT NOT NULL,
  service_allowance_min INT NOT NULL,
  PRIMARY KEY(brand,dock_type)
);

CREATE TABLE IF NOT EXISTS public.planning_drafts (
  delivery_date DATE PRIMARY KEY,
  result JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.planning_revisions (
  delivery_date DATE PRIMARY KEY,
  revision INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.planning_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  routing_key TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PUBLISHED','FAILED')),
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_planning_outbox_pending ON public.planning_outbox(status,created_at);
CREATE INDEX IF NOT EXISTS idx_orders_planning_date ON public.orders(preferred_date,closed_at);
