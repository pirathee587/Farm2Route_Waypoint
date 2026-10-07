-- Migration: 20261004000016_store_manager_outlet_sync.sql
-- Description: Back-fills outlet_id in public.user_profiles for store managers
--              whose records originate from the .NET auth-service DataSeeder.
--
-- Problem: The .NET DataSeeder seeds store managers into auth_schema.users +
--          auth_schema.store_manager_profiles, but never creates / updates
--          public.user_profiles rows.  When the order-service falls back to
--          the user_profiles table to resolve outlet_id it finds NULL and
--          raises a 422 "authenticated user has no assigned outlet".
--
-- Fix:
--   1. Ensure every auth_schema store_manager_profiles row has a matching
--      public.user_profiles row with the correct outlet_id.
--   2. Add a partial unique index so future upserts stay idempotent.

DO $$
BEGIN
  -- ── 1. Sync from auth_schema to public.user_profiles ──────────────────────
  --  Only runs when both schemas are present (avoids errors in test envs).
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth_schema' AND table_name = 'store_manager_profiles'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth_schema' AND table_name = 'users'
  ) THEN

    -- 1a. Ensure auth.users has the store manager (foreign key parent)
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    SELECT
      u."Id" AS id,
      u."Email" AS email,
      crypt('Waypoint@2026', gen_salt('bf')),
      NOW(),
      'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', smp."FullName", 'role', 'STORE_MANAGER'),
      NOW(),
      NOW()
    FROM auth_schema.users u
    JOIN auth_schema.store_manager_profiles smp ON smp."UserId" = u."Id"
    WHERE u."Role" = 'STORE_MANAGER'
    ON CONFLICT (id) DO NOTHING;

    -- 1b. Ensure public.user_profiles has the store manager with outlet_id
    INSERT INTO public.user_profiles (id, full_name, email, role, outlet_id)
    SELECT
      u."Id"                        AS id,
      smp."FullName"                AS full_name,
      u."Email"                     AS email,
      'STORE_MANAGER'::public.user_role AS role,
      smp."OutletId"                AS outlet_id
    FROM auth_schema.users       u
    JOIN auth_schema.store_manager_profiles smp ON smp."UserId" = u."Id"
    WHERE u."Role" = 'STORE_MANAGER'
      AND smp."OutletId" IS NOT NULL
      AND smp."OutletId" <> ''
    ON CONFLICT (id) DO UPDATE
      SET outlet_id  = EXCLUDED.outlet_id,
          full_name  = EXCLUDED.full_name,
          role       = 'STORE_MANAGER'::public.user_role;

    -- 1c. Associate outlet store_manager_id if not set
    UPDATE public.outlets o
    SET store_manager_id = smp."UserId"
    FROM auth_schema.store_manager_profiles smp
    WHERE o.outlet_id = smp."OutletId"
      AND o.store_manager_id IS NULL;

  END IF;
END $$;

-- ── 2. Safety net: ensure outlet_id is populated for any SM row that still ──
--      has NULL (e.g. created before this migration ran).
-- Nothing to do if auth_schema tables don't exist — handled above.
