-- Keep Loader checklists aligned with the line items submitted by Store Manager.
-- Legacy demo orders have no order_items rows and are intentionally untouched.
WITH source_items AS (
  SELECT
    oi.id AS item_id,
    li.stop_id,
    li.trip_id,
    li.order_id,
    UPPER(REGEXP_REPLACE(TRIM(oi.item_name), '[^A-Za-z0-9]+', '-', 'g')) AS sku,
    oi.item_name AS name,
    oi.quantity AS expected_qty,
    oi.unit,
    CASE
      WHEN SUM(oi.quantity) OVER (PARTITION BY li.trip_id, li.order_id) > 0
      THEN SUM(li.weight_kg) OVER (PARTITION BY li.trip_id, li.order_id)
           * oi.quantity / SUM(oi.quantity) OVER (PARTITION BY li.trip_id, li.order_id)
      ELSE 0
    END AS weight_kg,
    li.tags
  FROM public.load_items li
  JOIN public.order_items oi ON oi.order_id = li.order_id
), removed_aggregates AS (
  DELETE FROM public.load_items li
  WHERE li.status = 'PENDING'
    AND EXISTS (SELECT 1 FROM source_items s WHERE s.trip_id=li.trip_id AND s.order_id=li.order_id)
  RETURNING li.item_id
)
INSERT INTO public.load_items
  (item_id,stop_id,trip_id,order_id,sku,name,expected_qty,loaded_qty,unit,weight_kg,tags,status)
SELECT item_id,stop_id,trip_id,order_id,COALESCE(NULLIF(sku,''),'ITEM'),name,
       expected_qty,0,unit,weight_kg,tags,'PENDING'
FROM source_items
ON CONFLICT (item_id) DO UPDATE SET
  stop_id=EXCLUDED.stop_id,
  trip_id=EXCLUDED.trip_id,
  order_id=EXCLUDED.order_id,
  sku=EXCLUDED.sku,
  name=EXCLUDED.name,
  expected_qty=EXCLUDED.expected_qty,
  unit=EXCLUDED.unit,
  weight_kg=EXCLUDED.weight_kg,
  tags=EXCLUDED.tags,
  updated_at=NOW();
