-- Realistic, date-stable loader demo data. Re-runnable and intentionally reuses
-- existing auth user IDs; this migration never writes auth.users.
CREATE OR REPLACE FUNCTION public.seed_loader_demo_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_loader UUID := '11111111-1111-1111-1111-111111111101';
  cfg RECORD;
  s INT;
  i INT;
  n INT;
  checked_target INT;
  item_no INT;
  stop_id UUID;
  item_id UUID;
  outlet_id TEXT;
  outlet_name TEXT;
  brand_name TEXT;
  item_name TEXT;
  item_sku TEXT;
  item_unit TEXT;
  item_tags TEXT[];
  item_status TEXT;
  item_weight NUMERIC(10,2);
  expected_qty INT;
  stop_status TEXT;
  trip_day DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date;
  day_start TIMESTAMPTZ := ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date + TIME '00:00') AT TIME ZONE 'Asia/Colombo';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id=v_loader AND role='LOADER') THEN
    RAISE EXCEPTION 'loader demo requires existing loader user %', v_loader;
  END IF;

  FOR cfg IN
    SELECT * FROM (VALUES
      (1,'20400000-0000-0000-0000-000000000204'::uuid,'TRC-204','22222222-2222-2222-2222-222222222201'::uuid,'Nimal Perera',5000,4,'A5','Union Place','LOADING',29,30,0::numeric,TRUE),
      (2,'18900000-0000-0000-0000-000000000189'::uuid,'TRC-189','22222222-2222-2222-2222-222222222202'::uuid,'Ruwan Jayasuriya',6000,3,'B2','Negombo','LOADED',15,15,0::numeric,TRUE),
      (3,'21100000-0000-0000-0000-000000000211'::uuid,'TRC-211','22222222-2222-2222-2222-222222222203'::uuid,'S. Fernando',5200,5,'C1','Wattala','PENDING',0,0,0::numeric,FALSE),
      (4,'17600000-0000-0000-0000-000000000176'::uuid,'TRC-176','22222222-2222-2222-2222-222222222204'::uuid,'A. Wickramasinghe',4500,4,'A2','Nugegoda','LOADING',10,24,1890::numeric,TRUE),
      (5,'19800000-0000-0000-0000-000000000198'::uuid,'TRC-198','22222222-2222-2222-2222-222222222205'::uuid,'M. Rizwan',4800,2,'B4','Kiribathgoda','LOADED',10,10,0::numeric,FALSE),
      (6,'22000000-0000-0000-0000-000000000220'::uuid,'TRC-220','22222222-2222-2222-2222-222222222206'::uuid,'Tharindu Silva',5600,6,'C3','Maharagama','LOADING',10,32,1720::numeric,TRUE),
      (7,'15000000-0000-0000-0000-000000000150'::uuid,'TRC-150','22222222-2222-2222-2222-222222222201'::uuid,'Nimal Perera',4000,2,'A2','Dehiwala','LOADED',0,0,0::numeric,FALSE),
      (8,'16200000-0000-0000-0000-000000000162'::uuid,'TRC-162','22222222-2222-2222-2222-222222222202'::uuid,'Ruwan Jayasuriya',5400,5,'A5','Bambalapitiya','LOADING',12,20,0::numeric,TRUE),
      (9,'17100000-0000-0000-0000-000000000171'::uuid,'TRC-171','22222222-2222-2222-2222-222222222203'::uuid,'S. Fernando',4200,3,'B2','Kaduwela','LOADED',0,0,0::numeric,FALSE),
      (10,'18300000-0000-0000-0000-000000000183'::uuid,'TRC-183','22222222-2222-2222-2222-222222222204'::uuid,'A. Wickramasinghe',5800,6,'B4','Moratuwa','LOADING',8,26,0::numeric,TRUE),
      (11,'19500000-0000-0000-0000-000000000195'::uuid,'TRC-195','22222222-2222-2222-2222-222222222205'::uuid,'M. Rizwan',4600,4,'C1','Rajagiriya','LOADED',0,0,0::numeric,FALSE),
      (12,'20700000-0000-0000-0000-000000000207'::uuid,'TRC-207','22222222-2222-2222-2222-222222222206'::uuid,'Tharindu Silva',6000,3,'C3','Kottawa','PENDING',0,0,0::numeric,FALSE)
    ) AS x(idx,trip_id,vehicle_id,driver_id,driver_name,capacity,stop_count,dock,destination,confirmation_status,fixed_checked,fixed_total,fixed_loaded_kg,has_cold)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id=cfg.driver_id AND role='DRIVER') THEN
      RAISE EXCEPTION 'loader demo trip % requires existing driver %', cfg.vehicle_id, cfg.driver_id;
    END IF;

    INSERT INTO public.vehicles(vehicle_id,registration,type,temp,weight_cap_kg,volume_cap_m3,temp_capability,depot,brand,driver_id,is_active)
    VALUES(cfg.vehicle_id,'WP-'||cfg.vehicle_id,'truck'::vehicle_kind,
      CASE WHEN cfg.has_cold THEN 'reefer' ELSE 'ambient' END::vehicle_temp,
      cfg.capacity,24,CASE WHEN cfg.has_cold THEN 'CHILLED' ELSE 'AMBIENT' END::temp_requirement,
      'Peliyagoda','WAYPOINT',cfg.driver_id,TRUE)
    ON CONFLICT(vehicle_id) DO UPDATE SET driver_id=EXCLUDED.driver_id,weight_cap_kg=EXCLUDED.weight_cap_kg,
      temp=EXCLUDED.temp,temp_capability=EXCLUDED.temp_capability,depot='Peliyagoda',is_active=TRUE;

    INSERT INTO public.trips(trip_id,vehicle_id,driver_id,trip_number,delivery_date,status,stop_sequence,total_weight_kg,total_volume_m3,destination_area,created_at,updated_at)
    VALUES(cfg.trip_id,cfg.vehicle_id,cfg.driver_id,1,trip_day,'PLANNED','{}',0,0,cfg.destination,
      day_start + INTERVAL '6 hours',day_start + INTERVAL '6 hours')
    ON CONFLICT(trip_id) DO UPDATE SET vehicle_id=EXCLUDED.vehicle_id,driver_id=EXCLUDED.driver_id,
      delivery_date=trip_day,status='PLANNED',destination_area=EXCLUDED.destination_area,created_at=EXCLUDED.created_at,updated_at=NOW();

    DELETE FROM public.issue_flags WHERE trip_id=cfg.trip_id;
    DELETE FROM public.plan_changes WHERE trip_id=cfg.trip_id;
    DELETE FROM public.load_activity_log WHERE trip_id=cfg.trip_id;
    DELETE FROM public.load_items WHERE trip_id=cfg.trip_id;
    DELETE FROM public.load_stops WHERE trip_id=cfg.trip_id;

    INSERT INTO public.loading_confirmations(trip_id,loader_id,status,dock,plan_revision,ready_at,ready_by,version)
    VALUES(cfg.trip_id,v_loader,cfg.confirmation_status::loading_status,'Dock '||cfg.dock,
      CASE WHEN cfg.vehicle_id='TRC-162' THEN 3 ELSE 1 END,
      CASE WHEN cfg.confirmation_status='LOADED' THEN day_start + INTERVAL '9 hours 5 minutes' END,
      CASE WHEN cfg.confirmation_status='LOADED' THEN v_loader END,0)
    ON CONFLICT(trip_id) DO UPDATE SET loader_id=v_loader,status=EXCLUDED.status,dock=EXCLUDED.dock,
      plan_revision=EXCLUDED.plan_revision,ready_at=EXCLUDED.ready_at,ready_by=EXCLUDED.ready_by,version=0,updated_at=NOW();

    item_no := 0;
    IF cfg.confirmation_status='LOADED' THEN checked_target:=100000;
    ELSIF cfg.fixed_total > 0 THEN checked_target := cfg.fixed_checked;
    ELSE checked_target := 100000; END IF;
    FOR s IN 1..cfg.stop_count LOOP
      stop_id := uuid_generate_v5(cfg.trip_id,'stop-'||s);
      brand_name := CASE (cfg.idx+s)%3 WHEN 0 THEN 'Fresh' WHEN 1 THEN 'Style' ELSE 'Tech' END;
      IF NOT cfg.has_cold AND brand_name='Fresh' THEN brand_name:=CASE WHEN s%2=0 THEN 'Style' ELSE 'Tech' END; END IF;
      IF cfg.vehicle_id IN ('TRC-176','TRC-220') AND s=cfg.stop_count THEN brand_name := 'Fresh'; END IF;
      outlet_name := CASE brand_name
        WHEN 'Fresh' THEN (ARRAY['Keells','Cargills Food City','Arpico Supercentre','FreshMart'])[((s-1)%4)+1]
        WHEN 'Style' THEN (ARRAY['StyleHub','Odel','House of Fashion'])[((s-1)%3)+1]
        ELSE (ARRAY['Singer','Abans','Softlogic'])[((s-1)%3)+1] END || ' — ' ||
        (ARRAY['Union Place','Wattala','Nugegoda','Maharagama','Dehiwala','Rajagiriya'])[((cfg.idx+s-2)%6)+1];
      IF cfg.vehicle_id='TRC-204' AND s=4 THEN outlet_name:='Keells — Union Place'; brand_name:='Fresh'; END IF;
      outlet_id := 'OUT-LD-'||substring(cfg.vehicle_id from 5)||'-'||lpad(s::text,2,'0');
      INSERT INTO public.outlets(outlet_id,name,district,depot,parking_type,address,brand,parking_constraint,is_active)
      VALUES(outlet_id,outlet_name,CASE WHEN s%2=0 THEN 'Gampaha District' ELSE 'Colombo District' END,
        'Peliyagoda','STANDARD',s||' Main Road, '||cfg.destination,lower(brand_name)::order_brand,
        (CASE WHEN s%5=0 THEN 'van_only' ELSE 'normal' END)::parking_constraint,TRUE)
      ON CONFLICT ON CONSTRAINT outlets_pkey DO UPDATE SET name=EXCLUDED.name,brand=EXCLUDED.brand,address=EXCLUDED.address,is_active=TRUE;

      n := CASE WHEN cfg.vehicle_id='TRC-204' THEN (ARRAY[9,8,8,5])[s]
                WHEN cfg.vehicle_id='TRC-176' THEN 6
                WHEN cfg.vehicle_id='TRC-220' THEN (ARRAY[6,6,5,5,5,5])[s]
                ELSE 3 + ((cfg.idx+s)%7) END;
      INSERT INTO public.load_stops(stop_id,trip_id,stop_no,load_order,outlet_id,outlet_name,district,bay_info,status,tag,total_units,total_crates,total_weight_kg,dock_note,planned_arrival,removed_from_plan)
      VALUES(stop_id,cfg.trip_id,s,cfg.stop_count-s+1,outlet_id,outlet_name,
        CASE WHEN s%2=0 THEN 'Gampaha District' ELSE 'Colombo District' END,
        (ARRAY['Rear dock','Shared mall bay','Curb / street','Side dock'])[((s-1)%4)+1],
        'PENDING',brand_name,0,0,0,(ARRAY['Rear dock','Shared mall bay','Curb / street','Side dock'])[((s-1)%4)+1],
        TIME '08:00' + ((s-1)*INTERVAL '35 minutes'),FALSE);

      FOR i IN 1..n LOOP
        item_no := item_no+1;
        item_id := CASE WHEN cfg.vehicle_id='TRC-204' AND s=4 AND i=1
          THEN '20441000-0000-0000-0000-000000000001'::uuid ELSE uuid_generate_v5(stop_id,'item-'||i) END;
        IF brand_name='Fresh' THEN
          item_name := (ARRAY['Highland milk crates','Vanilla yoghurt packs','Elephant House frozen packs','Anchor butter cartons','Fresh vegetable crates','Chicken cartons'])[((i-1)%6)+1];
          item_sku := 'FRE-'||lpad(cfg.idx::text,2,'0')||'-'||lpad(s::text,2,'0')||lpad(i::text,2,'0');
          item_unit := (ARRAY['crates','packs','cartons'])[((i-1)%3)+1];
          item_tags := ARRAY['Fresh',CASE WHEN i%3=0 THEN 'frozen' ELSE 'chilled' END];
        ELSIF brand_name='Style' THEN
          item_name := (ARRAY['Garment cartons','Service apron packs','Premium linen packs'])[((i-1)%3)+1];
          item_sku := 'STY-'||lpad(cfg.idx::text,2,'0')||'-'||lpad(s::text,2,'0')||lpad(i::text,2,'0');
          item_unit := (ARRAY['cartons','packs'])[((i-1)%2)+1]; item_tags := ARRAY['Style','ambient'];
        ELSE
          item_name := (ARRAY['LED television units','Refrigerator units','Countertop display units','Kitchen mixer units'])[((i-1)%4)+1];
          item_sku := 'TEC-'||lpad(cfg.idx::text,2,'0')||'-'||lpad(s::text,2,'0')||lpad(i::text,2,'0');
          item_unit := 'units'; item_tags := ARRAY['Tech','fragile'];
        END IF;
        item_status := CASE WHEN item_no<=checked_target THEN 'CHECKED' ELSE 'PENDING' END;
        IF cfg.vehicle_id='TRC-204' AND s=4 THEN item_status:=CASE WHEN i=1 THEN 'PENDING' ELSE 'CHECKED' END; END IF;
        expected_qty:=3+((i+s)%22);
        item_weight := CASE WHEN cfg.fixed_loaded_kg>0 AND item_status='CHECKED'
          THEN round(cfg.fixed_loaded_kg/cfg.fixed_checked,2) ELSE round((35 + ((i+s)%6)*13)::numeric,2) END;
        IF cfg.vehicle_id='TRC-204' AND s=4 AND i=1 THEN
          item_name:='Highland full cream milk crates'; item_sku:='FRE-HL-0018'; item_unit:='crates';
          expected_qty:=24; item_weight:=384; item_tags:=ARRAY['Fresh','chilled'];
        END IF;
        IF cfg.vehicle_id='TRC-176' AND item_status='CHECKED' AND item_no=cfg.fixed_checked THEN item_weight:=cfg.fixed_loaded_kg-item_weight*(cfg.fixed_checked-1); END IF;
        IF cfg.vehicle_id='TRC-220' AND item_status='CHECKED' AND item_no=cfg.fixed_checked THEN item_weight:=cfg.fixed_loaded_kg-item_weight*(cfg.fixed_checked-1); END IF;
        INSERT INTO public.load_items(item_id,stop_id,trip_id,sku,name,expected_qty,loaded_qty,unit,weight_kg,tags,status,checked_at,checked_by)
        VALUES(item_id,stop_id,cfg.trip_id,item_sku,item_name,expected_qty,
          CASE WHEN item_status='CHECKED' THEN expected_qty ELSE 0 END,item_unit,item_weight,item_tags,item_status,
          CASE WHEN item_status='CHECKED' THEN day_start+INTERVAL '8 hours 12 minutes'+(item_no*INTERVAL '2 minutes') END,
          CASE WHEN item_status='CHECKED' THEN v_loader END);
      END LOOP;
    END LOOP;

    IF cfg.fixed_total=0 AND cfg.confirmation_status='LOADING' THEN
      UPDATE public.load_items SET status='PENDING',loaded_qty=0,checked_at=NULL,checked_by=NULL
      WHERE trip_id=cfg.trip_id AND item_id IN (SELECT item_id FROM public.load_items WHERE trip_id=cfg.trip_id ORDER BY item_id OFFSET CASE WHEN cfg.vehicle_id='TRC-162' THEN 12 ELSE 8 END);
    ELSIF cfg.confirmation_status='PENDING' THEN
      UPDATE public.load_items SET status='PENDING',loaded_qty=0,checked_at=NULL,checked_by=NULL WHERE trip_id=cfg.trip_id;
    END IF;
    UPDATE public.load_stops s0 SET status=CASE
      WHEN NOT EXISTS(SELECT 1 FROM public.load_items i0 WHERE i0.stop_id=s0.stop_id AND i0.status<>'CHECKED') THEN 'LOADED'
      WHEN NOT EXISTS(SELECT 1 FROM public.load_items i0 WHERE i0.stop_id=s0.stop_id AND i0.status='CHECKED') THEN 'PENDING'
      ELSE 'LOADING' END
    WHERE s0.trip_id=cfg.trip_id;
    UPDATE public.trips t0 SET stop_sequence=ARRAY(SELECT s1.outlet_id FROM public.load_stops s1 WHERE s1.trip_id=cfg.trip_id ORDER BY s1.stop_no),
      total_weight_kg=(SELECT COALESCE(SUM(i1.weight_kg),0) FROM public.load_items i1 WHERE i1.trip_id=cfg.trip_id) WHERE t0.trip_id=cfg.trip_id;

    INSERT INTO public.load_activity_log(trip_id,event_type,title,description,icon_type,logged_at,created_by)
    VALUES(cfg.trip_id,'START','Loading started',cfg.vehicle_id||' assigned to Dock '||cfg.dock,'play',day_start+INTERVAL '7 hours 30 minutes',v_loader),
      (cfg.trip_id,'STOP_OPENED','First load-order stop opened',cfg.destination||' manifest opened','package',day_start+INTERVAL '8 hours 12 minutes',v_loader);
  END LOOP;

  INSERT INTO public.issue_flags(trip_id,flagged_by,issue_type,ref,qty_affected,reason,description,resolved,created_at)
  VALUES('17600000-0000-0000-0000-000000000176',v_loader,'DAMAGE','SR-0176',4,'DAMAGED','Chicken cartons damaged during staging.',FALSE,day_start+INTERVAL '8 hours 40 minutes')
  ON CONFLICT(ref) DO UPDATE SET resolved=FALSE,description=EXCLUDED.description,created_at=EXCLUDED.created_at;

  UPDATE public.load_stops SET change_flag='REORDERED' WHERE trip_id='16200000-0000-0000-0000-000000000162' AND stop_no=2;
  UPDATE public.load_stops SET change_flag='NEW' WHERE trip_id='16200000-0000-0000-0000-000000000162' AND stop_no=3;
  stop_id:=uuid_generate_v5('16200000-0000-0000-0000-000000000162','removed-stop');
  INSERT INTO public.outlets(outlet_id,name,district,depot,parking_type,address,brand,parking_constraint,is_active)
  VALUES('OUT-LD-162-RM','Odel — Crescat','Colombo District','Peliyagoda','STANDARD','89 Galle Road, Colombo 03','style','mall_dock',TRUE)
  ON CONFLICT ON CONSTRAINT outlets_pkey DO UPDATE SET name=EXCLUDED.name,brand=EXCLUDED.brand;
  INSERT INTO public.load_stops(stop_id,trip_id,stop_no,load_order,outlet_id,outlet_name,district,status,total_units,total_crates,total_weight_kg,dock_note,change_flag,removed_from_plan)
  SELECT uuid_generate_v5('16200000-0000-0000-0000-000000000162','removed-stop'),
    '16200000-0000-0000-0000-000000000162',6,99,o.outlet_id,'Odel — Crescat','Colombo District','PENDING',12,0,180,'Shared mall bay','REMOVED',TRUE
  FROM public.outlets o WHERE o.outlet_id='OUT-LD-162-RM';
  FOR i IN 1..3 LOOP
    INSERT INTO public.load_items(item_id,stop_id,trip_id,sku,name,expected_qty,loaded_qty,unit,weight_kg,tags,status)
    VALUES(uuid_generate_v5(stop_id,'removed-item-'||i),stop_id,'16200000-0000-0000-0000-000000000162','STY-162-R'||i,
      (ARRAY['Garment cartons','Service apron packs','Premium linen packs'])[i],4+i,0,CASE WHEN i=1 THEN 'cartons' ELSE 'packs' END,60,ARRAY['Style','ambient'],'PENDING');
  END LOOP;

  INSERT INTO public.plan_changes(trip_id,revision,summary,details,acknowledged,created_at)
  VALUES
   ('16200000-0000-0000-0000-000000000162',2,'Plan Updated — stop sequence changed',
    '{"updatedBy":"Kasun Perera","previous":[{"stopId":"old-2","outletId":"OUT-LD-162-02","outlet":"Abans — Nugegoda","sequence":2,"loadOrder":4}],"updated":[{"stopId":"new-2","outletId":"OUT-LD-162-02","outlet":"Abans — Nugegoda","sequence":2,"loadOrder":4,"change":"REORDERED"}]}'::jsonb,FALSE,day_start+INTERVAL '8 hours 25 minutes'),
   ('16200000-0000-0000-0000-000000000162',3,'Plan Updated — one stop added and one removed',
    '{"updatedBy":"Kasun Perera","previous":[{"stopId":"removed","outletId":"OUT-LD-162-01","outlet":"Odel — Crescat","sequence":6,"loadOrder":99,"change":"REMOVED"}],"updated":[{"stopId":"new-3","outletId":"OUT-LD-162-03","outlet":"Keells — Maharagama","sequence":3,"loadOrder":3,"change":"NEW"}]}'::jsonb,FALSE,day_start+INTERVAL '8 hours 45 minutes');

  -- WPT-204 is deliberately excluded from plan changes; preserve live shortfall numbering.
  DELETE FROM public.plan_changes WHERE trip_id='20400000-0000-0000-0000-000000000204';
  PERFORM setval('public.issue_flag_ref_seq',481,true);
END;
$$;

SELECT public.seed_loader_demo_data();
