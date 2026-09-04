-- ============================================================
-- BKWB — PayMongo Webhook Payment Confirmation Migration
-- ------------------------------------------------------------
-- Safe to re-run (idempotent).
--
-- Adds:
--   * Extended payment_method CHECK constraint to support online methods
--   * Index on payments(reference_number) for O(1) idempotency lookups
--   * Atomic process_paymongo_payment() RPC with locking and verification
-- ============================================================

-- 1. Extend payment_method CHECK constraint on public.payments
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_payment_method_check'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_payment_method_check;
  END IF;

  -- Add updated constraint with online payment methods
  ALTER TABLE public.payments
    ADD CONSTRAINT payments_payment_method_check
    CHECK (payment_method IN ('cash', 'gcash', 'bank', 'card', 'paymaya', 'grab_pay', 'online'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Ensure index on payments.reference_number for fast idempotency checks
CREATE INDEX IF NOT EXISTS idx_payments_reference_number ON public.payments (reference_number);

-- 3. Atomic PayMongo Webhook Payment Processing RPC
CREATE OR REPLACE FUNCTION public.process_paymongo_payment(
  p_bill_id UUID,
  p_account_id UUID,
  p_resident_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_paymongo_payment_id TEXT,
  p_checkout_session_id TEXT,
  p_event_id TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
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
BEGIN
  -- 1. Idempotency Check: check if payment with this reference_number already exists
  IF p_paymongo_payment_id IS NOT NULL AND p_paymongo_payment_id <> '' THEN
    SELECT id, bill_id, amount, status INTO v_existing_payment
    FROM public.payments
    WHERE reference_number = p_paymongo_payment_id
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

  -- Also check if notes contains checkout_session_id
  IF p_checkout_session_id IS NOT NULL AND p_checkout_session_id <> '' THEN
    SELECT id, bill_id, amount, status INTO v_existing_payment
    FROM public.payments
    WHERE notes IS NOT NULL AND notes LIKE '%' || p_checkout_session_id || '%'
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
      'error', 'bill_not_found'
    );
  END IF;

  -- 3. Verify bill ownership / metadata consistency (if provided)
  IF p_account_id IS NOT NULL AND v_bill.account_id <> p_account_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'account_mismatch'
    );
  END IF;

  IF p_resident_id IS NOT NULL AND v_bill.resident_id <> p_resident_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'resident_mismatch'
    );
  END IF;

  -- 4. Check bill status
  IF v_bill.status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'bill_already_paid',
      'status', 'already_paid'
    );
  END IF;

  IF v_bill.status = 'void' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'bill_voided'
    );
  END IF;

  -- 5. Verify payment amount matches bill amount_due (exact to 2 decimals / 1 centavo tolerance)
  IF ABS(v_bill.amount_due - p_amount) >= 0.01 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'amount_mismatch',
      'bill_amount', v_bill.amount_due,
      'paid_amount', p_amount
    );
  END IF;

  -- 6. Insert completed payment record
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
    v_bill.id,
    v_bill.account_id,
    v_bill.resident_id,
    p_amount,
    p_payment_method,
    NOW(),
    p_paymongo_payment_id,
    p_notes,
    NULL,
    'completed'
  )
  RETURNING id INTO v_new_payment_id;

  -- 7. Mark bill as paid
  UPDATE public.bills
  SET status = 'paid',
      paid_at = NOW(),
      updated_at = NOW()
  WHERE id = v_bill.id;

  -- 8. Return success payload
  RETURN jsonb_build_object(
    'success', TRUE,
    'status', 'paid',
    'payment_id', v_new_payment_id,
    'bill_id', v_bill.id,
    'amount', p_amount
  );
END;
$$;

-- Security: Revoke public execution, allow service_role only
REVOKE ALL ON FUNCTION public.process_paymongo_payment(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_paymongo_payment(UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
