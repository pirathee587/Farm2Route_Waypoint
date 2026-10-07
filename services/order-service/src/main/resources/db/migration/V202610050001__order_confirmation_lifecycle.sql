ALTER TYPE public.order_status_v2 ADD VALUE IF NOT EXISTS 'CONFIRMED' AFTER 'PENDING';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status
  ON public.orders(requested_delivery_date, status);
