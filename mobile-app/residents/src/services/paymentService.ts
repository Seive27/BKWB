import { supabase } from '@/lib/supabase';

/**
 * Resident online-payment service.
 *
 * The PayMongo backend is already implemented, audited, and deployed:
 *
 *   Resident App → create-paymongo-checkout (Edge Function)
 *               → PayMongo Hosted Checkout
 *               → paymongo-webhook (Edge Function)
 *               → process_paymongo_payment() (atomic RPC)
 *               → payments table + bills table + realtime
 *
 * This file ONLY wraps that existing architecture for the Resident app.
 * It never marks a bill paid locally — the database/webhook is the sole
 * source of truth for payment confirmation.
 */

/** Shape of the safe payload returned by create-paymongo-checkout. */
export interface CheckoutSession {
  checkoutUrl: string;
  checkoutSessionId: string;
  /** PayMongo reference number — the bill number for BKWB checkouts. */
  referenceNumber: string;
  amount: number;
  currency: string;
}

/** Mirrors one row of the Supabase `payments` table (+ bill join). */
export interface ResidentPayment {
  id: string;
  bill_id: string | null;
  account_id: string | null;
  resident_id: string | null;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string | null;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  created_at: string;
  bill?: { bill_number: string; billing_period: string } | null;
}

const PAYMENT_SELECT =
  '*, bill:bills!payments_bill_id_fkey(bill_number, billing_period)';

/**
 * Create a PayMongo Hosted Checkout session for one bill.
 *
 * The edge function re-reads the amount directly from the database, so the
 * amount shown here is informational only — the gateway always charges the
 * authoritative bill amount. Creating a session is NOT proof of payment:
 * the bill stays unpaid until the paymongo-webhook confirms it.
 */
export async function createCheckoutSession(billId: string): Promise<CheckoutSession> {
  const { data, error: fnError } = await supabase.functions.invoke(
    'create-paymongo-checkout',
    { body: { bill_id: billId } }
  );

  if (fnError) {
    throw new Error(fnError.message || 'Failed to start the payment checkout.');
  }

  const result = (data ?? {}) as {
    success?: boolean;
    error?: string;
    checkout_url?: string;
    checkout_session_id?: string;
    reference_number?: string;
    amount?: number;
    currency?: string;
  };

  if (result.success === false || result.error) {
    throw new Error(result.error || 'Payment gateway rejected the request.');
  }

  if (!result.checkout_url || !result.checkout_session_id) {
    throw new Error('Payment gateway did not return a checkout session.');
  }

  return {
    checkoutUrl: result.checkout_url,
    checkoutSessionId: result.checkout_session_id,
    referenceNumber: result.reference_number || '',
    amount: Number(result.amount) || 0,
    currency: result.currency || 'PHP',
  };
}

/** Fetch the signed-in resident's payment records (RLS limits to their own). */
export async function getMyPayments(): Promise<ResidentPayment[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to view your payments.');
  }

  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('resident_id', session.user.id)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.warn('[payments] table not available:', error.message);
      return [];
    }
    throw new Error(error.message || 'Failed to load your payment history.');
  }

  return ((data ?? []) as unknown as ResidentPayment[]).map((row) => ({
    ...row,
    bill: row.bill ?? null,
  }));
}

/**
 * The most recent payment recorded for one bill (webhook-confirmed rows only
 * unless nothing completed exists). Returns null when the bill has no
 * payment record yet — callers must never invent one.
 */
export async function getPaymentForBill(billId: string): Promise<ResidentPayment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('bill_id', billId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })
    .limit(5);

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation')) {
      console.warn('[payments] table not available:', error.message);
      return null;
    }
    console.warn('[payments] failed to load payment for bill:', error.message);
    return null;
  }

  const rows = (data ?? []) as unknown as ResidentPayment[];
  return (
    rows.find((p) => p.status === 'completed') ??
    rows[0] ??
    null
  );
}

// ── Display helpers ──────────────────────────────────────────────────────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash (Barangay Hall)',
  gcash: 'GCash',
  paymaya: 'Maya',
  maya: 'Maya',
  card: 'Card',
  grab_pay: 'GrabPay',
  bank: 'Bank transfer',
  online: 'Online payment',
};

/** Human-readable label for a payments.payment_method value. */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '—';
  const key = method.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] ?? method;
}

/** '2026-05-12T07:45:00Z' -> 'May 12, 2026 · 3:45 PM' (device locale). */
export function formatPaymentDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
}