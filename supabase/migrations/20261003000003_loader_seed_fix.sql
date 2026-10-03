-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 007 — LOADER SEED STATE FIX & STOP PROGRESS VIEW
--  Service : Loading & Delivery Service
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Update load_stops schema: remove redundant columns, add dock_note ─────
ALTER TABLE public.load_stops
  DROP COLUMN IF EXISTS total_items,
  DROP COLUMN IF EXISTS loaded_items;

ALTER TABLE public.load_stops
  ADD COLUMN IF NOT EXISTS total_units INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_crates INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dock_note TEXT;

COMMENT ON COLUMN public.load_stops.dock_note IS 'Dock instructions (e.g. Rear dock / Shared mall bay / Curb / street)';
COMMENT ON COLUMN public.load_stops.total_units IS 'Total units to be delivered at this stop.';
COMMENT ON COLUMN public.load_stops.total_crates IS 'Total crate count staged for this stop.';

-- ── 2. Create view for dynamic stop progress calculation ─────────────────────
CREATE OR REPLACE VIEW public.v_load_stop_progress AS
SELECT
  s.stop_id,
  s.trip_id,
  s.stop_no,
  s.load_order,
  s.outlet_id,
  s.outlet_name,
  s.district,
  s.bay_info,
  s.status,
  s.tag,
  s.dock_note,
  s.total_units,
  s.total_crates,
  s.total_weight_kg,
  COUNT(i.item_id)::INT AS total_items,
  COUNT(i.item_id) FILTER (WHERE i.status = 'CHECKED')::INT AS loaded_items,
  COUNT(i.item_id) FILTER (WHERE i.status = 'PENDING')::INT AS pending_items,
  COUNT(i.item_id) FILTER (WHERE i.status = 'ISSUE')::INT AS issue_items,
  COALESCE(SUM(i.weight_kg) FILTER (WHERE i.status = 'CHECKED'), 0)::NUMERIC(10, 2) AS loaded_weight_kg,
  s.created_at,
  s.updated_at
FROM public.load_stops s
LEFT JOIN public.load_items i ON s.stop_id = i.stop_id
GROUP BY s.stop_id;

-- ── 3. Reset sequence so first live shortfall generates SR-0482 ─────────────
SELECT setval('public.issue_flag_ref_seq', 481, true);

-- ── 4. Fix WPT-204 initial seed state for live demo execution ────────────────
DO $$
DECLARE
  v_trip_204 UUID := '20400000-0000-0000-0000-000000000204';
  v_stop_wpt204_1 UUID := '20410000-0000-0000-0000-000000000001';
  v_stop_wpt204_2 UUID := '20420000-0000-0000-0000-000000000002';
  v_stop_wpt204_3 UUID := '20430000-0000-0000-0000-000000000003';
  v_stop_wpt204_4 UUID := '20440000-0000-0000-0000-000000000004';
  v_item_milk UUID := '20441000-0000-0000-0000-000000000001';
  v_loader_id UUID := '11111111-1111-1111-1111-111111111101';
BEGIN
  -- Clear any pre-existing issue flags for WPT-204 (TRC-176 keeps its flag SR-0176)
  DELETE FROM public.issue_flags WHERE trip_id = v_trip_204;

  -- Reset loading_confirmations for WPT-204: status LOADING, no ready_at / ready_by
  UPDATE public.loading_confirmations
  SET status = 'LOADING', ready_at = NULL, ready_by = NULL, version = 0, updated_at = NOW()
  WHERE trip_id = v_trip_204;

  -- Reset load_activity_log for WPT-204: keep ONLY "Loading started" and "Stop 4 loading opened"
  DELETE FROM public.load_activity_log WHERE trip_id = v_trip_204;

  INSERT INTO public.load_activity_log (trip_id, event_type, title, description, icon_type, logged_at, created_by)
  VALUES
    (v_trip_204, 'START', 'Loading started', 'TRC-204 assigned to Dock A5', 'play', NOW() - INTERVAL '4 hours', v_loader_id),
    (v_trip_204, 'STOP_OPENED', 'Stop 4 loading opened', 'Keells — Union Place · load order 1', 'package', NOW() - INTERVAL '3 hours 18 minutes', v_loader_id);

  -- Update stop dock notes and metrics
  UPDATE public.load_stops
  SET dock_note = 'Rear dock', total_units = 92, total_crates = 42, status = 'LOADING'
  WHERE stop_id = v_stop_wpt204_4;

  UPDATE public.load_stops
  SET dock_note = 'Shared mall bay', total_units = 146, total_crates = 28, status = 'LOADED'
  WHERE stop_id = v_stop_wpt204_3;

  UPDATE public.load_stops
  SET dock_note = 'Side dock', total_units = 110, total_crates = 35, status = 'LOADED'
  WHERE stop_id = v_stop_wpt204_2;

  UPDATE public.load_stops
  SET dock_note = 'Curb / street', total_units = 85, total_crates = 20, status = 'LOADED'
  WHERE stop_id = v_stop_wpt204_1;

  -- Ensure Stop 4 has 4 CHECKED and 1 PENDING (Highland milk crates)
  UPDATE public.load_items
  SET status = 'PENDING', loaded_qty = 0, checked_at = NULL, checked_by = NULL, updated_at = NOW()
  WHERE item_id = v_item_milk;

  UPDATE public.load_items
  SET status = 'CHECKED', loaded_qty = expected_qty, checked_at = NOW() - INTERVAL '30 minutes', checked_by = v_loader_id, updated_at = NOW()
  WHERE stop_id = v_stop_wpt204_4 AND item_id <> v_item_milk;

  -- The other three stops (Stops 1, 2, 3) are fully LOADED (all items CHECKED)
  UPDATE public.load_items
  SET status = 'CHECKED', loaded_qty = expected_qty, checked_at = NOW() - INTERVAL '1 hour', checked_by = v_loader_id, updated_at = NOW()
  WHERE trip_id = v_trip_204 AND stop_id <> v_stop_wpt204_4;

END $$;
