ALTER TABLE public.load_stops DROP CONSTRAINT IF EXISTS chk_load_stops_delivery_status;
ALTER TABLE public.load_stops ADD CONSTRAINT chk_load_stops_delivery_status
  CHECK (delivery_status IS NULL OR delivery_status IN ('NOT_DELIVERED','DELIVERED','PARTIAL'));

ALTER TABLE public.delivery_records ADD COLUMN IF NOT EXISTS stop_id UUID REFERENCES public.load_stops(stop_id);
ALTER TABLE public.load_stops ADD COLUMN IF NOT EXISTS delivery_next_stop_id UUID REFERENCES public.load_stops(stop_id);

CREATE TABLE IF NOT EXISTS public.pod_uploads (
  upload_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), stop_id UUID NOT NULL REFERENCES public.load_stops(stop_id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id), pod_type TEXT NOT NULL CHECK(pod_type IN ('SIGNATURE','PHOTO')),
  file_url TEXT NOT NULL UNIQUE, receiver_name TEXT, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pod_uploads_stop ON public.pod_uploads(stop_id,pod_type,uploaded_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_item_results (
  delivery_id UUID NOT NULL REFERENCES public.delivery_records(delivery_id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.load_items(item_id), ordered_qty INT NOT NULL, delivered_qty INT NOT NULL,
  status TEXT NOT NULL, PRIMARY KEY(delivery_id,item_id)
);
CREATE TABLE IF NOT EXISTS public.delivery_shortfalls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), delivery_id UUID NOT NULL REFERENCES public.delivery_records(delivery_id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.load_items(item_id), qty INT NOT NULL, type TEXT NOT NULL CHECK(type IN ('shortage','damage')),
  note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
