CREATE TABLE IF NOT EXISTS public.trip_stops (
  trip_stop_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  outlet_id TEXT NOT NULL REFERENCES public.outlets(outlet_id),
  stop_sequence INTEGER NOT NULL CHECK (stop_sequence > 0),
  planned_arrival TIME,
  delivery_window_start TIME,
  delivery_window_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, order_id), UNIQUE(trip_id, stop_sequence)
);

CREATE TABLE IF NOT EXISTS public.planning_decisions (
  decision_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id),
  trip_id UUID REFERENCES public.trips(trip_id),
  decision_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_sequence ON public.trip_stops(trip_id,stop_sequence);
CREATE INDEX IF NOT EXISTS idx_planning_decisions_order ON public.planning_decisions(order_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_order_allocation ON public.allocations(order_id) WHERE status='ALLOCATED'::public.allocation_status;
