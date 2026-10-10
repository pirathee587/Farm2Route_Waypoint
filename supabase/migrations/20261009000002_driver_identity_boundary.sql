-- Driver identities are owned by auth-service and may live in either the
-- current or legacy auth schema. Do not couple planning rows to one store.
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;
