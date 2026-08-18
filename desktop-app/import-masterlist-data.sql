-- ============================================================
-- BKWB — Import: Barangay Kalunasan Meter Reader Masterlist
-- ------------------------------------------------------------
-- LIMITED AUTHORIZED TESTING EXTRACT — 55 consumer records
-- (5 per sitio, 11 sitios) extracted from
-- "Meter Reader Masterlist.xlsx" (Page 1 of 97).
--
-- PREREQUISITE:
--   Run import-masterlist-schema.sql in the Supabase SQL Editor
--   FIRST (it makes profiles.email optional, adds 'applicant' to
--   connection_status, and adds the reading snapshot columns).
--
-- WHAT THIS DOES:
--   * Upserts one row per consumer, keyed on CONSUMER CODE.
--     Cons Code is stored as resident_accounts.account_number.
--   * Never creates duplicates: if the Cons Code already exists,
--     only the masterlist-provided fields are updated.
--   * Creates auth users + resident profiles ONLY for cons codes
--     that do not exist yet. Imported consumers have NO email /
--     phone / DOB (not authorized by the barangay), so they are
--     account records — not login accounts. Sample/demo accounts
--     with real credentials are untouched and keep working.
--   * Meter Serial Numbers are stored as TEXT (leading zeros and
--     formats like '2024-0006697' are preserved exactly).
--   * A BLANK Current Reading stays NULL. It is never converted
--     to zero and never marks the consumer inactive.
--   * Service address, outstanding balance, billing and payment
--     history are NOT imported (barangay has not authorized them).
--
-- SAFE TO RE-RUN. Run the whole file in the SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- A. Pre-flight checks (clear errors instead of confusing ones)
-- ------------------------------------------------------------
DO $$
DECLARE
  v_email_nullable  BOOLEAN;
  v_users_email_ok  BOOLEAN;
  v_accounts_unique BOOLEAN;
BEGIN
  SELECT is_nullable = 'YES' INTO v_email_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email';

  IF NOT v_email_nullable THEN
    RAISE EXCEPTION 'profiles.email is still NOT NULL. Run import-masterlist-schema.sql first (step 1 makes email optional).';
  END IF;

  SELECT is_nullable = 'YES' INTO v_users_email_ok
  FROM information_schema.columns
  WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email';

  IF NOT v_users_email_ok THEN
    RAISE EXCEPTION 'This Supabase project''s auth.users.email does not allow NULL, so masterlist consumers (who have no email) cannot be imported as records. Contact the project owner to upgrade GoTrue.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'resident_accounts'
      AND indexdef ILIKE '%account_number%'
  ) INTO v_accounts_unique;

  IF NOT v_accounts_unique THEN
    RAISE EXCEPTION 'resident_accounts.account_number has no unique index. Run the main BKWB migration (or add a UNIQUE constraint on account_number) before importing.';
  END IF;
END $$;

-- ------------------------------------------------------------
-- B. Stage the source rows (order preserved from the workbook)
-- ------------------------------------------------------------
CREATE TEMP TABLE IF NOT EXISTS masterlist_import (
  seq               INTEGER PRIMARY KEY,
  cons_code         TEXT NOT NULL,
  last_name         TEXT,
  first_name        TEXT,
  middle_name       TEXT,
  meter_serial      TEXT,
  previous_period   DATE,
  previous_reading  NUMERIC,
  current_reading   NUMERIC,
  status            TEXT NOT NULL DEFAULT 'active',
  sitio             TEXT
);

TRUNCATE masterlist_import;

INSERT INTO masterlist_import
  (seq, cons_code, last_name, first_name, middle_name, meter_serial,
   previous_period, previous_reading, current_reading, status, sitio)
