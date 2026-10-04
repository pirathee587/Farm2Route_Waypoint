ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entity_ref TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS event_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_event_id ON public.notifications(event_id) WHERE event_id IS NOT NULL;

DO $$ DECLARE d TEXT := '22222222-2222-2222-2222-222222222214'; day DATE := (NOW() AT TIME ZONE 'Asia/Colombo')::date; BEGIN
INSERT INTO public.notifications(notification_id,user_id,event_type,title,body,entity_ref,payload,read,created_at,event_id) VALUES
(uuid_generate_v5(d::uuid,'route-updated-seed'),d,'ROUTE_UPDATED','Route updated','Stop 4 - TechPoint Outlet has been removed from Trip 1','14000000-0000-0000-0000-000000000001',jsonb_build_object('removed_stop_seq',4,'removed_outlet_name','TechPoint Outlet','trip_number',1,'before_count',8,'after_count',7,'route_synced',false),FALSE,NOW()-INTERVAL '2 minutes',uuid_generate_v5(d::uuid,'route-updated-event')),
(uuid_generate_v5(d::uuid,'load-shortfall-seed'),d,'LOAD_SHORTFALL','Load shortfall','OUT014 - 2 bread units short before departure','OUT014',jsonb_build_object('sku','BREAD','qty',2),FALSE,(day+TIME '09:32') AT TIME ZONE 'Asia/Colombo',uuid_generate_v5(d::uuid,'load-shortfall-event')),
(uuid_generate_v5(d::uuid,'issue-ack-seed'),d,'ISSUE_ACKNOWLEDGED','Issue acknowledged','Dispatcher acknowledged access issue at OUT027','OUT027','{}',FALSE,(day+TIME '08:10') AT TIME ZONE 'Asia/Colombo',uuid_generate_v5(d::uuid,'issue-ack-event')),
(uuid_generate_v5(d::uuid,'departure-seed'),d,'TRIP_DEPARTURE_CONFIRMED','Trip departure confirmed','VEH014 left Peliyagoda depot at 06:30 AM','VEH014','{}',TRUE,(day+TIME '06:30') AT TIME ZONE 'Asia/Colombo',uuid_generate_v5(d::uuid,'departure-event'))
ON CONFLICT(notification_id) DO NOTHING; END $$;
