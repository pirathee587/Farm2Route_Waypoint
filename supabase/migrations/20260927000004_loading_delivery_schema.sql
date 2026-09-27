-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 004 — LOADING & DELIVERY SCHEMA
--  Service : Loading & Delivery Service (Go)
--  Tables  : loading_confirmations, delivery_records, proof_of_delivery,
--             issue_flags, sync_queue
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Enum types ──────────────────────────────────────────────────────────────
CREATE TYPE public.delivery_outcome AS ENUM (
  'DELIVERED',
  'ATTEMPTED',
  'NOT_HOME',
  'REFUSED',
  'PARTIAL'
);

CREATE TYPE public.issue_type AS ENUM (
  'DAMAGE',
  'SHORTAGE',
  'WRONG_ITEM',
  'TEMPERATURE',
  'OTHER'
);

CREATE TYPE public.loading_status AS ENUM (
  'PENDING',
  'LOADING',
  'LOADED',
  'DEPARTED'
);

CREATE TYPE public.sync_status AS ENUM (
  'PENDING',
  'SYNCED',
  'FAILED',
  'CONFLICT'
);

-- ── Table: loading_confirmations ────────────────────────────────────────────
-- Loader confirms all items are physically loaded onto the vehicle
CREATE TABLE public.loading_confirmations (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID           NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  loader_id       UUID           NOT NULL REFERENCES auth.users(id),
  status          loading_status NOT NULL DEFAULT 'PENDING',
  confirmed_order_ids  UUID[]   NOT NULL DEFAULT '{}',
  unloaded_items  JSONB          NOT NULL DEFAULT '[]', -- [{order_id, reason, notes}]
  loaded_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id)   -- One confirmation per trip
);

COMMENT ON TABLE public.loading_confirmations IS
  'Loader sign-off that a trip is physically loaded and ready to depart.';

