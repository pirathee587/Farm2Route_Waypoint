-- Migration: 20261004000014_order_sync_and_auth_seed.sql
-- Description: Unifies orders.order_id column, bidirectional trigger sync, and seeds DRV014 auth user / profile.

-- 1. Ensure public.orders has order_id column and synchronization trigger
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_id UUID;
UPDATE public.orders SET order_id = id WHERE order_id IS NULL;
ALTER TABLE public.orders ALTER COLUMN order_id SET DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);

CREATE OR REPLACE FUNCTION public.fn_sync_order_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_id IS NULL AND NEW.id IS NOT NULL THEN
        NEW.order_id := NEW.id;
    ELSIF NEW.id IS NULL AND NEW.order_id IS NOT NULL THEN
        NEW.id := NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_order_id ON public.orders;
CREATE TRIGGER trg_sync_order_id
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_order_id();

-- 2. Seed DRV014 into auth_schema.users and auth_schema.driver_profiles
DO $$
DECLARE
  v_drv_id UUID := '22222222-2222-2222-2222-222222222214';
  v_pw_hash TEXT := '$2a$12$K1r.mZ0J7N97k2v44Z5kze64Q5Rj2hV2x1bFhG4n9vJ1.z9kYlY4a';
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='auth_schema' AND table_name='users') THEN
    INSERT INTO auth_schema.users ("Id", "Email", "PasswordHash", "Role", "Status", "CreatedAt", "UpdatedAt")
    VALUES (v_drv_id, 'drv014@waypoint.lk', v_pw_hash, 'DRIVER', 'ACTIVE', NOW(), NOW())
    ON CONFLICT ("Id") DO UPDATE SET "Email"=EXCLUDED."Email", "PasswordHash"=EXCLUDED."PasswordHash", "Role"='DRIVER', "Status"='ACTIVE';

    INSERT INTO auth_schema.driver_profiles ("Id", "UserId", "FullName", "Depot", "VehicleId", "EmployeeId", "CreatedAt")
    VALUES (gen_random_uuid(), v_drv_id, 'Driver DRV014', 'Peliyagoda', 'VEH014', 'DRV014', NOW())
    ON CONFLICT ("UserId") DO UPDATE SET "FullName"=EXCLUDED."FullName", "VehicleId"=EXCLUDED."VehicleId";
  END IF;

  -- Ensure public.user_profiles has DRV014
  INSERT INTO public.user_profiles(id, full_name, email, role, depot, phone, is_active)
  VALUES(v_drv_id, 'Driver DRV014', 'drv014@waypoint.lk', 'DRIVER', 'Peliyagoda', '+94 77 014 0014', TRUE)
  ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name, role='DRIVER', depot=EXCLUDED.depot, is_active=TRUE;

  -- 3. Ensure DRV014 has the 4 required notifications for today
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications') THEN
    INSERT INTO public.notifications(notification_id,user_id,event_type,title,body,entity_ref,payload,read,created_at,event_id) VALUES
    (uuid_generate_v5(v_drv_id,'route-updated-seed'),v_drv_id::text,'ROUTE_UPDATED','Route updated','Stop 4 - TechPoint Outlet has been removed from Trip 1','14000000-0000-0000-0000-000000000001',jsonb_build_object('removed_stop_seq',4,'removed_outlet_name','TechPoint Outlet','trip_number',1,'before_count',8,'after_count',7,'route_synced',false),FALSE,NOW()-INTERVAL '2 minutes',uuid_generate_v5(v_drv_id,'route-updated-event')),
    (uuid_generate_v5(v_drv_id,'load-shortfall-seed'),v_drv_id::text,'LOAD_SHORTFALL','Load shortfall','OUT014 - 2 bread units short before departure','OUT014',jsonb_build_object('sku','BREAD','qty',2),FALSE,((NOW() AT TIME ZONE 'Asia/Colombo')::date + TIME '09:32') AT TIME ZONE 'Asia/Colombo',uuid_generate_v5(v_drv_id,'load-shortfall-event')),
    (uuid_generate_v5(v_drv_id,'issue-ack-seed'),v_drv_id::text,'ISSUE_ACKNOWLEDGED','Issue acknowledged','Dispatcher acknowledged access issue at OUT027','OUT027','{}',FALSE,((NOW() AT TIME ZONE 'Asia/Colombo')::date + TIME '08:10') AT TIME ZONE 'Asia/Colombo',uuid_generate_v5(v_drv_id,'issue-ack-event')),
    (uuid_generate_v5(v_drv_id,'departure-seed'),v_drv_id::text,'TRIP_DEPARTURE_CONFIRMED','Trip departure confirmed','VEH014 left Peliyagoda depot at 06:30 AM','VEH014','{}',TRUE,((NOW() AT TIME ZONE 'Asia/Colombo')::date + TIME '06:30') AT TIME ZONE 'Asia/Colombo',uuid_generate_v5(v_drv_id,'departure-event'))
    ON CONFLICT(notification_id) DO UPDATE SET created_at=EXCLUDED.created_at, read=EXCLUDED.read;
  END IF;
END $$;

