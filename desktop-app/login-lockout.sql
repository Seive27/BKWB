-- Login lockout for incorrect passwords and other credentials.
-- The first two failures can be retried immediately. The third starts a
-- 30-second wait. Each later consecutive failure adds 15 seconds
-- (45, 60, 75, ...). A correct sign-in clears the streak.
-- Attempts made while a wait is still active do not add more time.

CREATE TABLE IF NOT EXISTS public.login_lockouts (
  identifier text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_lockouts_failed_count_nonnegative CHECK (failed_count >= 0),
  CONSTRAINT login_lockouts_identifier_length CHECK (char_length(identifier) BETWEEN 1 AND 320)
);

ALTER TABLE public.login_lockouts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.login_lockouts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.login_lockout_normalize(p_identifier text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_identifier IS NULL THEN NULL
    WHEN char_length(lower(btrim(p_identifier))) NOT BETWEEN 1 AND 320 THEN NULL
    ELSE lower(btrim(p_identifier))
  END;
$$;

CREATE OR REPLACE FUNCTION public.login_lockout_status(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key text;
  v_count integer;
  v_locked_until timestamptz;
  v_seconds integer;
BEGIN
  v_key := public.login_lockout_normalize(p_identifier);
  IF v_key IS NULL THEN
    RETURN jsonb_build_object('retry_after_seconds', 0, 'failed_count', 0);
  END IF;

  SELECT failed_count, locked_until
    INTO v_count, v_locked_until
  FROM public.login_lockouts
  WHERE identifier = v_key;

  IF NOT FOUND OR v_locked_until IS NULL OR v_locked_until <= now() THEN
    RETURN jsonb_build_object(
      'retry_after_seconds', 0,
      'failed_count', coalesce(v_count, 0)
    );
  END IF;

  v_seconds := ceil(extract(epoch FROM (v_locked_until - now())))::integer;
  RETURN jsonb_build_object(
    'retry_after_seconds', greatest(v_seconds, 1),
    'failed_count', v_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.register_failed_login(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key text;
  v_count integer;
  v_locked_until timestamptz;
  v_seconds integer;
BEGIN
  v_key := public.login_lockout_normalize(p_identifier);
  IF v_key IS NULL THEN
    RETURN jsonb_build_object('retry_after_seconds', 0, 'failed_count', 0);
  END IF;

  INSERT INTO public.login_lockouts (identifier, failed_count, locked_until, updated_at)
  VALUES (v_key, 0, NULL, now())
  ON CONFLICT (identifier) DO NOTHING;

  SELECT failed_count, locked_until
    INTO v_count, v_locked_until
  FROM public.login_lockouts
  WHERE identifier = v_key
  FOR UPDATE;

  IF v_locked_until IS NOT NULL AND v_locked_until > now() THEN
    v_seconds := ceil(extract(epoch FROM (v_locked_until - now())))::integer;
    RETURN jsonb_build_object(
      'retry_after_seconds', greatest(v_seconds, 1),
      'failed_count', v_count
    );
  END IF;

  v_count := v_count + 1;

  IF v_count >= 3 THEN
    -- 3rd failure = 30s, 4th = 45s, 5th = 60s, ...
    v_seconds := 30 + (v_count - 3) * 15;
    -- Keep a script from pushing one identifier out for more than a day.
    v_seconds := least(v_seconds, 86400);
    v_locked_until := now() + (v_seconds * interval '1 second');
  ELSE
    v_seconds := 0;
    v_locked_until := NULL;
  END IF;

  UPDATE public.login_lockouts
  SET failed_count = v_count,
      locked_until = v_locked_until,
      updated_at = now()
  WHERE identifier = v_key;

  RETURN jsonb_build_object(
    'retry_after_seconds', v_seconds,
    'failed_count', v_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_login_lockout(p_identifier text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_key text;
  v_email text;
  v_allowed boolean := false;
BEGIN
  v_key := public.login_lockout_normalize(p_identifier);
  IF v_key IS NULL THEN
    RETURN;
  END IF;

  IF coalesce(auth.jwt() ->> 'role', '') = 'service_role' THEN
    v_allowed := true;
  ELSIF auth.uid() IS NOT NULL THEN
    SELECT lower(btrim(u.email))
      INTO v_email
    FROM auth.users u
    WHERE u.id = auth.uid();

    v_allowed := v_email IS NOT NULL AND v_email = v_key;

    IF NOT v_allowed THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.resident_accounts ra
        WHERE ra.resident_id = auth.uid()
          AND lower(btrim(ra.account_number)) = v_key
      )
      INTO v_allowed;
    END IF;
  END IF;

  IF v_allowed THEN
    DELETE FROM public.login_lockouts WHERE identifier = v_key;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.login_lockout_normalize(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.login_lockout_status(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_failed_login(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_login_lockout(text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.login_lockout_status(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_failed_login(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_login_lockout(text) TO authenticated, service_role;
