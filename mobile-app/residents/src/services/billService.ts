import { supabase } from '@/lib/supabase';

/** Mirrors the Supabase `bills` row (+ joined account info) for one resident. */
export interface ResidentBill {
  id: string;
  bill_number: string;
  billing_period: string;
  period_start: string | null;
  period_end: string | null;
  previous_reading: number | null;
  current_reading: number | null;
  consumption: number | null;
  water_rate: number;
  extra_components: { id?: string; category: string; price: number }[] | null;
  amount_due: number;
  status: 'pending' | 'paid' | 'overdue' | 'void';
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
  account?: {
    id: string;
    account_number: string;
    sitio: string | null;
  } | null;
}

/**
 * Fetch the signed-in resident's bills (RLS limits rows to their own
 * resident_id). Newest billing period first.
 */
export async function getMyBills(): Promise<ResidentBill[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to view your bills.');
  }

  const { data, error } = await supabase
    .from('bills')
    .select(
      '*, account:resident_accounts!bills_account_id_fkey(id, account_number, sitio)'
    )
    .eq('resident_id', session.user.id)
    .is('deleted_at', null)
    .order('billing_period', { ascending: false });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('does not exist') || msg.includes('relation')) {
      // Bills module not migrated yet on this backend — show an empty list
      // rather than blocking the whole Bills screen.
      console.warn('[bills] table not available:', error.message);
      return [];
    }
    throw new Error(error.message || 'Failed to load your bills.');
  }

  return ((data ?? []) as unknown as ResidentBill[]).map((row) => ({
    ...row,
    extra_components: Array.isArray(row.extra_components) ? row.extra_components : [],
    account: row.account ?? null,
  }));
}

/** '2026-05' -> 'May 2026'. */
export function formatPeriod(period: string): string {
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatBillDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
