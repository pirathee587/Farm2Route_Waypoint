-- Driver Stop Detail metadata and deterministic DRV014 page seed.
ALTER TABLE public.outlets
  ADD COLUMN IF NOT EXISTS dock_type TEXT,
  ADD COLUMN IF NOT EXISTS mall_window TEXT;

COMMENT ON COLUMN public.outlets.dock_type IS 'Delivery dock requirement such as mall_bay.';
COMMENT ON COLUMN public.outlets.mall_window IS 'Human-readable mall/access restriction note.';

UPDATE public.outlets
SET name='Style Mall Outlet',district='Kandy',parking_constraint='van_only',dock_type='mall_bay',mall_window='Mall access window'
WHERE outlet_id='OUT027';

-- Base OUT027 order becomes Hanging Garments with the requested window.
UPDATE public.orders SET product_code='GARMENTS',quantity=20,weight_kg=32,temp_requirement='AMBIENT',
  window_open='09:30',window_close='10:00'
WHERE id=uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT027');

INSERT INTO public.orders(id,outlet_id,product_code,quantity,weight_kg,volume_m3,brand,temp_requirement,preferred_date,window_open,window_close,status)
VALUES(uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT027-CARTONS'),'OUT027','CARTONS',12,16,0.5,'style'::order_brand,'AMBIENT',(NOW() AT TIME ZONE 'Asia/Colombo')::date,'09:30','10:00','ALLOCATED'::order_status_v2)
ON CONFLICT(id) DO UPDATE SET quantity=12,weight_kg=16,temp_requirement='AMBIENT',window_open='09:30',window_close='10:00';

INSERT INTO public.allocations(order_id,trip_id,vehicle_id,status,stop_index,planned_arrival)
SELECT uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT027-CARTONS'),'14000000-0000-0000-0000-000000000001','VEH014','ALLOCATED',3,'09:30'
WHERE NOT EXISTS (SELECT 1 FROM public.allocations WHERE order_id=uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT027-CARTONS') AND trip_id='14000000-0000-0000-0000-000000000001');

DELETE FROM public.load_items WHERE trip_id='14000000-0000-0000-0000-000000000001' AND stop_id IN (SELECT stop_id FROM public.load_stops WHERE trip_id='14000000-0000-0000-0000-000000000001' AND outlet_id IN ('OUT014','OUT027'));

INSERT INTO public.load_items(stop_id,trip_id,order_id,sku,name,expected_qty,loaded_qty,unit,weight_kg,tags,status)
SELECT stop_id,trip_id,uuid_generate_v5(trip_id,'OUT027'),'GARMENTS','Hanging Garments',20,20,'units',32,ARRAY[]::text[],'CHECKED' FROM public.load_stops WHERE trip_id='14000000-0000-0000-0000-000000000001' AND outlet_id='OUT027'
UNION ALL
SELECT stop_id,trip_id,uuid_generate_v5(trip_id,'OUT027-CARTONS'),'CARTONS','Cartons',12,12,'units',16,ARRAY[]::text[],'CHECKED' FROM public.load_stops WHERE trip_id='14000000-0000-0000-0000-000000000001' AND outlet_id='OUT027';

-- Central Supermarket: separate orders preserve per-item temperature requirements.
UPDATE public.orders SET product_code='MILK',quantity=20,weight_kg=20,temp_requirement='CHILLED' WHERE id=uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014');
INSERT INTO public.orders(id,outlet_id,product_code,quantity,weight_kg,volume_m3,brand,temp_requirement,preferred_date,window_open,window_close,status) VALUES
 (uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014-BREAD'),'OUT014','BREAD',30,15,0.5,'fresh'::order_brand,'AMBIENT',(NOW() AT TIME ZONE 'Asia/Colombo')::date,'08:30','10:30','ALLOCATED'::order_status_v2),
 (uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014-VEGETABLES'),'OUT014','VEGETABLES',15,18,0.5,'fresh'::order_brand,'CHILLED',(NOW() AT TIME ZONE 'Asia/Colombo')::date,'08:30','10:30','ALLOCATED'::order_status_v2)
ON CONFLICT(id) DO UPDATE SET quantity=EXCLUDED.quantity,weight_kg=EXCLUDED.weight_kg,temp_requirement=EXCLUDED.temp_requirement;

INSERT INTO public.allocations(order_id,trip_id,vehicle_id,status,stop_index,planned_arrival)
SELECT o.id,'14000000-0000-0000-0000-000000000001','VEH014','ALLOCATED',2,'09:00' FROM public.orders o
WHERE o.id IN (uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014-BREAD'),uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014-VEGETABLES'))
AND NOT EXISTS (SELECT 1 FROM public.allocations a WHERE a.order_id=o.id AND a.trip_id='14000000-0000-0000-0000-000000000001');

INSERT INTO public.load_items(stop_id,trip_id,order_id,sku,name,expected_qty,loaded_qty,unit,weight_kg,tags,status)
SELECT s.stop_id,s.trip_id,x.order_id,x.sku,x.name,x.units,x.units,'units',x.weight,ARRAY[]::text[],'CHECKED'
FROM public.load_stops s CROSS JOIN (VALUES
 (uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014'),'MILK','Milk',20,20::numeric),
 (uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014-BREAD'),'BREAD','Bread',30,15::numeric),
 (uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT014-VEGETABLES'),'VEGETABLES','Vegetables',15,18::numeric)
) AS x(order_id,sku,name,units,weight)
WHERE s.trip_id='14000000-0000-0000-0000-000000000001' AND s.outlet_id='OUT014';

INSERT INTO public.deferral_records(deferral_id,order_id,delivery_date,reason,constraint_type,retry_date,notified,created_at)
VALUES(uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT027-SKIP'),uuid_generate_v5('14000000-0000-0000-0000-000000000001'::uuid,'OUT027'),'2026-09-18','outlet_closed','WINDOW','2026-09-19',TRUE,'2026-09-18 10:00:00+05:30')
ON CONFLICT(deferral_id) DO UPDATE SET reason='outlet_closed',delivery_date='2026-09-18',created_at='2026-09-18 10:00:00+05:30';
