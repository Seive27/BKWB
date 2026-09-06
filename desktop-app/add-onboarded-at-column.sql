-- ============================================================
-- BKWB — Resident first-login account setup (onboarding state)
-- ------------------------------------------------------------
-- Adds the single onboarding state field used by the Resident
-- mobile app's mandatory Account Setup flow:
--
--   profiles.onboarded_at TIMESTAMPTZ (NULL = setup required)
--
-- States:
--   NULL            → first login / setup required
--   (email pending) → email verification required (GoTrue-managed:
--                     the auth user's pending email_change token
--                     stays unconfirmed until the code is entered)
--   NOT NULL        → active / onboarded
--
-- NO other state system, NO new tables. RLS policies are untouched:
-- residents still own their profile row via auth.uid(), and the new
-- RPC is SECURITY DEFINER + tight so it can never be abused.
--
-- Safe to re-run. Existing accounts keep working: profiles that
-- already have a REAL email are backfilled as onboarded.
-- ============================================================

-- 1. The onboarding state column.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- 2. Backfill: anyone who already has a real (non-login-handle) email
--    has already completed setup — never force them through it.
--    Login handles look like acc-12345@example.com.
UPDATE public.profiles
SET onboarded_at = NOW()
WHERE onboarded_at IS NULL
  AND email IS NOT NULL
  AND lower(btrim(email)) !~ '^acc-[a-z0-9-]+@example\.com$';

-- 3. Fast lookup for the login-path onboarding check.
CREATE INDEX IF NOT EXISTS profiles_onboarded_at_idx
  ON public.profiles (onboarded_at)
  WHERE onboarded_at IS NULL;

-- 4. Finalization RPC — called by the Resident app AFTER the resident
--    has (a) authenticated with Account Number + temporary password,
--    (b) received and entered the OTP sent to their own email, and
--    (c) set a new password. It flips onboarded_at in one atomic call.
--
--    SECURITY:
--      * Runs as the authenticated resident; the profile row is located
--        strictly by auth.uid() — never by a client-supplied account
--        number — so nobody can complete setup for someone else.
--      * Fails closed unless the auth user has a REAL, CONFIRMED email
--        (login handles @example.com can never receive the OTP, and
--        GoTrue only swaps the email after the code is verified).
--      * No passwords or secrets are passed in or logged here; the
--        password itself was set via Supabase Auth updateUser().
CREATE OR REPLACE FUNCTION public.complete_resident_onboarding()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email           TEXT;
  v_email_confirmed BOOLEAN;
  v_display_email   TEXT;
  v_first_name      TEXT;
  v_last_name       TEXT;
BEGIN
  -- Only an authenticated caller has a profile to onboard.
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', FALSE, 'error', 'You must be signed in.');
  END IF;

  -- Check the AUTH email (GoTrue) — NOT profiles.email. By this point the
  -- resident has completed the verified email change, so auth.users.email
  -- holds their real address while profiles.email still holds the old
  -- internal handle; profiles is synced below in the same statement.
  SELECT u.email,
         (u.email_confirmed_at IS NOT NULL)
  INTO v_email, v_email_confirmed
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL OR v_email_confirmed IS NOT TRUE THEN
    RETURN json_build_object('ok', FALSE, 'error', 'Your email is not confirmed yet.');
  END IF;

  -- A login handle or placeholder is NOT a real mailbox; setup requires a
  -- real, verified email on the AUTH user.
  IF lower(btrim(v_email)) ~ '^(acc-[a-z0-9-]+|no-email-[a-f0-9]+)@example\.com$' THEN
    RETURN json_build_object('ok', FALSE, 'error',
      'A real email address must be verified before completing setup.');
  END IF;

  -- Flip the state and sync the verified real email down to the profile so
  -- staff tooling (canIssueLogin / resident-login) sees it and never
  -- clobbers it. Only this authenticated user's row is touched.
  UPDATE public.profiles
  SET onboarded_at = NOW(),
      email = v_email
  WHERE id = auth.uid();

  SELECT first_name, last_name, email
  INTO v_first_name, v_last_name, v_display_email
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN json_build_object(
    'ok', TRUE,
    'first_name', v_first_name,
    'last_name', v_last_name,
    'email', v_display_email
  );
END;
$$;

-- 5. Grant execute to authenticated residents (default is PUBLIC for
--    functions, but be explicit; the body still fails closed for anon).
GRANT EXECUTE ON FUNCTION public.complete_resident_onboarding() TO authenticated;

NOTIFY pgrst, 'reload schema';
