-- ═══════════════════════════════════════════════════════════════════
--  Migration: 20261003000006_notification_schema.sql
--  Creates the notifications table for the notification service.
--  Notifications are stored per-user and keyed to event types.
-- ═══════════════════════════════════════════════════════════════════

-- ── notifications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    notification_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT        NOT NULL,
    event_type      TEXT        NOT NULL,   -- FLAG_RAISED | ORDER_DEFERRED | etc.
    title           TEXT        NOT NULL,
    body            TEXT        NOT NULL,
    payload_json    TEXT        NOT NULL DEFAULT '',
    read            BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

-- Index for per-user notification queries (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON public.notifications (user_id, created_at DESC);

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id, read)
    WHERE read = FALSE;

-- Index for event_type-based queries / analytics
CREATE INDEX IF NOT EXISTS idx_notifications_event_type
    ON public.notifications (event_type, created_at DESC);

COMMENT ON TABLE public.notifications IS
    'Per-user notification records persisted by the notification service for inbox + offline delivery.';

COMMENT ON COLUMN public.notifications.payload_json IS
    'Raw JSON payload from the originating RabbitMQ event for rich context in the UI.';
