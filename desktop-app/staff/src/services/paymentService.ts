import { supabase } from '../lib/supabase';
import type { Payment, PaymentMethod, PaymentStatus } from '../types';

export interface PaymentQueryOptions {
  status?: PaymentStatus;
  limit?: number;
}

export interface RecordPaymentInput {
  billId?: string | null;
  accountId?: string | null;
  residentId?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
  paymentDate?: string;
}

export interface RecordMultiBillPaymentInput {
  billIds: string[];
  accountId: string;
  residentId: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  notes?: string | null;
}

export function getPaymentErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    code === '42P01' ||
    msg.includes('relation "public.payments" does not exist') ||
    msg.includes('relation "payments" does not exist') ||
    (msg.includes('payments') && msg.includes('does not exist'))
  ) {
    return 'The payments table has not been set up yet. Please run the latest SQL migration (bkwb-billing-migration.sql).';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to manage payments.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

type PaymentRow = Payment;

function mapPaymentRow(row: PaymentRow): Payment {
  return {
    ...row,
    bill: row.bill ?? null,
    account: row.account ?? null,
    resident: row.resident ?? null,
    recorder: row.recorder ?? null,
    billId: row.bill_id ?? undefined,
    residentName: row.resident
      ? `${row.resident.first_name} ${row.resident.last_name}`.trim()
      : undefined,
    date: row.payment_date,
    method: row.payment_method,
  };
}

const PAYMENT_SELECT =
  '*, bill:bills!payments_bill_id_fkey(id, bill_number, billing_period, amount_due, status), account:resident_accounts!payments_account_id_fkey(id, account_number, sitio, service_address), resident:profiles!payments_resident_id_fkey(id, first_name, last_name), recorder:profiles!payments_recorded_by_fkey(id, first_name, last_name)';

/**
 * Fetch payments (newest first).
 */
export async function getPayments(options: PaymentQueryOptions = {}): Promise<Payment[]> {
  let query = supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(getPaymentErrorMessage(error));
  }

  return (data ?? []).map((row) => mapPaymentRow(row as unknown as PaymentRow));
}

/**
 * Fetch payments for a specific resident.
 */
export async function getPaymentsByResident(residentId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('resident_id', residentId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (error) {
    throw new Error(getPaymentErrorMessage(error));
  }

  return (data ?? []).map((row) => mapPaymentRow(row as unknown as PaymentRow));
}

/**
 * Fetch payments for a specific account.
 */
export async function getPaymentsByAccount(accountId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select(PAYMENT_SELECT)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });

  if (error) {
    throw new Error(getPaymentErrorMessage(error));
  }

  return (data ?? []).map((row) => mapPaymentRow(row as unknown as PaymentRow));
}

/**
 * Record a payment for a single bill or account.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const recordedBy = session?.user?.id ?? null;

  const row = {
    bill_id: input.billId ?? null,
    account_id: input.accountId ?? null,
    resident_id: input.residentId ?? null,
    amount: input.amount,
    payment_method: input.paymentMethod,
    reference_number: input.referenceNumber?.trim() || null,
    notes: input.notes?.trim() || null,
    payment_date: input.paymentDate || new Date().toISOString(),
    recorded_by: recordedBy,
    status: 'completed' as const,
  };

  const { data, error } = await supabase
    .from('payments')
    .insert([row])
    .select(PAYMENT_SELECT)
    .single();

  if (error) {
    throw new Error(getPaymentErrorMessage(error));
  }

  // If associated with a bill, mark the bill as paid
  if (input.billId) {
    const { error: billError } = await supabase
      .from('bills')
      .update({
        status: 'paid',
        paid_at: row.payment_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.billId);

    if (billError) {
      console.warn('[recordPayment] Could not update bill status:', billError.message);
    }
  }

  return mapPaymentRow(data as unknown as PaymentRow);
}

/**
 * Record payment for multiple selected bills atomically.
 */
export async function recordMultiBillPayment(
  input: RecordMultiBillPaymentInput
): Promise<{ success: boolean; billsPaid: number; totalAmount: number }> {
  // First try the RPC function if available
  const { error: rpcError } = await supabase.rpc('record_payment_transaction', {
    p_bill_ids: input.billIds,
    p_account_id: input.accountId,
    p_resident_id: input.residentId,
    p_amount: input.totalAmount,
    p_payment_method: input.paymentMethod,
    p_reference_number: input.referenceNumber?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });

  if (!rpcError) {
    return {
      success: true,
      billsPaid: input.billIds.length,
      totalAmount: input.totalAmount,
    };
  }

  // Fallback to client-side batch insert + update
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const recordedBy = session?.user?.id ?? null;
  const now = new Date().toISOString();

  // If specific bills are selected
  if (input.billIds.length > 0) {
    const { data: billsData, error: billsFetchErr } = await supabase
      .from('bills')
      .select('id, amount_due')
      .in('id', input.billIds);

    if (billsFetchErr) {
      throw new Error(getPaymentErrorMessage(billsFetchErr));
    }

    const billsMap = new Map((billsData ?? []).map((b) => [b.id, b.amount_due]));

    const paymentRows = input.billIds.map((bId) => ({
      bill_id: bId,
      account_id: input.accountId,
      resident_id: input.residentId,
      amount: billsMap.get(bId) ?? input.totalAmount / input.billIds.length,
      payment_method: input.paymentMethod,
      payment_date: now,
      reference_number: input.referenceNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      recorded_by: recordedBy,
      status: 'completed' as const,
    }));

    const { error: insertErr } = await supabase.from('payments').insert(paymentRows);
    if (insertErr) {
      throw new Error(getPaymentErrorMessage(insertErr));
    }

    const { error: updateErr } = await supabase
      .from('bills')
      .update({
        status: 'paid',
        paid_at: now,
        updated_at: now,
      })
      .in('id', input.billIds);

    if (updateErr) {
      throw new Error(getPaymentErrorMessage(updateErr));
    }
  } else {
    const singleRow = {
      account_id: input.accountId,
      resident_id: input.residentId,
      amount: input.totalAmount,
      payment_method: input.paymentMethod,
      payment_date: now,
      reference_number: input.referenceNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      recorded_by: recordedBy,
      status: 'completed' as const,
    };

    const { error: insertErr } = await supabase.from('payments').insert([singleRow]);
    if (insertErr) {
      throw new Error(getPaymentErrorMessage(insertErr));
    }
  }

  return {
    success: true,
    billsPaid: input.billIds.length,
    totalAmount: input.totalAmount,
  };
}

/** Legacy stub compatibility */
export async function verifyPayment(_id: string): Promise<void> {}

// ── Realtime ──

/**
 * Subscribe to insert/update/delete events on the payments table.
 * Returns an unsubscribe function.
 */
export function subscribeToPayments(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: Payment | null) => void
): () => void {
  const channel = supabase
    .channel(`payments-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapPaymentRow(payload.new as unknown as PaymentRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
