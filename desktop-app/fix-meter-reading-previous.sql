-- Fix previous_reading so it is not frozen as 0 at assignment time.
-- Safe to re-run. Resolves previous from the latest approved/billed reading
-- (with account snapshot fallback), recalculates consumption, backfills
-- existing rows, and refreshes resident_accounts snapshots.

-- ============================================================
-- 1. Resolve previous_reading inside calculate_consumption so it
--    runs before consumption math on INSERT/UPDATE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_consumption()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_resolved NUMERIC;
BEGIN
  -- Refresh previous when assigning, submitting, or approving.
  -- Meter readers cannot set this column themselves; the DB owns it.
  IF TG_OP = 'INSERT'
     OR NEW.status IN ('assigned', 'pending_review')
     OR (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status)
  THEN
    SELECT mr.current_reading
    INTO v_resolved
    FROM public.meter_readings mr
    WHERE mr.account_id = NEW.account_id
      AND mr.id IS DISTINCT FROM NEW.id
      AND mr.deleted_at IS NULL
      AND mr.status IN ('approved', 'billed')
      AND mr.current_reading IS NOT NULL
    ORDER BY COALESCE(mr.reading_date, mr.created_at) DESC, mr.created_at DESC
    LIMIT 1;

    IF v_resolved IS NULL THEN
      -- First workflow reading: use masterlist / snapshot dial position.
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

-- ============================================================
-- 2. Allow system-managed previous_reading updates from the
--    calculate_consumption trigger when a meter reader submits.
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_meter_reading_reader_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF public.is_staff_or_admin() THEN
    RETURN NEW;
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
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
    OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
  ) THEN
    RAISE EXCEPTION 'Meter readers cannot change assignment-level fields.';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. On approve: refresh open assignments for the same account
--    so their previous_reading tracks the newly approved dial.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_account_reading_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.current_reading IS NOT NULL THEN
    UPDATE public.resident_accounts
    SET previous_reading = NEW.previous_reading,
        current_reading = NEW.current_reading,
        previous_reading_date = date_trunc(
          'month',
          COALESCE(NEW.reading_date, NEW.assignment_date::timestamptz)
        )::date,
        updated_at = NOW()
    WHERE id = NEW.account_id;

    -- Keep still-open assignments in sync for the next submit.
    UPDATE public.meter_readings
    SET previous_reading = NEW.current_reading,
        updated_at = NOW()
    WHERE account_id = NEW.account_id
      AND id IS DISTINCT FROM NEW.id
      AND deleted_at IS NULL
      AND status = 'assigned';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. Backfill previous_reading / consumption for existing rows
--    using the chronologically prior approved/billed reading.
-- ============================================================
WITH ordered AS (
  SELECT
    id,
    account_id,
    status,
    current_reading,
    reading_date,
    created_at,
    LAG(current_reading) OVER (
      PARTITION BY account_id
      ORDER BY COALESCE(reading_date, created_at), created_at, id
    ) AS prior_current
  FROM public.meter_readings
  WHERE deleted_at IS NULL
    AND status IN ('pending_review', 'approved', 'billed')
    AND current_reading IS NOT NULL
)
UPDATE public.meter_readings mr
SET
  previous_reading = COALESCE(o.prior_current, 0),
  consumption = mr.current_reading - COALESCE(o.prior_current, 0),
  updated_at = NOW()
FROM ordered o
WHERE mr.id = o.id
  AND (
    mr.previous_reading IS DISTINCT FROM COALESCE(o.prior_current, 0)
    OR mr.consumption IS DISTINCT FROM (mr.current_reading - COALESCE(o.prior_current, 0))
  );

-- Open assignments: previous = latest approved/billed current for the account.
UPDATE public.meter_readings mr
SET
  previous_reading = COALESCE(latest.current_reading, mr.previous_reading, 0),
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (account_id)
    account_id,
    current_reading
  FROM public.meter_readings
  WHERE deleted_at IS NULL
    AND status IN ('approved', 'billed')
    AND current_reading IS NOT NULL
  ORDER BY account_id, COALESCE(reading_date, created_at) DESC, created_at DESC
) latest
WHERE mr.account_id = latest.account_id
  AND mr.deleted_at IS NULL
  AND mr.status = 'assigned'
  AND mr.previous_reading IS DISTINCT FROM latest.current_reading;

-- Linked bills: keep printed previous in sync with the fixed reading.
UPDATE public.bills b
SET
  previous_reading = mr.previous_reading,
  consumption = CASE
    WHEN b.current_reading IS NOT NULL THEN b.current_reading - mr.previous_reading
    ELSE b.consumption
  END,
  updated_at = NOW()
FROM public.meter_readings mr
WHERE b.reading_id = mr.id
  AND b.deleted_at IS NULL
  AND b.previous_reading IS DISTINCT FROM mr.previous_reading;

-- Account snapshots from the latest approved/billed reading per account.
UPDATE public.resident_accounts ra
SET
  previous_reading = latest.previous_reading,
  current_reading = latest.current_reading,
  previous_reading_date = date_trunc(
    'month',
    COALESCE(latest.reading_date, latest.assignment_date::timestamptz)
  )::date,
  updated_at = NOW()
FROM (
  SELECT DISTINCT ON (account_id)
    account_id,
    previous_reading,
    current_reading,
    reading_date,
    assignment_date
  FROM public.meter_readings
  WHERE deleted_at IS NULL
    AND status IN ('approved', 'billed')
    AND current_reading IS NOT NULL
  ORDER BY account_id, COALESCE(reading_date, created_at) DESC, created_at DESC
) latest
WHERE ra.id = latest.account_id;
