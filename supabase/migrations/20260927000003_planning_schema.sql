-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 003 — PLANNING & ALLOCATION SCHEMA
--  Service : Planning Service (Spring Boot)
--  Tables  : trips, allocations, deferral_records
--  Core of the delivery planning engine
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enum types ──────────────────────────────────────────────────────────────
CREATE TYPE public.trip_status AS ENUM (
  'PLANNED',
  'LOADING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE public.allocation_status AS ENUM (
  'ALLOCATED',
  'DEFERRED'
);

CREATE TYPE public.constraint_type AS ENUM (
  'BRAND',
  'TEMP',
  'PARKING',
  'DEPOT',
  'WEIGHT',
  'VOLUME',
  'WINDOW',
  'TRIPS',
  'NONE'
);

-- ── Table: trips ────────────────────────────────────────────────────────────
-- A trip = one vehicle going out once (max 2 trips per vehicle per day)
CREATE TABLE public.trips (
  trip_id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      TEXT        NOT NULL REFERENCES public.vehicles(vehicle_id),
  driver_id       UUID        REFERENCES auth.users(id),
  trip_number     SMALLINT    NOT NULL CHECK (trip_number IN (1, 2)), -- Max 2/day
  delivery_date   DATE        NOT NULL,
  status          trip_status NOT NULL DEFAULT 'PLANNED',
  stop_sequence   TEXT[]      NOT NULL DEFAULT '{}', -- Ordered outlet_ids
  total_weight_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_volume_m3 NUMERIC(8,  3) NOT NULL DEFAULT 0,
  departed_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vehicle_id, trip_number, delivery_date)   -- Enforce max 2 trips/vehicle/day
);

COMMENT ON TABLE public.trips IS
  'Planned delivery trips. Each vehicle can have max 2 trips per day.';

-- ── Table: allocations ──────────────────────────────────────────────────────
-- Links each order to a trip (or records why it was deferred)
CREATE TABLE public.allocations (
  allocation_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID        NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  trip_id          UUID        REFERENCES public.trips(trip_id),
  vehicle_id       TEXT        REFERENCES public.vehicles(vehicle_id),
  status           allocation_status NOT NULL DEFAULT 'ALLOCATED',
  stop_index       INTEGER,                          -- Position in trip stop sequence
  planned_arrival  TIME,                             -- Estimated arrival time at outlet
  -- Deferral fields (populated when status = DEFERRED)
  deferral_reason  TEXT,
  failed_constraint constraint_type DEFAULT 'NONE',
  retry_date       DATE,
  allocated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  allocated_by     TEXT        NOT NULL DEFAULT 'SYSTEM', -- SYSTEM or user_id
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.allocations IS
  'Result of the allocation engine run. Each order gets one allocation record per run.';

-- ── Table: deferral_records ─────────────────────────────────────────────────
-- Audit trail of every deferral (separate from allocations for reporting)
CREATE TABLE public.deferral_records (
  deferral_id      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID        NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
  delivery_date    DATE        NOT NULL,             -- Date that was attempted
  reason           TEXT        NOT NULL,
  constraint_type  constraint_type NOT NULL,
  retry_date       DATE,
  notified         BOOLEAN     NOT NULL DEFAULT FALSE, -- Was store manager notified?
  notified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.deferral_records IS
  'Audit log of all deferred orders. Used for reporting and store manager notifications.';

-- ── Table: allocation_runs ──────────────────────────────────────────────────
-- Tracks each execution of the allocation engine
CREATE TABLE public.allocation_runs (
  run_id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_date   DATE        NOT NULL,
  triggered_by    UUID        REFERENCES auth.users(id),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  total_orders    INTEGER     NOT NULL DEFAULT 0,
  allocated_count INTEGER     NOT NULL DEFAULT 0,
  deferred_count  INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'RUNNING'  -- RUNNING | COMPLETED | FAILED
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_trips_vehicle_date      ON public.trips(vehicle_id, delivery_date);
CREATE INDEX idx_trips_date_status       ON public.trips(delivery_date, status);
CREATE INDEX idx_trips_driver            ON public.trips(driver_id);
CREATE INDEX idx_allocations_order_id    ON public.allocations(order_id);
CREATE INDEX idx_allocations_trip_id     ON public.allocations(trip_id);
CREATE INDEX idx_allocations_status      ON public.allocations(status);
CREATE INDEX idx_deferral_order_id       ON public.deferral_records(order_id);
CREATE INDEX idx_deferral_date           ON public.deferral_records(delivery_date);
CREATE INDEX idx_deferral_retry_date     ON public.deferral_records(retry_date);
CREATE INDEX idx_alloc_runs_date         ON public.allocation_runs(delivery_date);

-- ── updated_at triggers ─────────────────────────────────────────────────────
CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_allocations_updated_at
  BEFORE UPDATE ON public.allocations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.trips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deferral_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_runs     ENABLE ROW LEVEL SECURITY;

-- DISPATCHER + ADMIN can see all trips and allocations
CREATE POLICY "dispatcher_read_trips"
  ON public.trips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('DISPATCHER', 'ADMIN', 'LOADER', 'DRIVER')
    )
  );

-- DRIVER can only see trips assigned to them
CREATE POLICY "driver_read_own_trips"
  ON public.trips FOR SELECT
  USING (driver_id = auth.uid());

CREATE POLICY "service_role_all_trips"
  ON public.trips FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_allocations"
  ON public.allocations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_deferrals"
  ON public.deferral_records FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "authenticated_read_deferrals"
  ON public.deferral_records FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_allocations"
  ON public.allocations FOR SELECT
  USING (auth.role() = 'authenticated');
