ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS fuel_consumed_l NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.district_travel (
  depot TEXT NOT NULL,
  district TEXT NOT NULL,
  depot_to_district_km NUMERIC(10,2) NOT NULL CHECK (depot_to_district_km >= 0),
  inter_stop_km NUMERIC(10,2) NOT NULL CHECK (inter_stop_km >= 0),
  PRIMARY KEY (depot, district)
);
