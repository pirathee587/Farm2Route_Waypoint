-- ═══════════════════════════════════════════════════════════════════════════
--  ROLLBACK / DOWN SCRIPT — Migration 005
--  Reverts: 20261003000005_order_service_owned_tables.sql
--
--  ⚠️  WARNINGS — READ BEFORE RUNNING ⚠️
--
--  1. DESTRUCTIVE: All rows in order_items, order_deferrals,
--     delivery_tracking, receipt_confirmations, and issue_reports will be
--     permanently deleted.
--
--  2. orders.id will be renamed back to orders.order_id.  Any application
--     code or FK references using the 'id' column name must be updated.
--
--  3. vehicles.type values that were MOTORCYCLE before migration 005 were
--     blocked by the pre-check and therefore never migrated.  The rollback
--     cannot restore them; use a pre-migration-005 backup if needed.
--
--  4. orders.status rows that were CANCELLED before migration 005 were mapped
--     to DEFERRED during the forward migration.  The rollback cannot
--     distinguish them; restore from backup to recover CANCELLED rows.
--
--  5. FREEZE ALL WRITES to the affected tables before running this script.
--
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Step 1: Drop new outlet-scoped RLS policies ──────────────────────────

DROP POLICY IF EXISTS "orders_outlet_access"                ON public.orders;
DROP POLICY IF EXISTS "order_items_outlet_access"           ON public.order_items;
DROP POLICY IF EXISTS "order_deferrals_outlet_access"       ON public.order_deferrals;
DROP POLICY IF EXISTS "delivery_tracking_outlet_access"     ON public.delivery_tracking;
DROP POLICY IF EXISTS "receipt_confirmations_outlet_access" ON public.receipt_confirmations;
DROP POLICY IF EXISTS "issue_reports_outlet_access"         ON public.issue_reports;

-- Restore the original migration-002 order policies.
CREATE POLICY "store_manager_read_own_orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() IN (
      SELECT placed_by FROM public.orders WHERE outlet_id = orders.outlet_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
        AND role IN ('DISPATCHER', 'ADMIN', 'LOADER', 'DRIVER')
    )
  );

CREATE POLICY "store_manager_insert_orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ── Step 2: Drop the outlet-access helper function ───────────────────────

DROP FUNCTION IF EXISTS public.user_can_access_outlet(TEXT);

-- ── Step 3: Drop lifecycle tables (introduced by 005) ────────────────────

DROP TABLE IF EXISTS public.issue_reports;
DROP TABLE IF EXISTS public.receipt_confirmations;
DROP TABLE IF EXISTS public.delivery_tracking;
DROP TABLE IF EXISTS public.order_deferrals;
DROP TABLE IF EXISTS public.order_items;

-- ── Step 4: Revert the orders table ─────────────────────────────────────

-- 4a. Drop new index added by 005.
DROP INDEX IF EXISTS public.idx_orders_requested_delivery_date;

-- 4b. Drop new constraint added by 005.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_type_only_for_fresh;

-- 4c. Drop new columns added by 005.
ALTER TABLE public.orders
  DROP COLUMN IF EXISTS order_type,
  DROP COLUMN IF EXISTS created_by_user_id,
  DROP COLUMN IF EXISTS requested_delivery_date;

-- 4d. Re-add the NOT NULL constraints that 005 relaxed for legacy columns.
ALTER TABLE public.orders
  ALTER COLUMN product_code    SET NOT NULL,
  ALTER COLUMN quantity         SET NOT NULL,
  ALTER COLUMN weight_kg        SET NOT NULL,
  ALTER COLUMN volume_m3        SET NOT NULL,
  ALTER COLUMN temp_requirement SET NOT NULL,
  ALTER COLUMN window_open      SET NOT NULL,
  ALTER COLUMN window_close     SET NOT NULL;

-- 4e. Re-cast brand from order_brand back to TEXT (migration-002 stored TEXT).
ALTER TABLE public.orders
  ALTER COLUMN brand TYPE TEXT
    USING brand::TEXT;

-- 4f. Re-cast status from order_status_v2 back to the original order_status.
--     CANCELLED rows cannot be recovered — see warning #4 above.
ALTER TABLE public.orders
  ALTER COLUMN status TYPE public.order_status
    USING status::TEXT::public.order_status;

