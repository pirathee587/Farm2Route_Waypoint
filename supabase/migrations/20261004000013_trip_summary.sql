-- Shared completion primitive. Delivery, issue, sync and route-removal paths all
-- invoke this function in their existing transaction.
CREATE OR REPLACE FUNCTION public.complete_trip_if_ready(p_trip_id UUID, p_completed_at TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_ready BOOLEAN; v_status public.trip_status;
BEGIN
  SELECT status INTO v_status FROM public.trips WHERE trip_id=p_trip_id FOR UPDATE;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_status='COMPLETED' THEN RETURN TRUE; END IF;
  SELECT NOT EXISTS (
    SELECT 1 FROM public.load_stops s
    WHERE s.trip_id=p_trip_id AND s.removed_from_plan=FALSE
      AND COALESCE(s.delivery_status,'') NOT IN ('DELIVERED','PARTIAL','NOT_DELIVERED')
      AND NOT EXISTS (
        SELECT 1 FROM public.delivery_records d WHERE d.stop_id=s.stop_id
          AND d.outcome::text IN ('DELIVERED','PARTIAL','ATTEMPTED','NOT_HOME','REFUSED')
      )
  ) AND EXISTS (SELECT 1 FROM public.load_stops WHERE trip_id=p_trip_id AND removed_from_plan=FALSE)
  INTO v_ready;
  IF NOT v_ready THEN RETURN FALSE; END IF;
  UPDATE public.trips SET status='COMPLETED',completed_at=COALESCE(completed_at,p_completed_at),updated_at=p_completed_at WHERE trip_id=p_trip_id;
  INSERT INTO public.outbox_events(id,aggregate_type,aggregate_id,event_type,payload,status,created_at)
  VALUES(uuid_generate_v5(p_trip_id,'trip-completed'),'TRIP',p_trip_id::text,'TRIP_COMPLETED',
    jsonb_build_object('trip_id',p_trip_id,'completed_at',p_completed_at,'target_roles',jsonb_build_array('DISPATCHER')),'PENDING',p_completed_at)
  ON CONFLICT(id) DO NOTHING;
  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION public.complete_trip_after_route_removal() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.removed_from_plan=TRUE AND OLD.removed_from_plan IS DISTINCT FROM TRUE THEN
    PERFORM public.complete_trip_if_ready(NEW.trip_id,NOW());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_complete_trip_after_route_removal ON public.load_stops;
CREATE TRIGGER trg_complete_trip_after_route_removal AFTER UPDATE OF removed_from_plan ON public.load_stops
FOR EACH ROW EXECUTE FUNCTION public.complete_trip_after_route_removal();

-- The 5/2/1 Trip 1 summary is created only inside tests. It intentionally does
-- not alter the main DRV014 demo seed or the separate OUT014 sync conflict fixture.
