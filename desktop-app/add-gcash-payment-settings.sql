-- ============================================================
-- BKWB - GCash Payment Configuration Migration
-- ============================================================

-- 1. Insert default GCash settings
INSERT INTO public.system_settings (key, value, category, label, description, is_public) VALUES
  ('billing.gcash_account_name', '"Barangay Kalunasan Water System"', 'billing', 'GCash Account Name', 'Official GCash account name for online payments.', TRUE),
  ('billing.gcash_mobile_number', '""', 'billing', 'GCash Mobile Number', 'Official GCash mobile number (e.g. 09171234567).', TRUE),
  ('billing.gcash_payment_active', 'false', 'billing', 'Enable GCash Payments', 'Toggle to enable or disable GCash online payments.', TRUE)
ON CONFLICT (key) DO NOTHING;

-- 2. Restrict staff from updating billing settings (specifically GCash)
CREATE OR REPLACE FUNCTION public.prevent_staff_billing_settings_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.category = 'billing' AND public.current_user_role_name() = 'staff' THEN
    RAISE EXCEPTION 'Staff members are not allowed to modify billing settings.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_billing_settings_role ON public.system_settings;
CREATE TRIGGER enforce_billing_settings_role
  BEFORE UPDATE OR INSERT ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_staff_billing_settings_update();

-- 3. Create an RPC to submit manual GCash payment confirmation
CREATE OR REPLACE FUNCTION public.submit_gcash_payment_confirmation(
  p_bill_id UUID,
  p_amount NUMERIC,
  p_reference_number TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_account_id UUID;
  v_resident_id UUID;
  v_payment_id UUID;
  v_existing_ref UUID;
BEGIN
  -- Verify the resident owns the bill
  SELECT account_id, resident_id INTO v_account_id, v_resident_id
  FROM public.bills
  WHERE id = p_bill_id AND resident_id = auth.uid() AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bill not found or access denied.';
  END IF;

  -- Ensure reference number is unique
  SELECT id INTO v_existing_ref
  FROM public.payments
  WHERE reference_number = p_reference_number AND deleted_at IS NULL;

  IF FOUND THEN
    RAISE EXCEPTION 'Reference number % has already been used.', p_reference_number;
  END IF;

  -- Insert payment as 'pending'
  INSERT INTO public.payments (
    bill_id, account_id, resident_id, amount, payment_method, 
    reference_number, status, payment_date
  ) VALUES (
    p_bill_id, v_account_id, v_resident_id, p_amount, 'gcash', 
    p_reference_number, 'pending', NOW()
  ) RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- 4. Create an RPC to verify/approve pending payments
CREATE OR REPLACE FUNCTION public.verify_gcash_payment(
  p_payment_id UUID,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  IF public.current_user_role_name() NOT IN ('staff', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied. Staff role required.';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found or already verified.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.payments SET status = 'completed', updated_at = NOW(), recorded_by = auth.uid() WHERE id = p_payment_id;
    -- Note: Updating bill amount_paid in a simple way
    UPDATE public.bills 
    SET amount_paid = COALESCE(amount_paid, 0) + v_payment.amount,
        status = CASE 
                   WHEN (COALESCE(amount_paid, 0) + v_payment.amount) >= amount_due THEN 'paid'
                   ELSE 'pending'
                 END,
        updated_at = NOW()
    WHERE id = v_payment.bill_id;
  ELSIF p_action = 'reject' THEN
    UPDATE public.payments SET status = 'cancelled', updated_at = NOW(), recorded_by = auth.uid() WHERE id = p_payment_id;
  ELSE
    RAISE EXCEPTION 'Invalid action';
  END IF;
END;
$$;

