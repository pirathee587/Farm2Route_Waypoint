ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS display_name text;

UPDATE public.vehicles
SET display_name = CASE
  WHEN type::text ILIKE '%van%' THEN 'Cargo Van ' || vehicle_id
  WHEN temp_capability::text NOT ILIKE '%ambient%' THEN 'Refrigerated Truck ' || vehicle_id
  ELSE 'Delivery Truck ' || vehicle_id
END
WHERE display_name IS NULL OR btrim(display_name) = '';
