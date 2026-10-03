-- Small multi-depot fixture for loader depot scoping.
INSERT INTO auth.users(id,email,role,raw_user_meta_data) VALUES
 ('11111111-1111-1111-1111-111111111102','kandy.loader@waypoint.lk','authenticated','{"full_name":"Kandy Loader","role":"LOADER"}')
ON CONFLICT(id) DO NOTHING;
UPDATE public.user_profiles SET role='LOADER',depot='Kandy' WHERE id='11111111-1111-1111-1111-111111111102';
UPDATE public.user_profiles SET depot='Peliyagoda' WHERE id='11111111-1111-1111-1111-111111111101';

INSERT INTO public.outlets(outlet_id,name,district,depot,parking_type,address)
VALUES('OUT-KANDY-01','Kandy City Store','Kandy District','Kandy','STANDARD','Kandy') ON CONFLICT(outlet_id) DO NOTHING;
INSERT INTO public.vehicles(vehicle_id,registration,type,weight_cap_kg,volume_cap_m3,temp_capability,depot,brand,driver_id)
VALUES('KDY-301','CP-3010','TRUCK',4200,18,'AMBIENT','Kandy','Fresh','22222222-2222-2222-2222-222222222203') ON CONFLICT(vehicle_id) DO NOTHING;
INSERT INTO public.trips(trip_id,vehicle_id,driver_id,trip_number,delivery_date,status,stop_sequence,total_weight_kg,total_volume_m3,destination_area)
VALUES('30100000-0000-0000-0000-000000000301','KDY-301','22222222-2222-2222-2222-222222222203',1,CURRENT_DATE,'PLANNED',ARRAY['OUT-KANDY-01'],600,3,'Kandy City') ON CONFLICT(trip_id) DO NOTHING;
INSERT INTO public.loading_confirmations(trip_id,loader_id,status,dock,plan_revision,version)
VALUES('30100000-0000-0000-0000-000000000301','11111111-1111-1111-1111-111111111102','PENDING','Dock K1',1,0) ON CONFLICT(trip_id) DO NOTHING;
INSERT INTO public.load_stops(stop_id,trip_id,stop_no,load_order,outlet_id,outlet_name,district,bay_info,status,tag,total_units,total_crates,total_weight_kg)
VALUES('30100000-0000-0000-0000-000000000311','30100000-0000-0000-0000-000000000301',1,1,'OUT-KANDY-01','Kandy City Store','Kandy District','Kandy Dock','PENDING','standard',10,2,600)
ON CONFLICT(trip_id,stop_no) DO NOTHING;
INSERT INTO public.load_items(item_id,stop_id,trip_id,sku,name,expected_qty,loaded_qty,unit,weight_kg,tags,status)
VALUES('30100000-0000-0000-0000-000000000321','30100000-0000-0000-0000-000000000311','30100000-0000-0000-0000-000000000301','KDY-FRESH-01','Kandy Fresh Assortment',10,0,'crates',600,ARRAY['ambient'],'PENDING')
ON CONFLICT(item_id) DO NOTHING;
