\set ON_ERROR_STOP on
\getenv store_manager_id PHASE8_STORE_MANAGER_ID
\getenv dispatcher_id PHASE8_DISPATCHER_ID
\getenv loader_id PHASE8_LOADER_ID
\getenv driver_id PHASE8_DRIVER_ID

BEGIN;

-- Application-owned rows only. Supabase identities are deleted afterward by
-- DELETE /auth/v1/admin/users/{id}; this file never modifies auth.users.
DELETE FROM auth_schema.users
WHERE "Id" IN (
  :'store_manager_id'::uuid,
  :'dispatcher_id'::uuid,
  :'loader_id'::uuid,
  :'driver_id'::uuid
);

DELETE FROM public.user_profiles
WHERE id IN (
  :'store_manager_id'::uuid,
  :'dispatcher_id'::uuid,
  :'loader_id'::uuid,
  :'driver_id'::uuid
);

COMMIT;
