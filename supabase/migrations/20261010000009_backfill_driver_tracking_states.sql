INSERT INTO public.delivery_tracking(order_id,status,is_delayed,source_note,updated_at)
SELECT DISTINCT ON (li.order_id) li.order_id,
       CASE WHEN ls.delivery_status='NOT_DELIVERED' THEN 'delivery_attempted'::tracking_status ELSE 'out_for_delivery'::tracking_status END,
       ls.delivery_status='NOT_DELIVERED',
       CASE WHEN ls.delivery_status='NOT_DELIVERED' THEN 'Can''t deliver: '||COALESCE(ls.cant_deliver_reason,'reported by driver') ELSE 'Driver arrived at '||ls.outlet_name END,
       COALESCE(ls.cant_deliver_reported_at,ls.arrived_at,NOW())
FROM public.load_stops ls JOIN public.load_items li ON li.stop_id=ls.stop_id
WHERE li.order_id IS NOT NULL AND (ls.arrival_status IN ('ARRIVED','WAITING_FOR_WINDOW') OR ls.delivery_status='NOT_DELIVERED')
ORDER BY li.order_id,COALESCE(ls.cant_deliver_reported_at,ls.arrived_at,NOW()) DESC;
