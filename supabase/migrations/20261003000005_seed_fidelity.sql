-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 009 — SEED FIDELITY, PARKING CONSTRAINTS & REAL ITEM COUNTS
--  Service : Loading & Delivery Service
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add parking_constraint to outlets ─────────────────────────────────────
ALTER TABLE public.outlets
  ADD COLUMN IF NOT EXISTS parking_constraint TEXT;

COMMENT ON COLUMN public.outlets.parking_constraint IS
  'Parking constraint tag (e.g. van_only) appended to stop tags.';

UPDATE public.outlets SET parking_constraint = 'van_only' WHERE outlet_id = 'OUT-STYLEHUB-01';

-- ── 2. Helper Outlets for multi-stop seed trips ──────────────────────────────
INSERT INTO public.outlets (outlet_id, name, district, depot, parking_type, address, parking_constraint)
VALUES
  ('OUT-NEGOMBO-02', 'Keells — Beach Road', 'Gampaha District', 'DEPOT-01', 'STANDARD', '12 Beach Rd, Negombo', NULL),
  ('OUT-NEGOMBO-03', 'Arpico — Negombo City', 'Gampaha District', 'DEPOT-01', 'STANDARD', '55 Main St, Negombo', NULL),
  ('OUT-KIRIBATH-02', 'Keells — Kiribathgoda Junction', 'Gampaha District', 'DEPOT-01', 'STANDARD', '88 Kandy Rd, Kiribathgoda', NULL),
  ('OUT-WATTALA-01', 'Cargills — Wattala Central', 'Gampaha District', 'DEPOT-01', 'STANDARD', '10 Negombo Rd, Wattala', NULL),
  ('OUT-WATTALA-02', 'Keells — Mabola', 'Gampaha District', 'DEPOT-01', 'STANDARD', '45 Mabola Rd, Wattala', NULL),
  ('OUT-WATTALA-03', 'Arpico — Hendala', 'Gampaha District', 'DEPOT-01', 'STANDARD', '22 Hendala Rd, Wattala', NULL),
  ('OUT-WATTALA-04', 'Laughs — Kerawalapitiya', 'Gampaha District', 'DEPOT-01', 'STANDARD', '101 Kerawalapitiya, Wattala', NULL),
  ('OUT-WATTALA-05', 'SPAR — Wattala Junction', 'Gampaha District', 'DEPOT-01', 'STANDARD', '15 Negombo Rd, Wattala', NULL),
  ('OUT-MAHARA-01', 'Keells — Maharagama Clock Tower', 'Colombo District', 'DEPOT-01', 'STANDARD', '1 High Level Rd, Maharagama', NULL),
  ('OUT-MAHARA-02', 'Cargills — Maharagama Market', 'Colombo District', 'DEPOT-01', 'STANDARD', '20 Market St, Maharagama', NULL),
  ('OUT-MAHARA-03', 'Arpico — Pamunuwa Road', 'Colombo District', 'DEPOT-01', 'STANDARD', '5 Pamunuwa Rd, Maharagama', NULL),
  ('OUT-MAHARA-04', 'Laugfs — High Level', 'Colombo District', 'DEPOT-01', 'STANDARD', '140 High Level Rd, Maharagama', NULL),
  ('OUT-MAHARA-05', 'Softlogic — Wijerama', 'Colombo District', 'DEPOT-01', 'STANDARD', '80 High Level Rd, Maharagama', NULL),
  ('OUT-MAHARA-06', 'Singer — Boralesgamuwa', 'Colombo District', 'DEPOT-01', 'STANDARD', '12 Dehiwala Rd, Boralesgamuwa', NULL)
ON CONFLICT (outlet_id) DO NOTHING;

