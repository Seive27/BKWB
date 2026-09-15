import { supabase } from '../lib/supabase';
import type { Bill, BillStatus } from '../types';

// ─── Query Options ───

export interface BillQueryOptions {
  status?: BillStatus | null;
  /** Maximum number of rows to return (optional; list is bounded by readings). */
  limit?: number;
  accountId?: string;
}

/** Error handling ─ mirrors the staff billService. */
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
 * are applied by the page (same pattern as Staff).
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
