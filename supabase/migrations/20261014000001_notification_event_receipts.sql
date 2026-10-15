-- ═══════════════════════════════════════════════════════════════════
--  Migration: 20261014000001_notification_event_receipts.sql
--  Idempotency ledger for the notification-service RabbitMQ consumer.
--
--  The consumer inserts one receipt per event key in the same
--  transaction as the notification fan-out rows. A redelivered or
--  re-published event finds its key already present and is skipped.
--
--  Additive only: no existing table or row is modified.
--  DEPLOYMENT ORDER: apply before deploying the notification-service
--  build that calls CreateForRolesOnce; otherwise every persisted event
--  fails, is retried and ends in notification.dead-letter.
--  NOT YET APPLIED to any environment — requires schema review.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notification_event_receipts (
    event_key    TEXT        PRIMARY KEY,   -- 'sha256:<hex>' of event type + body
    event_type   TEXT        NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supports age-based pruning of old receipts.
CREATE INDEX IF NOT EXISTS idx_notification_event_receipts_processed_at
    ON public.notification_event_receipts (processed_at);

-- Service-internal table: not exposed through the Supabase Data API.
-- Guarded so plain PostgreSQL test fixtures without Supabase roles still apply.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON TABLE public.notification_event_receipts FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON TABLE public.notification_event_receipts FROM authenticated;
    END IF;
END $$;

COMMENT ON TABLE public.notification_event_receipts IS
    'Processed RabbitMQ event keys; guarantees at-most-once notification persistence per event.';
