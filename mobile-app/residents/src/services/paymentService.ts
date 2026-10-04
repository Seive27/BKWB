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
  status: 'completed' | 'pending' | 'cancelled' | 'refunded' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  receipt_sent_at?: string | null;
  receipt_snapshot?: OfficialReceiptSnapshot | null;
  bill?: { bill_number: string; billing_period: string } | null;
}

/** Official receipt payload stored when staff taps Send Receipt. */
export interface OfficialReceiptSnapshot {
  totalPaid: number;
  residentName: string;
  accountNumber: string;
  referenceNumber: string;
  paymentDate: string;
  paymentMethod: string;
  bills: Array<{
    id: string;
    billing_period: string;
    bill_number: string;
    amount: number;
  }>;
  amountReceived?: number | null;
  changeDue?: number | null;
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
export async function createCheckoutSession(
  billId: string,
  options?: { appReturnUrl?: string }
): Promise<CheckoutSession> {
  const { data, error: fnError } = await supabase.functions.invoke(
    'create-paymongo-checkout',
    {
      body: {
        bill_id: billId,
        ...(options?.appReturnUrl ? { app_return_url: options.appReturnUrl } : {}),
      },
    }
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

/**
 * Ask the server to re-check PayMongo for a checkout session and mark the bill
 * paid if PayMongo confirms payment. Used when the webhook is delayed/missing.
 * Never invents a paid state locally — only the edge function + RPC can.
 */
export async function verifyPayMongoPayment(
  billId: string,
  checkoutSessionId?: string | null
): Promise<{ confirmed: boolean; status?: string; amount?: number; error?: string }> {
  // Refresh so a long GCash session doesn't call the function with an expired JWT.
  try {
    await supabase.auth.refreshSession();
  } catch {
    // continue with existing session
  }

  const body: { bill_id: string; checkout_session_id?: string } = {
    bill_id: billId,
  };
  const sessionId = (checkoutSessionId ?? '').trim();
  if (sessionId) body.checkout_session_id = sessionId;

  const { data, error: fnError } = await supabase.functions.invoke(
    'verify-paymongo-payment',
    { body }
  );

  type VerifyBody = {
    success?: boolean;
    status?: string;
    amount?: number;
    error?: string;
    message?: string;
  };

  let result = (data ?? {}) as VerifyBody;

  if (fnError) {
    // FunctionsHttpError: parse the response body for the real message.
    const ctx = (fnError as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as VerifyBody;
        if (body && typeof body === 'object') result = { ...result, ...body };
      } catch {
        // ignore parse errors
      }
    }
    const detail = result.error || result.message;
    return {
      confirmed: false,
      status: result.status,
      error: detail || fnError.message || 'Verification failed.',
    };
  }

  const confirmed =
    result.success === true &&
    (result.status === 'paid' ||
      result.status === 'already_paid' ||
      result.status === 'already_processed');

  return {
    confirmed,
    status: result.status,
    amount: result.amount,
    error: confirmed ? undefined : result.error || result.message,
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
  const payment =
    rows.find((p) => p.status === 'completed') ??
    rows[0] ??
    null;

  if (!payment) return null;

  return {
    ...payment,
    bill: payment.bill ?? null,
    receipt_snapshot: payment.receipt_snapshot ?? null,
    receipt_sent_at: payment.receipt_sent_at ?? null,
  };
}

/**
 * Build a displayable official receipt for a bill. Prefers the staff-sent
 * snapshot; returns null until staff has used Send Receipt.
 */
export function getOfficialReceiptForPayment(
  payment: ResidentPayment | null,
  fallback?: {
    residentName: string;
    accountNumber: string;
    billId: string;
    billNumber: string;
    billingPeriod: string;
    amountDue: number;
  }
): OfficialReceiptSnapshot | null {
  if (!payment?.receipt_sent_at) return null;
  if (payment.receipt_snapshot) return payment.receipt_snapshot;
  if (!fallback) return null;

  return {
    totalPaid: Number(payment.amount) || fallback.amountDue,
    residentName: fallback.residentName,
    accountNumber: fallback.accountNumber,
    referenceNumber: payment.reference_number || payment.id.slice(0, 8).toUpperCase(),
    paymentDate: payment.payment_date,
    paymentMethod: payment.payment_method,
    bills: [
      {
        id: fallback.billId,
        billing_period: fallback.billingPeriod,
        bill_number: fallback.billNumber,
        amount: Number(payment.amount) || fallback.amountDue,
      },
    ],
  };
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
}export async function getGCashConfig() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['billing.gcash_qr_image_url', 'billing.gcash_payment_active']);
    
  if (error) {
    console.warn('[payments] failed to load gcash config', error);
    return null;
  }
  
  let qrImageUrl = '';
  let active = false;

  data.forEach(s => {
    if (s.key === 'billing.gcash_qr_image_url') qrImageUrl = String(s.value).replace(/^"|"$/g, '');
    if (s.key === 'billing.gcash_payment_active') active = s.value === 'true' || s.value === true;
  });

  return { qrImageUrl, active };
}

export async function submitGCashPaymentConfirmation(billId: string, amount: number, referenceNumber: string) {
  const { data, error } = await supabase.rpc('submit_gcash_payment_confirmation', {
    p_bill_id: billId,
    p_amount: amount,
    p_reference_number: referenceNumber
  });
  
  if (error) {
    throw new Error(error.message || 'Failed to submit payment confirmation.');
  }
  
  return data;
}




export async function getOnlinePaymentConfig() {
  const { data, error } = await supabase.from('system_settings').select('key, value').in('key', ['billing.gcash_qr_image_url', 'billing.gcash_payment_active', 'billing.maribank_qr_image_url', 'billing.maribank_payment_active']);
  if (error) return null;
  let gcashQrImageUrl = ''; let gcashActive = false; let maribankQrImageUrl = ''; let maribankActive = false;
  data.forEach(s => {
    if (s.key === 'billing.gcash_qr_image_url') gcashQrImageUrl = String(s.value).replace(/^"|"$/g, '');
    if (s.key === 'billing.gcash_payment_active') gcashActive = s.value === 'true' || s.value === true;
    if (s.key === 'billing.maribank_qr_image_url') maribankQrImageUrl = String(s.value).replace(/^"|"$/g, '');
    if (s.key === 'billing.maribank_payment_active') maribankActive = s.value === 'true' || s.value === true;
  });
  return { gcashQrImageUrl, gcashActive, maribankQrImageUrl, maribankActive };
}

export async function submitOnlinePaymentConfirmation(billId: string, amount: number, referenceNumber: string, paymentMethod: string) {
  const { data, error } = await supabase.rpc('submit_online_payment_confirmation', { p_bill_id: billId, p_amount: amount, p_reference_number: referenceNumber, p_payment_method: paymentMethod });
  if (error) throw new Error(error.message || 'Failed to submit payment confirmation.');
  return data;
}