VALUES
  (1, '9283', 'ABELGAS', 'ALMA', 'MAGDADARO', '12793', '2021-07-01', 1760, NULL, 'inactive', 'AWIHAW'),
  (2, '7621', 'ABELGAS', 'VERONICA', 'SEPTIMO', '25596', '2026-05-01', 1617, 1626, 'active', 'AWIHAW'),
  (3, '3341', 'ABILGAS', 'REYNALDO', 'BORRES', '20816363', '2026-05-01', 795, 795, 'active', 'AWIHAW'),
  (4, '9865', 'ANTIGA', 'MARICEL', 'BAYLON', NULL, NULL, 0, NULL, 'applicant', 'AWIHAW'),
  (5, '7001', 'APA-AP', 'PETERSON', 'WAMINAL', '13799', '2026-05-01', 525, 533, 'active', 'AWIHAW'),
  (6, '13429', 'ALONSABE', 'NATHAN', 'O.', '562', '2026-05-01', 309, 312, 'active', 'ELLENA HOMES'),
  (7, '13427', 'AMACNA', 'MONALISA', NULL, '150931748', '2026-05-01', 1569, 1583, 'active', 'ELLENA HOMES'),
  (8, '14443', 'APAAP', 'RYAN', 'ERMO', '231555061', '2026-05-01', 170, 183, 'active', 'ELLENA HOMES'),
  (9, '14801', 'BACOLOD', 'NESTOR', 'JOHN T.', '1315132', '2026-05-01', 74, 80, 'active', 'ELLENA HOMES'),
  (10, '13423', 'BAGUIO', 'SUSANA', 'OLIS', '150310287', '2026-05-01', 1215, 1229, 'active', 'ELLENA HOMES'),
  (11, '4561', 'ADOLFO', 'MELECIA', 'POGOY', '4561', '2026-05-01', 1932, 1932, 'active', 'LARIHA'),
  (12, '12261', 'ANGCAHAN', 'TERESITA', 'PATRIA', '1655970', '2026-05-01', 1070, 1074, 'active', 'LARIHA'),
  (13, '76', 'BACTOL', 'EVA', 'JAO', '1119370', '2026-05-01', 1677, 1677, 'active', 'LARIHA'),
  (14, '9481', 'BADAYOS', 'MARCELA', 'TABARNO', '13553', '2026-05-01', 2837, 2844, 'active', 'LARIHA'),
  (15, '8861', 'BARBON', 'CECILIA', 'MORGA', '974', '2026-05-01', 2640, 2667, 'active', 'LARIHA'),
  (16, '6761', 'ABAPO', 'ARMAND', NULL, '120605701', '2026-05-01', 2160, 2174, 'active', 'LOKANA'),
  (17, '482', 'AGUILAR', 'MARICEL', NULL, '40218100', '2026-05-01', 3590, 3603, 'active', 'LOKANA'),
  (18, '99', 'ALVAREZ', 'ANDRESA', NULL, '600028', '2026-05-01', 2331, 2350, 'active', 'LOKANA'),
  (19, '9181', 'ANDRINO', 'ALICIA', 'RIVERA', '14956', '2026-05-01', 3636, 3648, 'active', 'LOKANA'),
  (20, '462', 'ANTECRISTO', 'MARCELINA', NULL, '907622', '2026-05-01', 2417, 2426, 'active', 'LOKANA'),
  (21, '10382', 'ABAO', 'REBECCA', 'GUASEN', '21794', '2026-05-01', 2424, 2441, 'active', 'LOWER KALUNASAN'),
  (22, '14372', 'ABAPO', 'HYNGEN', 'REGIDOR', '2024-0006697', '2026-05-01', 122, 135, 'active', 'LOWER KALUNASAN'),
  (23, '602', 'ABOT', 'FELIPA', NULL, '20050608', '2026-05-01', 4700, 4727, 'active', 'LOWER KALUNASAN'),
  (24, '11021', 'ALOLOR', 'ROLANDO', 'CHAVEZ', '130170780', '2026-05-01', 1407, 1421, 'active', 'LOWER KALUNASAN'),
  (25, '15141', 'AMORCILLO', 'JUNREY', NULL, '222127415', '2026-05-01', 55, 58, 'active', 'LOWER KALUNASAN'),
  (26, '2602', 'ABELLA', 'ALFREDO', 'ALCOSEBA', '209570', '2026-05-01', 4348, 4348, 'active', 'MOUNTAIN VIEW VILLAGE'),
  (27, '2901', 'ARANTE', 'RENITA', 'GOMEZ', '100524785', '2026-05-01', 5064, 5109, 'active', 'MOUNTAIN VIEW VILLAGE'),
  (28, '10721', 'BAGUIO', 'ARETAS', 'PATAC', '2009281610', '2026-05-01', 964, 965, 'active', 'MOUNTAIN VIEW VILLAGE'),
  (29, '14561', 'BALDERAS', 'LIONEL', 'M.', '231555212', '2026-05-01', 249, 263, 'active', 'MOUNTAIN VIEW VILLAGE'),
  (30, '9221', 'BASADRE', 'ERVIN', 'OCAMPOS', '21592', '2026-05-01', 1972, 1988, 'active', 'MOUNTAIN VIEW VILLAGE'),
  (31, '10742', 'ABAPO', 'PAULINO', 'JR. MONTERDE', '558', '2026-05-01', 1782, 1794, 'active', 'PANG PANG LANOG'),
  (32, '14367', 'ABELLA', 'JENELYN', 'NAVARRO', '231408637', '2026-05-01', 176, 184, 'active', 'PANG PANG LANOG'),
  (33, '9379', 'ADOLFO', 'ELENA', NULL, '21659', '2026-05-01', 1417, 1437, 'active', 'PANG PANG LANOG'),
  (34, '8951', 'ALBARACIN', 'EMILYN', NULL, '2012300276', '2026-05-01', 1717, 1750, 'active', 'PANG PANG LANOG'),
  (35, '13684', 'ALEGRE', 'CHARITO', 'NARCISO', '102595', '2026-05-01', 633, 657, 'active', 'PANG PANG LANOG'),
  (36, '681', 'ABELLA', 'RUBEN', 'G.', '932297', '2026-04-01', 4889, 4963, 'active', 'UPPER KALUNASAN'),
  (37, '9584', 'ALPAR', 'ARISTEO', 'S.', '130303923', '2026-04-01', 5081, 5081, 'active', 'UPPER KALUNASAN'),
  (38, '4722', 'ARDA', 'RIZA', 'EBARITA', '110601461', '2026-04-01', 1544, 1553, 'active', 'UPPER KALUNASAN'),
  (39, '11783', 'BANA-AY', 'EUGENIO', 'JR. BILAR', '150700784', '2026-04-01', 638, 638, 'active', 'UPPER KALUNASAN'),
  (40, '11784', 'BANA-AY', 'EUGENIO', 'JR. #2', '150700713', '2026-04-01', 967, 967, 'active', 'UPPER KALUNASAN'),
  (41, '127', 'ACABADO', 'HAIDE', NULL, '10143680', '2026-05-01', 1770, 1774, 'active', 'SAN JOSE VILLE'),
  (42, '128', 'ALBINA', 'MARIO', NULL, '7462', '2026-05-01', 2727, 2734, 'active', 'SAN JOSE VILLE'),
  (43, '4341', 'ALCIBAR', 'CONCEPCION', 'EBARLE', '110410437', '2026-05-01', 753, 756, 'active', 'SAN JOSE VILLE'),
  (44, '5742', 'BACARISAS', 'MARK', 'JONE P.', '20111004295', '2026-05-01', 1576, 1582, 'active', 'SAN JOSE VILLE'),
  (45, '1521', 'BINGHAY', 'NECITAS', 'P.', '926810', '2026-05-01', 3451, 3469, 'active', 'SAN JOSE VILLE'),
  (46, '174', 'ALBINA', 'GABRIEL', NULL, '903464', '2026-05-01', 3932, 3942, 'active', 'SAN MARCELO'),
  (47, '465', 'AMADORA', 'MADELINE', NULL, '2265', '2026-05-01', 5635, 5647, 'active', 'SAN MARCELO'),
  (48, '11161', 'AÑASCO', 'ALETH', 'ZOZOBRADO', '1164', '2026-05-01', 1475, 1488, 'active', 'SAN MARCELO'),
  (49, '180', 'BACO', 'REY', NULL, '537', '2026-05-01', 2783, 2792, 'active', 'SAN MARCELO'),
  (50, '172', 'BOTERO JR.', 'FELICISIMO', NULL, '903672', '2026-05-01', 4314, 4330, 'active', 'SAN MARCELO'),
  (51, '15061', 'ALVARADO', 'GEMAILA', NULL, '1328', '2026-01-01', 128, NULL, 'active', 'CAMPARANG'),
  (52, '4181', 'AMBOS', 'ALBERTO', 'TABES', '1108763', '2026-04-01', 2125, NULL, 'active', 'CAMPARANG'),
  (53, '2483', 'ARANTE', 'NESTOR', 'YANONG', '1010218777', '2026-04-01', 9181, NULL, 'active', 'CAMPARANG'),
  (54, '582', 'VELASCO', 'GILLIE', NULL, '925900', '2026-04-01', 3605, NULL, 'active', 'CAMPARANG'),
  (55, '398', 'VERGARA #1', 'MARGARITA', NULL, '8915825', '2026-04-01', 3526, NULL, 'active', 'CAMPARANG');


