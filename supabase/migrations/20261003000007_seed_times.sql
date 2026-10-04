-- Pin the two initial WPT-204 demo events to today's Asia/Colombo clock time.
-- Subsequent live events continue to use server time.
DELETE FROM public.load_activity_log
WHERE trip_id = '20400000-0000-0000-0000-000000000204'
  AND event_type IN ('START', 'STOP_OPENED');

INSERT INTO public.load_activity_log
  (trip_id, event_type, title, description, icon_type, logged_at, created_by)
VALUES
  ('20400000-0000-0000-0000-000000000204', 'START', 'Loading started',
   'TRC-204 assigned to Dock A5', 'play',
   ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date + TIME '07:30') AT TIME ZONE 'Asia/Colombo',
   '11111111-1111-1111-1111-111111111101'),
  ('20400000-0000-0000-0000-000000000204', 'STOP_OPENED', 'Stop 4 loading opened',
   'Keells — Union Place · load order 1', 'package',
   ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Colombo')::date + TIME '08:12') AT TIME ZONE 'Asia/Colombo',
   '11111111-1111-1111-1111-111111111101');
