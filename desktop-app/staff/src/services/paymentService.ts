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

export interface RecordMultiBillPaymentResult {
  success: boolean;
  billsPaid: number;
  billsPartial: number;
  totalAmount: number;
}

/** Snapshot stored on payments.receipt_snapshot for resident Official Receipt view. */
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

export interface SendOfficialReceiptInput {
  residentId: string;
  billIds: string[];
  receipt: OfficialReceiptSnapshot;
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
  if (msg.includes('payments_status_check') || msg.includes('violates check constraint')) {
    return 'Payment could not be recorded because of an invalid payment status. Please refresh and try again.';
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

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
 * Full payment marks the bill paid; partial reduces amount_due (balance).
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const recordedBy = session?.user?.id ?? null;
  const amount = roundMoney(input.amount);
  const now = input.paymentDate || new Date().toISOString();

  const row = {
    bill_id: input.billId ?? null,
    account_id: input.accountId ?? null,
    resident_id: input.residentId ?? null,
    amount,
    payment_method: input.paymentMethod,
    reference_number: input.referenceNumber?.trim() || null,
    notes: input.notes?.trim() || null,
    payment_date: now,
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

  if (input.billId) {
    const { data: bill, error: billFetchError } = await supabase
      .from('bills')
      .select('id, amount_due, status')
      .eq('id', input.billId)
      .single();

    if (billFetchError) {
      console.warn('[recordPayment] Could not load bill for balance update:', billFetchError.message);
    } else if (bill && bill.status !== 'paid' && bill.status !== 'void') {
      const newBalance = roundMoney(Number(bill.amount_due ?? 0) - amount);
      const billUpdate =
        newBalance < 0.01
          ? {
              amount_due: 0,
              status: 'paid' as const,
              paid_at: now,
              updated_at: now,
            }
          : {
              amount_due: Math.max(0, newBalance),
              updated_at: now,
            };

      const { error: billError } = await supabase.from('bills').update(billUpdate).eq('id', input.billId);

      if (billError) {
        console.warn('[recordPayment] Could not update bill status/balance:', billError.message);
      }
    }
  }

  return mapPaymentRow(data as unknown as PaymentRow);
}

/**
 * Record payment for multiple selected bills.
 * Allocates totalAmount oldest-first; fully covered bills become paid,
 * partially covered bills keep the remaining amount_due as balance.
 */
export async function recordMultiBillPayment(
  input: RecordMultiBillPaymentInput
): Promise<RecordMultiBillPaymentResult> {
  const { error: rpcError, data: rpcData } = await supabase.rpc('record_payment_transaction', {
    p_bill_ids: input.billIds,
    p_account_id: input.accountId,
    p_resident_id: input.residentId,
    p_amount: roundMoney(input.totalAmount),
    p_payment_method: input.paymentMethod,
    p_reference_number: input.referenceNumber?.trim() || null,
    p_notes: input.notes?.trim() || null,
  });

  if (!rpcError) {
    const payload = (rpcData ?? {}) as {
      bills_paid?: number;
      bills_partial?: number;
      total_amount?: number;
    };
    return {
      success: true,
      billsPaid: Number(payload.bills_paid ?? input.billIds.length),
      billsPartial: Number(payload.bills_partial ?? 0),
      totalAmount: Number(payload.total_amount ?? input.totalAmount),
    };
  }

  // Fallback to client-side allocation when RPC is unavailable.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const recordedBy = session?.user?.id ?? null;
  const now = new Date().toISOString();
  let remaining = roundMoney(input.totalAmount);
  let billsPaid = 0;
  let billsPartial = 0;
  let appliedTotal = 0;

  if (input.billIds.length > 0) {
    const { data: billsData, error: billsFetchErr } = await supabase
      .from('bills')
      .select('id, amount_due, status, billing_period, due_date, created_at')
      .in('id', input.billIds)
      .is('deleted_at', null);

    if (billsFetchErr) {
      throw new Error(getPaymentErrorMessage(billsFetchErr));
    }

    const ordered = [...(billsData ?? [])].sort((a, b) => {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      const periodCmp = String(a.billing_period ?? '').localeCompare(String(b.billing_period ?? ''));
      if (periodCmp !== 0) return periodCmp;
      return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
    });

    for (const bill of ordered) {
      if (remaining < 0.01) break;
      if (bill.status === 'paid' || bill.status === 'void') continue;

      const due = roundMoney(Number(bill.amount_due ?? 0));
      if (due < 0.01) continue;

      const apply = roundMoney(Math.min(due, remaining));
      if (apply < 0.01) continue;

      const { error: insertErr } = await supabase.from('payments').insert([
        {
          bill_id: bill.id,
          account_id: input.accountId,
          resident_id: input.residentId,
          amount: apply,
          payment_method: input.paymentMethod,
          payment_date: now,
          reference_number: input.referenceNumber?.trim() || null,
          notes: input.notes?.trim() || null,
          recorded_by: recordedBy,
          status: 'completed' as const,
        },
      ]);
      if (insertErr) {
        throw new Error(getPaymentErrorMessage(insertErr));
      }

      const newBalance = roundMoney(due - apply);
      const billUpdate =
        newBalance < 0.01
          ? {
              amount_due: 0,
              status: 'paid' as const,
              paid_at: now,
              updated_at: now,
            }
          : {
              amount_due: Math.max(0, newBalance),
              updated_at: now,
            };

      const { error: updateErr } = await supabase.from('bills').update(billUpdate).eq('id', bill.id);
      if (updateErr) {
        throw new Error(getPaymentErrorMessage(updateErr));
      }

      if (newBalance < 0.01) billsPaid += 1;
      else billsPartial += 1;

      remaining = roundMoney(remaining - apply);
      appliedTotal = roundMoney(appliedTotal + apply);
    }

    if (billsPaid + billsPartial === 0) {
      throw new Error('No payable bills found for the selected billing periods.');
    }
  } else {
    const { error: insertErr } = await supabase.from('payments').insert([
      {
        account_id: input.accountId,
        resident_id: input.residentId,
        amount: remaining,
        payment_method: input.paymentMethod,
        payment_date: now,
        reference_number: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
        recorded_by: recordedBy,
        status: 'completed' as const,
      },
    ]);
    if (insertErr) {
      throw new Error(getPaymentErrorMessage(insertErr));
    }
    appliedTotal = remaining;
  }

  return {
    success: true,
    billsPaid,
    billsPartial,
    totalAmount: appliedTotal,
  };
}

/**
 * Notify the resident and attach the official receipt snapshot to each
 * payment for the selected billing period(s). Residents then see
 * "View Official Receipt" on the bill Payment Receipt section.
 */
export async function sendOfficialReceiptToResident(
  input: SendOfficialReceiptInput
): Promise<{ notificationsCreated: number; paymentsUpdated: number }> {
  if (!input.residentId) {
    throw new Error('Resident is required to send a receipt.');
  }
  if (!input.billIds.length) {
    throw new Error('Select at least one bill before sending a receipt.');
  }

  const now = new Date().toISOString();
  const periods = input.receipt.bills
    .map((b) => b.billing_period)
    .filter(Boolean)
    .join(', ');

  const { error: notifError } = await supabase.from('notifications').insert([
    {
      user_id: input.residentId,
      type: 'payment',
      title: 'Official Receipt Available',
      message: `Your official payment receipt${periods ? ` for ${periods}` : ''} (OR ${input.receipt.referenceNumber}) is ready. Open Bills and tap View Official Receipt.`,
      reference_type: 'bill',
      reference_id: input.billIds[0],
    },
  ]);

  if (notifError) {
    throw new Error(getPaymentErrorMessage(notifError));
  }

  const { data: updatedPayments, error: updateError } = await supabase
    .from('payments')
    .update({
      receipt_sent_at: now,
      receipt_snapshot: input.receipt,
      updated_at: now,
    })
    .in('bill_id', input.billIds)
    .eq('resident_id', input.residentId)
    .is('deleted_at', null)
    .select('id');

  if (updateError) {
    throw new Error(getPaymentErrorMessage(updateError));
  }

  return {
    notificationsCreated: 1,
    paymentsUpdated: updatedPayments?.length ?? 0,
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
export async function getPendingPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, bills(bill_number, billing_period), profiles:resident_id(first_name, last_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data as any[];
}

/** Online methods written by PayMongo webhook / hosted checkout. */
const ONLINE_PAYMENT_METHODS = ['card', 'paymaya', 'grab_pay', 'online'] as const;

/** True when a payment row was confirmed by PayMongo (or another hosted online checkout). */
export function isPayMongoPayment(row: {
  payment_method?: string | null;
  notes?: string | null;
} | null | undefined): boolean {
  if (!row) return false;
  const method = (row.payment_method ?? '').toLowerCase();
  if ((ONLINE_PAYMENT_METHODS as readonly string[]).includes(method)) return true;
  const notes = row.notes ?? '';
  return notes.includes('paymongo') || notes.includes('"provider":"paymongo"');
}

/**
 * Recent completed online / PayMongo payments for the staff Payments feed.
 * These are auto-confirmed by the webhook (no staff approve step).
 */
export async function getRecentOnlinePayments(limit = 20): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, bills(bill_number, billing_period), profiles:resident_id(first_name, last_name)')
    .eq('status', 'completed')
    .in('payment_method', [...ONLINE_PAYMENT_METHODS])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return data as any[];
}

export async function verifyPendingPayment(paymentId: string, action: 'approve' | 'reject'): Promise<void> {
  const status = action === 'approve' ? 'completed' : 'cancelled';
  
  // Actually, we can use the existing trigger to handle the bill update when status changes to completed
  const { error } = await supabase
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', paymentId);
    
  if (error) {
    throw new Error(error.message);
  }
}
export async function verifyPendingPaymentRPC(paymentId: string, action: 'approve' | 'reject', rejectionReason?: string): Promise<void> {
  const { error } = await supabase.rpc('verify_online_payment', {
    p_payment_id: paymentId,
    p_action: action,
    p_rejection_reason: rejectionReason || null
  });
  if (error) {
    throw new Error(error.message);
  }
} 