-- ── 3. Reseed Trips with Full Fidelity ───────────────────────────────────────
DO $$
DECLARE
  v_trip_189 UUID := '18900000-0000-0000-0000-000000000189';
  v_trip_198 UUID := '19800000-0000-0000-0000-000000000198';
  v_trip_211 UUID := '21100000-0000-0000-0000-000000000211';
  v_trip_176 UUID := '17600000-0000-0000-0000-000000000176';
  v_trip_220 UUID := '22000000-0000-0000-0000-000000000220';
  v_trip_204 UUID := '20400000-0000-0000-0000-000000000204';
  
  v_stop UUID;
BEGIN
  -- A. TRC-189: 3 stops, 100% Ready, 4,760 kg loaded
  DELETE FROM public.load_items WHERE trip_id = v_trip_189;
  DELETE FROM public.load_stops WHERE trip_id = v_trip_189;

  FOR s IN 1..3 LOOP
    v_stop := ('18900000-0000-0000-0000-00000000000' || s)::UUID;
    INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
    VALUES (v_stop, v_trip_189, s, 4 - s, 'OUT-NEGOMBO-0' || s, 'Negombo Outlet Stop ' || s, 'Gampaha District', 'Bay ' || s, 'LOADED', 'Dock B2', 50, 15, 1586.67);

    FOR i IN 1..5 LOOP
      INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at)
      VALUES (v_stop, v_trip_189, 'TRC189-S' || s || '-I' || i, 'Negombo Dry Grocery ' || s || '-' || i, 10, 10, 'crates', 317.33, ARRAY['ambient'], 'CHECKED', NOW() - INTERVAL '30 minutes');
    END LOOP;
  END LOOP;

  UPDATE public.loading_confirmations
  SET status = 'LOADED', ready_at = NOW() - INTERVAL '15 minutes'
  WHERE trip_id = v_trip_189;

  -- B. TRC-198: 2 stops, 100% Ready, 3,940 kg loaded
  DELETE FROM public.load_items WHERE trip_id = v_trip_198;
  DELETE FROM public.load_stops WHERE trip_id = v_trip_198;

  FOR s IN 1..2 LOOP
    v_stop := ('19800000-0000-0000-0000-00000000000' || s)::UUID;
    INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
    VALUES (v_stop, v_trip_198, s, 3 - s, 'OUT-KIRIBATH-0' || s, 'Kiribathgoda Stop ' || s, 'Gampaha District', 'Bay ' || s, 'LOADED', 'Dock B4', 40, 12, 1970.00);

    FOR i IN 1..5 LOOP
      INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at)
      VALUES (v_stop, v_trip_198, 'TRC198-S' || s || '-I' || i, 'Kiribath Pack ' || s || '-' || i, 8, 8, 'crates', 394.00, ARRAY['ambient'], 'CHECKED', NOW() - INTERVAL '25 minutes');
    END LOOP;
  END LOOP;

  UPDATE public.loading_confirmations
  SET status = 'LOADED', ready_at = NOW() - INTERVAL '20 minutes'
  WHERE trip_id = v_trip_198;

  -- C. TRC-211: 5 stops, 0% Not Started, 0 kg loaded, all PENDING
  DELETE FROM public.load_items WHERE trip_id = v_trip_211;
  DELETE FROM public.load_stops WHERE trip_id = v_trip_211;

  FOR s IN 1..5 LOOP
    v_stop := ('21100000-0000-0000-0000-00000000000' || s)::UUID;
    INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
    VALUES (v_stop, v_trip_211, s, 6 - s, 'OUT-WATTALA-0' || s, 'Wattala Branch ' || s, 'Gampaha District', 'Front Bay', 'PENDING', 'Dock C1', 30, 10, 800.00);

    FOR i IN 1..4 LOOP
      INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
      VALUES (v_stop, v_trip_211, 'TRC211-S' || s || '-I' || i, 'Wattala Hardware Item ' || s || '-' || i, 5, 0, 'cartons', 200.00, ARRAY['Tech', 'fragile'], 'PENDING');
    END LOOP;
  END LOOP;

  UPDATE public.loading_confirmations
  SET status = 'PENDING', ready_at = NULL
  WHERE trip_id = v_trip_211;

  -- D. TRC-220: 6 stops, 31% Loading, 1,720 kg checked, 32 items total (10 checked, 22 pending)
  DELETE FROM public.load_items WHERE trip_id = v_trip_220;
  DELETE FROM public.load_stops WHERE trip_id = v_trip_220;

  -- Stop 6 (Load order 1): LOADED, 5 items checked, 860 kg
  v_stop := '22000000-0000-0000-0000-000000000006'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_220, 6, 1, 'OUT-MAHARA-01', 'Keells — Maharagama Clock Tower', 'Colombo District', 'Main Dock', 'LOADED', 'Dock C3', 45, 15, 860.00);
  FOR i IN 1..5 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at)
    VALUES (v_stop, v_trip_220, 'TRC220-S6-I' || i, 'Maharagama Fresh Crate ' || i, 10, 10, 'crates', 172.00, ARRAY['Fresh', 'chilled'], 'CHECKED', NOW() - INTERVAL '10 minutes');
  END LOOP;

  -- Stop 5 (Load order 2): LOADED, 5 items checked, 860 kg
  v_stop := '22000000-0000-0000-0000-000000000005'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_220, 5, 2, 'OUT-MAHARA-02', 'Cargills — Maharagama Market', 'Colombo District', 'Side Dock', 'LOADED', 'Dock C3', 45, 15, 860.00);
  FOR i IN 1..5 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at)
    VALUES (v_stop, v_trip_220, 'TRC220-S5-I' || i, 'Maharagama Chilled Dairy ' || i, 10, 10, 'crates', 172.00, ARRAY['Fresh', 'chilled'], 'CHECKED', NOW() - INTERVAL '5 minutes');
  END LOOP;

  -- Stop 4 (Load order 3): LOADING, 5 items pending, 600 kg
  v_stop := '22000000-0000-0000-0000-000000000004'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_220, 4, 3, 'OUT-MAHARA-03', 'Arpico — Pamunuwa Road', 'Colombo District', 'Rear Dock', 'LOADING', 'Dock C3', 35, 10, 600.00);
  FOR i IN 1..5 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (v_stop, v_trip_220, 'TRC220-S4-I' || i, 'Pamunuwa Dry Stock ' || i, 6, 0, 'cartons', 120.00, ARRAY['ambient'], 'PENDING');
  END LOOP;

  -- Stop 3 (Load order 4): PENDING, 5 items pending
  v_stop := '22000000-0000-0000-0000-000000000003'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_220, 3, 4, 'OUT-MAHARA-04', 'Laugfs — High Level', 'Colombo District', 'Front Bay', 'PENDING', 'Dock C3', 30, 8, 500.00);
  FOR i IN 1..5 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (v_stop, v_trip_220, 'TRC220-S3-I' || i, 'High Level Ambient ' || i, 6, 0, 'cartons', 100.00, ARRAY['ambient'], 'PENDING');
  END LOOP;

  -- Stop 2 (Load order 5): PENDING, 6 items pending
  v_stop := '22000000-0000-0000-0000-000000000002'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_220, 2, 5, 'OUT-MAHARA-05', 'Softlogic — Wijerama', 'Colombo District', 'Side Bay', 'PENDING', 'Dock C3', 30, 8, 500.00);
  FOR i IN 1..6 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (v_stop, v_trip_220, 'TRC220-S2-I' || i, 'Wijerama Goods ' || i, 5, 0, 'cartons', 83.33, ARRAY['Style'], 'PENDING');
  END LOOP;

  -- Stop 1 (Load order 6): PENDING, 6 items pending
  v_stop := '22000000-0000-0000-0000-000000000001'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_220, 1, 6, 'OUT-MAHARA-06', 'Singer — Boralesgamuwa', 'Colombo District', 'Front Bay', 'PENDING', 'Dock C3', 30, 8, 500.00);
  FOR i IN 1..6 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (v_stop, v_trip_220, 'TRC220-S1-I' || i, 'Boralesgamuwa Tech ' || i, 5, 0, 'cartons', 83.33, ARRAY['Tech'], 'PENDING');
  END LOOP;

  UPDATE public.loading_confirmations
  SET status = 'LOADING', ready_at = NULL
  WHERE trip_id = v_trip_220;

  -- E. TRC-176: Ensure 4 stops, 24 items total: 10 checked, 14 pending (1890 kg loaded, 42% progress)
  DELETE FROM public.load_items WHERE trip_id = v_trip_176;
  DELETE FROM public.load_stops WHERE trip_id = v_trip_176;

  -- Stop 4 (Load order 1): LOADED, 10 items checked, 1890 kg
  v_stop := '17640000-0000-0000-0000-000000000004'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_176, 4, 1, 'OUT-NAWINNA-01', 'Arpico — Nawinna', 'Colombo District', 'Main Dock', 'LOADED', 'Main warehouse dock', 80, 25, 1890.00);
  FOR i IN 1..10 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at)
    VALUES (v_stop, v_trip_176, 'TRC176-S4-I' || i, 'Nawinna Fresh Food ' || i, 8, 8, 'crates', 189.00, ARRAY['Fresh', 'chilled'], 'CHECKED', NOW() - INTERVAL '15 minutes');
  END LOOP;

  -- Stop 3 (Load order 2): LOADING, 4 items pending
  v_stop := '17630000-0000-0000-0000-000000000003'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_176, 3, 2, 'OUT-KOHUWALA-01', 'Cargills — Kohuwala', 'Colombo District', 'Rear Dock', 'LOADING', 'Rear bay', 40, 10, 500.00);
  FOR i IN 1..4 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (v_stop, v_trip_176, 'TRC176-S3-I' || i, 'Kohuwala Ambient Pack ' || i, 5, 0, 'cartons', 125.00, ARRAY['ambient'], 'PENDING');
  END LOOP;

  -- Stop 2 (Load order 3): PENDING, 5 items pending
  v_stop := '17620000-0000-0000-0000-000000000002'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_176, 2, 3, 'OUT-DELKANDA-01', 'Keells — Delkanda', 'Colombo District', 'Side Alley', 'PENDING', 'Side dock', 40, 10, 500.00);
  FOR i IN 1..5 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (v_stop, v_trip_176, 'TRC176-S2-I' || i, 'Delkanda Canned Food ' || i, 5, 0, 'cartons', 100.00, ARRAY['ambient'], 'PENDING');
  END LOOP;

  -- Stop 1 (Load order 4): PENDING, 5 items pending
  v_stop := '17610000-0000-0000-0000-000000000001'::UUID;
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, dock_note, total_units, total_crates, total_weight_kg)
  VALUES (v_stop, v_trip_176, 1, 4, 'OUT-NUGEGODA-01', 'Laugfs — Nugegoda', 'Colombo District', 'Front Bay', 'PENDING', 'Front dock', 40, 10, 500.00);
  FOR i IN 1..5 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (v_stop, v_trip_176, 'TRC176-S1-I' || i, 'Nugegoda Grocery ' || i, 5, 0, 'cartons', 100.00, ARRAY['ambient'], 'PENDING');
  END LOOP;

  UPDATE public.loading_confirmations
  SET status = 'LOADING', ready_at = NULL
  WHERE trip_id = v_trip_176;

  -- F. Ensure Highland milk crates on WPT-204 is 384 kg (24 crates total)
  UPDATE public.load_items
  SET weight_kg = 384.00,
      expected_qty = 24,
      loaded_qty = 0,
      status = 'PENDING',
      checked_at = NULL,
      checked_by = NULL
  WHERE item_id = '20441000-0000-0000-0000-000000000001';

  -- Ensure sequence starts at 481 (so first shortfall gets SR-0482)
  PERFORM setval('public.issue_flag_ref_seq', 481, true);

END $$;
