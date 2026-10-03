-- Restore warehouse loading order as the exact reverse of dispatcher stop_no
-- for every seeded active trip. Historical removed stops remain outside the
-- active sequence range.
UPDATE public.load_stops
SET load_order = 2000000 + load_order
WHERE trip_id IN (
  '17600000-0000-0000-0000-000000000176',
  '18900000-0000-0000-0000-000000000189',
  '19800000-0000-0000-0000-000000000198',
  '20400000-0000-0000-0000-000000000204',
  '21100000-0000-0000-0000-000000000211',
  '22000000-0000-0000-0000-000000000220',
  '30100000-0000-0000-0000-000000000301'
);

WITH seeded_counts AS (
  SELECT trip_id,COUNT(*)::INT AS stop_count
  FROM public.load_stops
  WHERE removed_from_plan=FALSE
    AND trip_id IN (
      '17600000-0000-0000-0000-000000000176',
      '18900000-0000-0000-0000-000000000189',
      '19800000-0000-0000-0000-000000000198',
      '20400000-0000-0000-0000-000000000204',
      '21100000-0000-0000-0000-000000000211',
      '22000000-0000-0000-0000-000000000220',
      '30100000-0000-0000-0000-000000000301'
    )
  GROUP BY trip_id
)
UPDATE public.load_stops s
SET load_order=c.stop_count-s.stop_no+1,updated_at=NOW()
FROM seeded_counts c
WHERE s.trip_id=c.trip_id AND s.removed_from_plan=FALSE;
