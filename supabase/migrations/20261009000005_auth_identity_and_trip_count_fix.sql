-- Gateway identities are owned by auth-service (auth_schema). Loader audit IDs
-- must not be constrained to the legacy Supabase auth store.
ALTER TABLE public.issue_flags DROP CONSTRAINT IF EXISTS issue_flags_flagged_by_fkey;
ALTER TABLE public.issue_flags DROP CONSTRAINT IF EXISTS issue_flags_resolved_by_fkey;
