-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 002 — ORDER & REFERENCE DATA SCHEMA
--  Service : Order Service (Spring Boot)
--  Tables  : outlets, vehicles, calendar, orders
--  Matches column names in provided CSV datasets
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enum types ──────────────────────────────────────────────────────────────
CREATE TYPE public.temp_requirement AS ENUM (
  'AMBIENT', 'CHILLED', 'FROZEN'
);

CREATE TYPE public.vehicle_type AS ENUM (
  'TRUCK', 'VAN', 'MOTORCYCLE'
);

CREATE TYPE public.parking_type AS ENUM (
  'STANDARD', 'RESTRICTED'
);

CREATE TYPE public.order_status AS ENUM (
  'PENDING',
  'ALLOCATED',
  'DEFERRED',
  'ATTEMPTED',
  'DELIVERED',
  'CANCELLED'
);

-- ── Table: outlets ─────────────────────────────────────────────────────────
-- Reference data — loaded from outlets.csv
CREATE TABLE public.outlets (
  outlet_id       TEXT        PRIMARY KEY,          -- e.g. "OL001"
  name            TEXT        NOT NULL,
  district        TEXT        NOT NULL,
  depot           TEXT        NOT NULL,             -- Assigned depot code
  parking_type    parking_type NOT NULL DEFAULT 'STANDARD',
  lat             NUMERIC(10, 7),
  lng             NUMERIC(10, 7),
  contact_name    TEXT,
  contact_phone   TEXT,
  address         TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.outlets IS
  'Store/outlet reference data. Seeded from outlets.csv on startup.';

-- ── Table: vehicles ─────────────────────────────────────────────────────────
-- Reference data — loaded from vehicles.csv
CREATE TABLE public.vehicles (
  vehicle_id       TEXT        PRIMARY KEY,         -- e.g. "VH001"
  registration     TEXT        NOT NULL UNIQUE,     -- Plate number
  type             vehicle_type NOT NULL,
  weight_cap_kg    NUMERIC(10, 2) NOT NULL,         -- Max load weight
  volume_cap_m3    NUMERIC(8,  3) NOT NULL,         -- Max load volume
  temp_capability  temp_requirement NOT NULL DEFAULT 'AMBIENT',
  depot            TEXT        NOT NULL,
  brand            TEXT        NOT NULL,            -- Brand constraint match
  driver_id        UUID        REFERENCES auth.users(id),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.vehicles IS
  'Vehicle fleet reference data. Seeded from vehicles.csv on startup.';

-- ── Table: delivery_calendar ────────────────────────────────────────────────
-- Defines which outlets are served on which dates.
-- Loaded from calendar.csv
CREATE TABLE public.delivery_calendar (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id       TEXT        NOT NULL REFERENCES public.outlets(outlet_id),
  delivery_date   DATE        NOT NULL,
  is_delivery_day BOOLEAN     NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(outlet_id, delivery_date)
);

COMMENT ON TABLE public.delivery_calendar IS
  'Scheduled delivery days per outlet. Seeded from calendar.csv.';

-- ── Table: orders ───────────────────────────────────────────────────────────
CREATE TABLE public.orders (
  order_id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id        TEXT        NOT NULL REFERENCES public.outlets(outlet_id),
  product_code     TEXT        NOT NULL,
  quantity         INTEGER     NOT NULL CHECK (quantity > 0),
  weight_kg        NUMERIC(10, 2) NOT NULL CHECK (weight_kg > 0),
  volume_m3        NUMERIC(8,  3) NOT NULL CHECK (volume_m3 > 0),
  brand            TEXT        NOT NULL,
  temp_requirement temp_requirement NOT NULL DEFAULT 'AMBIENT',
  preferred_date   DATE        NOT NULL,
  window_open      TIME        NOT NULL,             -- Delivery window start
  window_close     TIME        NOT NULL,             -- Delivery window end
  status           order_status NOT NULL DEFAULT 'PENDING',
  placed_by        UUID        REFERENCES auth.users(id),
  cutoff_enforced  BOOLEAN     NOT NULL DEFAULT FALSE, -- Was 4PM cutoff applied?
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.orders IS
  'Customer delivery orders. 4PM cutoff enforced at service level.';

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_outlets_district        ON public.outlets(district);
CREATE INDEX idx_outlets_depot           ON public.outlets(depot);
CREATE INDEX idx_vehicles_depot          ON public.vehicles(depot);
CREATE INDEX idx_vehicles_brand          ON public.vehicles(brand);
CREATE INDEX idx_vehicles_temp           ON public.vehicles(temp_capability);
CREATE INDEX idx_calendar_date           ON public.delivery_calendar(delivery_date);
CREATE INDEX idx_calendar_outlet_date    ON public.delivery_calendar(outlet_id, delivery_date);
CREATE INDEX idx_orders_outlet_id        ON public.orders(outlet_id);
CREATE INDEX idx_orders_status           ON public.orders(status);
CREATE INDEX idx_orders_preferred_date   ON public.orders(preferred_date);
CREATE INDEX idx_orders_brand            ON public.orders(brand);
CREATE INDEX idx_orders_created_at       ON public.orders(created_at DESC);

-- ── updated_at triggers ─────────────────────────────────────────────────────
CREATE TRIGGER trg_outlets_updated_at
  BEFORE UPDATE ON public.outlets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.outlets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_calendar  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders             ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read reference data
CREATE POLICY "auth_read_outlets"
  ON public.outlets FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_read_vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "auth_read_calendar"
  ON public.delivery_calendar FOR SELECT
  USING (auth.role() = 'authenticated');

-- Orders: STORE_MANAGER can place & read their own outlet's orders
CREATE POLICY "store_manager_read_own_orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() IN (
      SELECT placed_by FROM public.orders WHERE outlet_id = orders.outlet_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('DISPATCHER', 'ADMIN', 'LOADER', 'DRIVER')
    )
  );

CREATE POLICY "store_manager_insert_orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Service role can do everything (used by backend services)
CREATE POLICY "service_role_all_orders"
  ON public.orders FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_outlets"
  ON public.outlets FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_vehicles"
  ON public.vehicles FOR ALL
  USING (auth.role() = 'service_role');
