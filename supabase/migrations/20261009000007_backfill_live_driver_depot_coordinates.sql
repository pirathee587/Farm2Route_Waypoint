-- New vehicles created after the original route-map migration must inherit the
-- real coordinates of their assigned depot. This keeps Driver routing away
-- from the invalid 0,0 coordinate and allows Mapbox to return road geometry.
UPDATE public.vehicles
SET depot_lat = 6.9600000,
    depot_lng = 79.8780000,
    updated_at = NOW()
WHERE LOWER(depot) IN ('peliyagoda', 'depot-01')
  AND (depot_lat IS NULL OR depot_lng IS NULL OR (depot_lat = 0 AND depot_lng = 0));

UPDATE public.vehicles
SET depot_lat = 7.2906000,
    depot_lng = 80.6337000,
    updated_at = NOW()
WHERE LOWER(depot) LIKE '%kandy%'
  AND (depot_lat IS NULL OR depot_lng IS NULL OR (depot_lat = 0 AND depot_lng = 0));
