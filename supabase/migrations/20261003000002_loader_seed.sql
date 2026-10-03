-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 006 — SEED DATA FOR LOADER WORKFLOW & TODAY'S LOADS
--  Service : Loading & Delivery Service
--  Seed    : Users (Kumar S., Drivers), Vehicles (TRC-204, TRC-189, etc.),
--            Outlets, Trip WPT-204 (Dock A5, 4 stops, 30 line items,
--            Keells stop with 5 items), 5 other trips for Today's Loads.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_loader_id UUID := '11111111-1111-1111-1111-111111111101';
  v_driver_nimal UUID := '22222222-2222-2222-2222-222222222201';
  v_driver_ruwan UUID := '22222222-2222-2222-2222-222222222202';
  v_driver_fernando UUID := '22222222-2222-2222-2222-222222222203';
  v_driver_wickrama UUID := '22222222-2222-2222-2222-222222222204';
  v_driver_rizwan UUID := '22222222-2222-2222-2222-222222222205';
  v_driver_tharindu UUID := '22222222-2222-2222-2222-222222222206';
  v_dispatcher_id UUID := '33333333-3333-3333-3333-333333333301';

  v_trip_204 UUID := '20400000-0000-0000-0000-000000000204';
  v_trip_189 UUID := '18900000-0000-0000-0000-000000000189';
  v_trip_211 UUID := '21100000-0000-0000-0000-000000000211';
  v_trip_176 UUID := '17600000-0000-0000-0000-000000000176';
  v_trip_198 UUID := '19800000-0000-0000-0000-000000000198';
  v_trip_220 UUID := '22000000-0000-0000-0000-000000000220';

  v_stop_wpt204_1 UUID := '20410000-0000-0000-0000-000000000001';
  v_stop_wpt204_2 UUID := '20420000-0000-0000-0000-000000000002';
  v_stop_wpt204_3 UUID := '20430000-0000-0000-0000-000000000003';
  v_stop_wpt204_4 UUID := '20440000-0000-0000-0000-000000000004';

  v_item_milk UUID := '20441000-0000-0000-0000-000000000001';
  v_item_frozen UUID := '20441000-0000-0000-0000-000000000002';
  v_item_countertop UUID := '20441000-0000-0000-0000-000000000003';
  v_item_apron UUID := '20441000-0000-0000-0000-000000000004';
  v_item_butter UUID := '20441000-0000-0000-0000-000000000005';
