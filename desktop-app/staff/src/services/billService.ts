import { supabase } from '../lib/supabase';
import type { Bill, BillStatus } from '../types';

// ─── Query Options ───

export interface BillQueryOptions {
  status?: BillStatus | null;
  /** Maximum number of rows to return (optional; list is bounded by readings). */
  limit?: number;
  accountId?: string;
}

/** One WATER FEE (or extra component) line on the printed bill receipt. */
export interface BillReceiptLine {
  accountName: string;
  billPeriod: string;
  previousReading: number | null;
  currentReading: number | null;
  consumption: number | null;
  amount: number;
}

/** Data needed to render the Generate Bill / billing receipt modal. */
export interface BillReceiptData {
  bill: Bill;
  consCode: string;
  residentName: string;
  address: string;
  meterSerial: string;
  prevBillPeriod: string | null;
  prevConsumption: number | null;
  billPeriod: string;
  dueDate: string | null;
  lastPayment: { date: string; amount: number } | null;
  waterRate: number;
  lines: BillReceiptLine[];
  totalAmountDue: number;
}

/** Error handling ─ mirrors the other BKWB services. */
export function getBillErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    code === '42P01' ||
    msg.includes('relation "public.bills" does not exist') ||
    msg.includes('relation "bills" does not exist') ||
    (msg.includes('bills') && msg.includes('does not exist'))
  ) {
    return 'The bills table has not been set up yet. Please run the latest SQL migration (bkwb-billing-migration.sql).';
  }
  if (msg.includes('foreign key relationship') || msg.includes('could not find a relationship') || msg.includes('schema cache')) {
    return 'The bills table relationships have not been updated. Please run the latest SQL migration (bkwb-billing-migration.sql).';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to manage bills.';
  }
  if (msg.includes('not been configured')) {
    return error.message;
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ─── Row Mapping ───

type BillRow = Bill;

function mapRow(row: BillRow): Bill {
  return {
    ...row,
    extra_components: Array.isArray(row.extra_components) ? row.extra_components : [],
    account: row.account ?? null,
    resident: row.resident ?? null,
  };
}

const BILL_SELECT =
  '*, account:resident_accounts!bills_account_id_fkey(id, account_number, service_address, sitio, connection_status, meter:meters(meter_number)), resident:profiles!bills_resident_id_fkey(id, first_name, middle_name, last_name)';

// ─── Queries ───

/**
 * Fetch all non-deleted bills (newest first) with the account + resident
 * joins used by the Bills table. Search/status filtering and pagination
 * are applied by the page (same pattern as Residents / Meter Readings);
 * the bill count is bounded by approved readings so this stays small.
 */
export async function getBills(options: BillQueryOptions = {}): Promise<Bill[]> {
  let query = supabase
    .from('bills')
    .select(BILL_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.accountId) {
    query = query.eq('account_id', options.accountId);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(getBillErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as BillRow));
}

/** Fetch a single bill by id (with account + resident joins). */
export async function getBillById(billId: string): Promise<Bill> {
  const { data, error } = await supabase
    .from('bills')
    .select(BILL_SELECT)
    .eq('id', billId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(getBillErrorMessage(error));
  }
  if (!data) {
    throw new Error('Bill not found.');
  }

  return mapRow(data as unknown as BillRow);
}

/** Fetch every bill of one resident (used by the Resident Overview modal). */
export async function getBillsByResident(residentId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select(BILL_SELECT)
    .eq('resident_id', residentId)
    .is('deleted_at', null)
    .order('billing_period', { ascending: false });

  if (error) {
    throw new Error(getBillErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as BillRow));
}

/** Unpaid (pending / overdue) bills for an account, newest period first. */
export async function getUnpaidBillsByAccount(accountId: string): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select(BILL_SELECT)
    .eq('account_id', accountId)
    .in('status', ['pending', 'overdue'])
    .is('deleted_at', null)
    .order('billing_period', { ascending: false });

  if (error) {
    throw new Error(getBillErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as BillRow));
}

