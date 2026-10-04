ALTER TABLE public.driver_sessions
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS accuracy_meters NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS heading NUMERIC(7, 2),
  ADD COLUMN IF NOT EXISTS speed_meters_per_sec NUMERIC(10, 2);

ALTER TABLE public.driver_sessions
  DROP CONSTRAINT IF EXISTS driver_sessions_latitude_check;
ALTER TABLE public.driver_sessions
  ADD CONSTRAINT driver_sessions_latitude_check CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);

ALTER TABLE public.driver_sessions
  DROP CONSTRAINT IF EXISTS driver_sessions_longitude_check;
ALTER TABLE public.driver_sessions
  ADD CONSTRAINT driver_sessions_longitude_check CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
