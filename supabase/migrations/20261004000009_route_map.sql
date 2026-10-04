-- Synthetic demo coordinates; not suitable for production navigation accuracy.
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS depot_lat NUMERIC(10,7), ADD COLUMN IF NOT EXISTS depot_lng NUMERIC(10,7);
UPDATE public.vehicles SET depot_lat=6.9600,depot_lng=79.8780 WHERE depot='Peliyagoda' AND (depot_lat IS NULL OR depot_lng IS NULL);

UPDATE public.outlets SET lat=v.lat,lng=v.lng FROM (VALUES
 ('OUT001',6.9271::numeric,79.8612::numeric),('OUT014',6.9147,79.8778),('OUT027',7.2906,80.6337),('OUT032',6.9350,79.8500),
 ('OUT041',6.9490,79.9000),('OUT052',7.0840,79.9980),('OUT063',6.9900,79.9300),('OUT078',7.0500,80.0200)
) AS v(id,lat,lng) WHERE outlets.outlet_id=v.id AND (outlets.lat IS NULL OR outlets.lng IS NULL);

CREATE TABLE IF NOT EXISTS public.traffic_speed (
  observed_hour SMALLINT PRIMARY KEY CHECK(observed_hour BETWEEN 0 AND 23), speed_index NUMERIC(5,3) NOT NULL CHECK(speed_index>0), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.traffic_speed(observed_hour,speed_index) SELECT h,1.0 FROM generate_series(0,23) h ON CONFLICT(observed_hour) DO NOTHING;
