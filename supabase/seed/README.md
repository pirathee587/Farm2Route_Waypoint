# Supabase Seed Data

This directory contains standalone seed scripts that are designed to be run manually by developers or administrators.

## Scripts

### `seed_users.sql`
Creates demo/development user accounts in `auth.users` and `public.user_profiles` with default password `Password@123`:

- **Loader**: `kumar.loader@waypoint.lk` (User ID: `11111111-1111-1111-1111-111111111101`)
- **Driver**: `nimal.driver@waypoint.lk` (User ID: `22222222-2222-2222-2222-222222222201`)
- **Dispatcher**: `dispatcher@waypoint.lk` (User ID: `33333333-3333-3333-3333-333333333301`)

### Execution
Run via Supabase Dashboard SQL Editor or via CLI:
```bash
psql $DATABASE_URL -f supabase/seed/seed_users.sql
```
