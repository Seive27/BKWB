-- ============================================================
-- BKWB - Online Payment (GCash & MariBank) Features Migration
-- ============================================================

-- 1. Update check constraints to allow 'maribank' and 'rejected' (if we use 'rejected' instead of 'cancelled')
-- Actually, the prompt says "use existing if established". The existing is 'cancelled'.
-- Let's stick to 'cancelled' for the status, but add 'maribank' to payment_method.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('cash', 'gcash', 'bank', 'maribank'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('completed', 'pending', 'cancelled', 'refunded', 'rejected'));

-- 2. Add columns for verification and rejection details
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Add MariBank to system settings
INSERT INTO public.system_settings (key, value, category, label, description, is_public) VALUES
  ('billing.maribank_qr_image_url', '""', 'billing', 'MariBank Payment QR Code', 'Official MariBank payment QR code/instructions image.', TRUE),
  ('billing.maribank_payment_active', 'false', 'billing', 'Enable MariBank Payments', 'Toggle to enable or disable MariBank online payments.', TRUE)
ON CONFLICT (key) DO NOTHING;

-- 4. Replace RPC for online payment submission to handle both providers
CREATE OR REPLACE FUNCTION public.submit_online_payment_confirmation(
  p_bill_id UUID,
  p_amount NUMERIC,
  p_reference_number TEXT,
  p_payment_method TEXT
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
  IF p_payment_method NOT IN ('gcash', 'maribank') THEN
    RAISE EXCEPTION 'Invalid payment method.';
  END IF;

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
    p_bill_id, v_account_id, v_resident_id, p_amount, p_payment_method, 
    p_reference_number, 'pending', NOW()
  ) RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

-- 5. Replace RPC for payment verification
CREATE OR REPLACE FUNCTION public.verify_online_payment(
  p_payment_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
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
    RAISE EXCEPTION 'Payment not found or already verified/rejected.';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.payments 
    SET status = 'completed', 
        updated_at = NOW(), 
        recorded_by = auth.uid(),
        verified_by = auth.uid(),
        verified_at = NOW()
    WHERE id = p_payment_id;
    
    -- Update bill amount_paid
    UPDATE public.bills 
    SET amount_paid = COALESCE(amount_paid, 0) + v_payment.amount,
        status = CASE 
                   WHEN (COALESCE(amount_paid, 0) + v_payment.amount) >= amount_due THEN 'paid'
                   ELSE 'pending'
                 END,
        updated_at = NOW()
    WHERE id = v_payment.bill_id;
    
  ELSIF p_action = 'reject' THEN
    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
      RAISE EXCEPTION 'Rejection reason is required.';
    END IF;
    
    UPDATE public.payments 
    SET status = 'rejected', 
        rejection_reason = p_rejection_reason,
        updated_at = NOW(), 
        recorded_by = auth.uid(),
        rejected_by = auth.uid(),
        rejected_at = NOW()
    WHERE id = p_payment_id;
  ELSE
    RAISE EXCEPTION 'Invalid action. Use approve or reject.';
  END IF;
END;
$$;

