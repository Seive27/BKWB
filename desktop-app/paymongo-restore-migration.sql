-- ============================================================
-- BKWB - PayMongo restoration: additive payment_method migration
-- ------------------------------------------------------------
-- Context:
--   The newer online-payment migration
--   (add-online-payment-features.sql) narrowed
--   public.payments.payment_method to:
--       ('cash', 'gcash', 'bank', 'maribank')
--   This REJECTS the methods the existing PayMongo webhook writes
--   ('card', 'paymaya', 'grab_pay', 'online') via
--   process_paymongo_payment(), so PayMongo-confirmed rows could not
--   be inserted.
--
-- This migration ONLY widens that CHECK constraint so BOTH the current
-- GCash/MariBank methods AND PayMongo's methods are accepted. It is
-- additive and non-destructive:
--   * no tables, columns, or rows are dropped
--   * no payment statuses are reset
--   * existing historical payments / QR / MariBank records are untouched
--
-- Safe to run against the current real-db schema. Idempotent (re-runnable).
-- ============================================================

-- 1. Widen payment_method to support the current methods + PayMongo methods.
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN (
    'cash',      -- walk-in / staff-recorded
    'gcash',     -- resident QR
    'maribank',  -- resident QR
    'bank',
    'card',      -- PayMongo
    'paymaya',   -- PayMongo
    'grab_pay',  -- PayMongo
    'online'     -- PayMongo fallback / generic online
  ));

-- 2. Idempotency support for the PayMongo webhook (reference_number lookups).
CREATE INDEX IF NOT EXISTS idx_payments_reference_number
  ON public.payments (reference_number);

-- 3. Verify the PayMongo webhook RPC.
--    process_paymongo_payment() is provided by
--    desktop-app/paymongo-webhook-migration.sql and, since that
--    migration was part of the previously working PayMongo flow, is
--    expected to already exist and be compatible with the current
--    schema (it only uses payments/bills columns that exist).
--
--    Do NOT recreate it unnecessarily. Confirm it exists with:
--
--      SELECT p.oid::regprocedure AS signature
--      FROM pg_proc p
--      JOIN pg_namespace n ON n.oid = p.pronamespace
--      WHERE n.nspname = 'public'
--        AND p.proname = 'process_paymongo_payment';
--
--    If that returns 0 rows, apply ONLY the function section of
--    desktop-app/paymongo-webhook-migration.sql (CREATE OR REPLACE
--    FUNCTION public.process_paymongo_payment ... plus the GRANT/REVOKE
--    at the end), then run THIS migration again so the widened
--    constraint wins over the older migration's narrower list.

NOTIFY pgrst, 'reload schema';