BEGIN

  -- ── 1. Seed Users (auth.users & public.user_profiles) ──────────────────────
  -- Loader: Kumar S.
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_loader_id) THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      v_loader_id, 'kumar.loader@waypoint.lk', crypt('Password@123', gen_salt('bf')),
      NOW(), 'authenticated', '{"provider":"email","providers":["email"]}',
      '{"full_name":"Kumar S.","role":"LOADER"}', NOW(), NOW()
    );
  END IF;

  INSERT INTO public.user_profiles (id, full_name, email, role, depot, phone)
  VALUES (v_loader_id, 'Kumar S.', 'kumar.loader@waypoint.lk', 'LOADER', 'DEPOT-01', '+94 77 123 4567')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  -- Driver 1: Nimal Perera
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_driver_nimal) THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      v_driver_nimal, 'nimal.driver@waypoint.lk', crypt('Password@123', gen_salt('bf')),
      NOW(), 'authenticated', '{"provider":"email","providers":["email"]}',
      '{"full_name":"Nimal Perera","role":"DRIVER"}', NOW(), NOW()
    );
  END IF;
  INSERT INTO public.user_profiles (id, full_name, email, role, depot, phone)
  VALUES (v_driver_nimal, 'Nimal Perera', 'nimal.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 234 5678')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  -- Other Drivers: Ruwan, S. Fernando, A. Wickramasinghe, M. Rizwan, Tharindu Silva
  INSERT INTO public.user_profiles (id, full_name, email, role, depot, phone)
  VALUES
    (v_driver_ruwan, 'Ruwan Jayasuriya', 'ruwan.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 345 6789'),
    (v_driver_fernando, 'S. Fernando', 'fernando.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 456 7890'),
    (v_driver_wickrama, 'A. Wickramasinghe', 'wickrama.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 567 8901'),
    (v_driver_rizwan, 'M. Rizwan', 'rizwan.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 678 9012'),
    (v_driver_tharindu, 'Tharindu Silva', 'tharindu.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 789 0123')
  ON CONFLICT (id) DO NOTHING;

  -- Dispatcher
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_dispatcher_id) THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (
      v_dispatcher_id, 'dispatcher@waypoint.lk', crypt('Password@123', gen_salt('bf')),
      NOW(), 'authenticated', '{"provider":"email","providers":["email"]}',
      '{"full_name":"Senior Dispatcher","role":"DISPATCHER"}', NOW(), NOW()
    );
  END IF;
  INSERT INTO public.user_profiles (id, full_name, email, role, depot)
  VALUES (v_dispatcher_id, 'Senior Dispatcher', 'dispatcher@waypoint.lk', 'DISPATCHER', 'DEPOT-01')
  ON CONFLICT (id) DO UPDATE SET role = 'DISPATCHER';

  -- ── 2. Seed Vehicles ───────────────────────────────────────────────────────
  INSERT INTO public.vehicles (vehicle_id, registration, type, weight_cap_kg, volume_cap_m3, temp_capability, depot, brand, driver_id)
  VALUES
    ('TRC-204', 'WP-TRC-204', 'TRUCK', 5000.00, 20.00, 'FROZEN',  'DEPOT-01', 'ISUZU', v_driver_nimal),
    ('TRC-189', 'WP-TRC-189', 'TRUCK', 4800.00, 18.00, 'CHILLED', 'DEPOT-01', 'MITSUBISHI', v_driver_ruwan),
    ('TRC-211', 'WP-TRC-211', 'TRUCK', 6000.00, 24.00, 'AMBIENT', 'DEPOT-01', 'HINO', v_driver_fernando),
    ('TRC-176', 'WP-TRC-176', 'TRUCK', 4500.00, 16.00, 'CHILLED', 'DEPOT-01', 'ISUZU', v_driver_wickrama),
    ('TRC-198', 'WP-TRC-198', 'TRUCK', 4000.00, 15.00, 'AMBIENT', 'DEPOT-01', 'TATA', v_driver_rizwan),
    ('TRC-220', 'WP-TRC-220', 'TRUCK', 5500.00, 22.00, 'FROZEN',  'DEPOT-01', 'ISUZU', v_driver_tharindu)
  ON CONFLICT (vehicle_id) DO UPDATE SET
    registration = EXCLUDED.registration,
    weight_cap_kg = EXCLUDED.weight_cap_kg,
    temp_capability = EXCLUDED.temp_capability;

  -- ── 3. Seed Outlets ────────────────────────────────────────────────────────
  INSERT INTO public.outlets (outlet_id, name, district, depot, parking_type, address, contact_name, contact_phone)
  VALUES
    ('OUT-KEELLS-01',   'Keells — Union Place',     'Colombo District', 'DEPOT-01', 'STANDARD',   '112 Union Place, Colombo 02', 'Mahesh Silva', '+94 11 234 5678'),
    ('OUT-SINGER-01',   'Singer — One Galle Face',  'Colombo District', 'DEPOT-01', 'STANDARD',   '1A Centre Road, Colombo 01', 'Kavinda Perera', '+94 11 345 6789'),
    ('OUT-STYLEHUB-01', 'StyleHub — Kollupitiya',   'Colombo District', 'DEPOT-01', 'STANDARD',   '45 Galle Road, Colombo 03', 'Anusha Dias', '+94 11 456 7890'),
    ('OUT-FRESHMART-01','FreshMart — Dematagoda',   'Colombo District', 'DEPOT-01', 'STANDARD',   '89 Baseline Road, Colombo 09', 'Roshan Gamage', '+94 11 567 8901'),
    ('OUT-NEGOMBO-01',  'Keells — Negombo Road',    'Gampaha District', 'DEPOT-01', 'STANDARD',   '12 Negombo Rd, Peliyagoda', 'Sunil Jayawardena', '+94 31 222 3344'),
    ('OUT-WATTALA-01',  'Cargills — Wattala',       'Gampaha District', 'DEPOT-01', 'STANDARD',   '210 Negombo Rd, Wattala', 'Praveen Fernando', '+94 11 987 6543'),
    ('OUT-NUGEGODA-01', 'Laugfs — Nugegoda',        'Colombo District', 'DEPOT-01', 'STANDARD',   '55 Stanley Thilakarathne Mawatha', 'Chaminda Bandara', '+94 11 876 5432'),
    ('OUT-KIRIBATH-01', 'Arpico — Kiribathgoda',    'Gampaha District', 'DEPOT-01', 'STANDARD',   '18 Kandy Road, Kiribathgoda', 'Dinesh Kumara', '+94 11 765 4321'),
    ('OUT-MAHARA-01',   'Food City — Maharagama',   'Colombo District', 'DEPOT-01', 'STANDARD',   '94 High Level Road, Maharagama', 'Nuwan Pradeep', '+94 11 654 3210')
  ON CONFLICT (outlet_id) DO UPDATE SET name = EXCLUDED.name, district = EXCLUDED.district;

  -- ── 4. Seed Trips (Trips table) ────────────────────────────────────────────
  -- Trip WPT-204 (Dock A5, TRC-204, Driver Nimal, 4 stops, 3400 kg loaded / 5000 kg cap)
  INSERT INTO public.trips (trip_id, vehicle_id, driver_id, trip_number, delivery_date, status, stop_sequence, total_weight_kg, total_volume_m3)
  VALUES (
    v_trip_204, 'TRC-204', v_driver_nimal, 1, CURRENT_DATE, 'LOADING',
    ARRAY['OUT-FRESHMART-01', 'OUT-STYLEHUB-01', 'OUT-SINGER-01', 'OUT-KEELLS-01'],
    3400.00, 14.50
  )
  ON CONFLICT (trip_id) DO UPDATE SET
    vehicle_id = EXCLUDED.vehicle_id,
    driver_id = EXCLUDED.driver_id,
    status = EXCLUDED.status,
    total_weight_kg = EXCLUDED.total_weight_kg;

  -- 5 Other Trips for Today's Loads:
  -- Trip 2: TRC-189 (Dock B2, 4760/4800 kg, Ready / 100%)
  INSERT INTO public.trips (trip_id, vehicle_id, driver_id, trip_number, delivery_date, status, stop_sequence, total_weight_kg, total_volume_m3)
  VALUES (v_trip_189, 'TRC-189', v_driver_ruwan, 1, CURRENT_DATE, 'LOADING', ARRAY['OUT-NEGOMBO-01'], 4760.00, 17.20)
  ON CONFLICT (trip_id) DO UPDATE SET total_weight_kg = EXCLUDED.total_weight_kg;

  -- Trip 3: TRC-211 (Dock C1, 0/6000 kg, Not Started / 0%)
  INSERT INTO public.trips (trip_id, vehicle_id, driver_id, trip_number, delivery_date, status, stop_sequence, total_weight_kg, total_volume_m3)
  VALUES (v_trip_211, 'TRC-211', v_driver_fernando, 1, CURRENT_DATE, 'PLANNED', ARRAY['OUT-WATTALA-01'], 0.00, 0.00)
  ON CONFLICT (trip_id) DO UPDATE SET total_weight_kg = EXCLUDED.total_weight_kg;

  -- Trip 4: TRC-176 (Dock A2, 1890/4500 kg, Issue / 42%)
  INSERT INTO public.trips (trip_id, vehicle_id, driver_id, trip_number, delivery_date, status, stop_sequence, total_weight_kg, total_volume_m3)
  VALUES (v_trip_176, 'TRC-176', v_driver_wickrama, 1, CURRENT_DATE, 'LOADING', ARRAY['OUT-NUGEGODA-01'], 1890.00, 7.80)
  ON CONFLICT (trip_id) DO UPDATE SET total_weight_kg = EXCLUDED.total_weight_kg;

  -- Trip 5: TRC-198 (Dock B4, 3940/4000 kg, Ready / 100%)
  INSERT INTO public.trips (trip_id, vehicle_id, driver_id, trip_number, delivery_date, status, stop_sequence, total_weight_kg, total_volume_m3)
  VALUES (v_trip_198, 'TRC-198', v_driver_rizwan, 1, CURRENT_DATE, 'LOADING', ARRAY['OUT-KIRIBATH-01'], 3940.00, 14.80)
  ON CONFLICT (trip_id) DO UPDATE SET total_weight_kg = EXCLUDED.total_weight_kg;

  -- Trip 6: TRC-220 (Dock C3, 1720/5500 kg, Loading / 31%)
  INSERT INTO public.trips (trip_id, vehicle_id, driver_id, trip_number, delivery_date, status, stop_sequence, total_weight_kg, total_volume_m3)
  VALUES (v_trip_220, 'TRC-220', v_driver_tharindu, 1, CURRENT_DATE, 'LOADING', ARRAY['OUT-MAHARA-01'], 1720.00, 6.90)
  ON CONFLICT (trip_id) DO UPDATE SET total_weight_kg = EXCLUDED.total_weight_kg;

  -- ── 5. Seed Loading Confirmations (Load Sessions per trip) ─────────────────
  -- WPT-204 (Dock A5, Loading, revision 1)
  INSERT INTO public.loading_confirmations (trip_id, loader_id, status, dock, plan_revision, version)
  VALUES (v_trip_204, v_loader_id, 'LOADING', 'Dock A5', 1, 0)
  ON CONFLICT (trip_id) DO UPDATE SET dock = EXCLUDED.dock, status = EXCLUDED.status;

  -- TRC-189 (Dock B2, Ready / LOADED)
  INSERT INTO public.loading_confirmations (trip_id, loader_id, status, dock, plan_revision, ready_at, ready_by, version)
  VALUES (v_trip_189, v_loader_id, 'LOADED', 'Dock B2', 1, NOW() - INTERVAL '15 minutes', v_loader_id, 0)
  ON CONFLICT (trip_id) DO UPDATE SET dock = EXCLUDED.dock, status = EXCLUDED.status, ready_at = EXCLUDED.ready_at;

  -- TRC-211 (Dock C1, Not Started / PENDING)
  INSERT INTO public.loading_confirmations (trip_id, loader_id, status, dock, plan_revision, version)
  VALUES (v_trip_211, v_loader_id, 'PENDING', 'Dock C1', 1, 0)
  ON CONFLICT (trip_id) DO UPDATE SET dock = EXCLUDED.dock, status = EXCLUDED.status;

  -- TRC-176 (Dock A2, Loading with open issue)
  INSERT INTO public.loading_confirmations (trip_id, loader_id, status, dock, plan_revision, version)
  VALUES (v_trip_176, v_loader_id, 'LOADING', 'Dock A2', 1, 0)
  ON CONFLICT (trip_id) DO UPDATE SET dock = EXCLUDED.dock, status = EXCLUDED.status;

  -- TRC-198 (Dock B4, Ready / LOADED)
  INSERT INTO public.loading_confirmations (trip_id, loader_id, status, dock, plan_revision, ready_at, ready_by, version)
  VALUES (v_trip_198, v_loader_id, 'LOADED', 'Dock B4', 1, NOW() - INTERVAL '25 minutes', v_loader_id, 0)
  ON CONFLICT (trip_id) DO UPDATE SET dock = EXCLUDED.dock, status = EXCLUDED.status, ready_at = EXCLUDED.ready_at;

  -- TRC-220 (Dock C3, Loading / 31%)
  INSERT INTO public.loading_confirmations (trip_id, loader_id, status, dock, plan_revision, version)
  VALUES (v_trip_220, v_loader_id, 'LOADING', 'Dock C3', 1, 0)
  ON CONFLICT (trip_id) DO UPDATE SET dock = EXCLUDED.dock, status = EXCLUDED.status;

  -- ── 6. Seed Load Stops for WPT-204 ─────────────────────────────────────────
  -- Rule: load_order is REVERSE of stop_no (delivery sequence)
  -- Total 4 stops:
  -- Stop 1 (Delivery Drop 1) -> load_order 4 (Loaded last, near door)
  -- Stop 2 (Delivery Drop 2) -> load_order 3
  -- Stop 3 (Delivery Drop 3) -> load_order 2
  -- Stop 4 (Delivery Drop 4) -> load_order 1 (Loaded first, front of truck)

  -- Stop 1: FreshMart — Dematagoda
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, total_items, loaded_items, total_weight_kg)
  VALUES (v_stop_wpt204_1, v_trip_204, 1, 4, 'OUT-FRESHMART-01', 'FreshMart — Dematagoda', 'Colombo District', 'Front Bay 1', 'PENDING', 'Curb / street', 8, 0, 750.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, status = EXCLUDED.status;

  -- Stop 2: StyleHub — Kollupitiya
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, total_items, loaded_items, total_weight_kg)
  VALUES (v_stop_wpt204_2, v_trip_204, 2, 3, 'OUT-STYLEHUB-01', 'StyleHub — Kollupitiya', 'Colombo District', 'Side Alley Dock', 'PENDING', 'van_only', 8, 4, 820.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, status = EXCLUDED.status;

  -- Stop 3: Singer — One Galle Face
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, total_items, loaded_items, total_weight_kg)
  VALUES (v_stop_wpt204_3, v_trip_204, 3, 2, 'OUT-SINGER-01', 'Singer — One Galle Face', 'Colombo District', 'Basement Loading Dock B', 'LOADING', 'Shared mall bay', 9, 7, 1150.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, status = EXCLUDED.status;

  -- Stop 4: Keells — Union Place (5 items, 680 kg, loaded first into front of truck)
  INSERT INTO public.load_stops (stop_id, trip_id, stop_no, load_order, outlet_id, outlet_name, district, bay_info, status, tag, total_items, loaded_items, total_weight_kg)
  VALUES (v_stop_wpt204_4, v_trip_204, 4, 1, 'OUT-KEELLS-01', 'Keells — Union Place', 'Colombo District', 'Rear loading bay', 'LOADING', 'Rear dock', 5, 4, 680.00)
  ON CONFLICT (trip_id, stop_no) DO UPDATE SET load_order = EXCLUDED.load_order, status = EXCLUDED.status;

  -- ── 7. Seed Load Items for WPT-204 Keells Stop (Stop 4) ────────────────────
  -- Total 5 items for Keells stop (4 checked, 1 issue with short-shipped milk crates):
  -- Item 1: Highland full cream milk crates (24 crates, 2 short-shipped)
  INSERT INTO public.load_items (item_id, stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at, checked_by)
  VALUES (v_item_milk, v_stop_wpt204_4, v_trip_204, 'FRE-HL-0018', 'Highland full cream milk crates', 24, 22, 'crates', 384.00, ARRAY['Fresh', 'chilled'], 'ISSUE', NOW() - INTERVAL '45 minutes', v_loader_id)
  ON CONFLICT (item_id) DO UPDATE SET status = EXCLUDED.status, loaded_qty = EXCLUDED.loaded_qty;

  -- Item 2: Elephant House frozen packs (12 cartons)
  INSERT INTO public.load_items (item_id, stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at, checked_by)
  VALUES (v_item_frozen, v_stop_wpt204_4, v_trip_204, 'FRE-EH-0431', 'Elephant House frozen packs', 12, 12, 'cartons', 144.00, ARRAY['Fresh', 'frozen'], 'CHECKED', NOW() - INTERVAL '40 minutes', v_loader_id)
  ON CONFLICT (item_id) DO UPDATE SET status = EXCLUDED.status, loaded_qty = EXCLUDED.loaded_qty;

  -- Item 3: Abans countertop display unit (2 units)
  INSERT INTO public.load_items (item_id, stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at, checked_by)
  VALUES (v_item_countertop, v_stop_wpt204_4, v_trip_204, 'TEC-AB-2094', 'Abans countertop display unit', 2, 2, 'units', 30.00, ARRAY['Tech', 'fragile'], 'CHECKED', NOW() - INTERVAL '35 minutes', v_loader_id)
  ON CONFLICT (item_id) DO UPDATE SET status = EXCLUDED.status, loaded_qty = EXCLUDED.loaded_qty;

  -- Item 4: Linen House service aprons (18 packs)
  INSERT INTO public.load_items (item_id, stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at, checked_by)
  VALUES (v_item_apron, v_stop_wpt204_4, v_trip_204, 'STY-LH-1102', 'Linen House service aprons', 18, 18, 'packs', 18.00, ARRAY['Style', 'ambient'], 'CHECKED', NOW() - INTERVAL '30 minutes', v_loader_id)
  ON CONFLICT (item_id) DO UPDATE SET status = EXCLUDED.status, loaded_qty = EXCLUDED.loaded_qty;

  -- Item 5: Anchor butter cartons (36 cartons)
  INSERT INTO public.load_items (item_id, stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status, checked_at, checked_by)
  VALUES (v_item_butter, v_stop_wpt204_4, v_trip_204, 'FRE-AN-0013', 'Anchor butter cartons', 36, 36, 'cartons', 104.00, ARRAY['Fresh', 'chilled'], 'CHECKED', NOW() - INTERVAL '25 minutes', v_loader_id)
  ON CONFLICT (item_id) DO UPDATE SET status = EXCLUDED.status, loaded_qty = EXCLUDED.loaded_qty;

  -- ── 8. Seed Remaining 25 Items across other 3 stops (Total = 30 line items) ─
  -- Stop 3 (Singer - 9 items)
  FOR i IN 1..9 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (
      v_stop_wpt204_3, v_trip_204,
      'SNG-00' || i, 'Singer Appliance Component Pack ' || i,
      10 + i, 10 + i, 'boxes', 120.00, ARRAY['Appliance'], 'CHECKED'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Stop 2 (StyleHub - 8 items)
  FOR i IN 1..8 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (
      v_stop_wpt204_2, v_trip_204,
      'STY-00' || i, 'StyleHub Apparel Bundle ' || i,
      15 + i, CASE WHEN i <= 4 THEN 15 + i ELSE 0 END, 'cartons', 100.00, ARRAY['Apparel'],
      CASE WHEN i <= 4 THEN 'CHECKED' ELSE 'PENDING' END
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Stop 1 (FreshMart - 8 items)
  FOR i IN 1..8 LOOP
    INSERT INTO public.load_items (stop_id, trip_id, sku, name, expected_qty, loaded_qty, unit, weight_kg, tags, status)
    VALUES (
      v_stop_wpt204_1, v_trip_204,
      'FSH-00' || i, 'Fresh Produce Pack ' || i,
      20 + i, 0, 'crates', 90.00, ARRAY['Fresh'], 'PENDING'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ── 9. Seed Issue Flags ───────────────────────────────────────────────────
  -- WPT-204 Keells stop shortage (ref: SR-0482)
  INSERT INTO public.issue_flags (
    trip_id, flagged_by, issue_type, ref, stop_id, item_id,
    qty_affected, reason, description, weight_delta_kg, dispatcher_notified_at, resolved
  )
  VALUES (
    v_trip_204, v_loader_id, 'SHORTAGE', 'SR-0482', v_stop_wpt204_4, v_item_milk,
    2, 'SHORT_SHIPPED',
    'Only 22 crates were staged at Dock A5. Seal was intact; verified count with floor supervisor.',
    32.00, NOW() - INTERVAL '1 hour', FALSE
  )
  ON CONFLICT (ref) DO UPDATE SET
    qty_affected = EXCLUDED.qty_affected,
    reason = EXCLUDED.reason,
    description = EXCLUDED.description;

  -- TRC-176 Issue Flag (causing 'Issue' derived status)
  INSERT INTO public.issue_flags (
    trip_id, flagged_by, issue_type, ref, qty_affected, reason, description, resolved
  )
  VALUES (
    v_trip_176, v_loader_id, 'DAMAGE', 'SR-0176', 4, 'DAMAGED',
    'Pallet compromised during forklift staging; leaking packaging.', FALSE
  )
  ON CONFLICT (ref) DO NOTHING;

  -- ── 10. Seed Activity Log for WPT-204 ──────────────────────────────────────
  INSERT INTO public.load_activity_log (trip_id, event_type, title, description, icon_type, logged_at, created_by)
  VALUES
    (v_trip_204, 'START', 'Loading started', 'TRC-204 assigned to Dock A5', 'play', NOW() - INTERVAL '4 hours', v_loader_id),
    (v_trip_204, 'STOP_OPENED', 'Stop 4 loading opened', 'Keells — Union Place · load order 1', 'package', NOW() - INTERVAL '3 hours 18 minutes', v_loader_id),
    (v_trip_204, 'SHORTFALL', 'Shortfall reported', 'Highland milk crates · 2 crates short-shipped', 'alert', NOW() - INTERVAL '1 hour 4 minutes', v_loader_id),
    (v_trip_204, 'STOP_CONFIRMED', 'Stop 4 confirmed loaded', 'Issue attached to dispatch manifest', 'check', NOW() - INTERVAL '48 minutes', v_loader_id),
    (v_trip_204, 'STOPS_COMPLETED', 'All stops completed', '4 of 4 stop checklists confirmed', 'list', NOW() - INTERVAL '26 minutes', v_loader_id),
    (v_trip_204, 'CONFIRMATION', 'Loading confirmation recorded', 'Kumar S. completed the final vehicle check', 'user', NOW() - INTERVAL '16 minutes', v_loader_id)
  ON CONFLICT DO NOTHING;

  -- ── 11. Seed Plan Changes ──────────────────────────────────────────────────
  INSERT INTO public.plan_changes (trip_id, revision, summary, details, acknowledged, acknowledged_at, acknowledged_by)
  VALUES (
    v_trip_204, 2, 'Plan Updated — stop sequence has changed',
    '{"reason": "Traffic re-route around Galle Road", "changed_stops": ["OUT-KEELLS-01"]}',
    FALSE, NULL, NULL
  )
  ON CONFLICT DO NOTHING;

END $$;
