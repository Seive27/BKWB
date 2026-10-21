-- Fix: PayMongo verify/webhook fails with
--   "Could not choose the best candidate function between:
--     process_paymongo_payment(... 9 args)
--     process_paymongo_payment(... 10 args, p_external_reference)"
--
-- Cause: both overloads accept the same first 9 parameters (later args have
-- defaults). When the edge function omits or nulls p_external_reference,
-- Postgres cannot pick a winner and the payment never updates amount_due.
--
-- Keep only the canonical 10-arg function from defense-final-fixes-migration.sql.

DROP FUNCTION IF EXISTS public.process_paymongo_payment(
  UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT
);

REVOKE ALL ON FUNCTION public.process_paymongo_payment(
  UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_paymongo_payment(
  UUID, UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;
