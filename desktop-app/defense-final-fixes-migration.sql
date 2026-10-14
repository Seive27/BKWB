-- ============================================================
-- BKWB — Final Defense Preparation Database Migration
-- ============================================================
-- Migration: defense-final-fixes-migration.sql
-- Description:
--   1. Adds previous_balance and credit_applied to bills.
--   2. Adds partially_paid and carried_forward to the bills status constraint.
--   3. Adds credit_balance to resident_accounts.
--   4. Adds paymongo_payment_id, paymongo_checkout_session_id,
--      and paymongo_external_reference to payments.
--   5. Updates process_paymongo_payment RPC to support underpayments,
--      exact payments, overpayment credits, and atomic notifications.
--   6. Updates record_payment_transaction RPC to support partial payments,
--      overpayment credits to resident_accounts, and atomic notifications.
--   7. Updates generate_bill_for_reading RPC with strict duplicate bill
--      prevention, carry-forward unpaid balance (old bills are marked
--      'carried_forward', never rewritten as 'paid'), and credit deduction.
--
-- Safe to re-run (idempotent).
-- ============================================================

-- 1. Extend bills table with previous_balance and credit_applied
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS previous_balance NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS credit_applied NUMERIC NOT NULL DEFAULT 0;

-- Ensure bills_status_check accepts 'partially_paid'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bills_status_check'
      AND conrelid = 'public.bills'::regclass
  ) THEN
    ALTER TABLE public.bills DROP CONSTRAINT bills_status_check;
  END IF;

  ALTER TABLE public.bills
    ADD CONSTRAINT bills_status_check
    CHECK (status IN ('pending', 'partially_paid', 'paid', 'overdue', 'void', 'carried_forward'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 1b. Idempotent payments.payment_method CHECK extension so online methods
--     recorded through the RPCs below are accepted (mirrors paymongo-webhook-migration.sql).
DO $$
BEGIN
  ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_payment_method_check
    CHECK (payment_method IN ('cash', 'gcash', 'bank', 'card', 'paymaya', 'grab_pay', 'online'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Extend resident_accounts with credit_balance
ALTER TABLE public.resident_accounts ADD COLUMN IF NOT EXISTS credit_balance NUMERIC NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resident_accounts_credit_balance_check'
      AND conrelid = 'public.resident_accounts'::regclass
  ) THEN
    ALTER TABLE public.resident_accounts
      ADD CONSTRAINT resident_accounts_credit_balance_check
      CHECK (credit_balance >= 0);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Extend payments table with PayMongo identifier columns
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paymongo_payment_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paymongo_checkout_session_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paymongo_external_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_paymongo_payment_id ON public.payments (paymongo_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_checkout_session_id ON public.payments (paymongo_checkout_session_id);

-- 4. Atomic PayMongo Webhook & Verification Payment Processing RPC
CREATE OR REPLACE FUNCTION public.process_paymongo_payment(
  p_bill_id UUID,
  p_account_id UUID,
  p_resident_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_paymongo_payment_id TEXT,
  p_checkout_session_id TEXT,
  p_event_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_external_reference TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bill public.bills%ROWTYPE;
  v_existing_payment RECORD;
  v_new_payment_id UUID;
  v_effective_amount NUMERIC;
  v_remaining_balance NUMERIC;
  v_excess_credit NUMERIC := 0;
  v_new_status TEXT;
  v_notes_clean TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'invalid_amount',
      'message', 'Payment amount must be greater than zero.'
    );
  END IF;

  v_effective_amount := ROUND(p_amount, 2);

  -- 1. Idempotency Check: check if payment with this PayMongo payment ID already exists
  IF p_paymongo_payment_id IS NOT NULL AND p_paymongo_payment_id <> '' THEN
    SELECT id, bill_id, amount, status INTO v_existing_payment
    FROM public.payments
    WHERE paymongo_payment_id = p_paymongo_payment_id
       OR reference_number = p_paymongo_payment_id
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'status', 'already_processed',
        'payment_id', v_existing_payment.id,
        'bill_id', v_existing_payment.bill_id
      );
    END IF;
  END IF;

  -- Also check if payment exists with this checkout_session_id
  IF p_checkout_session_id IS NOT NULL AND p_checkout_session_id <> '' THEN
    SELECT id, bill_id, amount, status INTO v_existing_payment
    FROM public.payments
    WHERE paymongo_checkout_session_id = p_checkout_session_id
       OR (notes IS NOT NULL AND notes LIKE '%' || p_checkout_session_id || '%')
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'status', 'already_processed',
        'payment_id', v_existing_payment.id,
        'bill_id', v_existing_payment.bill_id
      );
    END IF;
  END IF;

  -- 2. Lock and retrieve the target bill
  SELECT * INTO v_bill
  FROM public.bills
  WHERE id = p_bill_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'bill_not_found',
      'message', 'Bill not found.'
    );
  END IF;

  -- 3. Verify bill ownership / metadata consistency (if provided)
  IF p_account_id IS NOT NULL AND v_bill.account_id <> p_account_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'account_mismatch',
      'message', 'Bill account does not match payment metadata.'
    );
  END IF;

  IF p_resident_id IS NOT NULL AND v_bill.resident_id <> p_resident_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'resident_mismatch',
      'message', 'Bill resident does not match payment metadata.'
    );
  END IF;

  -- 4. Check bill status
  IF v_bill.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', TRUE,
      'status', 'already_paid',
      'bill_id', v_bill.id,
      'message', 'Bill has already been marked as paid.'
    );
  END IF;

  IF v_bill.status = 'void' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'bill_voided',
      'message', 'This bill is voided and cannot be processed for payment.'
    );
  END IF;

  IF v_bill.status = 'carried_forward' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'bill_carried_forward',
      'message', 'This bill was carried forward into a newer bill. Pay the current bill instead.'
    );
  END IF;

  -- 5. Business Calculations: Underpayment, Exact Payment, or Overpayment
  -- Let:
  --   remaining_balance = max(current_bill_amount - payment_amount, 0)
  --   credit_balance = max(payment_amount - current_bill_amount, 0)
  IF v_effective_amount < v_bill.amount_due THEN
    -- Underpayment (Scenario A)
    v_remaining_balance := ROUND(v_bill.amount_due - v_effective_amount, 2);
    v_excess_credit := 0;
    v_new_status := 'partially_paid';
  ELSIF ABS(v_effective_amount - v_bill.amount_due) < 0.01 THEN
    -- Exact payment (Scenario B)
    v_remaining_balance := 0;
    v_excess_credit := 0;
    v_new_status := 'paid';
  ELSE
    -- Overpayment (Scenario C)
    v_remaining_balance := 0;
    v_excess_credit := ROUND(v_effective_amount - v_bill.amount_due, 2);
    v_new_status := 'paid';
  END IF;

  -- 6. Insert completed payment record
  v_notes_clean := p_notes;
  INSERT INTO public.payments (
    bill_id,
    account_id,
    resident_id,
    amount,
    payment_method,
    payment_date,
    reference_number,
    paymongo_payment_id,
    paymongo_checkout_session_id,
    paymongo_external_reference,
    notes,
    recorded_by,
    status
  )
  VALUES (
    v_bill.id,
    v_bill.account_id,
    v_bill.resident_id,
    v_effective_amount,
    COALESCE(p_payment_method, 'online'),
    NOW(),
    COALESCE(p_paymongo_payment_id, p_checkout_session_id),
    p_paymongo_payment_id,
    p_checkout_session_id,
    p_external_reference,
    v_notes_clean,
    NULL,
    'completed'
  )
  RETURNING id INTO v_new_payment_id;

  -- 7. Update target bill
  UPDATE public.bills
  SET amount_due = v_remaining_balance,
      status = v_new_status,
      paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END,
      updated_at = NOW()
  WHERE id = v_bill.id;

  -- 8. If overpayment, credit excess to resident_accounts.credit_balance
  IF v_excess_credit > 0 THEN
    UPDATE public.resident_accounts
    SET credit_balance = ROUND(COALESCE(credit_balance, 0) + v_excess_credit, 2),
        updated_at = NOW()
    WHERE id = v_bill.account_id;
  END IF;

  -- 9. Atomic in-app notifications
  -- Resident notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    reference_type,
    reference_id,
    created_at
  )
  VALUES (
    v_bill.resident_id,
    'payment',
    CASE
      WHEN v_new_status = 'partially_paid' THEN 'Partial Payment Confirmed'
      WHEN v_excess_credit > 0 THEN 'Payment Confirmed (Credit Applied)'
      ELSE 'Payment Confirmed'
    END,
    'Your online payment of ₱' || TO_CHAR(v_effective_amount, 'FM999,990.00') ||
    ' for bill ' || COALESCE(v_bill.bill_number, '') ||
    ' has been successfully confirmed.' ||
    CASE
      WHEN v_new_status = 'partially_paid' THEN ' Remaining balance: ₱' || TO_CHAR(v_remaining_balance, 'FM999,990.00') || '.'
      WHEN v_excess_credit > 0 THEN ' Excess of ₱' || TO_CHAR(v_excess_credit, 'FM999,990.00') || ' was credited to your account.'
      ELSE ''
    END,
    'bill',
    v_bill.id,
    NOW()
  );

  -- Staff notifications
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    reference_type,
    reference_id,
    created_at
  )
  SELECT
    p.id,
    'payment',
    'PayMongo Payment Received',
    'Online payment of ₱' || TO_CHAR(v_effective_amount, 'FM999,990.00') ||
    ' confirmed for bill ' || COALESCE(v_bill.bill_number, '') ||
    ' (' || COALESCE(p_payment_method, 'online') || ').',
    'bill',
    v_bill.id,
    NOW()
  FROM public.profiles p
  JOIN public.roles r ON p.role_id = r.id
  WHERE r.name IN ('staff', 'super_admin') AND p.is_active = TRUE;

  -- 10. Return success response
  RETURN jsonb_build_object(
    'success', TRUE,
    'status', v_new_status,
    'payment_id', v_new_payment_id,
    'bill_id', v_bill.id,
    'amount', v_effective_amount,
    'remaining_balance', v_remaining_balance,
    'excess_credit', v_excess_credit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_paymongo_payment(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_paymongo_payment(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- NOTE: do NOT add a separate 9-argument overload. The canonical 10-argument
-- function above has defaults for p_event_id / p_notes / p_external_reference,
-- so it already accepts 8, 9 or 10 positional arguments. A second 9-argument
-- overload would make 9-argument calls ambiguous ("function is not unique").


-- 5. Staff Record Payment Transaction RPC (supports partial payments, multi-bills, & overpayment credit)
CREATE OR REPLACE FUNCTION public.record_payment_transaction(
  p_bill_ids UUID[],
  p_account_id UUID,
  p_resident_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_reference_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bill RECORD;
  v_payment_ids UUID[] := ARRAY[]::UUID[];
  v_new_payment_id UUID;
  v_bill_count INTEGER := 0;
  v_remaining NUMERIC;
  v_apply NUMERIC;
  v_new_balance NUMERIC;
  v_bills_paid INTEGER := 0;
  v_bills_partial INTEGER := 0;
  v_first_bill_id UUID := NULL;
  v_first_bill_number TEXT := NULL;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and administrators can record payments.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero.';
  END IF;

  IF p_payment_method NOT IN ('cash', 'gcash', 'bank', 'card', 'paymaya', 'grab_pay', 'online') THEN
    RAISE EXCEPTION 'Invalid payment method: %.', p_payment_method;
  END IF;

  v_remaining := ROUND(p_amount, 2);

  IF p_bill_ids IS NOT NULL AND cardinality(p_bill_ids) > 0 THEN
    FOR v_bill IN
      SELECT id, bill_number, amount_due, status, billing_period, due_date
      FROM public.bills
      WHERE id = ANY (p_bill_ids)
        AND deleted_at IS NULL
      ORDER BY
        COALESCE(due_date, DATE '9999-12-31') ASC,
        billing_period ASC NULLS LAST,
        created_at ASC
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining < 0.01;

      IF v_bill.status IN ('paid', 'void', 'carried_forward') OR COALESCE(v_bill.amount_due, 0) < 0.01 THEN
        CONTINUE;
      END IF;

      IF v_first_bill_id IS NULL THEN
        v_first_bill_id := v_bill.id;
        v_first_bill_number := v_bill.bill_number;
      END IF;

      v_apply := LEAST(ROUND(v_bill.amount_due, 2), v_remaining);
      IF v_apply < 0.01 THEN
        CONTINUE;
      END IF;

      INSERT INTO public.payments (
        bill_id, account_id, resident_id, amount,
        payment_method, payment_date, reference_number,
        notes, recorded_by, status
      )
      VALUES (
        v_bill.id, p_account_id, p_resident_id,
        v_apply,
        p_payment_method, NOW(), p_reference_number,
        p_notes, auth.uid(), 'completed'
      )
      RETURNING id INTO v_new_payment_id;

      v_payment_ids := array_append(v_payment_ids, v_new_payment_id);
      v_bill_count := v_bill_count + 1;
      v_new_balance := ROUND(v_bill.amount_due - v_apply, 2);

      IF v_new_balance < 0.01 THEN
        UPDATE public.bills
        SET amount_due = 0,
            status = 'paid',
            paid_at = NOW(),
            updated_at = NOW()
        WHERE id = v_bill.id;
        v_bills_paid := v_bills_paid + 1;
      ELSE
        UPDATE public.bills
        SET amount_due = v_new_balance,
            status = 'partially_paid',
            updated_at = NOW()
        WHERE id = v_bill.id;
        v_bills_partial := v_bills_partial + 1;
      END IF;

      v_remaining := ROUND(v_remaining - v_apply, 2);
    END LOOP;

    IF v_bill_count = 0 THEN
      RAISE EXCEPTION 'No payable bills found for the selected billing periods.';
    END IF;

    -- If excess payment remains after covering all selected bills, store as resident credit!
    IF v_remaining > 0 THEN
      UPDATE public.resident_accounts
      SET credit_balance = ROUND(COALESCE(credit_balance, 0) + v_remaining, 2),
          updated_at = NOW()
      WHERE id = p_account_id;
    END IF;
  ELSE
    -- General account credit payment (not tied to specific bills)
    INSERT INTO public.payments (
      account_id, resident_id, amount,
      payment_method, payment_date, reference_number,
      notes, recorded_by, status
    )
    VALUES (
      p_account_id, p_resident_id, v_remaining,
      p_payment_method, NOW(), p_reference_number,
      p_notes, auth.uid(), 'completed'
    )
    RETURNING id INTO v_new_payment_id;
    v_payment_ids := array_append(v_payment_ids, v_new_payment_id);

    UPDATE public.resident_accounts
    SET credit_balance = ROUND(COALESCE(credit_balance, 0) + v_remaining, 2),
        updated_at = NOW()
    WHERE id = p_account_id;

    v_remaining := 0;
  END IF;

  -- Create notification for resident
  IF p_resident_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      reference_type,
      reference_id,
      created_at
    )
    VALUES (
      p_resident_id,
      'payment',
      CASE
        WHEN v_bills_partial > 0 AND v_bills_paid = 0 THEN 'Partial Payment Recorded'
        WHEN v_remaining > 0 THEN 'Payment Recorded (Excess Credited)'
        ELSE 'Payment Confirmed'
      END,
      'A payment of ₱' || TO_CHAR(p_amount, 'FM999,990.00') ||
      ' via ' || p_payment_method ||
      ' has been recorded for your account' ||
      CASE WHEN v_first_bill_number IS NOT NULL THEN ' (Bill ' || v_first_bill_number || ')' ELSE '' END || '.' ||
      CASE WHEN v_remaining > 0 THEN ' Excess of ₱' || TO_CHAR(v_remaining, 'FM999,990.00') || ' was credited to your account.' ELSE '' END,
      'bill',
      v_first_bill_id,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'payment_ids', to_jsonb(v_payment_ids),
    'bills_touched', v_bill_count,
    'bills_paid', v_bills_paid,
    'bills_partial', v_bills_partial,
    'total_amount', ROUND(p_amount, 2),
    'unallocated', 0,
    'excess_credited', v_remaining
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_payment_transaction(UUID[], UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payment_transaction(UUID[], UUID, UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;


-- 6. Bill Generation RPC with Duplicate Prevention, Carry-Forward Balance, and Credit Application
CREATE OR REPLACE FUNCTION public.generate_bill_for_reading(p_reading_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reading public.meter_readings%ROWTYPE;
  v_rate NUMERIC := 0;
  v_components JSONB := '[]'::jsonb;
  v_component_total NUMERIC := 0;
  v_grace_days INTEGER := 0;
  v_period_date DATE;
  v_period TEXT;
  v_period_start DATE;
  v_period_end DATE;
  v_due_date DATE;
  v_current_charges NUMERIC := 0;
  v_previous_balance NUMERIC := 0;
  v_available_credit NUMERIC := 0;
  v_credit_to_apply NUMERIC := 0;
  v_net_amount_due NUMERIC := 0;
  v_new_id UUID;
  v_new_number TEXT;
  v_existing_id UUID;
  v_existing_number TEXT;
  v_existing_status TEXT;
  v_old_unpaid_bill RECORD;
BEGIN
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Only staff and administrators can generate bills.';
  END IF;

  SELECT * INTO v_reading
  FROM public.meter_readings
  WHERE id = p_reading_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meter reading not found.';
  END IF;

  IF v_reading.current_reading IS NULL THEN
    RAISE EXCEPTION 'No current reading recorded yet. Record the reading before generating a bill.';
  END IF;

  IF v_reading.status NOT IN ('approved', 'billed') THEN
    RAISE EXCEPTION 'Only approved readings can be billed.';
  END IF;

  -- Derive billing period
  v_period_date := COALESCE(v_reading.assignment_date, v_reading.reading_date::date);
  v_period := to_char(v_period_date, 'YYYY-MM');
  v_period_start := date_trunc('month', v_period_date)::date;
  v_period_end := (date_trunc('month', v_period_date) + INTERVAL '1 month - 1 day')::date;

  -- Lock account to prevent concurrent duplicate generation
  PERFORM pg_advisory_xact_lock(hashtext(v_reading.account_id::text || ':' || v_period));

  -- Idempotency check 1: this reading already has a bill
  SELECT id, bill_number, status INTO v_existing_id, v_existing_number, v_existing_status
  FROM public.bills
  WHERE reading_id = p_reading_id AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.meter_readings SET status = 'billed'
    WHERE id = p_reading_id AND status <> 'billed';

    RETURN jsonb_build_object(
      'generated', FALSE,
      'reason', 'already_billed_reading',
      'message', 'A bill for this meter reading already exists (' || v_existing_number || ').',
      'bill_id', v_existing_id,
      'bill_number', v_existing_number
    );
  END IF;

  -- Idempotency check 2: account already has a bill for this period (Requirement 4)
  SELECT id, bill_number, status INTO v_existing_id, v_existing_number, v_existing_status
  FROM public.bills
  WHERE account_id = v_reading.account_id
    AND billing_period = v_period
    AND deleted_at IS NULL
    AND status IN ('pending', 'partially_paid', 'overdue')
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.meter_readings SET status = 'billed'
    WHERE id = p_reading_id AND status <> 'billed';

    RETURN jsonb_build_object(
      'generated', FALSE,
      'reason', 'duplicate',
      'message', 'A bill for this account and billing period already exists (' || v_existing_number || ').',
      'bill_id', v_existing_id,
      'bill_number', v_existing_number
    );
  END IF;

  -- Retrieve water rate & system settings
  SELECT COALESCE((value #>> '{}')::numeric, 0) INTO v_rate
  FROM public.system_settings
  WHERE key = 'billing.water_rate';
  IF v_rate IS NULL OR v_rate <= 0 THEN
    RAISE EXCEPTION 'Water rate has not been configured yet. Set it under Configure Bills before generating bills.';
  END IF;

  SELECT COALESCE((value #>> '{}')::int, 0) INTO v_grace_days
  FROM public.system_settings
  WHERE key = 'billing.grace_period_days';

  SELECT value INTO v_components
  FROM public.system_settings
  WHERE key = 'billing.extra_components';
  IF v_components IS NULL OR jsonb_typeof(v_components) <> 'array' THEN
    v_components := '[]'::jsonb;
  END IF;
  SELECT COALESCE(sum(COALESCE(NULLIF(c->>'price', '')::numeric, 0)), 0)
    INTO v_component_total
  FROM jsonb_array_elements(v_components) AS c;

  v_due_date := CASE WHEN v_grace_days > 0 THEN v_period_end + v_grace_days ELSE NULL END;

  -- 1. Base consumption charges for current period
  v_current_charges := ROUND((v_reading.consumption * v_rate + v_component_total)::numeric, 2);

  -- 2. Carry-forward outstanding balance from prior open/unpaid bills
  -- Fetch sum of outstanding amount_due on prior bills for this account
  SELECT COALESCE(SUM(amount_due), 0) INTO v_previous_balance
  FROM public.bills
  WHERE account_id = v_reading.account_id
    AND deleted_at IS NULL
    AND status IN ('pending', 'partially_paid', 'overdue')
    AND billing_period < v_period;

  -- Mark prior unpaid bills as CARRIED FORWARD into this cycle. They stop being
  -- counted as open/outstanding (excluded from every pending/overdue filter) but
  -- keep their original `amount` and `amount_due` for the historical record —
  -- they are NEVER rewritten to 'paid' and no fabricated payment timestamp is set.
  FOR v_old_unpaid_bill IN
    SELECT id, bill_number, amount_due
    FROM public.bills
    WHERE account_id = v_reading.account_id
      AND deleted_at IS NULL
      AND status IN ('pending', 'partially_paid', 'overdue')
      AND billing_period < v_period
    FOR UPDATE
  LOOP
    UPDATE public.bills
    SET status = 'carried_forward',
        updated_at = NOW()
    WHERE id = v_old_unpaid_bill.id;
  END LOOP;

  -- 3. Retrieve available overpayment credit from resident_accounts
  SELECT COALESCE(credit_balance, 0) INTO v_available_credit
  FROM public.resident_accounts
  WHERE id = v_reading.account_id
  FOR UPDATE;

  -- Deduct credit from bill amount
  IF v_available_credit > 0 THEN
    v_credit_to_apply := LEAST(ROUND(v_current_charges + v_previous_balance, 2), v_available_credit);
    UPDATE public.resident_accounts
    SET credit_balance = ROUND(credit_balance - v_credit_to_apply, 2),
        updated_at = NOW()
    WHERE id = v_reading.account_id;
  ELSE
    v_credit_to_apply := 0;
  END IF;

  -- 4. Calculate Net Amount Due
  v_net_amount_due := ROUND(GREATEST((v_current_charges + v_previous_balance) - v_credit_to_apply, 0), 2);

  -- 5. Insert new bill
  INSERT INTO public.bills (
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
    paid_at,
    generated_by
  )
  VALUES (
    v_reading.account_id,
    v_reading.resident_id,
    v_reading.id,
    v_period,
    v_period_start,
    v_period_end,
    v_reading.previous_reading,
    v_reading.current_reading,
    v_reading.consumption,
    v_rate,
    v_components,
    v_current_charges,
    v_previous_balance,
    v_credit_to_apply,
    v_net_amount_due,
    CASE WHEN v_net_amount_due < 0.01 THEN 'paid' ELSE 'pending' END,
    v_due_date,
    CASE WHEN v_net_amount_due < 0.01 THEN NOW() ELSE NULL END,
    auth.uid()
  )
  RETURNING id, bill_number INTO v_new_id, v_new_number;

  -- Mark reading as billed
  UPDATE public.meter_readings SET status = 'billed'
  WHERE id = p_reading_id AND status <> 'billed';

  RETURN jsonb_build_object(
    'generated', TRUE,
    'bill_id', v_new_id,
    'bill_number', v_new_number,
    'billing_period', v_period,
    'amount', v_current_charges,
    'previous_balance', v_previous_balance,
    'credit_applied', v_credit_to_apply,
    'amount_due', v_net_amount_due
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_bill_for_reading(UUID) TO authenticated;

-- 7. Keep the "one open bill per account/period" guarantee aligned with the new
--    partially-payed state (the pre-existing index only covered pending/overdue).
DROP INDEX IF EXISTS public.bills_account_period_open_unique;
CREATE UNIQUE INDEX IF NOT EXISTS bills_account_period_open_unique
  ON public.bills (account_id, billing_period)
  WHERE deleted_at IS NULL AND status IN ('pending', 'partially_paid', 'overdue');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 8. VERIFICATION QUERIES (read-only — run after the migration)
-- ============================================================
-- 8a. Confirm the new columns exist.
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND ((table_name = 'bills' AND column_name IN ('previous_balance','credit_applied'))
--     OR (table_name = 'resident_accounts' AND column_name = 'credit_balance')
--     OR (table_name = 'payments' AND column_name LIKE 'paymongo%'))
-- ORDER BY table_name, column_name;

-- 8b. Confirm the bill status constraint now allows the new states.
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'bills_status_check';

-- 8c. Confirm exactly one canonical process_paymongo_payment signature (10 args, no 9-arg overload).
-- SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'process_paymongo_payment';

-- 8d. Duplicate bills for the same account/period (should return ZERO rows).
-- SELECT account_id, billing_period, count(*)
-- FROM public.bills
-- WHERE deleted_at IS NULL AND status IN ('pending','partially_paid','overdue')
-- GROUP BY account_id, billing_period HAVING count(*) > 1;

-- 8e. Payments carrying a PayMongo id but no matching bill (should return ZERO rows).
-- SELECT p.id, p.paymongo_payment_id
-- FROM public.payments p
-- LEFT JOIN public.bills b ON b.id = p.bill_id
-- WHERE p.paymongo_payment_id IS NOT NULL AND b.id IS NULL;
