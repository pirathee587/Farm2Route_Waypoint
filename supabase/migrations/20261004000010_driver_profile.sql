ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS driver_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_profiles_driver_code ON public.user_profiles(driver_code) WHERE driver_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.driver_sessions (
  driver_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  pending_actions_count INT NOT NULL DEFAULT 0 CHECK(pending_actions_count>=0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.driver_sessions(driver_id,last_seen_at,last_synced_at,pending_actions_count)
VALUES('22222222-2222-2222-2222-222222222214',NOW(),((NOW() AT TIME ZONE 'Asia/Colombo')::date+TIME '09:26') AT TIME ZONE 'Asia/Colombo',0)
ON CONFLICT(driver_id) DO UPDATE SET last_synced_at=EXCLUDED.last_synced_at;

UPDATE public.user_profiles SET full_name='Kumar',driver_code='DRV014',depot='Peliyagoda' WHERE id='22222222-2222-2222-2222-222222222214';
