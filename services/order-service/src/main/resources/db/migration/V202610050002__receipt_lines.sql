CREATE TABLE IF NOT EXISTS public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipt_confirmations(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  expected_qty INTEGER NOT NULL CHECK (expected_qty >= 0),
  received_qty INTEGER NOT NULL CHECK (received_qty >= 0),
  UNIQUE (receipt_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id ON public.receipt_items(receipt_id);
