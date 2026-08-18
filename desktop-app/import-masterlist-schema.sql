-- ============================================================
-- BKWB — Masterlist Import: Schema changes
-- ------------------------------------------------------------
-- Prepares the existing BKWB schema for the Barangay Kalunasan
-- Meter Reader Masterlist (limited authorized testing extract).
--
-- Run order:
--   1. Run THIS file in the Supabase SQL Editor.
--   2. Run import-masterlist-data.sql (the 55 consumer records).
--
-- Safe to re-run. No tables are dropped or reset. Existing data
-- (sample/demo residents, auth users, accounts) is NOT touched.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Email becomes OPTIONAL.
--    The barangay has not authorized email/contact data for the
--    masterlist consumers, so imported profiles must be able to
--    exist with a NULL email (auth.users.email supports NULL in
--    GoTrue, so these are records — not login accounts).
--    Existing accounts that already have an email are unaffected.
-- ------------------------------------------------------------
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;

-- ------------------------------------------------------------
-- 2. Resident account status gains 'applicant'.
--    Source statuses: ACTIVE / INACTIVE / APPLICANT.
--    The existing CHECK only allowed active/inactive/disconnected.
-- ------------------------------------------------------------
DO $$
DECLARE
  con_name TEXT;
BEGIN
  FOR con_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    WHERE ns.nspname = 'public'
      AND cls.relname = 'resident_accounts'
      AND con.contype = 'c'
      AND att.attname = 'connection_status'
  LOOP
    EXECUTE format('ALTER TABLE public.resident_accounts DROP CONSTRAINT %I', con_name);
  END LOOP;
END $$;

ALTER TABLE public.resident_accounts
  ADD CONSTRAINT resident_accounts_connection_status_check
  CHECK (connection_status IN ('active', 'inactive', 'disconnected', 'applicant'));

-- ------------------------------------------------------------
-- 3. Latest-reading snapshot columns on the service account.
--    The masterlist provides: Previous Period, Previous Reading,
--    Current Reading. A BLANK Current Reading is valid data (the
--    meter reader has not recorded the latest reading yet) and
--    must stay NULL — never coerced to zero.
--
--    These columns mirror the masterlist extract. The full
--    meter_readings workflow (assign -> submit -> approve) stays
--    untouched; future meter-reading submissions can update
--    current_reading through that workflow without destroying
--    the resident/account information.
-- ------------------------------------------------------------
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS previous_reading NUMERIC;
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS current_reading NUMERIC;
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS previous_reading_date DATE;

-- Indexes used by the resident list (filter by status / period)
CREATE INDEX IF NOT EXISTS idx_resident_accounts_connection_status
  ON public.resident_accounts (connection_status);
CREATE INDEX IF NOT EXISTS idx_resident_accounts_previous_reading_date
  ON public.resident_accounts (previous_reading_date);

-- ------------------------------------------------------------
-- 4. Sitios are loaded dynamically from resident_accounts.sitio
--    (the UI queries distinct values), so no hard-coded sitio
--    lookup table is needed and new sitios are picked up
--    automatically. Ensure the lookup index exists.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_resident_accounts_sitio
  ON public.resident_accounts (sitio);

NOTIFY pgrst, 'reload schema';
