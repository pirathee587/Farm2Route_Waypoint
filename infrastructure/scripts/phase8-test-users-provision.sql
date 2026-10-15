\set ON_ERROR_STOP on
\getenv test_password TEST_USER_PASSWORD
\getenv store_manager_id PHASE8_STORE_MANAGER_ID
\getenv dispatcher_id PHASE8_DISPATCHER_ID
\getenv loader_id PHASE8_LOADER_ID
\getenv driver_id PHASE8_DRIVER_ID
\getenv store_manager_email PHASE8_STORE_MANAGER_EMAIL
\getenv dispatcher_email PHASE8_DISPATCHER_EMAIL
\getenv loader_email PHASE8_LOADER_EMAIL
\getenv driver_email PHASE8_DRIVER_EMAIL
\getenv outlet_id PHASE8_OUTLET_ID
\getenv vehicle_id PHASE8_VEHICLE_ID
\getenv depot PHASE8_DEPOT

BEGIN;

-- Supabase auth.users rows already exist through POST /auth/v1/admin/users.
-- These rows support the application's separate .NET login implementation.
INSERT INTO auth_schema.users
  ("Id", "Email", "PasswordHash", "Role", "Status", "CreatedAt", "UpdatedAt")
VALUES
  (:'store_manager_id'::uuid, lower(:'store_manager_email'), crypt(:'test_password', gen_salt('bf', 12)), 'STORE_MANAGER', 'active', now(), now()),
  (:'dispatcher_id'::uuid, lower(:'dispatcher_email'), crypt(:'test_password', gen_salt('bf', 12)), 'DISPATCHER', 'active', now(), now()),
  (:'loader_id'::uuid, lower(:'loader_email'), crypt(:'test_password', gen_salt('bf', 12)), 'LOADER', 'active', now(), now()),
  (:'driver_id'::uuid, lower(:'driver_email'), crypt(:'test_password', gen_salt('bf', 12)), 'DRIVER', 'active', now(), now())
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO auth_schema.store_manager_profiles
  ("Id", "UserId", "FullName", "OutletId", "EmployeeId", "CreatedAt")
VALUES (gen_random_uuid(), :'store_manager_id'::uuid, 'Phase 8 Store Manager', :'outlet_id', 'P8-SM-001', now());

INSERT INTO auth_schema.dispatcher_profiles
  ("Id", "UserId", "FullName", "Depot", "EmployeeId", "CreatedAt")
VALUES (gen_random_uuid(), :'dispatcher_id'::uuid, 'Phase 8 Dispatcher', :'depot', 'P8-DSP-001', now());

INSERT INTO auth_schema.loader_profiles
  ("Id", "UserId", "FullName", "Depot", "EmployeeId", "CreatedAt")
VALUES (gen_random_uuid(), :'loader_id'::uuid, 'Phase 8 Loader', :'depot', 'P8-LDR-001', now());

INSERT INTO auth_schema.driver_profiles
  ("Id", "UserId", "FullName", "VehicleId", "LicenseNumber", "Depot", "EmployeeId", "CreatedAt")
VALUES (gen_random_uuid(), :'driver_id'::uuid, 'Phase 8 Driver', :'vehicle_id', 'P8-LIC-001', :'depot', 'P8-DRV-001', now());

-- The Admin API trigger creates these rows. Update only application metadata.
UPDATE public.user_profiles
SET full_name = 'Phase 8 Store Manager', role = 'STORE_MANAGER', outlet_id = :'outlet_id', depot = NULL, is_active = true
WHERE id = :'store_manager_id'::uuid;
UPDATE public.user_profiles
SET full_name = 'Phase 8 Dispatcher', role = 'DISPATCHER', outlet_id = NULL, depot = :'depot', is_active = true
WHERE id = :'dispatcher_id'::uuid;
UPDATE public.user_profiles
SET full_name = 'Phase 8 Loader', role = 'LOADER', outlet_id = NULL, depot = :'depot', is_active = true
WHERE id = :'loader_id'::uuid;
UPDATE public.user_profiles
SET full_name = 'Phase 8 Driver', role = 'DRIVER', outlet_id = NULL, depot = :'depot', driver_code = 'P8-DRV-001', is_active = true
WHERE id = :'driver_id'::uuid;

-- Force the transaction to fail if the Admin API trigger did not create all
-- four public profiles. The denominator is zero unless the count is exactly 4.
SELECT 1 / CASE WHEN count(*) = 4 THEN 1 ELSE 0 END AS four_profiles_present
FROM public.user_profiles
WHERE id IN (
  :'store_manager_id'::uuid,
  :'dispatcher_id'::uuid,
  :'loader_id'::uuid,
  :'driver_id'::uuid
);

COMMIT;
