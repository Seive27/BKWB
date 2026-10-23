-- ============================================================
-- BKWB — mobile_login_issued_at on profiles
-- ------------------------------------------------------------
-- When staff leaves Email blank on Add New Resident (or runs
-- Issue Login for an import), auth still needs an internal
-- acc-<account>@example.com handle for GoTrue. That handle must
-- NOT be copied into profiles.email — email stays NULL until the
-- resident adds a real one in Account Setup.
--
-- profiles.mobile_login_issued_at marks that Account Number login
-- credentials were activated, so Staff can show Active instead of
-- "No Account Yet" without inventing a profile email.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mobile_login_issued_at TIMESTAMPTZ;

-- Anyone who already has the internal login handle on profiles.email
-- has had credentials issued; mark them and clear the fake email.
UPDATE public.profiles
SET
  mobile_login_issued_at = COALESCE(mobile_login_issued_at, NOW()),
  email = NULL
WHERE email IS NOT NULL
  AND lower(btrim(email)) ~ '^acc-[a-z0-9-]+@example\.com$';

CREATE INDEX IF NOT EXISTS profiles_mobile_login_issued_at_idx
  ON public.profiles (mobile_login_issued_at)
  WHERE mobile_login_issued_at IS NOT NULL;
