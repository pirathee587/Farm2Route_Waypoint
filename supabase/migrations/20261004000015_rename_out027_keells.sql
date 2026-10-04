-- Keep the OUT027 display name consistent across the outlet master data and
-- the denormalized driver stop rows used by the route map.
UPDATE public.outlets
SET name = 'Keells - K-Zone Moratuwa',
    district = 'Moratuwa',
    address = 'K-Zone, 340, Lakshapathiya, Moratuwa 10400',
    lat = 6.7954545,
    lng = 79.8876526
WHERE outlet_id = 'OUT027';

UPDATE public.load_stops
SET outlet_name = 'Keells - K-Zone Moratuwa',
    district = 'Moratuwa',
    updated_at = NOW()
WHERE outlet_id = 'OUT027';

-- Route origin for VEH014. Without these values the API's numeric fallback is
-- 0,0, which draws the depot and route line off the west coast of Africa.
UPDATE public.vehicles
SET depot_lat = 6.9600000,
    depot_lng = 79.8780000
WHERE depot = 'Peliyagoda'
  AND (depot_lat IS NULL OR depot_lng IS NULL OR (depot_lat = 0 AND depot_lng = 0));
