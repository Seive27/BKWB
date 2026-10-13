-- ============================================================
-- BKWB — Super Admin can activate or disable user logins
-- ------------------------------------------------------------
-- profiles.is_active is the login gate already checked by the
-- resident, meter reader, staff, and super admin apps.
--   true  → the user can sign in
--   false → sign-in is rejected and a restored session is signed out
--
-- Super admins are not covered by "Staff can update resident profiles"
-- (that policy is is_staff() and residents only). This adds a narrow
-- RPC that flips only is_active, plus a trigger so an account owner
-- cannot turn their own login back on.
--
-- Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = (SELECT auth.uid())
      AND r.name = 'super_admin'
      AND p.is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- Only an active super admin may change someone else's login flag.
-- The caller can never change their own row.
CREATE OR REPLACE FUNCTION public.set_profile_active(target_id uuid, active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (SELECT public.is_super_admin()) THEN
    RAISE EXCEPTION 'You do not have permission to change account status.'
      USING ERRCODE = '42501';
  END IF;

  IF target_id IS NULL OR active IS NULL THEN
    RAISE EXCEPTION 'Account and status are required.'
      USING ERRCODE = '22023';
  END IF;

  IF target_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'You cannot change your own account status.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET is_active = active
  WHERE id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found.'
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_profile_active(uuid, boolean) TO authenticated;

-- Block an account owner from flipping is_active on their own row.
-- Staff may still deactivate residents, and super admins may still
-- change other accounts. Service-role writes (no auth.uid()) are unchanged.
CREATE OR REPLACE FUNCTION public.guard_profile_is_active()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
    RETURN NEW;
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = OLD.id THEN
    RAISE EXCEPTION 'You cannot change your own account status.'
      USING ERRCODE = '42501';
  END IF;

  IF (SELECT public.is_super_admin()) OR (SELECT public.is_staff()) THEN
    RETURN NEW;
  END IF;

  IF (SELECT auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'You do not have permission to change account status.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_is_active ON public.profiles;
CREATE TRIGGER guard_profile_is_active
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_is_active();