-- ------------------------------------------------------------
-- C. Meters: ensure every serial exists (idempotent by serial)
-- ------------------------------------------------------------
INSERT INTO public.meters (meter_number, is_active)
SELECT DISTINCT meter_serial, TRUE
FROM masterlist_import
WHERE meter_serial IS NOT NULL AND btrim(meter_serial) <> ''
ON CONFLICT (meter_number) DO NOTHING;

-- ------------------------------------------------------------
-- D. Import: create auth user + profile only for NEW cons codes,
--    then upsert the resident account keyed on Cons Code.
-- ------------------------------------------------------------
DO $$
DECLARE
  r               RECORD;
  v_profile_id    UUID;
  v_meter_id      UUID;
  v_existing      UUID;
  v_created       INTEGER := 0;
  v_updated       INTEGER := 0;
  v_created_users INTEGER := 0;
BEGIN
  FOR r IN SELECT * FROM masterlist_import ORDER BY seq LOOP
    -- Existing account with this Cons Code? Reuse its resident mapping.
    SELECT resident_id INTO v_existing
    FROM public.resident_accounts
    WHERE account_number = r.cons_code
    LIMIT 1;

    IF v_existing IS NULL THEN
      -- New consumer: create an auth user (email stays NULL — the
      -- barangay has not authorized contact data). handle_new_user
      -- fires and inserts the resident profile automatically.
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
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name),
        FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL, '', NULL, FALSE, NULL, FALSE
      )
      RETURNING id INTO v_profile_id;

      -- The trigger already created the profile with role=resident;
      -- fill in the masterlist names and login-active flag.
      UPDATE public.profiles
      SET first_name = r.first_name,
          middle_name = r.middle_name,
          last_name = r.last_name,
          date_of_birth = NULL,
          phone = NULL,
          email = NULL,
          is_active = (r.status <> 'inactive')
      WHERE id = v_profile_id;

      v_created_users := v_created_users + 1;
    ELSE
      v_profile_id := v_existing;
    END IF;

    -- Resolve the meter row created in step C.
    IF r.meter_serial IS NOT NULL AND btrim(r.meter_serial) <> '' THEN
      SELECT id INTO v_meter_id
      FROM public.meters
      WHERE meter_number = r.meter_serial
      LIMIT 1;
    ELSE
      v_meter_id := NULL;
    END IF;

    -- Upsert the service account. Existing rows keep their
    -- resident mapping, service_address and any manually entered
    -- data; only the masterlist fields are applied.
    INSERT INTO public.resident_accounts (
      resident_id, account_number, meter_id, service_address,
      sitio, connection_status, previous_reading, current_reading, previous_reading_date
    )
    VALUES (
      v_profile_id, r.cons_code, v_meter_id, NULL,
      r.sitio, r.status, r.previous_reading, r.current_reading, r.previous_period
    )
    ON CONFLICT (account_number) DO UPDATE SET
      meter_id             = EXCLUDED.meter_id,
      sitio                = EXCLUDED.sitio,
      connection_status    = EXCLUDED.connection_status,
      previous_reading     = EXCLUDED.previous_reading,
      current_reading      = EXCLUDED.current_reading,
      previous_reading_date = EXCLUDED.previous_reading_date;

    IF v_existing IS NULL THEN
      v_created := v_created + 1;
    ELSE
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Masterlist import complete: % new account(s) created, % existing account(s) updated, % new profile(s) created.', v_created, v_updated, v_created_users;
END $$;

-- ------------------------------------------------------------
-- E. Verification (aggregate only — no raw consumer data)
-- ------------------------------------------------------------
SELECT
  (SELECT count(*) FROM public.resident_accounts WHERE account_number IN (SELECT cons_code FROM masterlist_import))                              AS imported_accounts,
  (SELECT count(*) FROM public.resident_accounts WHERE account_number IN (SELECT cons_code FROM masterlist_import) AND connection_status = 'active')  AS active,
  (SELECT count(*) FROM public.resident_accounts WHERE account_number IN (SELECT cons_code FROM masterlist_import) AND connection_status = 'inactive') AS inactive,
  (SELECT count(*) FROM public.resident_accounts WHERE account_number IN (SELECT cons_code FROM masterlist_import) AND connection_status = 'applicant') AS applicant,
  (SELECT count(*) FROM public.resident_accounts WHERE account_number IN (SELECT cons_code FROM masterlist_import) AND current_reading IS NULL)         AS blank_current_reading;

SELECT sitio, connection_status, count(*)
FROM public.resident_accounts
WHERE account_number IN (SELECT cons_code FROM masterlist_import)
GROUP BY sitio, connection_status
ORDER BY sitio, connection_status;
