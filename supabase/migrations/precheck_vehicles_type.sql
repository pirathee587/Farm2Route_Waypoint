SELECT
  COALESCE(
    string_agg(
      'vehicle_id=' || vehicle_id || '  type=' || type::TEXT,
      E'\n'
      ORDER BY vehicle_id
    ),
    'NO OFFENDING ROWS - pre-check passed'
  ) AS result
FROM public.vehicles
WHERE lower(type::TEXT) NOT IN ('truck', 'van');
