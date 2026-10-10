-- A clean, consistently numbered vehicle set for dispatcher planning.
-- TRC-000 is deliberately unallocated and sized for the largest current
-- Peliyagoda Fresh order, so at least one genuine option passes validation.
INSERT INTO public.vehicles
  (vehicle_id,registration,type,weight_cap_kg,volume_cap_m3,temp_capability,depot,brand,driver_id,is_active,display_name)
VALUES
  ('TRC-000','WP-TRC-000','truck',12000,65,'CHILLED','Peliyagoda','fresh',NULL,TRUE,'Fresh Multi-temperature Truck TRC-000'),
  ('VEH-000','WP-VEH-000','van',2500,14,'CHILLED','Peliyagoda','fresh',NULL,TRUE,'Fresh Delivery Van VEH-000'),
  ('KDY-000','CP-KDY-000','truck',12000,65,'CHILLED','Kandy','fresh',NULL,TRUE,'Kandy Multi-temperature Truck KDY-000')
ON CONFLICT (vehicle_id) DO UPDATE SET
  registration=EXCLUDED.registration,
  weight_cap_kg=EXCLUDED.weight_cap_kg,
  volume_cap_m3=EXCLUDED.volume_cap_m3,
  temp_capability=EXCLUDED.temp_capability,
  depot=EXCLUDED.depot,
  brand=EXCLUDED.brand,
  driver_id=NULL,
  is_active=TRUE,
  display_name=EXCLUDED.display_name;

INSERT INTO public.vehicle_planning_state(vehicle_id,available,weekly_fuel_quota_l,weekly_fuel_used_l)
VALUES ('TRC-000',TRUE,500,0),('VEH-000',TRUE,300,0),('KDY-000',TRUE,500,0)
ON CONFLICT (vehicle_id) DO UPDATE SET available=TRUE,weekly_fuel_used_l=0;

