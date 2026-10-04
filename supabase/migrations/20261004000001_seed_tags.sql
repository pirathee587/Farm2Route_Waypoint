-- Loading seed fidelity: tags remain item-owned and stop tags are derived at read time.
UPDATE public.outlets
SET parking_constraint = CASE outlet_id
  WHEN 'OUT-FRESHMART-01' THEN 'van_only'
  WHEN 'OUT-STYLEHUB-01' THEN NULL
  ELSE parking_constraint
END
WHERE outlet_id IN ('OUT-FRESHMART-01', 'OUT-STYLEHUB-01');

UPDATE public.load_items i
SET tags = CASE s.stop_no
  WHEN 4 THEN ARRAY['Fresh', 'chilled', 'reefer']::TEXT[]
  WHEN 3 THEN ARRAY['Tech', 'fragile']::TEXT[]
  WHEN 2 THEN ARRAY['Style', 'ambient']::TEXT[]
  WHEN 1 THEN ARRAY['Fresh', 'chilled']::TEXT[]
END,
updated_at = NOW()
FROM public.load_stops s
WHERE i.stop_id = s.stop_id
  AND s.trip_id = '20400000-0000-0000-0000-000000000204';

UPDATE public.load_stops
SET load_order = 100000 + load_order
WHERE trip_id = '20400000-0000-0000-0000-000000000204';

UPDATE public.load_stops
SET load_order = 5 - stop_no,
    status = CASE WHEN stop_no = 4 THEN 'LOADING' ELSE 'LOADED' END,
    removed_from_plan = FALSE,
    change_flag = NULL,
    updated_at = NOW()
WHERE trip_id = '20400000-0000-0000-0000-000000000204';

UPDATE public.load_items i
SET status = 'PENDING', loaded_qty = 0, checked_at = NULL, checked_by = NULL, updated_at = NOW()
FROM public.load_stops s
WHERE i.stop_id = s.stop_id AND s.status = 'PENDING' AND i.status <> 'PENDING';

UPDATE public.load_items i
SET status = 'CHECKED', loaded_qty = expected_qty,
    checked_at = COALESCE(checked_at, NOW()), updated_at = NOW()
FROM public.load_stops s
WHERE i.stop_id = s.stop_id
  AND s.status = 'LOADED'
  AND i.status NOT IN ('CHECKED', 'ISSUE');
