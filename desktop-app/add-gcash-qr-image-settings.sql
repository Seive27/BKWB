-- ============================================================
-- BKWB - GCash QR Image Upload Migration
-- ============================================================

-- 1. Create a public storage bucket for system assets (like the QR code)
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-assets', 'system-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'system-assets'
DROP POLICY IF EXISTS "Public can view system assets" ON storage.objects;
CREATE POLICY "Public can view system assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'system-assets');

DROP POLICY IF EXISTS "Super Admin can insert system assets" ON storage.objects;
CREATE POLICY "Super Admin can insert system assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'system-assets' 
    AND public.current_user_role_name() = 'super_admin'
  );

DROP POLICY IF EXISTS "Super Admin can update system assets" ON storage.objects;
CREATE POLICY "Super Admin can update system assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'system-assets' 
    AND public.current_user_role_name() = 'super_admin'
  )
  WITH CHECK (
    bucket_id = 'system-assets' 
    AND public.current_user_role_name() = 'super_admin'
  );

DROP POLICY IF EXISTS "Super Admin can delete system assets" ON storage.objects;
CREATE POLICY "Super Admin can delete system assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'system-assets' 
    AND public.current_user_role_name() = 'super_admin'
  );

-- 3. Cleanup previous dynamic GCash settings from the system_settings table if they exist
DELETE FROM public.system_settings WHERE key IN ('billing.gcash_mobile_number', 'billing.gcash_payment_link', 'billing.gcash_account_name');

-- 4. Insert the new QR Image URL setting
INSERT INTO public.system_settings (key, value, category, label, description, is_public) VALUES
  ('billing.gcash_qr_image_url', '""', 'billing', 'GCash Payment QR Code', 'Official GCash payment QR code image.', TRUE),
  ('billing.gcash_payment_active', 'false', 'billing', 'Enable GCash Payments', 'Toggle to enable or disable GCash online payments.', TRUE)
ON CONFLICT (key) DO UPDATE SET
  category = EXCLUDED.category,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public;

-- 5. Note: The prevent_staff_billing_settings_update trigger and submit_gcash_payment_confirmation / verify_gcash_payment RPCs 
-- from the previous migration remain fully valid and necessary for the new flow as they just handle the payment records itself, 
-- independent of how the QR is displayed or generated.
