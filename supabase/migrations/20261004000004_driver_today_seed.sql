-- Page 1 driver Today seed: DRV014 / VEH014 / Trip 1 with eight stops.
DO $$
DECLARE
  v_driver UUID := '22222222-2222-2222-2222-222222222214';
  v_trip UUID := '14000000-0000-0000-0000-000000000001';
  v_outlets TEXT[] := ARRAY['OUT001','OUT014','OUT027','OUT032','OUT041','OUT052','OUT063','OUT078'];
  v_names TEXT[] := ARRAY['FreshMart','Central Supermarket','Style Mall Outlet','TechPoint','Green Grocer','City Pharmacy','Home Essentials','Daily Needs'];
  v_stops UUID[] := ARRAY[
    '14010000-0000-0000-0000-000000000001'::uuid,'14020000-0000-0000-0000-000000000002'::uuid,
    '14030000-0000-0000-0000-000000000003'::uuid,'14040000-0000-0000-0000-000000000004'::uuid,
    '14050000-0000-0000-0000-000000000005'::uuid,'14060000-0000-0000-0000-000000000006'::uuid,
    '14070000-0000-0000-0000-000000000007'::uuid,'14080000-0000-0000-0000-000000000008'::uuid
  ];
  i INTEGER;
  v_order UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=v_driver) THEN
    INSERT INTO auth.users(id,email,encrypted_password,email_confirmed_at,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
    VALUES(v_driver,'drv014@waypoint.lk',crypt('Password@123',gen_salt('bf')),NOW(),'authenticated','{"provider":"email","providers":["email"]}','{"full_name":"Driver DRV014","role":"DRIVER","driver_code":"DRV014"}',NOW(),NOW());
  END IF;
  INSERT INTO public.user_profiles(id,full_name,email,role,depot,phone)
  VALUES(v_driver,'Driver DRV014','drv014@waypoint.lk','DRIVER','Peliyagoda','+94 77 014 0014')
  ON CONFLICT(id) DO UPDATE SET full_name=EXCLUDED.full_name,role='DRIVER',depot=EXCLUDED.depot;

  UPDATE public.user_profiles
  SET phone=COALESCE(phone,'+94 11 234 5678')
  WHERE role='DISPATCHER' AND is_active=TRUE;

  INSERT INTO public.vehicles(vehicle_id,registration,type,temp,weight_cap_kg,volume_cap_m3,temp_capability,depot,brand,driver_id)
  VALUES('VEH014','WP-VEH-014','van'::vehicle_kind,'ambient'::vehicle_temp,1800,9,'AMBIENT'::temp_requirement,'Peliyagoda','WAYPOINT',v_driver)
  ON CONFLICT(vehicle_id) DO UPDATE SET driver_id=v_driver,depot='Peliyagoda',type='van'::vehicle_kind;

  FOR i IN 1..8 LOOP
    INSERT INTO public.outlets(outlet_id,name,district,depot,parking_type,address)
    VALUES(v_outlets[i],v_names[i],CASE WHEN i<5 THEN 'Colombo' ELSE 'Gampaha' END,'Peliyagoda','STANDARD','Seed address '||i)
    ON CONFLICT(outlet_id) DO UPDATE SET name=EXCLUDED.name;
  END LOOP;

  INSERT INTO public.trips(trip_id,vehicle_id,driver_id,trip_number,delivery_date,status,stop_sequence,total_weight_kg,total_volume_m3)
  VALUES(v_trip,'VEH014',v_driver,1,(NOW() AT TIME ZONE 'Asia/Colombo')::date,'PLANNED',v_outlets,800,4)
  ON CONFLICT(trip_id) DO UPDATE SET vehicle_id='VEH014',driver_id=v_driver,delivery_date=(NOW() AT TIME ZONE 'Asia/Colombo')::date,stop_sequence=v_outlets;

  FOR i IN 1..8 LOOP
    INSERT INTO public.load_stops(stop_id,trip_id,stop_no,load_order,outlet_id,outlet_name,district,status,total_units,total_crates,total_weight_kg)
    VALUES(v_stops[i],v_trip,i,9-i,v_outlets[i],v_names[i],CASE WHEN i<5 THEN 'Colombo' ELSE 'Gampaha' END,'LOADED',1,1,100)
    ON CONFLICT(trip_id,stop_no) DO UPDATE SET outlet_id=EXCLUDED.outlet_id,outlet_name=EXCLUDED.outlet_name,district=EXCLUDED.district,removed_from_plan=FALSE;

    v_order := uuid_generate_v5(v_trip, v_outlets[i]);
    INSERT INTO public.orders(id,outlet_id,product_code,quantity,weight_kg,volume_m3,brand,temp_requirement,preferred_date,window_open,window_close,status)
    VALUES(v_order,v_outlets[i],'SEED-'||LPAD(i::text,2,'0'),1,100,0.5,'fresh'::order_brand,'AMBIENT'::temp_requirement,(NOW() AT TIME ZONE 'Asia/Colombo')::date,
           (TIME '08:00' + ((i-1) * INTERVAL '30 minutes'))::time,
           (TIME '10:00' + ((i-1) * INTERVAL '30 minutes'))::time,'ALLOCATED'::order_status_v2)
    ON CONFLICT(id) DO UPDATE SET preferred_date=EXCLUDED.preferred_date,window_open=EXCLUDED.window_open,window_close=EXCLUDED.window_close;
    IF NOT EXISTS (SELECT 1 FROM public.allocations WHERE order_id=v_order AND trip_id=v_trip) THEN
      INSERT INTO public.allocations(order_id,trip_id,vehicle_id,status,stop_index,planned_arrival)
      VALUES(v_order,v_trip,'VEH014','ALLOCATED',i,(TIME '08:30' + ((i-1) * INTERVAL '30 minutes'))::time);
    END IF;
  END LOOP;
END $$;
