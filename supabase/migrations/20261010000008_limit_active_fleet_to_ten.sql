UPDATE public.vehicles SET is_active = vehicle_id IN
  ('KDY-000','TRC-000','VEH-000','VEH001','VEH002','VEH003','VEH004','VEH005','VEH006','VEH014');

INSERT INTO public.vehicle_planning_state(vehicle_id,available,updated_at)
SELECT vehicle_id, vehicle_id NOT IN ('KDY-000','TRC-000','VEH014'), NOW()
FROM public.vehicles
WHERE vehicle_id IN ('KDY-000','TRC-000','VEH-000','VEH001','VEH002','VEH003','VEH004','VEH005','VEH006','VEH014')
ON CONFLICT(vehicle_id) DO UPDATE SET available=EXCLUDED.available,updated_at=EXCLUDED.updated_at;
