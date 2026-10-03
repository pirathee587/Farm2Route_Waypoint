-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 008 — PROGRESS FIDELITY, TRIP SEED REFINEMENTS & REEFER ZONES
--  Service : Loading & Delivery Service
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add destination_area to trips for clean UI presentation ───────────────
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS destination_area TEXT;

COMMENT ON COLUMN public.trips.destination_area IS 'Short destination area for UI display (e.g. Union Place, Negombo, Nugegoda).';

-- ── 2. Add change_flag and planned_arrival to load_stops ─────────────────────
ALTER TABLE public.load_stops
  ADD COLUMN IF NOT EXISTS change_flag TEXT,
  ADD COLUMN IF NOT EXISTS planned_arrival TIME;

COMMENT ON COLUMN public.load_stops.change_flag IS 'REORDERED, NEW, REMOVED or NULL';

-- Update view v_load_stop_progress to include change_flag and planned_arrival
DROP VIEW IF EXISTS public.v_load_stop_progress CASCADE;
CREATE VIEW public.v_load_stop_progress AS
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
  s.change_flag,
  s.planned_arrival,
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

-- ── 3. Populate destination areas for today's trips ──────────────────────────
UPDATE public.trips SET destination_area = 'Union Place'  WHERE trip_id = '20400000-0000-0000-0000-000000000204';
UPDATE public.trips SET destination_area = 'Negombo'      WHERE trip_id = '18900000-0000-0000-0000-000000000189';
UPDATE public.trips SET destination_area = 'Wattala'      WHERE trip_id = '21100000-0000-0000-0000-000000000211';
UPDATE public.trips SET destination_area = 'Nugegoda'     WHERE trip_id = '17600000-0000-0000-0000-000000000176';
UPDATE public.trips SET destination_area = 'Kiribathgoda' WHERE trip_id = '19800000-0000-0000-0000-000000000198';
UPDATE public.trips SET destination_area = 'Maharagama'   WHERE trip_id = '22000000-0000-0000-0000-000000000220';

-- ── 4. Seed 4 stops and items for TRC-176 (Issue status, Nugegoda) ───────────
DO $$
DECLARE
  v_trip_176 UUID := '17600000-0000-0000-0000-000000000176';
  v_stop_176_1 UUID := '17610000-0000-0000-0000-000000000001';
  v_stop_176_2 UUID := '17620000-0000-0000-0000-000000000002';
  v_stop_176_3 UUID := '17630000-0000-0000-0000-000000000003';
  v_stop_176_4 UUID := '17640000-0000-0000-0000-000000000004';
BEGIN
  -- Insert outlets if not present
  INSERT INTO public.outlets (outlet_id, name, district, depot, parking_type, address)
  VALUES
    ('OUT-DELKANDA-01', 'Keells — Delkanda', 'Colombo District', 'DEPOT-01', 'STANDARD', '120 High Level Rd, Delkanda'),
    ('OUT-KOHUWALA-01', 'Cargills — Kohuwala', 'Colombo District', 'DEPOT-01', 'STANDARD', '45 Sunethra Devi Rd, Kohuwala'),
    ('OUT-NAWINNA-01',  'Arpico — Nawinna', 'Colombo District', 'DEPOT-01', 'STANDARD', '78 Old Nawinna Rd, Maharagama')
  ON CONFLICT (outlet_id) DO NOTHING;

  -- 4 Stops for TRC-176:
  -- Stop 1 (Drop 1 -> Load Order 4): Laugfs — Nugegoda
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop_176_1, v_trip_176, 1, 4, 'OUT-NUGEGODA-01', 'Laugfs — Nugegoda', 'Colombo District', 'Front Bay', 'PENDING', 'Curb', 'Front dock', 60, 20, 450.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, dock_note = EXCLUDED.dock_note;

  -- Stop 2 (Drop 2 -> Load Order 3): Keells — Delkanda
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop_176_2, v_trip_176, 2, 3, 'OUT-DELKANDA-01', 'Keells — Delkanda', 'Colombo District', 'Side Alley', 'PENDING', 'Standard', 'Side dock', 50, 15, 380.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, dock_note = EXCLUDED.dock_note;

  -- Stop 3 (Drop 3 -> Load Order 2): Cargills — Kohuwala
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop_176_3, v_trip_176, 3, 2, 'OUT-KOHUWALA-01', 'Cargills — Kohuwala', 'Colombo District', 'Rear Dock', 'LOADING', 'Standard', 'Rear bay', 70, 22, 520.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, dock_note = EXCLUDED.dock_note;

  -- Stop 4 (Drop 4 -> Load Order 1): Arpico — Nawinna
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop_176_4, v_trip_176, 4, 1, 'OUT-NAWINNA-01', 'Arpico — Nawinna', 'Colombo District', 'Main Dock', 'LOADED', 'Standard', 'Main warehouse dock', 80, 25, 540.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, dock_note = EXCLUDED.dock_note;

  -- Items for TRC-176: total 24 items, 10 CHECKED (41.6% ~ 42% progress, total loaded 1890 kg)
  FOR i IN 1..10 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, status)
    VALUES (v_stop_176_4, v_trip_176, 'TRC176-ITEM-' || i, 'Chilled Dairy Pack ' || i, 10, 10, 'crates', 189.00, 'CHECKED')
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR i IN 11..24 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, status)
    VALUES (v_stop_176_2, v_trip_176, 'TRC176-ITEM-' || i, 'Ambient Grocery Pack ' || i, 10, 0, 'cartons', 150.00, 'PENDING')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ── 5. Seed stops and items for TRC-189 (Ready / 100%) and TRC-198 (Ready / 100%)
DO $$
DECLARE
  v_trip_189 UUID := '18900000-0000-0000-0000-000000000189';
  v_stop_189_1 UUID := '18910000-0000-0000-0000-000000000001';
  v_trip_198 UUID := '19800000-0000-0000-0000-000000000198';
  v_stop_198_1 UUID := '19810000-0000-0000-0000-000000000001';
BEGIN
  -- TRC-189: 100% loaded, status LOADED
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop_189_1, v_trip_189, 1, 1, 'OUT-NEGOMBO-01', 'Keells — Negombo Road', 'Gampaha District', 'Dock B2', 'LOADED', 'Standard', 'Dock B2', 120, 40, 4760.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET status = 'LOADED', dock_note = 'Dock B2';

  FOR i IN 1..10 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, status)
    VALUES (v_stop_189_1, v_trip_189, 'TRC189-ITEM-' || i, 'Negombo Wholesale Goods ' || i, 12, 12, 'crates', 476.00, 'CHECKED')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- TRC-198: 100% loaded, status LOADED
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop_198_1, v_trip_198, 1, 1, 'OUT-KIRIBATH-01', 'Arpico — Kiribathgoda', 'Gampaha District', 'Dock B4', 'LOADED', 'Standard', 'Dock B4', 100, 35, 3940.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET status = 'LOADED', dock_note = 'Dock B4';

  FOR i IN 1..10 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, status)
    VALUES (v_stop_198_1, v_trip_198, 'TRC198-ITEM-' || i, 'Kiribathgoda Staged Batch ' || i, 10, 10, 'crates', 394.00, 'CHECKED')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
