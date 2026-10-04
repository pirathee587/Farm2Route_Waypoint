-- Item tags remain item-specific; stop tags are derived from outlet reference data.
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS brand TEXT;

UPDATE public.outlets o SET brand=x.brand
FROM (
  SELECT s.outlet_id,CASE
    WHEN BOOL_OR('Fresh'=ANY(i.tags)) THEN 'Fresh'
    WHEN BOOL_OR('Style'=ANY(i.tags)) THEN 'Style'
    WHEN BOOL_OR('Tech'=ANY(i.tags)) THEN 'Tech'
    WHEN BOOL_OR('Appliance'=ANY(i.tags)) THEN 'Tech'
  END AS brand
  FROM public.load_stops s JOIN public.load_items i ON i.stop_id=s.stop_id
  GROUP BY s.outlet_id
) x
WHERE o.outlet_id=x.outlet_id AND x.brand IS NOT NULL;

UPDATE public.outlets SET brand=CASE outlet_id
  WHEN 'OUT-KEELLS-01' THEN 'Fresh'
  WHEN 'OUT-SINGER-01' THEN 'Tech'
  WHEN 'OUT-STYLEHUB-01' THEN 'Style'
  WHEN 'OUT-FRESHMART-01' THEN 'Fresh'
  ELSE brand
END
WHERE outlet_id IN ('OUT-KEELLS-01','OUT-SINGER-01','OUT-STYLEHUB-01','OUT-FRESHMART-01');

UPDATE public.load_items SET tags=CASE item_id
  WHEN '20441000-0000-0000-0000-000000000001' THEN ARRAY['Fresh','chilled']::TEXT[]
  WHEN '20441000-0000-0000-0000-000000000002' THEN ARRAY['Fresh','frozen']::TEXT[]
  WHEN '20441000-0000-0000-0000-000000000003' THEN ARRAY['Tech','fragile']::TEXT[]
  WHEN '20441000-0000-0000-0000-000000000004' THEN ARRAY['Style','ambient']::TEXT[]
  WHEN '20441000-0000-0000-0000-000000000005' THEN ARRAY['Fresh','chilled']::TEXT[]
  ELSE tags
END,
updated_at=NOW()
WHERE item_id IN (
  '20441000-0000-0000-0000-000000000001',
  '20441000-0000-0000-0000-000000000002',
  '20441000-0000-0000-0000-000000000003',
  '20441000-0000-0000-0000-000000000004',
  '20441000-0000-0000-0000-000000000005'
);

-- Collision-safe restoration of reverse delivery order for every active seeded trip.
UPDATE public.load_stops SET load_order=1000000+load_order;
WITH counts AS (
  SELECT trip_id,COUNT(*)::INT AS stop_count
  FROM public.load_stops WHERE removed_from_plan=FALSE GROUP BY trip_id
)
UPDATE public.load_stops s
SET load_order=c.stop_count-s.stop_no+1,updated_at=NOW()
FROM counts c
WHERE s.trip_id=c.trip_id AND s.removed_from_plan=FALSE;
