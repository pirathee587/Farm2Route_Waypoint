-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 005 — LOADER WORKFLOW & REORDERING SCHEMA
--  Service : Loading & Delivery Service (Go 1.22)
--  Tables  : Alter loading_confirmations, Alter issue_flags,
--            Create load_stops, load_items, load_activity_log,
--            plan_changes, outbox_events
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Sequence for Issue Flag reference numbers (SR-0001, SR-0002, etc.) ────
CREATE SEQUENCE IF NOT EXISTS public.issue_flag_ref_seq
  START WITH 1
  INCREMENT BY 1;

-- Function to format issue flag reference numbers
CREATE OR REPLACE FUNCTION public.format_issue_flag_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    NEW.ref := 'SR-' || LPAD(NEXTVAL('public.issue_flag_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Alter existing table: loading_confirmations ───────────────────────────
-- Reusing existing table as the core load session per trip
ALTER TABLE public.loading_confirmations
  ADD COLUMN IF NOT EXISTS dock TEXT,
  ADD COLUMN IF NOT EXISTS plan_revision INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.loading_confirmations.dock IS 'Assigned warehouse dock (e.g., Dock A5).';
COMMENT ON COLUMN public.loading_confirmations.plan_revision IS 'Sequence version of the plan from planning-service.';
COMMENT ON COLUMN public.loading_confirmations.ready_at IS 'Timestamp when loader marked vehicle ready for departure.';
COMMENT ON COLUMN public.loading_confirmations.ready_by IS 'User ID of the loader who performed departure confirmation.';
COMMENT ON COLUMN public.loading_confirmations.version IS 'Optimistic concurrency version counter.';

-- ── 3. Alter existing table: issue_flags ────────────────────────────────────
-- Reusing existing table as the shortfall record
ALTER TABLE public.issue_flags
  ADD COLUMN IF NOT EXISTS ref TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stop_id UUID,
  ADD COLUMN IF NOT EXISTS item_id UUID,
  ADD COLUMN IF NOT EXISTS qty_affected INT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS weight_delta_kg NUMERIC(8, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispatcher_notified_at TIMESTAMPTZ;

-- Trigger to auto-generate ref on insert if missing
DROP TRIGGER IF EXISTS trg_issue_flags_ref ON public.issue_flags;
CREATE TRIGGER trg_issue_flags_ref
  BEFORE INSERT ON public.issue_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.format_issue_flag_ref();

COMMENT ON COLUMN public.issue_flags.ref IS 'Human-readable issue reference (e.g. SR-0482).';
COMMENT ON COLUMN public.issue_flags.reason IS 'Shortfall reason: MISSING, DAMAGED, SHORT_SHIPPED.';
COMMENT ON COLUMN public.issue_flags.weight_delta_kg IS 'Weight difference impacting vehicle manifest capacity.';

-- ── 4. Table: load_stops ────────────────────────────────────────────────────
-- Represents each delivery stop with load_order = REVERSE of delivery sequence
CREATE TABLE IF NOT EXISTS public.load_stops (
  stop_id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id          UUID        NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  stop_no          INT         NOT NULL CHECK (stop_no > 0),    -- Delivery sequence: 1, 2, 3, 4
  load_order       INT         NOT NULL CHECK (load_order > 0), -- Reverse sequence: last drop loaded first
  outlet_id        TEXT        NOT NULL REFERENCES public.outlets(outlet_id),
  outlet_name      TEXT        NOT NULL,
  district         TEXT,
  bay_info         TEXT,                                        -- e.g. "Rear loading bay", "Side dock", "Bay 2"
  status           TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LOADING', 'LOADED')),
  tag              TEXT,                                        -- e.g. "Rear dock", "Shared mall bay", "Curb / street", "van_only"
  total_items      INT         NOT NULL DEFAULT 0,
  loaded_items     INT         NOT NULL DEFAULT 0,
  total_weight_kg  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, stop_no),
  UNIQUE(trip_id, load_order)
);

COMMENT ON TABLE public.load_stops IS
  'Stops for a trip where load_order is the reverse of delivery sequence (stop_no).';

-- ── 5. Table: load_items ────────────────────────────────────────────────────
-- Individual items/crates to be verified and loaded for each stop
CREATE TABLE IF NOT EXISTS public.load_items (
  item_id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  stop_id          UUID        NOT NULL REFERENCES public.load_stops(stop_id) ON DELETE CASCADE,
  trip_id          UUID        NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  order_id         UUID        REFERENCES public.orders(order_id),
  sku              TEXT        NOT NULL,
  name             TEXT        NOT NULL,
  expected_qty     INT         NOT NULL CHECK (expected_qty >= 0),
  loaded_qty       INT         NOT NULL DEFAULT 0 CHECK (loaded_qty >= 0),
  unit             TEXT        NOT NULL DEFAULT 'crates',
  weight_kg        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tags             TEXT[]      NOT NULL DEFAULT '{}',           -- e.g. '{"Fresh", "chilled"}'
  status           TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CHECKED', 'ISSUE')),
  checked_at       TIMESTAMPTZ,
  checked_by       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.load_items IS
  'Item checklist rows for a loading stop.';

-- ── 6. Table: load_activity_log ─────────────────────────────────────────────
-- Chronological loading cycle activity log (07:30 Loading started, 08:12 Stop 4 opened, etc.)
CREATE TABLE IF NOT EXISTS public.load_activity_log (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id          UUID        NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  event_type       TEXT        NOT NULL,
  title            TEXT        NOT NULL,
  description      TEXT,
  icon_type        TEXT        NOT NULL DEFAULT 'package', -- play, package, alert, check, list, user
  logged_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID        REFERENCES auth.users(id)
);

COMMENT ON TABLE public.load_activity_log IS
  'Chronological log of loading events for departure verification.';

-- ── 7. Table: plan_changes ──────────────────────────────────────────────────
-- Records reorderings / sequence changes pushed by dispatcher or requested by loader
CREATE TABLE IF NOT EXISTS public.plan_changes (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id          UUID        NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  revision         INT         NOT NULL DEFAULT 1,
  summary          TEXT        NOT NULL,                         -- e.g. "Plan Updated — stop sequence has changed"
  details          JSONB       NOT NULL DEFAULT '{}',
  acknowledged     BOOLEAN     NOT NULL DEFAULT FALSE,
  acknowledged_at  TIMESTAMPTZ,
  acknowledged_by  UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.plan_changes IS
  'Tracks stop reorderings and loader acknowledgments.';

-- ── 8. Table: outbox_events ─────────────────────────────────────────────────
-- Transactional outbox for reliable RabbitMQ event publishing
CREATE TABLE IF NOT EXISTS public.outbox_events (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregate_type   TEXT        NOT NULL,                         -- TRIP | ISSUE_FLAG | DELIVERY
  aggregate_id     TEXT        NOT NULL,
  event_type       TEXT        NOT NULL,                         -- ALLOCATION_COMPLETED | DELIVERY_COMPLETED | FLAG_RAISED
  payload          JSONB       NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PUBLISHED', 'FAILED')),
  retry_count      INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at     TIMESTAMPTZ
);

COMMENT ON TABLE public.outbox_events IS
  'Transactional outbox pattern for guaranteed at-least-once message delivery.';

-- ── 9. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_load_stops_trip_load_order  ON public.load_stops(trip_id, load_order);
CREATE INDEX IF NOT EXISTS idx_load_stops_trip_stop_no     ON public.load_stops(trip_id, stop_no);
CREATE INDEX IF NOT EXISTS idx_load_items_stop_id          ON public.load_items(stop_id);
CREATE INDEX IF NOT EXISTS idx_load_items_trip_id          ON public.load_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_load_activity_trip_time     ON public.load_activity_log(trip_id, logged_at ASC);
CREATE INDEX IF NOT EXISTS idx_plan_changes_trip_revision  ON public.plan_changes(trip_id, revision);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status        ON public.outbox_events(status, created_at);

-- ── 10. Triggers for updated_at ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_load_stops_updated_at ON public.load_stops;
CREATE TRIGGER trg_load_stops_updated_at
  BEFORE UPDATE ON public.load_stops
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_load_items_updated_at ON public.load_items;
CREATE TRIGGER trg_load_items_updated_at
  BEFORE UPDATE ON public.load_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 11. Row Level Security ──────────────────────────────────────────────────
ALTER TABLE public.load_stops        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_changes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_events     ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_all_load_stops"        ON public.load_stops        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_load_items"        ON public.load_items        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_load_activity_log" ON public.load_activity_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_plan_changes"      ON public.plan_changes      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_all_outbox_events"     ON public.outbox_events     FOR ALL USING (auth.role() = 'service_role');

-- Loaders and Dispatchers read/write access
CREATE POLICY "loader_dispatcher_load_stops"
  ON public.load_stops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('LOADER', 'DISPATCHER', 'ADMIN')
    )
  );

CREATE POLICY "loader_dispatcher_load_items"
  ON public.load_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('LOADER', 'DISPATCHER', 'ADMIN')
    )
  );

CREATE POLICY "loader_dispatcher_load_activity"
  ON public.load_activity_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('LOADER', 'DISPATCHER', 'ADMIN')
    )
  );

CREATE POLICY "loader_dispatcher_plan_changes"
  ON public.plan_changes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('LOADER', 'DISPATCHER', 'ADMIN')
    )
  );
