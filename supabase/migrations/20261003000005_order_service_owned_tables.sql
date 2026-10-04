-- MIGRATION 005 - ORDER SERVICE OWNED TABLES
-- Service : Order Service (Spring Boot)
-- Tables  : outlets, vehicles, calendar, orders and order lifecycle read models
-- Reconciles the legacy order schema from migration 002 with the Order Service contract.

-- The Auth-owned profile is the existing user-to-business mapping surface. The
-- current profile schema has no outlet assignment, so extend it without adding
-- a second mapping table owned by Order Service.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS outlet_id TEXT;

-- Reference-data enums.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_brand') THEN
    CREATE TYPE public.order_brand AS ENUM ('fresh', 'style', 'tech');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dock_type') THEN
    CREATE TYPE public.dock_type AS ENUM ('rear_dock', 'street', 'mall_bay');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parking_constraint') THEN
    CREATE TYPE public.parking_constraint AS ENUM ('normal', 'van_only', 'mall_dock');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_kind') THEN
    CREATE TYPE public.vehicle_kind AS ENUM ('truck', 'van');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_temp') THEN
    CREATE TYPE public.vehicle_temp AS ENUM ('reefer', 'ambient');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type') THEN
    CREATE TYPE public.order_type AS ENUM ('dry', 'chilled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_v2') THEN
    CREATE TYPE public.order_status_v2 AS ENUM (
      'PENDING',
      'ALLOCATED',
      'DEFERRED',
      'ATTEMPTED',
      'DELIVERED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tracking_status') THEN
    CREATE TYPE public.tracking_status AS ENUM (
      'loaded',
      'out_for_delivery',
      'delivery_attempted',
      'completed'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issue_report_type') THEN
    CREATE TYPE public.issue_report_type AS ENUM ('missing', 'damaged', 'wrong_item', 'late');
  END IF;
END
$$;

ALTER TYPE public.tracking_status ADD VALUE IF NOT EXISTS 'allocated';

-- Reconcile the existing outlets table with the Order Service reference contract.
ALTER TABLE public.outlets
  ADD COLUMN IF NOT EXISTS brand public.order_brand,
  ADD COLUMN IF NOT EXISTS dock_type public.dock_type,
  ADD COLUMN IF NOT EXISTS parking_constraint public.parking_constraint,
  ADD COLUMN IF NOT EXISTS mall_window_open TIME,
  ADD COLUMN IF NOT EXISTS mall_window_close TIME,
  ADD COLUMN IF NOT EXISTS window_open_time TIME,
  ADD COLUMN IF NOT EXISTS window_close_time TIME;

-- Pre-check: abort if any vehicle row has a type that is not 'truck' or 'van'
-- (case-insensitive).  The old migration-002 vehicle_type enum also contained
-- 'MOTORCYCLE'; any such row must be resolved before this migration runs.
DO $$
DECLARE
  _bad_rows TEXT;
BEGIN
  SELECT string_agg(
    format('vehicle_id=%s type=%s', vehicle_id, type::TEXT),
    ', '
    ORDER BY vehicle_id
  )
  INTO _bad_rows
  FROM public.vehicles
  WHERE lower(type::TEXT) NOT IN ('truck', 'van');

  IF _bad_rows IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration 005 pre-check failed: vehicles.type contains values that '
      'cannot be mapped to vehicle_kind (truck | van).  Offending rows: [%].  '
      'Resolve each vehicle before re-running this migration.',
      _bad_rows;
  END IF;
END
$$;

-- Reconcile vehicle enums and add the CSV-owned reference fields.
-- The USING clause now raises an explicit error on any value other than
-- 'truck' or 'van' so there is no silent fall-through to a default.
ALTER TABLE public.vehicles
  ALTER COLUMN type TYPE public.vehicle_kind
    USING CASE lower(type::TEXT)
      WHEN 'truck' THEN 'truck'::public.vehicle_kind
      WHEN 'van'   THEN 'van'::public.vehicle_kind
      ELSE NULL::public.vehicle_kind
    END,
  ADD COLUMN IF NOT EXISTS temp public.vehicle_temp,
  ADD COLUMN IF NOT EXISTS fuel_type TEXT,
  ADD COLUMN IF NOT EXISTS km_per_l NUMERIC,
  ADD COLUMN IF NOT EXISTS weekly_fuel_quota_l NUMERIC;

UPDATE public.vehicles
SET temp = CASE lower(COALESCE(temp_capability::TEXT, 'ambient'))
  WHEN 'ambient' THEN 'ambient'::public.vehicle_temp
  ELSE 'reefer'::public.vehicle_temp
END
WHERE temp IS NULL;

ALTER TABLE public.vehicles
  ALTER COLUMN temp SET DEFAULT 'ambient',
  ALTER COLUMN temp SET NOT NULL;

-- The Order Service calendar is one row per date. Keep delivery_calendar from
-- migration 002 for compatibility with older consumers; new code uses calendar.
CREATE TABLE IF NOT EXISTS public.calendar (
  date           DATE PRIMARY KEY,
  dow            SMALLINT NOT NULL CHECK (dow BETWEEN 0 AND 6),
  dow_name       TEXT NOT NULL,
  is_weekend     BOOLEAN NOT NULL,
  iso_year       SMALLINT NOT NULL,
  iso_week       SMALLINT NOT NULL CHECK (iso_week BETWEEN 1 AND 53),
  is_payday      BOOLEAN NOT NULL DEFAULT FALSE,
  festival       TEXT,
  festival_ramp  BOOLEAN NOT NULL DEFAULT FALSE,
  is_holiday     BOOLEAN NOT NULL DEFAULT FALSE,
  monsoon        BOOLEAN NOT NULL DEFAULT FALSE,
  is_operating   BOOLEAN NOT NULL DEFAULT TRUE
);

-- Reconcile orders with the canonical proto status values. CANCELLED is mapped
-- to DEFERRED during migration because the proto has no CANCELLED state.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE public.orders RENAME COLUMN order_id TO id;
  END IF;
END $$;

ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.orders
  ALTER COLUMN brand TYPE public.order_brand
    USING lower(brand)::public.order_brand,
  ALTER COLUMN status TYPE public.order_status_v2
    USING CASE status::TEXT
      WHEN 'CANCELLED' THEN 'DEFERRED'::public.order_status_v2
      ELSE status::TEXT::public.order_status_v2
    END,
  ADD COLUMN IF NOT EXISTS order_type public.order_type,
  ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS created_by_user_id TEXT;
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'PENDING'::public.order_status_v2;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'preferred_date'
  ) THEN
    UPDATE public.orders SET requested_delivery_date = preferred_date WHERE requested_delivery_date IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'placed_by'
  ) THEN
    UPDATE public.orders SET created_by_user_id = placed_by::TEXT WHERE created_by_user_id IS NULL AND placed_by IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_only_for_fresh;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_type_only_for_fresh
    CHECK (brand = 'fresh' OR order_type IS NULL);