function formatResidentName(resident: Bill['resident']): string {
  if (!resident) return '—';
  const first = [resident.first_name, (resident as { middle_name?: string | null }).middle_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  const last = resident.last_name?.trim() ?? '';
  if (last && first) return `${last.toUpperCase()}, ${first.toUpperCase()}`;
  return (last || first || '—').toUpperCase();
}

function previousPeriod(period: string): string | null {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  let year = Number(m[1]);
  let month = Number(m[2]) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Assemble the billing-receipt payload used by the Generate Bill modal
 * after a meter reading is approved and billed.
 */
export async function getBillReceiptData(billId: string): Promise<BillReceiptData> {
  const bill = await getBillById(billId);

  const unpaid = await getUnpaidBillsByAccount(bill.account_id);
  const lineBills =
    unpaid.length > 0
      ? unpaid
      : [bill];

  // Ensure the just-generated bill is present even if status filters miss it.
  if (!lineBills.some((b) => b.id === bill.id)) {
    lineBills.unshift(bill);
  }

  const lines: BillReceiptLine[] = [];
  for (const b of lineBills) {
    const waterAmount = Math.max(
      0,
      Number(b.amount_due) -
        (b.extra_components ?? []).reduce((sum, c) => sum + (Number(c.price) || 0), 0)
    );
    lines.push({
      accountName: 'WATER FEE',
      billPeriod: b.billing_period,
      previousReading: b.previous_reading,
      currentReading: b.current_reading,
      consumption: b.consumption,
      amount: waterAmount,
    });
    for (const c of b.extra_components ?? []) {
      if (!c.category?.trim()) continue;
      lines.push({
        accountName: c.category.trim().toUpperCase(),
        billPeriod: b.billing_period,
        previousReading: null,
        currentReading: null,
        consumption: null,
        amount: Number(c.price) || 0,
      });
    }
  }

  const totalAmountDue = lineBills.reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0);

  let lastPayment: BillReceiptData['lastPayment'] = null;
  const { data: paymentRows, error: paymentError } = await supabase
    .from('payments')
    .select('payment_date, amount, status')
    .eq('account_id', bill.account_id)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })
    .limit(1);

  if (!paymentError && paymentRows && paymentRows.length > 0) {
    const p = paymentRows[0] as { payment_date: string; amount: number };
    lastPayment = { date: p.payment_date, amount: Number(p.amount) || 0 };
  }

  const account = bill.account as Bill['account'] & {
    service_address?: string | null;
    meter?: { meter_number: string } | null;
  };

  const addressParts = [account?.service_address, account?.sitio].filter(Boolean);
  const address =
    addressParts.length > 0
      ? addressParts.join(', ').toUpperCase()
      : '—';

  return {
    bill,
    consCode: account?.account_number ?? '—',
    residentName: formatResidentName(bill.resident),
    address,
    meterSerial: account?.meter?.meter_number ?? '—',
    prevBillPeriod: previousPeriod(bill.billing_period),
    prevConsumption: bill.previous_reading,
    billPeriod: bill.billing_period,
    dueDate: bill.due_date,
    lastPayment,
    waterRate: Number(bill.water_rate) || 0,
    lines,
    totalAmountDue,
  };
}

// ─── Mutations ───

export interface BillGenerationResult {
  generated: boolean;
  reason?: string;
  message?: string;
  bill_id?: string | null;
  bill_number?: string | null;
  billing_period?: string;
  amount_due?: number;
}

/**
 * Generate the bill for an APPROVED meter reading through the
 * `generate_bill_for_reading` RPC. The water rate comes from the billing
 * configuration (system_settings); when it has not been configured the RPC
 * fails with a clear message instead of inventing a price. Duplicate bills
 * for the same account + billing period are impossible (partial unique index).
 */
export async function generateBillForReading(readingId: string): Promise<BillGenerationResult> {
  const { data, error } = await supabase.rpc('generate_bill_for_reading', {
    p_reading_id: readingId,
  });

  if (error) {
    throw new Error(getBillErrorMessage(error));
  }

  return (data ?? {}) as BillGenerationResult;
}

/** Update a bill status (mark as Paid / Overdue / Void). */
export async function setBillStatus(billId: string, status: BillStatus): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'paid') {
    patch.paid_at = new Date().toISOString();
  } else {
    patch.paid_at = null;
  }

  const { error } = await supabase.from('bills').update(patch).eq('id', billId);
  if (error) {
    throw new Error(getBillErrorMessage(error));
  }
}

// ── Realtime ──

/**
 * Subscribe to insert/update/delete events on the bills table.
 * Returns an unsubscribe function.
 */
export function subscribeToBills(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: Bill | null) => void
): () => void {
  const channel = supabase
    .channel(`bills-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bills' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapRow(payload.new as BillRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
