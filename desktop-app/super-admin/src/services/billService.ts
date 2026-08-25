import { supabase } from '../lib/supabase';
import type { Bill } from '../types';

/**
 * Super Admin has READ access to bills (staff manages them). Mirrors the
 * staff billService query so both dashboards render identical data.
 */
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
    return 'You do not have permission to view bills.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

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
  '*, account:resident_accounts!bills_account_id_fkey(id, account_number, sitio, connection_status), resident:profiles!bills_resident_id_fkey(id, first_name, last_name)';

/** Fetch all non-deleted bills (newest first). */
export async function getBills(): Promise<Bill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select(BILL_SELECT)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getBillErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as BillRow));
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