-- 4g. Rename id back to order_id.
ALTER TABLE public.orders
  RENAME COLUMN id TO order_id;

-- ── Step 5: Revert the vehicles table ────────────────────────────────────

-- 5a. Drop columns added by 005.
ALTER TABLE public.vehicles
  DROP COLUMN IF EXISTS fuel_type,
  DROP COLUMN IF EXISTS km_per_l,
  DROP COLUMN IF EXISTS weekly_fuel_quota_l;

-- 5b. Remove NOT NULL + default from temp, then drop the column.
ALTER TABLE public.vehicles
  ALTER COLUMN temp DROP NOT NULL,
  ALTER COLUMN temp DROP DEFAULT;
ALTER TABLE public.vehicles
  DROP COLUMN IF EXISTS temp;

-- 5c. Re-cast vehicles.type from vehicle_kind back to vehicle_type.
--     Casts to uppercase to match the migration-002 enum ('TRUCK', 'VAN').
--     MOTORCYCLE rows were blocked by the pre-check so only truck/van exist.
ALTER TABLE public.vehicles
  ALTER COLUMN type TYPE public.vehicle_type
    USING CASE lower(type::TEXT)
      WHEN 'truck' THEN 'TRUCK'::public.vehicle_type
      WHEN 'van'   THEN 'VAN'::public.vehicle_type
      ELSE (
        -- Unreachable if pre-check logic held; causes a division-by-zero
        -- error to surface any unexpected value rather than silently coerce.
        SELECT NULL::public.vehicle_type
        FROM (SELECT 1 / 0) AS _guard
      )
    END;

-- ── Step 6: Drop the new calendar table ─────────────────────────────────

DROP TABLE IF EXISTS public.calendar;

-- ── Step 7: Revert outlets table column additions ────────────────────────

ALTER TABLE public.outlets
  DROP COLUMN IF EXISTS brand,
  DROP COLUMN IF EXISTS dock_type,
  DROP COLUMN IF EXISTS parking_constraint,
  DROP COLUMN IF EXISTS mall_window_open,
  DROP COLUMN IF EXISTS mall_window_close,
  DROP COLUMN IF EXISTS window_open_time,
  DROP COLUMN IF EXISTS window_close_time;

-- ── Step 8: Remove outlet_id from user_profiles ──────────────────────────

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS outlet_id;

-- ── Step 9: Drop enum types introduced by 005 ───────────────────────────

DROP TYPE IF EXISTS public.issue_report_type;
DROP TYPE IF EXISTS public.tracking_status;
DROP TYPE IF EXISTS public.order_type;
DROP TYPE IF EXISTS public.vehicle_temp;
DROP TYPE IF EXISTS public.vehicle_kind;
DROP TYPE IF EXISTS public.dock_type;
DROP TYPE IF EXISTS public.parking_constraint;
DROP TYPE IF EXISTS public.order_brand;
DROP TYPE IF EXISTS public.order_status_v2;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
--  POST-ROLLBACK VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════
-- Run these manually after the rollback to confirm the schema is back in the
-- migration-002 state:
--
-- 1. Old enum types still present:
--    SELECT typname FROM pg_type
--    WHERE typname IN ('vehicle_type', 'order_status', 'temp_requirement');
--
-- 2. New tables gone:
--    SELECT tablename FROM pg_tables
--    WHERE schemaname = 'public'
--      AND tablename IN ('order_items', 'order_deferrals', 'delivery_tracking',
--                        'receipt_confirmations', 'issue_reports', 'calendar');
--    -- Expected: 0 rows.
--
-- 3. orders primary key column renamed back:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'orders'
--      AND column_name = 'order_id';
--    -- Expected: 1 row.
--
-- 4. No new enum types remaining:
--    SELECT typname FROM pg_type
--    WHERE typname IN ('order_status_v2', 'order_brand', 'vehicle_kind',
--                      'vehicle_temp', 'order_type', 'dock_type',
--                      'parking_constraint', 'tracking_status', 'issue_report_type');
--    -- Expected: 0 rows.
