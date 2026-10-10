-- Remove only fixed-ID Loader/Driver showcase trips. Real dispatcher trips use
-- generated UUIDs and a non-empty trip_code, so they cannot match this list.
BEGIN;
CREATE TEMP TABLE legacy_demo_trips(trip_id UUID PRIMARY KEY) ON COMMIT DROP;
INSERT INTO legacy_demo_trips VALUES
('14000000-0000-0000-0000-000000000001'),('30100000-0000-0000-0000-000000000301'),
('15000000-0000-0000-0000-000000000150'),('16200000-0000-0000-0000-000000000162'),
('17100000-0000-0000-0000-000000000171'),('17600000-0000-0000-0000-000000000176'),
('18300000-0000-0000-0000-000000000183'),('18900000-0000-0000-0000-000000000189'),
('19500000-0000-0000-0000-000000000195'),('19800000-0000-0000-0000-000000000198'),
('20400000-0000-0000-0000-000000000204'),('20700000-0000-0000-0000-000000000207'),
('21100000-0000-0000-0000-000000000211'),('22000000-0000-0000-0000-000000000220');

DELETE FROM public.route_change_log WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
DELETE FROM public.sync_conflict_records WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
DELETE FROM public.deferral_records WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
DELETE FROM public.planning_decisions WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
DELETE FROM public.delivery_records WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
DELETE FROM public.issue_flags WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
DELETE FROM public.allocations WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
DELETE FROM public.trips WHERE trip_id IN (SELECT trip_id FROM legacy_demo_trips);
COMMIT;
