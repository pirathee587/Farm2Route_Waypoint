-- Some shared environments already contain district_travel from an older
-- schema. CREATE TABLE IF NOT EXISTS in V7 intentionally preserves it, so
-- bring that table forward before referencing the projection columns below.
ALTER TABLE public.district_travel
  ADD COLUMN IF NOT EXISTS depot_to_district_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inter_stop_km NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Legacy versions of this shared reference table also have required numeric
-- travel-time columns. Keep their existing values and provide a neutral
-- default only for new distance rows inserted by this migration.
DO $$
DECLARE legacy_column RECORD;
BEGIN
  FOR legacy_column IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='district_travel'
      AND is_nullable='NO'
      AND column_default IS NULL
      AND data_type IN ('smallint','integer','bigint','numeric','real','double precision')
      AND column_name NOT IN ('depot_to_district_km','inter_stop_km')
  LOOP
    EXECUTE format('ALTER TABLE public.district_travel ALTER COLUMN %I SET DEFAULT 0',legacy_column.column_name);
  END LOOP;
END $$;

INSERT INTO public.district_travel(depot,district,depot_to_district_km,inter_stop_km) VALUES
 ('Peliyagoda','Colombo',14,4),
 ('Peliyagoda','Gampaha',24,6),
 ('Peliyagoda','Kandy',116,8),
 ('Kandy','Kandy',8,4),
 ('Kandy','Colombo',122,6),
 ('Kandy','Gampaha',108,7)
ON CONFLICT (depot,district) DO UPDATE SET
 depot_to_district_km=EXCLUDED.depot_to_district_km,
 inter_stop_km=EXCLUDED.inter_stop_km;

CREATE OR REPLACE FUNCTION public.record_completed_trip_fuel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  efficiency NUMERIC;
  base_km NUMERIC;
  between_km NUMERIC;
  stop_count INTEGER;
BEGIN
  IF NEW.status::text='COMPLETED' AND OLD.status::text IS DISTINCT FROM 'COMPLETED' THEN
    SELECT v.km_per_l,dt.depot_to_district_km,dt.inter_stop_km
      INTO efficiency,base_km,between_km
    FROM public.vehicles v
    JOIN public.trip_stops ts ON ts.trip_id=NEW.trip_id AND ts.stop_sequence=1
    JOIN public.outlets o ON o.outlet_id=ts.outlet_id
    LEFT JOIN public.district_travel dt ON dt.depot=v.depot AND dt.district=o.district
    WHERE v.vehicle_id=NEW.vehicle_id;
    SELECT COUNT(*) INTO stop_count FROM public.trip_stops WHERE trip_id=NEW.trip_id;
    IF efficiency>0 AND base_km IS NOT NULL THEN
      NEW.fuel_consumed_l=ROUND((base_km+between_km*GREATEST(stop_count-1,0))/efficiency,2);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_record_completed_trip_fuel ON public.trips;
CREATE TRIGGER trg_record_completed_trip_fuel
BEFORE UPDATE OF status ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.record_completed_trip_fuel();
