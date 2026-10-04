-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 006: Reference Data RLS Policy Audit & Fix
--  File: 20261003000006_reference_data_rls_policies.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Fix RLS Gap on public.calendar ─────────────────────────────────────
-- PostgreSQL default RLS behavior: When RLS is enabled (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
-- without any policies defined, Postgres defaults to DEFAULT-DENY (deny all reads/writes)
-- for non-owner roles (e.g. authenticated users).
--
-- Calendar is master reference data (delivery dates, cutoff times, operating days)
-- with no outlet ownership constraints. Read access must be granted to all authenticated users.

ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_calendar" ON public.calendar;
CREATE POLICY "auth_read_calendar"
  ON public.calendar FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "service_role_all_calendar" ON public.calendar;
CREATE POLICY "service_role_all_calendar"
  ON public.calendar FOR ALL
  USING (auth.role() = 'service_role');

-- Note: No INSERT/UPDATE/DELETE policies are granted to authenticated users.
-- Modification of calendar entries is reserved exclusively for service_role / admins.


-- ── 2. Audit & Intentionality Confirmation for outlets and vehicles ─────────
-- AUDIT NOTE ON OUTLETS & VEHICLES RLS POLICIES:
--
-- In migration 002 (20260927000002_order_schema.sql), public.outlets and public.vehicles
-- were configured with policies granting SELECT access to any authenticated user:
--   - "auth_read_outlets"   ON public.outlets FOR SELECT USING (auth.role() = 'authenticated')
--   - "auth_read_vehicles"  ON public.vehicles FOR SELECT USING (auth.role() = 'authenticated')
--
-- CONFIRMATION OF INTENTIONAL BEHAVIOR (NOT AN OVERSIGHT):
-- Outlets and vehicles are system-wide master reference datasets.
-- Unlike transactional records (such as orders/order_items, which must be strictly
-- scoped to user_profiles.outlet_id for Store Managers), reference data must be readable
-- across all operational roles:
--   - Dispatchers require visibility of all outlets and vehicle capacities for route planning.
--   - Loaders and Drivers require visibility of depot vehicles and destination outlets.
--   - Store Managers require visibility of outlet metadata for multi-outlet or transfer operations.
--
-- Restricting outlets or vehicles to outlet-scoped RLS would break multi-depot planning and
-- cross-outlet dispatch workflows. Therefore, broad SELECT access for all authenticated users
-- is the explicit, intended security posture for reference tables.

-- Ensure policies are explicitly maintained and present:

DROP POLICY IF EXISTS "auth_read_outlets" ON public.outlets;
CREATE POLICY "auth_read_outlets"
  ON public.outlets FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "service_role_all_outlets" ON public.outlets;
CREATE POLICY "service_role_all_outlets"
  ON public.outlets FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "auth_read_vehicles" ON public.vehicles;
CREATE POLICY "auth_read_vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "service_role_all_vehicles" ON public.vehicles;
CREATE POLICY "service_role_all_vehicles"
  ON public.vehicles FOR ALL
  USING (auth.role() = 'service_role');
