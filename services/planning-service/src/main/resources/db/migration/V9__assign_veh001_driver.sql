-- VEH001 was selectable by dispatch but had no authoritative driver, which
-- made confirmed loads invisible to every driver's own-trip portal.
DO $$
DECLARE assigned_driver UUID := '22222222-2222-2222-2222-222222222214';
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id=assigned_driver AND role::text='DRIVER') THEN
    UPDATE public.vehicles SET driver_id=assigned_driver
    WHERE vehicle_id='VEH001' AND driver_id IS NULL;

    UPDATE public.trips SET driver_id=assigned_driver,updated_at=NOW()
    WHERE vehicle_id='VEH001' AND driver_id IS NULL
      AND status::text NOT IN ('COMPLETED','CANCELLED');
  END IF;
END $$;
