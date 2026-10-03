-- ═══════════════════════════════════════════════════════════════════════════
--  WAYPOINT SEED USERS SCRIPT
--  Run this script manually in Supabase SQL Editor or via psql to seed
--  development and demo login accounts in auth.users & public.user_profiles.
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
BEGIN

  -- ── 1. Loader: Kumar S. ───────────────────────────────────────────────────
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

  -- ── 2. Driver 1: Nimal Perera ─────────────────────────────────────────────
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

  -- ── 3. Additional Drivers ─────────────────────────────────────────────────
  INSERT INTO public.user_profiles (id, full_name, email, role, depot, phone)
  VALUES
    (v_driver_ruwan, 'Ruwan Jayasuriya', 'ruwan.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 345 6789'),
    (v_driver_fernando, 'S. Fernando', 'fernando.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 456 7890'),
    (v_driver_wickrama, 'A. Wickramasinghe', 'wickrama.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 567 8901'),
    (v_driver_rizwan, 'M. Rizwan', 'rizwan.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 678 9012'),
    (v_driver_tharindu, 'Tharindu Silva', 'tharindu.driver@waypoint.lk', 'DRIVER', 'DEPOT-01', '+94 77 789 0123')
  ON CONFLICT (id) DO NOTHING;

  -- ── 4. Senior Dispatcher ──────────────────────────────────────────────────
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

END $$;
