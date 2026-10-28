-- Fix: infinite recursion detected in policy for relation "meter_readings"
-- when Staff uses Assign Meter Reading.
-- Safe to re-run. Already applied via Supabase migration
-- fix_meter_readings_rls_recursion on project lnnkvqxvqhbdvsomdfyh.
--
-- Cause:
-- 1) calculate_consumption (SECURITY INVOKER) SELECTs meter_readings +
--    resident_accounts while an INSERT on meter_readings is under RLS.
-- 2) resident_accounts policy "Meter readers can read accounts in their sitio"
--    SELECTs meter_readings, re-entering meter_readings RLS.

CREATE OR REPLACE FUNCTION public.calculate_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_resolved NUMERIC;
BEGIN
  IF COALESCE(NEW.remarks, '') <> 'Imported bill history'
     AND (
       TG_OP = 'INSERT'
       OR NEW.status IN ('assigned', 'pending_review')
       OR (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
     )
  THEN
    SELECT mr.current_reading
    INTO v_resolved
    FROM public.meter_readings mr
    WHERE mr.account_id = NEW.account_id
      AND mr.id IS DISTINCT FROM NEW.id
      AND mr.deleted_at IS NULL
      AND mr.status IN ('approved', 'billed')
      AND mr.current_reading IS NOT NULL
      AND (
        NEW.assignment_date IS NULL
        OR mr.assignment_date < NEW.assignment_date
        OR (
          mr.assignment_date = NEW.assignment_date
          AND mr.created_at < COALESCE(NEW.created_at, NOW())
        )
      )
    ORDER BY mr.assignment_date DESC,
             COALESCE(mr.reading_date, mr.created_at) DESC,
             mr.created_at DESC
    LIMIT 1;

    IF v_resolved IS NULL THEN
      SELECT COALESCE(ra.current_reading, ra.previous_reading)
      INTO v_resolved
      FROM public.resident_accounts ra
      WHERE ra.id = NEW.account_id;
    END IF;

    NEW.previous_reading := COALESCE(v_resolved, 0);
  END IF;

  IF NEW.current_reading IS NOT NULL THEN
    IF NEW.current_reading < NEW.previous_reading THEN
      RAISE EXCEPTION 'current_reading must be greater than or equal to previous_reading';
    END IF;
    NEW.consumption := NEW.current_reading - NEW.previous_reading;
  ELSE
    NEW.consumption := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.meter_reader_can_read_account(
  p_account_id uuid,
  p_sitio text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.sitio_assignments sa
      WHERE sa.meter_reader_id = (SELECT auth.uid())
        AND sa.sitio = p_sitio
    )
    OR EXISTS (
      SELECT 1
      FROM public.meter_readings mr
      WHERE mr.account_id = p_account_id
        AND mr.meter_reader_id = (SELECT auth.uid())
        AND mr.deleted_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.meter_reader_can_read_account(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.meter_reader_can_read_account(uuid, text) TO authenticated;

DROP POLICY IF EXISTS "Meter readers can read accounts in their sitio" ON public.resident_accounts;
CREATE POLICY "Meter readers can read accounts in their sitio"
  ON public.resident_accounts
  FOR SELECT
  TO authenticated
  USING (public.meter_reader_can_read_account(id, sitio));
