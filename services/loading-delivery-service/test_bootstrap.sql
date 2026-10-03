-- ═══════════════════════════════════════════════════════════════════════════
-- Test Bootstrap for Standalone PostgreSQL (mocks Supabase auth schema & roles)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  role TEXT DEFAULT 'authenticated',
  raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT '11111111-1111-1111-1111-111111111101'::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
  SELECT 'authenticated';
$$ LANGUAGE sql STABLE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END $$;

-- Pre-seed auth.users so foreign key references in user_profiles and trips succeed
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111101', 'kumar.loader@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Kumar S.","role":"LOADER"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222201', 'nimal.driver@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Nimal Perera","role":"DRIVER"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222202', 'ruwan.driver@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Ruwan Jayasuriya","role":"DRIVER"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222203', 'fernando.driver@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"S. Fernando","role":"DRIVER"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222204', 'wickrama.driver@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"A. Wickramasinghe","role":"DRIVER"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222205', 'rizwan.driver@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"M. Rizwan","role":"DRIVER"}', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222206', 'tharindu.driver@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Tharindu Silva","role":"DRIVER"}', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333301', 'dispatcher@waypoint.lk', crypt('Password@123', gen_salt('bf')), NOW(), 'authenticated', '{"provider":"email","providers":["email"]}', '{"full_name":"Senior Dispatcher","role":"DISPATCHER"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
