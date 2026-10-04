import { supabase } from '../lib/supabase';
import { getBillingConfig } from './billingConfigService';
import type { Bill, BillStatus, MeterReading } from '../types';

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
  /** Receipt-facing status for that billing month. */
  status: 'Paid' | 'Unpaid' | 'Void';
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

/** Map bill status to the Paid / Unpaid label shown on receipts. */
function receiptStatusLabel(status: BillStatus): BillReceiptLine['status'] {
  if (status === 'paid') return 'Paid';
  if (status === 'void') return 'Void';
  return 'Unpaid'; // pending + overdue
}

async function getGracePeriodDays(): Promise<number> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'billing.grace_period_days')
    .maybeSingle();

  if (error || data == null) return 0;
  const raw = data.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return 0;
}

function periodFromReadingDate(readingDate: string | null, assignmentDate: string): {
  period: string;
  periodStart: string;
  periodEnd: string;
} {
  // Prefer assignment_date: that is the billing cycle staff assigned
  // (e.g. December). reading_date is only when the meter was read.
  const dateStr = (assignmentDate || readingDate || '').slice(0, 10);
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Reading date is invalid.');
  }
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const period = `${year}-${String(month + 1).padStart(2, '0')}`;
  const periodStart = `${period}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const periodEnd = `${period}-${String(lastDay).padStart(2, '0')}`;
  return { period, periodStart, periodEnd };
}

/**
 * Assemble the billing-receipt payload used by Generate Bill / Print Preview /
 * Receipt Review. Includes prior months' bills so the receipt shows previous
 * readings history, while Total Amount Due only sums unpaid charges.
 */
async function buildBillReceiptData(bill: Bill): Promise<BillReceiptData> {
  const [{ data: historyRows, error: historyError }, unpaid] = await Promise.all([
    supabase
      .from('bills')
      .select(BILL_SELECT)
      .eq('account_id', bill.account_id)
      .is('deleted_at', null)
      .lte('billing_period', bill.billing_period)
      .order('billing_period', { ascending: true })
      .limit(6),
    getUnpaidBillsByAccount(bill.account_id),
  ]);

  if (historyError) {
    throw new Error(getBillErrorMessage(historyError));
  }

  const byId = new Map<string, Bill>();
  for (const row of historyRows ?? []) {
    const mapped = mapRow(row as unknown as BillRow);
    byId.set(mapped.id, mapped);
  }
  for (const unpaidBill of unpaid) {
    byId.set(unpaidBill.id, unpaidBill);
  }
  byId.set(bill.id, bill);

  const lineBills = [...byId.values()].sort((a, b) =>
    a.billing_period.localeCompare(b.billing_period)
  );

  // Immediately previous period bill (for header Prev. Bill Period / Prev. Consumption).
  const priorBills = lineBills.filter((b) => b.billing_period < bill.billing_period);
  const previousBill = priorBills.length > 0 ? priorBills[priorBills.length - 1] : null;

  const lines: BillReceiptLine[] = [];
  for (const b of lineBills) {
    const priorForRowList = lineBills.filter((x) => x.billing_period < b.billing_period);
    const priorForRow =
      priorForRowList.length > 0 ? priorForRowList[priorForRowList.length - 1] : null;

    // Prefer stored previous_reading; fall back to prior bill's current reading.
    const previousReading =
      b.previous_reading != null && Number(b.previous_reading) !== 0
        ? b.previous_reading
        : priorForRow?.current_reading ?? b.previous_reading;

    const waterAmount = Math.max(
      0,
      Number(b.amount_due) -
        (b.extra_components ?? []).reduce((sum, c) => sum + (Number(c.price) || 0), 0)
    );

    const lineStatus = receiptStatusLabel(b.status);

    lines.push({
      accountName: 'WATER FEE',
      billPeriod: b.billing_period,
      status: lineStatus,
      previousReading,
      currentReading: b.current_reading,
      consumption: b.consumption,
      amount: waterAmount,
    });

    // Extra components only on unpaid / current open bills (avoid re-listing paid fees).
    if (b.status === 'pending' || b.status === 'overdue' || b.id === bill.id) {
      for (const c of b.extra_components ?? []) {
        if (!c.category?.trim()) continue;
        lines.push({
          accountName: c.category.trim().toUpperCase(),
          billPeriod: b.billing_period,
          status: lineStatus,
          previousReading: null,
          currentReading: null,
          consumption: null,
          amount: Number(c.price) || 0,
        });
      }
    }
  }

  // Charge total: unpaid only (paid prior months stay on the receipt for readings).
  const totalAmountDue = lineBills
    .filter((b) => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0);

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
    prevBillPeriod: previousBill?.billing_period ?? previousPeriod(bill.billing_period),
    prevConsumption:
      previousBill?.consumption ??
      (bill.previous_reading != null ? Number(bill.previous_reading) : null),
    billPeriod: bill.billing_period,
    dueDate: bill.due_date,
    lastPayment,
    waterRate: Number(bill.water_rate) || 0,
    lines,
    totalAmountDue,
  };
}

/** Assemble receipt data for an existing bill (Issue Bill / print). */
export async function getBillReceiptData(billId: string): Promise<BillReceiptData> {
  const bill = await getBillById(billId);
  return buildBillReceiptData(bill);
}

/**
 * Preview the billing receipt for a pending (or approved) meter reading
 * without creating a bill. Used in Receipt Review before Approve.
 */
export async function previewBillReceiptForReading(
  reading: MeterReading
): Promise<BillReceiptData> {
  if (reading.current_reading == null) {
    throw new Error('No current reading recorded yet. Record the reading before reviewing the receipt.');
  }
  if (reading.consumption == null) {
    throw new Error('Consumption is missing for this reading.');
  }

  const dates = periodFromReadingDate(reading.reading_date, reading.assignment_date);

  // Prefer a bill already tied to this reading.
  const { data: byReading, error: byReadingError } = await supabase
    .from('bills')
    .select('id')
    .eq('reading_id', reading.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (byReadingError) {
    throw new Error(getBillErrorMessage(byReadingError));
  }
  if (byReading?.id) {
    return getBillReceiptData(byReading.id);
  }

  // Otherwise show an open (unpaid) bill for the period — paid/void bills for
  // the same month must not block previewing a new reading.
  const { data: existingOpen, error: existingError } = await supabase
    .from('bills')
    .select('id')
    .eq('account_id', reading.account_id)
    .eq('billing_period', dates.period)
    .in('status', ['pending', 'overdue'])
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) {
    throw new Error(getBillErrorMessage(existingError));
  }
  if (existingOpen?.id) {
    return getBillReceiptData(existingOpen.id);
  }

  const [config, graceDays] = await Promise.all([getBillingConfig(), getGracePeriodDays()]);
  if (!config.waterRate || config.waterRate <= 0) {
    throw new Error(
      'Water rate has not been configured yet. Set it under Configure Bills before reviewing receipts.'
    );
  }

  const componentTotal = config.components.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
  const amount = Math.round((reading.consumption * config.waterRate + componentTotal) * 100) / 100;

  let dueDate: string | null = null;
  if (graceDays > 0) {
    const end = new Date(`${dates.periodEnd}T00:00:00`);
    end.setDate(end.getDate() + graceDays);
    dueDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  }

  const now = new Date().toISOString();
  const syntheticBill: Bill = {
    id: `preview-${reading.id}`,
    bill_number: 'PREVIEW',
    account_id: reading.account_id,
    resident_id: reading.resident_id,
    reading_id: reading.id,
    billing_period: dates.period,
    period_start: dates.periodStart,
    period_end: dates.periodEnd,
    previous_reading: reading.previous_reading,
    current_reading: reading.current_reading,
    consumption: reading.consumption,
    water_rate: config.waterRate,
    extra_components: config.components.map((c) => ({
      id: c.id,
      category: c.category,
      price: c.price,
    })),
    amount,
    amount_due: amount,
    status: 'pending',
    due_date: dueDate,
    paid_at: null,
    generated_by: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    account: reading.account
      ? {
          id: reading.account.id,
          account_number: reading.account.account_number,
          service_address: reading.account.service_address,
          sitio: reading.account.sitio,
          connection_status: 'active',
          meter: reading.meter ? { meter_number: reading.meter.meter_number } : null,
        }
      : null,
    resident: reading.resident ?? null,
  };

  return buildBillReceiptData(syntheticBill);
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
