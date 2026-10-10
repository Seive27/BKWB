-- First-login email confirmation.
-- Supabase Auth emails the code (reauthenticate). verifyOtp does not check
-- that code, so this function compares it to auth.users.reauthentication_token
-- for the signed-in user only, then clears it.

CREATE OR REPLACE FUNCTION public.confirm_registered_email(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_token text;
  v_sent_at timestamptz;
  v_hash text;
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'You must be signed in.');
  END IF;

  v_code := regexp_replace(coalesce(p_code, ''), '\s', '', 'g');
  IF v_code !~ '^[0-9]{6,8}$' THEN
    RETURN json_build_object('ok', false, 'error', 'Please enter the verification code from your email.');
  END IF;

  SELECT u.email, u.reauthentication_token, u.reauthentication_sent_at
    INTO v_email, v_token, v_sent_at
  FROM auth.users u
  WHERE u.id = auth.uid();

  IF v_email IS NULL
     OR lower(btrim(v_email)) ~ '^(acc-[a-z0-9-]+|no-email-[a-f0-9]+)@example\.com$'
     OR v_token IS NULL
     OR btrim(v_token) = ''
     OR v_sent_at IS NULL
     OR v_sent_at < (now() - interval '1 hour') THEN
    RETURN json_build_object('ok', false, 'error', 'That code is incorrect or has expired. Please request a new one.');
  END IF;

  v_hash := encode(
    extensions.digest(convert_to(v_email || v_code, 'UTF8'), 'sha224'),
    'hex'
  );

  IF v_hash IS DISTINCT FROM v_token THEN
    RETURN json_build_object('ok', false, 'error', 'That code is incorrect or has expired. Please request a new one.');
  END IF;

  UPDATE auth.users
  SET reauthentication_token = '',
      reauthentication_sent_at = NULL
  WHERE id = auth.uid();

  RETURN json_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_registered_email(text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_registered_email(text) TO authenticated;
