-- ============================================================
-- BKWB — Resident-side meter reading submissions
-- ------------------------------------------------------------
-- Lets a resident submit their own meter reading (with photo)
-- from the Residents app. The row lands in public.meter_readings
-- as status = 'pending_review' and source = 'resident', so the
-- existing staff Meter Readings page can review, approve/reject
-- and issue a bill with the same flow used for meter readers.
--
-- Run this ONCE in the Supabase SQL editor (idempotent — safe to
-- re-run). Deploy it before shipping the Residents app update.
-- ============================================================

-- 1. Tag each reading with who submitted it.
--    Existing rows default to the meter-reader route.
ALTER TABLE public.meter_readings
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'meter_reader';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meter_readings_source_check'
      AND conrelid = 'public.meter_readings'::regclass
  ) THEN
    ALTER TABLE public.meter_readings
      ADD CONSTRAINT meter_readings_source_check
      CHECK (source IN ('meter_reader', 'resident'));
  END IF;
END $$;

-- 2. Prevent duplicate self-submissions: only one resident submission
--    per account may sit in pending review at a time.
CREATE UNIQUE INDEX IF NOT EXISTS meter_readings_one_open_resident_submission
  ON public.meter_readings (account_id)
  WHERE source = 'resident'
    AND status = 'pending_review'
    AND deleted_at IS NULL;

-- 3. Fast filtering of resident submissions in the staff app.
CREATE INDEX IF NOT EXISTS idx_meter_readings_source_status
  ON public.meter_readings (source, status)
  WHERE deleted_at IS NULL;

-- 4. Row Level Security — residents may see their own readings
--    (both self-submitted and meter-reader ones) and create one
--    pending submission for their own active account.
DROP POLICY IF EXISTS "Residents can read own meter readings" ON public.meter_readings;
CREATE POLICY "Residents can read own meter readings"
  ON public.meter_readings
  FOR SELECT
  TO authenticated
  USING (
    resident_id = (SELECT auth.uid())
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Residents can submit own meter readings" ON public.meter_readings;
CREATE POLICY "Residents can submit own meter readings"
  ON public.meter_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    resident_id = (SELECT auth.uid())
    AND source = 'resident'
    AND status = 'pending_review'
    AND meter_reader_id IS NULL
    AND assigned_by IS NULL
    AND deleted_at IS NULL
    AND current_reading IS NOT NULL
    AND current_reading >= 0
    AND EXISTS (
      SELECT 1
      FROM public.resident_accounts ra
      WHERE ra.id = meter_readings.account_id
        AND ra.resident_id = (SELECT auth.uid())
        AND ra.connection_status = 'active'
    )
  );

-- 5. After staff reject a reading, the resident may correct it and
--    send it back for review. Only the rejected -> pending_review
--    transition is allowed; the existing guard trigger clears the
--    review fields and blocks assignment-level changes.
DROP POLICY IF EXISTS "Residents can resubmit rejected readings" ON public.meter_readings;
CREATE POLICY "Residents can resubmit rejected readings"
  ON public.meter_readings
  FOR UPDATE
  TO authenticated
  USING (
    resident_id = (SELECT auth.uid())
    AND source = 'resident'
    AND status = 'rejected'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    resident_id = (SELECT auth.uid())
    AND source = 'resident'
    AND status = 'pending_review'
    AND deleted_at IS NULL
  );

-- 6. Photo storage. Residents upload into their own folder of the
--    `meter-images` bucket (`<auth.uid()>/<file>.jpg`), exactly like
--    meter readers, and staff already have read access.
INSERT INTO storage.buckets (id, name, public)
VALUES ('meter-images', 'meter-images', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Residents can upload meter images" ON storage.objects;
CREATE POLICY "Residents can upload meter images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'meter-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Residents can read own meter images" ON storage.objects;
CREATE POLICY "Residents can read own meter images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'meter-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "Residents can update own meter images" ON storage.objects;
CREATE POLICY "Residents can update own meter images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'meter-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  )
  WITH CHECK (
    bucket_id = 'meter-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

-- ============================================================
-- Notes
-- * `previous_reading` / `consumption` stay database-owned: the
--   existing calculate_consumption trigger fills them on insert,
--   so a resident can never fake the previous reading.
-- * Staff can distinguish resident submissions by
--   source = 'resident' (badge + filter in the Meter Readings page).
-- ============================================================
