-- Route Planning must only offer vehicle IDs that exist in the authoritative
-- vehicle table. Complete the development fleet from the existing VEH014 row
-- so every dispatcher-selectable vehicle can be persisted and confirmed.
WITH fleet(vehicle_id, registration, weight_cap_kg, volume_cap_m3) AS (
  VALUES
    ('VEH016','WP-CAD-5589',4000::numeric,18::numeric),
    ('VEH018','WP-CAD-4456',4200::numeric,20::numeric),
    ('VEH021','WP-CAD-1109',5000::numeric,22::numeric),
    ('VEH022','WP-CAD-2234',3800::numeric,17::numeric),
    ('VEH027','WP-CAB-8810',5000::numeric,22::numeric),
    ('VEH028','WP-CBA-1045',3500::numeric,15::numeric),
    ('VEH033','WP-MAN-3221',1800::numeric,10::numeric),
    ('VEH035','WP-CAB-9912',1500::numeric, 8::numeric),
    ('VEH041','WP-CAB-9930',4800::numeric,18::numeric),
    ('VEH044','WP-CAD-7723',4000::numeric,18::numeric),
    ('VEH049','WP-CAB-4491',4500::numeric,20::numeric),
    ('VEH050','WP-CAB-5501',4000::numeric,18::numeric),
    ('VEH051','WP-MAN-6612',1800::numeric,10::numeric),
    ('VEH055','WP-CAB-8871',5200::numeric,24::numeric),
    ('VEH058','WP-CBA-3318',4200::numeric,19::numeric),
    ('VEH059','WP-CAD-0093',4800::numeric,21::numeric),
    ('VEH060','WP-CAB-2277',1500::numeric, 8::numeric),
    ('VEH062','WP-MAN-7745',1800::numeric,10::numeric),
    ('VEH064','WP-CBA-5509',4600::numeric,20::numeric)
)
INSERT INTO public.vehicles
  (vehicle_id,registration,type,weight_cap_kg,volume_cap_m3,temp_capability,
   depot,brand,driver_id,is_active,temp,fuel_type,km_per_l,weekly_fuel_quota_l)
SELECT f.vehicle_id,f.registration,b.type,f.weight_cap_kg,f.volume_cap_m3,
       b.temp_capability,b.depot,b.brand,NULL,TRUE,b.temp,b.fuel_type,b.km_per_l,
       b.weekly_fuel_quota_l
FROM fleet f
CROSS JOIN (SELECT * FROM public.vehicles WHERE vehicle_id='VEH014' LIMIT 1) b
ON CONFLICT (vehicle_id) DO UPDATE SET is_active=TRUE;