-- ── Table: delivery_records ──────────────────────────────────────────────────
-- Every delivery attempt by a driver at an outlet
CREATE TABLE public.delivery_records (
  delivery_id      UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id          UUID             NOT NULL REFERENCES public.trips(trip_id),
  order_id         UUID             NOT NULL REFERENCES public.orders(order_id),
  driver_id        UUID             NOT NULL REFERENCES auth.users(id),
  outlet_id        TEXT             NOT NULL REFERENCES public.outlets(outlet_id),
  outcome          delivery_outcome NOT NULL,
  arrived_at       TIMESTAMPTZ      NOT NULL,
  departed_at      TIMESTAMPTZ,
  received_by      TEXT,            -- Name of person who received the goods
  notes            TEXT,
  lat              NUMERIC(10, 7),  -- GPS at delivery location
  lng              NUMERIC(10, 7),
  -- Idempotency key for offline sync (client-generated UUID)
  operation_id     UUID             NOT NULL UNIQUE,
  synced_at        TIMESTAMPTZ,     -- NULL if captured offline, set when synced
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.delivery_records IS
  'Driver delivery attempt records. operation_id ensures idempotent offline sync.';

-- ── Table: proof_of_delivery ─────────────────────────────────────────────────
-- POD attachments: signature image, photo evidence
CREATE TABLE public.proof_of_delivery (
  pod_id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id      UUID        NOT NULL REFERENCES public.delivery_records(delivery_id) ON DELETE CASCADE,
  -- Supabase Storage URL
  file_url         TEXT        NOT NULL,
  -- SIGNATURE | PHOTO | DOCUMENT
  pod_type         TEXT        NOT NULL DEFAULT 'PHOTO',
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.proof_of_delivery IS
  'Proof of delivery files stored in Supabase Storage. Linked to delivery records.';

-- ── Table: issue_flags ───────────────────────────────────────────────────────
-- Flagged issues raised by loader or driver
CREATE TABLE public.issue_flags (
  issue_id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id          UUID        NOT NULL REFERENCES public.trips(trip_id),
  order_id         UUID        REFERENCES public.orders(order_id),
  flagged_by       UUID        NOT NULL REFERENCES auth.users(id),
  issue_type       issue_type  NOT NULL,
  description      TEXT        NOT NULL,
  evidence_url     TEXT,       -- Supabase Storage URL for photo
  resolved         BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_by      UUID        REFERENCES auth.users(id),
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.issue_flags IS
  'Issues flagged by loaders or drivers (damage, shortage, wrong item, etc.).';

-- ── Table: sync_queue ────────────────────────────────────────────────────────
-- Offline delivery records queued for sync when connectivity is restored
CREATE TABLE public.sync_queue (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id        UUID        NOT NULL REFERENCES auth.users(id),
  operation_id     UUID        NOT NULL UNIQUE,  -- Client-generated idempotency key
  operation_type   TEXT        NOT NULL,         -- DELIVERY | POD | FLAG
  payload          JSONB       NOT NULL,         -- Full RecordDeliveryRequest JSON
  captured_at      TIMESTAMPTZ NOT NULL,         -- When driver captured it offline
  sync_status      sync_status NOT NULL DEFAULT 'PENDING',
  synced_at        TIMESTAMPTZ,
  error_message    TEXT,
  retry_count      SMALLINT    NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sync_queue IS
  'Offline-first buffer. Driver records go here when offline; synced on reconnect.';

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_loading_conf_trip          ON public.loading_confirmations(trip_id);
CREATE INDEX idx_delivery_records_trip      ON public.delivery_records(trip_id);
CREATE INDEX idx_delivery_records_order     ON public.delivery_records(order_id);
CREATE INDEX idx_delivery_records_driver    ON public.delivery_records(driver_id);
CREATE INDEX idx_delivery_records_op_id     ON public.delivery_records(operation_id);
CREATE INDEX idx_delivery_records_outlet    ON public.delivery_records(outlet_id);
CREATE INDEX idx_delivery_records_arrived   ON public.delivery_records(arrived_at DESC);
CREATE INDEX idx_pod_delivery_id            ON public.proof_of_delivery(delivery_id);
CREATE INDEX idx_issue_flags_trip           ON public.issue_flags(trip_id);
CREATE INDEX idx_issue_flags_flagged_by     ON public.issue_flags(flagged_by);
CREATE INDEX idx_issue_flags_resolved       ON public.issue_flags(resolved);
CREATE INDEX idx_sync_queue_driver          ON public.sync_queue(driver_id);
CREATE INDEX idx_sync_queue_status          ON public.sync_queue(sync_status);
CREATE INDEX idx_sync_queue_op_id           ON public.sync_queue(operation_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
CREATE TRIGGER trg_loading_conf_updated_at
  BEFORE UPDATE ON public.loading_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_delivery_records_updated_at
  BEFORE UPDATE ON public.delivery_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.loading_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_delivery     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_flags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue            ENABLE ROW LEVEL SECURITY;

-- LOADER can manage their own loading confirmations
CREATE POLICY "loader_manage_own_confirmations"
  ON public.loading_confirmations FOR ALL
  USING (loader_id = auth.uid());

-- DRIVER can manage their own delivery records
CREATE POLICY "driver_manage_own_deliveries"
  ON public.delivery_records FOR ALL
  USING (driver_id = auth.uid());

-- DISPATCHER + ADMIN can read all delivery records
CREATE POLICY "dispatcher_read_all_deliveries"
  ON public.delivery_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('DISPATCHER', 'ADMIN')
    )
  );

-- DRIVER can manage their own sync queue
CREATE POLICY "driver_manage_own_sync_queue"
  ON public.sync_queue FOR ALL
  USING (driver_id = auth.uid());

-- Issues: flagged_by user and dispatchers
CREATE POLICY "own_and_dispatcher_read_flags"
  ON public.issue_flags FOR SELECT
  USING (
    flagged_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('DISPATCHER', 'ADMIN')
    )
  );

-- Service role full access
CREATE POLICY "service_all_loading"       ON public.loading_confirmations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_deliveries"    ON public.delivery_records FOR ALL      USING (auth.role() = 'service_role');
CREATE POLICY "service_all_pod"           ON public.proof_of_delivery FOR ALL     USING (auth.role() = 'service_role');
CREATE POLICY "service_all_issues"        ON public.issue_flags FOR ALL           USING (auth.role() = 'service_role');
CREATE POLICY "service_all_sync_queue"    ON public.sync_queue FOR ALL            USING (auth.role() = 'service_role');
