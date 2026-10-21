-- ============================================================
-- BKWB — Super Admin past-bill history import
-- ------------------------------------------------------------
-- One uploaded row is one past bills row, matched to a consumer
-- by resident_accounts.account_number. bill_number is
-- HIST-{account_number}-{YYYY-MM}, so uploading the same account
-- and month again updates that bill.
--
-- A payments.amount greater than zero writes one completed cash
-- payment. Re-upload replaces that imported payment.
-- When a row has a previous reading, current reading, or consumption,
-- the same month is written to meter_readings (status billed) and
-- linked from bills.reading_id. Re-upload updates that reading.
-- generate_bill_for_reading is not used.
--
-- Rows with no billing period are skipped.
-- Caller must be an active super admin. Safe to re-run.
-- ============================================================

-- Keep the previous reading from the sheet. A normal meter-reading insert
-- still replaces previous_reading with the latest billed reading.
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
    ORDER BY COALESCE(mr.reading_date, mr.created_at) DESC, mr.created_at DESC
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

CREATE UNIQUE INDEX IF NOT EXISTS bills_bill_number_key
  ON public.bills (bill_number);

CREATE OR REPLACE FUNCTION public.import_bill_history(p_rows JSONB)
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
  v_period TEXT;
  v_bill_number TEXT;
  v_account_id UUID;
  v_resident_id UUID;
  v_meter_id UUID;
  v_bill_id UUID;
  v_existing UUID;
  v_reading_id UUID;
  v_reading_previous NUMERIC;
  v_reading_current NUMERIC;
  v_period_start DATE;
  v_period_end DATE;
  v_due_date DATE;
  v_paid_at TIMESTAMPTZ;
  v_previous_reading NUMERIC;
  v_current_reading NUMERIC;
  v_consumption NUMERIC;
  v_water_rate NUMERIC;
  v_amount NUMERIC;
  v_previous_balance NUMERIC;
  v_payment NUMERIC;
  v_amount_due NUMERIC;
  v_status TEXT;
  v_created INTEGER := 0;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT (SELECT public.is_super_admin()) THEN
    RAISE EXCEPTION 'Only a super admin can import bill history.'
      USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Expected a JSON array of bill rows.'
      USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_rows) > 500 THEN
    RAISE EXCEPTION 'Send at most 500 rows per import batch.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    v_idx := v_idx + 1;
    v_account_id := NULL;
    v_resident_id := NULL;
    v_meter_id := NULL;
    v_bill_id := NULL;
    v_existing := NULL;
    v_reading_id := NULL;
    v_reading_previous := NULL;
    v_reading_current := NULL;
    v_period_start := NULL;
    v_period_end := NULL;
    v_due_date := NULL;
    v_paid_at := NULL;
    v_previous_reading := NULL;
    v_current_reading := NULL;
    v_consumption := NULL;
    v_water_rate := 0;
    v_amount := NULL;
    v_previous_balance := 0;
    v_payment := NULL;
    v_amount_due := NULL;

    v_row_number := COALESCE(NULLIF(v_row->>'_row', '')::INTEGER, v_idx);
    v_account_number := NULLIF(btrim(COALESCE(v_row->>'resident_accounts.account_number', '')), '');
    v_period := NULLIF(btrim(COALESCE(v_row->>'bills.billing_period', '')), '');

    IF v_period IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF v_account_number IS NULL THEN
      RAISE EXCEPTION 'Row %: resident_accounts.account_number is required.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    IF v_period !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
      RAISE EXCEPTION 'Row %: bills.billing_period must be YYYY-MM.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    v_status := lower(NULLIF(btrim(COALESCE(v_row->>'bills.status', '')), ''));
    IF v_status IS NULL OR v_status NOT IN ('paid', 'pending', 'partially_paid', 'overdue', 'carried_forward') THEN
      RAISE EXCEPTION 'Row %: bills.status must be paid, pending, partially_paid, overdue, or carried_forward.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    IF NULLIF(btrim(COALESCE(v_row->>'bills.period_start', '')), '') IS NOT NULL THEN
      IF btrim(v_row->>'bills.period_start') !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'Row %: bills.period_start must be YYYY-MM-DD.', v_row_number
          USING ERRCODE = '22023';
      END IF;
      v_period_start := btrim(v_row->>'bills.period_start')::DATE;
    END IF;

    IF NULLIF(btrim(COALESCE(v_row->>'bills.period_end', '')), '') IS NOT NULL THEN
      IF btrim(v_row->>'bills.period_end') !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'Row %: bills.period_end must be YYYY-MM-DD.', v_row_number
          USING ERRCODE = '22023';
      END IF;
      v_period_end := btrim(v_row->>'bills.period_end')::DATE;
    END IF;

    IF NULLIF(btrim(COALESCE(v_row->>'bills.due_date', '')), '') IS NOT NULL THEN
      IF btrim(v_row->>'bills.due_date') !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'Row %: bills.due_date must be YYYY-MM-DD.', v_row_number
          USING ERRCODE = '22023';
      END IF;
      v_due_date := btrim(v_row->>'bills.due_date')::DATE;
    END IF;

    IF NULLIF(btrim(COALESCE(v_row->>'bills.paid_at', '')), '') IS NOT NULL THEN
      IF btrim(v_row->>'bills.paid_at') !~ '^\d{4}-\d{2}-\d{2}$' THEN
        RAISE EXCEPTION 'Row %: bills.paid_at must be YYYY-MM-DD.', v_row_number
          USING ERRCODE = '22023';
      END IF;
      v_paid_at := btrim(v_row->>'bills.paid_at')::DATE::TIMESTAMPTZ;
    END IF;

    IF NULLIF(btrim(COALESCE(v_row->>'bills.amount', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Row %: bills.amount is required.', v_row_number
        USING ERRCODE = '22023';
    END IF;
    IF NULLIF(btrim(COALESCE(v_row->>'bills.amount_due', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Row %: bills.amount_due is required.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    v_amount := btrim(v_row->>'bills.amount')::NUMERIC;
    v_amount_due := btrim(v_row->>'bills.amount_due')::NUMERIC;
    IF NULLIF(btrim(COALESCE(v_row->>'bills.previous_balance', '')), '') IS NOT NULL THEN
      v_previous_balance := btrim(v_row->>'bills.previous_balance')::NUMERIC;
    END IF;
    IF NULLIF(btrim(COALESCE(v_row->>'bills.water_rate', '')), '') IS NOT NULL THEN
      v_water_rate := btrim(v_row->>'bills.water_rate')::NUMERIC;
    END IF;
    IF NULLIF(btrim(COALESCE(v_row->>'bills.previous_reading', '')), '') IS NOT NULL THEN
      v_previous_reading := btrim(v_row->>'bills.previous_reading')::NUMERIC;
    END IF;
    IF NULLIF(btrim(COALESCE(v_row->>'bills.current_reading', '')), '') IS NOT NULL THEN
      v_current_reading := btrim(v_row->>'bills.current_reading')::NUMERIC;
    END IF;
    IF NULLIF(btrim(COALESCE(v_row->>'bills.consumption', '')), '') IS NOT NULL THEN
      v_consumption := btrim(v_row->>'bills.consumption')::NUMERIC;
    END IF;
    IF NULLIF(btrim(COALESCE(v_row->>'payments.amount', '')), '') IS NOT NULL THEN
      v_payment := btrim(v_row->>'payments.amount')::NUMERIC;
    END IF;

    IF v_amount < 0 OR v_amount_due < 0 OR v_previous_balance < 0 OR v_water_rate < 0
       OR COALESCE(v_previous_reading, 0) < 0 OR COALESCE(v_current_reading, 0) < 0
       OR COALESCE(v_consumption, 0) < 0 OR COALESCE(v_payment, 0) < 0 THEN
      RAISE EXCEPTION 'Row %: amounts and readings must be non-negative.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    IF v_amount_due > v_amount + v_previous_balance THEN
      RAISE EXCEPTION 'Row %: bills.amount_due is greater than bills.amount plus bills.previous_balance.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    IF v_status = 'paid' AND v_amount_due <> 0 THEN
      RAISE EXCEPTION 'Row %: a paid bill must have bills.amount_due of 0.', v_row_number
        USING ERRCODE = '22023';
    END IF;

    IF v_status IN ('pending', 'overdue', 'partially_paid') AND v_amount_due <= 0 THEN
      RAISE EXCEPTION 'Row %: bills.amount_due must be greater than 0 when status is %.' , v_row_number, v_status
        USING ERRCODE = '22023';
    END IF;

    IF v_paid_at IS NULL AND v_status = 'paid' THEN
      v_paid_at := COALESCE(v_period_end, (v_period || '-01')::DATE)::TIMESTAMPTZ;
    END IF;

    SELECT id, resident_id, meter_id INTO v_account_id, v_resident_id, v_meter_id
    FROM public.resident_accounts
    WHERE account_number = v_account_number
    LIMIT 1;

    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'Row %: resident_accounts.account_number % was not found. Import that consumer first.', v_row_number, v_account_number
        USING ERRCODE = 'P0002';
    END IF;

    v_bill_number := 'HIST-' || v_account_number || '-' || v_period;

    SELECT id, reading_id INTO v_existing, v_reading_id
    FROM public.bills
    WHERE bill_number = v_bill_number
    LIMIT 1;

    IF v_previous_reading IS NOT NULL
       OR v_current_reading IS NOT NULL
       OR v_consumption IS NOT NULL THEN
      IF v_resident_id IS NULL THEN
        RAISE EXCEPTION 'Row %: account % has no resident, so the meter reading cannot be saved.', v_row_number, v_account_number
          USING ERRCODE = '22023';
      END IF;

      v_reading_previous := COALESCE(v_previous_reading, 0);
      v_reading_current := v_current_reading;
      IF v_reading_current IS NULL AND v_consumption IS NOT NULL THEN
        v_reading_current := v_reading_previous + v_consumption;
      END IF;
      IF v_reading_current IS NOT NULL AND v_reading_current < v_reading_previous THEN
        RAISE EXCEPTION 'Row %: bills.current_reading is lower than bills.previous_reading.', v_row_number
          USING ERRCODE = '22023';
      END IF;

      IF v_period_start IS NULL THEN
        v_period_start := (v_period || '-01')::DATE;
      END IF;
      IF v_period_end IS NULL THEN
        v_period_end := (date_trunc('month', v_period_start::TIMESTAMP) + INTERVAL '1 month - 1 day')::DATE;
      END IF;

      IF v_reading_id IS NOT NULL THEN
        UPDATE public.meter_readings
        SET account_id = v_account_id,
            resident_id = v_resident_id,
            meter_id = v_meter_id,
            assignment_date = v_period_start,
            reading_date = v_period_end::TIMESTAMPTZ,
            previous_reading = v_reading_previous,
            current_reading = v_reading_current,
            status = 'billed',
            remarks = 'Imported bill history',
            deleted_at = NULL
        WHERE id = v_reading_id;
      ELSE
        INSERT INTO public.meter_readings (
          account_id,
          resident_id,
          meter_id,
          assignment_date,
          reading_date,
          previous_reading,
          current_reading,
          status,
          remarks
        )
        VALUES (
          v_account_id,
          v_resident_id,
          v_meter_id,
          v_period_start,
          v_period_end::TIMESTAMPTZ,
          v_reading_previous,
          v_reading_current,
          'billed',
          'Imported bill history'
        )
        RETURNING id INTO v_reading_id;
      END IF;
    ELSE
      v_reading_id := NULL;
    END IF;

    INSERT INTO public.bills (
      bill_number,
      account_id,
      resident_id,
      reading_id,
      billing_period,
      period_start,
      period_end,
      previous_reading,
      current_reading,
      consumption,
      water_rate,
      extra_components,
      amount,
      previous_balance,
      credit_applied,
      amount_due,
      status,
      due_date,
      paid_at
    )
    VALUES (
      v_bill_number,
      v_account_id,
      v_resident_id,
      v_reading_id,
      v_period,
      v_period_start,
      v_period_end,
      v_previous_reading,
      v_current_reading,
      v_consumption,
      v_water_rate,
      '[]'::jsonb,
      v_amount,
      v_previous_balance,
      0,
      v_amount_due,
      v_status,
      v_due_date,
      v_paid_at
    )
    ON CONFLICT (bill_number) DO UPDATE SET
      account_id = EXCLUDED.account_id,
      resident_id = EXCLUDED.resident_id,
      reading_id = COALESCE(EXCLUDED.reading_id, public.bills.reading_id),
      billing_period = EXCLUDED.billing_period,
      period_start = EXCLUDED.period_start,
      period_end = EXCLUDED.period_end,
      previous_reading = EXCLUDED.previous_reading,
      current_reading = EXCLUDED.current_reading,
      consumption = EXCLUDED.consumption,
      water_rate = EXCLUDED.water_rate,
      amount = EXCLUDED.amount,
      previous_balance = EXCLUDED.previous_balance,
      amount_due = EXCLUDED.amount_due,
      status = EXCLUDED.status,
      due_date = EXCLUDED.due_date,
      paid_at = EXCLUDED.paid_at,
      updated_at = NOW();

    SELECT id INTO v_bill_id
    FROM public.bills
    WHERE bill_number = v_bill_number
    LIMIT 1;

    DELETE FROM public.payments
    WHERE bill_id = v_bill_id
      AND reference_number = v_bill_number
      AND notes = 'Imported bill history';

    IF v_payment IS NOT NULL AND v_payment > 0 THEN
      INSERT INTO public.payments (
        bill_id,
        account_id,
        resident_id,
        amount,
        payment_method,
        payment_date,
        reference_number,
        notes,
        recorded_by,
        status
      )
      VALUES (
        v_bill_id,
        v_account_id,
        v_resident_id,
        v_payment,
        'cash',
        COALESCE(v_paid_at, (v_period || '-01')::DATE::TIMESTAMPTZ),
        v_bill_number,
        'Imported bill history',
        (SELECT auth.uid()),
        'completed'
      );
    END IF;

    IF v_existing IS NULL THEN
      v_created := v_created + 1;
    ELSE
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'skipped', v_skipped,
    'total_rows', v_idx
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_bill_history(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_bill_history(JSONB) TO authenticated;

-- Link bill history that was imported before meter readings were recorded.
DO $$
DECLARE
  r RECORD;
  v_previous NUMERIC;
  v_current NUMERIC;
  v_start DATE;
  v_end DATE;
  v_reading_id UUID;
BEGIN
  FOR r IN
    SELECT b.id,
           b.account_id,
           b.resident_id,
           ra.meter_id,
           b.billing_period,
           b.period_start,
           b.period_end,
           b.previous_reading,
           b.current_reading,
           b.consumption
    FROM public.bills b
    JOIN public.resident_accounts ra ON ra.id = b.account_id
    WHERE b.deleted_at IS NULL
      AND b.bill_number LIKE 'HIST-%'
      AND b.reading_id IS NULL
      AND b.resident_id IS NOT NULL
      AND (
        b.previous_reading IS NOT NULL
        OR b.current_reading IS NOT NULL
        OR b.consumption IS NOT NULL
      )
  LOOP
    v_previous := COALESCE(r.previous_reading, 0);
    v_current := r.current_reading;
    IF v_current IS NULL AND r.consumption IS NOT NULL THEN
      v_current := v_previous + r.consumption;
    END IF;
    IF v_current IS NOT NULL AND v_current < v_previous THEN
      CONTINUE;
    END IF;

    v_start := COALESCE(r.period_start, (r.billing_period || '-01')::DATE);
    v_end := COALESCE(
      r.period_end,
      (date_trunc('month', v_start::TIMESTAMP) + INTERVAL '1 month - 1 day')::DATE
    );

    INSERT INTO public.meter_readings (
      account_id,
      resident_id,
      meter_id,
      assignment_date,
      reading_date,
      previous_reading,
      current_reading,
      status,
      remarks
    )
    VALUES (
      r.account_id,
      r.resident_id,
      r.meter_id,
      v_start,
      v_end::TIMESTAMPTZ,
      v_previous,
      v_current,
      'billed',
      'Imported bill history'
    )
    RETURNING id INTO v_reading_id;

    UPDATE public.bills
    SET reading_id = v_reading_id
    WHERE id = r.id;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
