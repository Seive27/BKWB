-- ============================================================
-- BKWB — Super Admin consumer masterlist import
-- ------------------------------------------------------------
-- Called from System Settings → Import. The workbook columns use
-- the live table.column names. One row upserts:
--   profiles            (name; new consumers also get an auth user
--                        with a null email, so the residents list shows
--                        "No Account Yet" until staff issue a login)
--   meters              (meter_number, and legacy meter_serial)
--   resident_accounts   (keyed on account_number / Cons Code)
--
-- Re-uploading the same account number updates that account and
-- does not create a second profile. A blank current reading stays
-- NULL. A blank service address does not erase an address already
-- stored on the account.
--
-- Caller must be an active super admin. Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.import_consumer_masterlist(p_rows JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row JSONB;
  v_idx INTEGER := 0;
  v_row_number INTEGER;
  v_account_number TEXT;
  v_last_name TEXT;
  v_first_name TEXT;
  v_middle_name TEXT;
  v_meter_number TEXT;
  v_date_text TEXT;
  v_previous_date DATE;
  v_prev_text TEXT;
  v_curr_text TEXT;
  v_previous_reading NUMERIC;
  v_current_reading NUMERIC;
  v_sitio TEXT;
  v_service_address TEXT;
  v_existing UUID;
  v_profile_id UUID;
  v_meter_id UUID;
  v_new_user BOOLEAN;
  v_created INTEGER := 0;
  v_updated INTEGER := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT public.is_super_admin()) THEN
    RAISE EXCEPTION 'Only a super admin can import the consumer masterlist.'
      USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected a JSON array of import rows.'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Send at most 500 rows per import batch.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_idx := v_idx + 1;
    v_existing := NULL;
    v_profile_id := NULL;
    v_meter_id := NULL;
    v_new_user := FALSE;
    v_previous_date := NULL;
    v_previous_reading := NULL;
    v_current_reading := NULL;

    v_row_number := COALESCE(NULLIF(v_row->>'_row', '')::INTEGER, v_idx);
    v_account_number := NULLIF(btrim(COALESCE(v_row->>'resident_accounts.account_number', '')), '');
    v_last_name := NULLIF(btrim(COALESCE(v_row->>'profiles.last_name', '')), '');
    v_first_name := NULLIF(btrim(COALESCE(v_row->>'profiles.first_name', '')), '');
    v_middle_name := NULLIF(btrim(COALESCE(v_row->>'profiles.middle_name', '')), '');
    v_meter_number := NULLIF(btrim(COALESCE(v_row->>'meters.meter_number', '')), '');
    v_date_text := NULLIF(btrim(COALESCE(v_row->>'resident_accounts.previous_reading_date', '')), '');
    v_prev_text := NULLIF(btrim(COALESCE(v_row->>'resident_accounts.previous_reading', '')), '');
    v_curr_text := NULLIF(btrim(COALESCE(v_row->>'resident_accounts.current_reading', '')), '');
    v_sitio := NULLIF(btrim(COALESCE(v_row->>'resident_accounts.sitio', '')), '');
    v_service_address := NULLIF(btrim(COALESCE(v_row->>'resident_accounts.service_address', '')), '');

    IF v_account_number IS NULL THEN
      RAISE EXCEPTION 'Row %: resident_accounts.account_number is required.', v_row_number
        USING ERRCODE = '22023';
    END IF;
    IF v_last_name IS NULL OR v_first_name IS NULL THEN
      RAISE EXCEPTION 'Row %: profiles.last_name and profiles.first_name are required.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    IF v_date_text IS NOT NULL THEN
      IF v_date_text !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'Row %: resident_accounts.previous_reading_date must be YYYY-MM-DD.', v_row_number
          USING ERRCODE = '22023';
      END IF;
      v_previous_date := v_date_text::DATE;
    END IF;

    IF v_prev_text IS NOT NULL THEN
      IF v_prev_text !~ '^\d+(\.\d+)?$' THEN
        RAISE EXCEPTION 'Row %: resident_accounts.previous_reading must be a non-negative number.', v_row_number
          USING ERRCODE = '22023';
      END IF;
      v_previous_reading := v_prev_text::NUMERIC;
    END IF;

    IF v_curr_text IS NOT NULL THEN
      IF v_curr_text !~ '^\d+(\.\d+)?$' THEN
        RAISE EXCEPTION 'Row %: resident_accounts.current_reading must be a non-negative number. Leave it blank when it has not been recorded.', v_row_number
          USING ERRCODE = '22023';
      END IF;
      v_current_reading := v_curr_text::NUMERIC;
    END IF;

    IF v_current_reading IS NOT NULL
       AND v_previous_reading IS NOT NULL
       AND v_current_reading < v_previous_reading THEN
      RAISE EXCEPTION 'Row %: resident_accounts.current_reading is lower than resident_accounts.previous_reading.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    SELECT resident_id INTO v_existing
    FROM public.resident_accounts
    WHERE account_number = v_account_number
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
        is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
        phone_change, phone_change_token, phone_change_sent_at,
        reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
      )
      VALUES (
        gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        NULL, NULL, NULL, NULL, '', NULL, '', NULL, '', '', NULL, NULL,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name),
        FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', NULL, FALSE, NULL, FALSE
      )
      RETURNING id INTO v_profile_id;

      v_new_user := TRUE;
    ELSE
      v_profile_id := v_existing;
    END IF;

    UPDATE public.profiles
    SET first_name = v_first_name,
        middle_name = v_middle_name,
        last_name = v_last_name
    WHERE id = v_profile_id;

    IF v_new_user THEN
      UPDATE public.profiles
      SET email = NULL,
          phone = NULL,
          date_of_birth = NULL
      WHERE id = v_profile_id;
    END IF;

    IF v_meter_number IS NOT NULL THEN
      SELECT id INTO v_meter_id
      FROM public.meters
      WHERE meter_number = v_meter_number
         OR meter_serial = v_meter_number
      ORDER BY CASE WHEN meter_number = v_meter_number THEN 0 ELSE 1 END
      LIMIT 1;

      IF v_meter_id IS NULL THEN
        INSERT INTO public.meters (meter_number, meter_serial, is_active)
        VALUES (v_meter_number, v_meter_number, TRUE)
        RETURNING id INTO v_meter_id;
      ELSE
        UPDATE public.meters
        SET meter_number = COALESCE(meter_number, v_meter_number),
            meter_serial = COALESCE(meter_serial, v_meter_number)
        WHERE id = v_meter_id;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.resident_accounts
        WHERE meter_id = v_meter_id
          AND account_number IS DISTINCT FROM v_account_number
      ) THEN
        RAISE EXCEPTION 'Row %: meters.meter_number % is already linked to another account.', v_row_number, v_meter_number
          USING ERRCODE = '23505';
      END IF;
    END IF;

    INSERT INTO public.resident_accounts (
      resident_id,
      account_number,
      meter_id,
      service_address,
      sitio,
      previous_reading,
      current_reading,
      previous_reading_date
    )
    VALUES (
      v_profile_id,
      v_account_number,
      v_meter_id,
      v_service_address,
      v_sitio,
      v_previous_reading,
      v_current_reading,
      v_previous_date
    )
    ON CONFLICT (account_number) DO UPDATE SET
      meter_id = EXCLUDED.meter_id,
      sitio = EXCLUDED.sitio,
      previous_reading = EXCLUDED.previous_reading,
      current_reading = EXCLUDED.current_reading,
      previous_reading_date = EXCLUDED.previous_reading_date,
      service_address = COALESCE(EXCLUDED.service_address, public.resident_accounts.service_address);

    IF v_new_user THEN
      v_created := v_created + 1;
    ELSE
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'total_rows', v_idx
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_consumer_masterlist(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_consumer_masterlist(JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
