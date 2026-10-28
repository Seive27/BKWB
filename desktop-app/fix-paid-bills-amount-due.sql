-- Repair bills that were marked paid without clearing the remaining balance.
-- Staff "Mark as paid" previously only set status/paid_at, leaving amount_due
-- at the original charge so Amount Paid stayed ₱0 and Amount Due stayed open.

UPDATE public.bills
SET
  amount = COALESCE(amount, amount_due),
  amount_due = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND status = 'paid'
  AND COALESCE(amount_due, 0) > 0;

UPDATE public.bills
SET
  amount_due = 0,
  updated_at = NOW()
WHERE deleted_at IS NULL
  AND status = 'void'
  AND COALESCE(amount_due, 0) > 0;
