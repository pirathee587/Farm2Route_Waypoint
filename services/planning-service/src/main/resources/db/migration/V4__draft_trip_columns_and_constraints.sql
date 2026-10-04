ALTER TABLE public.trips ALTER COLUMN vehicle_id DROP NOT NULL;
ALTER TABLE public.trips ALTER COLUMN trip_number DROP NOT NULL;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS trip_code TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS home_depot TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS validation_snapshot JSONB;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_trips_trip_code ON public.trips(trip_code) WHERE trip_code IS NOT NULL;

DROP INDEX IF EXISTS public.uq_active_order_allocation;
DO $$
DECLARE duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT order_id
    FROM public.allocations
    WHERE status::text IN ('TENTATIVE','ALLOCATED')
    GROUP BY order_id HAVING COUNT(*) > 1
  ) duplicates;
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot create uq_active_order_allocation: % order(s) have duplicate active allocations. Review and resolve those planning records without deleting audit history, then rerun Flyway.', duplicate_count;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_order_allocation ON public.allocations(order_id)
WHERE status IN ('TENTATIVE'::public.allocation_status,'ALLOCATED'::public.allocation_status);

ALTER TABLE public.deferral_records ADD COLUMN IF NOT EXISTS operational_note TEXT;
ALTER TABLE public.deferral_records ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE public.deferral_records ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.deferral_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
