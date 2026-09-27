-- ═══════════════════════════════════════════════════════════════════════════
--  MIGRATION 001 — AUTH SCHEMA
--  Service : Auth & User Service (.NET)
--  Supabase auth.users is the source of truth for login.
--  This schema extends it with roles, profiles, and refresh tokens.
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension (already on in Supabase, but safe to re-declare)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enum: User Roles ────────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM (
  'DISPATCHER',
  'LOADER',
  'DRIVER',
  'STORE_MANAGER',
  'ADMIN'
);

-- ── Table: user_profiles ────────────────────────────────────────────────────
-- Extended profile that mirrors auth.users and adds role + metadata.
-- Linked 1:1 to auth.users via id (UUID).
CREATE TABLE public.user_profiles (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL UNIQUE,
  role            user_role   NOT NULL DEFAULT 'DRIVER',
  depot           TEXT,                           -- Assigned depot (for LOADER/DRIVER)
  phone           TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.user_profiles IS
  'Extended user data linked to Supabase auth.users. Stores role and business metadata.';

-- ── Table: refresh_tokens ───────────────────────────────────────────────────
-- Custom refresh token management (used by .NET Auth service JWT rotation).
CREATE TABLE public.refresh_tokens (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash      TEXT        NOT NULL UNIQUE,    -- bcrypt hash of refresh token
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked         BOOLEAN     NOT NULL DEFAULT FALSE,
  revoked_at      TIMESTAMPTZ,
  user_agent      TEXT,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.refresh_tokens IS
  'Rotation-based refresh tokens for JWT auth. Revoked on use.';

-- ── Table: password_reset_tokens ───────────────────────────────────────────
CREATE TABLE public.password_reset_tokens (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash      TEXT        NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_user_profiles_email     ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role      ON public.user_profiles(role);
CREATE INDEX idx_refresh_tokens_user_id  ON public.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash     ON public.refresh_tokens(token_hash);
CREATE INDEX idx_reset_tokens_user_id    ON public.password_reset_tokens(user_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── Auto-create profile on auth.users insert (Supabase trigger) ────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'DRIVER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.user_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens  ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

-- ADMINs and DISPATCHERs can read all profiles
CREATE POLICY "admin_read_all_profiles"
  ON public.user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('ADMIN', 'DISPATCHER')
    )
  );

-- Users can only see their own refresh tokens
CREATE POLICY "users_own_refresh_tokens"
  ON public.refresh_tokens FOR ALL
  USING (auth.uid() = user_id);
