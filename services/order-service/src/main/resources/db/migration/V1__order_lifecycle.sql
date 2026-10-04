ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS outlet_id TEXT REFERENCES public.outlets(outlet_id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'CONFIRMED';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expected_arrival TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS deferral_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_value NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.order_items(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
 product_code TEXT NOT NULL, quantity INT NOT NULL CHECK(quantity>0), weight_kg NUMERIC(10,2) NOT NULL CHECK(weight_kg>0),
 volume_m3 NUMERIC(8,3) NOT NULL CHECK(volume_m3>0), temp_requirement public.temp_requirement NOT NULL, unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
 UNIQUE(order_id,product_code)
);
CREATE TABLE IF NOT EXISTS public.order_timeline(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID NOT NULL REFERENCES public.orders(order_id) ON DELETE CASCADE,
 status TEXT NOT NULL, detail TEXT, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(order_id,status)
);
CREATE TABLE IF NOT EXISTS public.order_receipts(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID NOT NULL REFERENCES public.orders(order_id), confirmed_by UUID NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), lines JSONB NOT NULL, UNIQUE(order_id)
);
CREATE TABLE IF NOT EXISTS public.order_issues(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), order_id UUID NOT NULL REFERENCES public.orders(order_id), raised_by UUID NOT NULL,
 issue_type TEXT NOT NULL CHECK(issue_type IN('DAMAGED','SHORT','WRONG')), product_code TEXT, quantity INT, description TEXT, photo_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.order_outbox(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), event_type TEXT NOT NULL, routing_key TEXT NOT NULL, aggregate_id TEXT NOT NULL,
 payload JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', attempts INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), published_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS public.order_event_inbox(
 event_key TEXT PRIMARY KEY, event_type TEXT NOT NULL, processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON public.order_timeline(order_id,occurred_at);
CREATE INDEX IF NOT EXISTS idx_order_outbox_status ON public.order_outbox(status,created_at);