-- These legacy migration-002 fields are not part of the Order Service request
-- contract. Keep them for older consumers, but do not require fabricated data
-- when creating an order through the current API.
ALTER TABLE public.orders
  ALTER COLUMN product_code DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL,
  ALTER COLUMN weight_kg DROP NOT NULL,
  ALTER COLUMN volume_m3 DROP NOT NULL,
  ALTER COLUMN temp_requirement DROP NOT NULL,
  ALTER COLUMN window_open DROP NOT NULL,
  ALTER COLUMN window_close DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_requested_delivery_date
  ON public.orders(requested_delivery_date);

-- Order-owned lifecycle tables.
CREATE TABLE IF NOT EXISTS public.order_items (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_name  TEXT NOT NULL,
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_deferrals (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reason              TEXT NOT NULL,
  original_date       DATE NOT NULL,
  revised_date        DATE,
  is_repeat_deferral  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status      public.tracking_status NOT NULL,
  eta         TIMESTAMPTZ,
  is_delayed  BOOLEAN NOT NULL DEFAULT FALSE,
  source_note TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.receipt_confirmations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id       UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  confirmed_by   TEXT NOT NULL,
  confirmed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  has_discrepancy BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.issue_reports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  issue_type  public.issue_report_type NOT NULL,
  description TEXT NOT NULL,
  photo_url   TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_deferrals_order_id ON public.order_deferrals(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_id ON public.delivery_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_receipt_confirmations_order_id ON public.receipt_confirmations(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_receipt_confirmations_order_id
  ON public.receipt_confirmations(order_id);
CREATE INDEX IF NOT EXISTS idx_issue_reports_order_id ON public.issue_reports(order_id);

-- Outlet-scoped RLS. The helper is SECURITY DEFINER so policies can inspect
-- the Auth-owned profile table without recursive user_profiles policies.
CREATE OR REPLACE FUNCTION public.user_can_access_outlet(target_outlet_id TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = auth.uid()
      AND outlet_id = target_outlet_id
  );
$$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_deferrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_reports ENABLE ROW LEVEL SECURITY;

-- Replace the broader migration-002 order policies; PostgreSQL combines
-- permissive policies with OR, so leaving them would bypass outlet scoping.
DROP POLICY IF EXISTS "store_manager_read_own_orders" ON public.orders;
DROP POLICY IF EXISTS "store_manager_insert_orders" ON public.orders;

CREATE POLICY "orders_outlet_access"
  ON public.orders FOR ALL
  USING (public.user_can_access_outlet(outlet_id) OR auth.role() = 'service_role')
  WITH CHECK (public.user_can_access_outlet(outlet_id) OR auth.role() = 'service_role');

CREATE POLICY "order_items_outlet_access"
  ON public.order_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (public.user_can_access_outlet(o.outlet_id) OR auth.role() = 'service_role')
  ));

CREATE POLICY "order_deferrals_outlet_access"
  ON public.order_deferrals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_deferrals.order_id
      AND (public.user_can_access_outlet(o.outlet_id) OR auth.role() = 'service_role')
  ));

CREATE POLICY "delivery_tracking_outlet_access"
  ON public.delivery_tracking FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = delivery_tracking.order_id
      AND (public.user_can_access_outlet(o.outlet_id) OR auth.role() = 'service_role')
  ));

CREATE POLICY "receipt_confirmations_outlet_access"
  ON public.receipt_confirmations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = receipt_confirmations.order_id
      AND (public.user_can_access_outlet(o.outlet_id) OR auth.role() = 'service_role')
  ));

CREATE POLICY "issue_reports_outlet_access"
  ON public.issue_reports FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = issue_reports.order_id
      AND (public.user_can_access_outlet(o.outlet_id) OR auth.role() = 'service_role')
  ));