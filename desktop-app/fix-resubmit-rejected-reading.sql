-- Let a meter reader correct a staff-rejected reading and send it back
-- to pending review. Safe to re-run.
--
-- Readers still cannot self-approve, reject, or bill. Only assigned →
-- pending_review and rejected → pending_review are allowed.

DROP POLICY IF EXISTS "Meter readers can submit own assigned readings" ON public.meter_readings;
CREATE POLICY "Meter readers can submit own assigned readings"
  ON public.meter_readings
  FOR UPDATE
  TO authenticated
  USING (
    meter_reader_id = (SELECT auth.uid())
    AND status IN ('assigned', 'rejected')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    meter_reader_id = (SELECT auth.uid())
    AND deleted_at IS NULL
    AND status = 'pending_review'
  );

CREATE OR REPLACE FUNCTION public.guard_meter_reading_reader_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.is_staff_or_admin() THEN
    RETURN NEW;
  END IF;

  -- Readers may only submit an assignment, or send a rejected reading
  -- back to pending review.
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'assigned' AND NEW.status = 'pending_review')
      OR (OLD.status = 'rejected' AND NEW.status = 'pending_review')
    ) THEN
      RAISE EXCEPTION 'Meter readers cannot set the reading to that status.';
    END IF;
  END IF;

  -- A corrected rejection is a fresh pending review.
  IF OLD.status = 'rejected' AND NEW.status = 'pending_review' THEN
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    NEW.rejection_reason := NULL;
  ELSIF (
    NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
    OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
  ) THEN
    RAISE EXCEPTION 'Meter readers cannot change assignment-level fields.';
  END IF;

  -- previous_reading is owned by calculate_consumption and may change
  -- on submit even though the client does not send it.
  IF (
    NEW.assignment_date IS DISTINCT FROM OLD.assignment_date
    OR NEW.meter_reader_id IS DISTINCT FROM OLD.meter_reader_id
    OR NEW.assigned_by IS DISTINCT FROM OLD.assigned_by
    OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
    OR NEW.account_id IS DISTINCT FROM OLD.account_id
    OR NEW.meter_id IS DISTINCT FROM OLD.meter_id
    OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
  ) THEN
    RAISE EXCEPTION 'Meter readers cannot change assignment-level fields.';
  END IF;

  RETURN NEW;
END;
$$;
