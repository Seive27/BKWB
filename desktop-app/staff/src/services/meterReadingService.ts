import { SITIO_OPTIONS } from '../constants';
import { supabase } from '../lib/supabase';
import type {
  MeterReaderOption,
  MeterReading,
  MeterReadingStatus,
} from '../types';

// ── Query Options ──

export interface MeterReadingQueryOptions {
  status?: MeterReadingStatus | null;
  /** Maximum number of rows to return. */
  limit?: number;
}

/** A resident account option shown in legacy pickers / previews. */
export interface AccountOption {
  id: string;
  account_number: string;
  service_address: string | null;
  sitio: string | null;
  resident_id: string;
  meter_id: string | null;
  resident_name: string;
  meter_number: string | null;
}

/** Sitio option for the assign-reading picker, with active account counts. */
export interface SitioAssignOption {
  name: string;
  activeAccountCount: number;
}

/** Result of a bulk sitio assignment. */
export interface SitioAssignmentResult {
  created: number;
  skipped: number;
  readings: MeterReading[];
}

// ── Error Handling ──

/** Map Supabase/PostgREST errors to user-friendly messages. */
export function getMeterReadingErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    code === '42P01' ||
    (msg.includes('does not exist') &&
      (msg.includes('relation') || msg.includes('table')))
  ) {
    return 'The meter readings tables have not been set up yet. Please run the SQL migration.';
  }
  if (
    code === '42501' ||
    msg.includes('row-level security') ||
    msg.includes('permission denied')
  ) {
    return 'You do not have permission to perform this action. Only staff can manage meter readings.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  if (msg.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (msg.includes('sitio') && msg.includes('column')) {
    return 'Sitio support is not set up yet. Please run the latest SQL migration.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ── Row Mapping ──

/** Full row shape incl. optional joined resources (resident/account/meter/…). */
type MeterReadingRow = MeterReading;

function mapRow(row: MeterReadingRow): MeterReading {
  return {
    ...row,
    resident: row.resident ?? null,
    account: row.account ?? null,
    meter: row.meter ?? null,
    meter_reader: row.meter_reader ?? null,
    assigner: row.assigner ?? null,
    reviewer: row.reviewer ?? null,
  };
}

const READING_SELECT =
  '*, resident:profiles!meter_readings_resident_id_fkey(id, first_name, last_name), account:resident_accounts!meter_readings_account_id_fkey(id, account_number, service_address, sitio), meter:meters!meter_readings_meter_id_fkey(id, meter_number), meter_reader:profiles!meter_readings_meter_reader_id_fkey(id, first_name, last_name), assigner:profiles!meter_readings_assigned_by_fkey(id, first_name, last_name), reviewer:profiles!meter_readings_reviewed_by_fkey(id, first_name, last_name)';

// ── Queries ──

/** Fetch all non-deleted meter readings (newest assignment first). */
export async function getMeterReadings(
  options: MeterReadingQueryOptions = {}
): Promise<MeterReading[]> {
  let query = supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .is('deleted_at', null)
    .order('assignment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as MeterReadingRow));
}

/** Fetch a single meter reading by id (for the review modal). */
export async function getReadingById(id: string): Promise<MeterReading | null> {
  const { data, error } = await supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return data ? mapRow(data as unknown as MeterReadingRow) : null;
}

/** Fetch active resident accounts for the assign-reading picker. */
export async function getResidentAccounts(): Promise<AccountOption[]> {
  const { data, error } = await supabase
    .from('resident_accounts')
    .select(
      'id, account_number, service_address, sitio, resident_id, meter_id, resident:profiles!resident_accounts_resident_id_fkey(first_name, last_name), meter:meters!resident_accounts_meter_id_fkey(meter_number)'
    )
    .eq('connection_status', 'active')
    .order('account_number');

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return (data ?? []).map((row) => {
    // PostgREST types embedded resources as arrays; bridge with a precise cast.
    const r = row as unknown as {
      id: string;
      account_number: string;
      service_address: string | null;
      sitio: string | null;
      resident_id: string;
      meter_id: string | null;
      resident?: { first_name: string; last_name: string } | null;
      meter?: { meter_number: string } | null;
    };
    return {
      id: r.id,
      account_number: r.account_number,
      service_address: r.service_address ?? null,
      sitio: r.sitio ?? null,
      resident_id: r.resident_id,
      meter_id: r.meter_id ?? null,
      resident_name: r.resident
        ? `${r.resident.first_name} ${r.resident.last_name}`.trim()
        : 'Unknown resident',
      meter_number: r.meter?.meter_number ?? null,
    };
  });
}

/** Fetch sitios with active account counts for the assign-reading picker. */
export async function getSitioOptions(): Promise<SitioAssignOption[]> {
  const { data, error } = await supabase
    .from('resident_accounts')
    .select('sitio')
    .eq('connection_status', 'active')
    .not('sitio', 'is', null);

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const name = (row.sitio ?? '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  // Prefer the canonical list so the dropdown stays stable, then append any
  // unexpected sitios that already exist on accounts.
  const known = new Set<string>(SITIO_OPTIONS);
  const options: SitioAssignOption[] = SITIO_OPTIONS.map((name) => ({
    name,
    activeAccountCount: counts.get(name) ?? 0,
  }));

  for (const [name, activeAccountCount] of counts) {
    if (!known.has(name)) {
      options.push({ name, activeAccountCount });
    }
  }

  return options;
}

/** Fetch active meter reader profiles for the assign-reading picker. */
export async function getMeterReaders(): Promise<MeterReaderOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles(name)')
    .eq('is_active', true)
    .eq('role.name', 'meter_reader')
    .order('last_name');

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
  }));
}

/** Reading history for one account (used by the Resident Overview modal). */
export async function getAccountReadings(accountId: string): Promise<MeterReading[]> {
  const { data, error } = await supabase
    .from('meter_readings')
    .select(READING_SELECT)
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .order('assignment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return (data ?? []).map((row) => mapRow(row as unknown as MeterReadingRow));
}


/**
 * Resolve the previous reading for an account: the current_reading of its
 * most recent Approved (or Billed) reading, or 0 when none exists.
 */
async function getPreviousReading(accountId: string): Promise<number> {
  const { data, error } = await supabase
    .from('meter_readings')
    .select('current_reading')
    .eq('account_id', accountId)
    .in('status', ['approved', 'billed'])
    .is('deleted_at', null)
    .order('reading_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return data?.current_reading ?? 0;
}

/** Create a new assignment for a resident account. */
export async function createAssignment(
  input: {
    account_id: string;
    meter_reader_id: string;
    assignment_date: string;
  },
  assignedBy: string
): Promise<MeterReading> {
  const { data: account, error: accountError } = await supabase
    .from('resident_accounts')
    .select('id, resident_id, meter_id')
    .eq('id', input.account_id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(
      accountError
        ? getMeterReadingErrorMessage(accountError)
        : 'Resident account not found.'
    );
  }

  const previousReading = await getPreviousReading(input.account_id);

  const { data, error } = await supabase
    .from('meter_readings')
    .insert({
      account_id: account.id,
      resident_id: account.resident_id,
      meter_id: account.meter_id,
      meter_reader_id: input.meter_reader_id,
      assigned_by: assignedBy,
      assignment_date: input.assignment_date,
      previous_reading: previousReading,
      status: 'assigned',
    })
    .select(READING_SELECT)
    .single();

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return mapRow(data as unknown as MeterReadingRow);
}

/**
 * Assign every active account in a sitio to a meter reader.
 * Accounts that already have an open assignment (assigned / pending_review)
 * are skipped so staff can safely re-run the action.
 */
export async function createSitioAssignment(
  input: {
    sitio: string;
    meter_reader_id: string;
    assignment_date: string;
  },
  assignedBy: string
): Promise<SitioAssignmentResult> {
  const sitio = input.sitio.trim();
  if (!sitio) {
    throw new Error('Please select a sitio.');
  }

  const { data: accounts, error: accountsError } = await supabase
    .from('resident_accounts')
    .select('id, resident_id, meter_id, account_number')
    .eq('connection_status', 'active')
    .eq('sitio', sitio)
    .order('account_number');

  if (accountsError) {
    throw new Error(getMeterReadingErrorMessage(accountsError));
  }

  if (!accounts || accounts.length === 0) {
    throw new Error(`No active resident accounts found in ${sitio}.`);
  }

  const accountIds = accounts.map((a) => a.id);

  const { data: openRows, error: openError } = await supabase
    .from('meter_readings')
    .select('account_id')
    .in('account_id', accountIds)
    .in('status', ['assigned', 'pending_review'])
    .is('deleted_at', null);

  if (openError) {
    throw new Error(getMeterReadingErrorMessage(openError));
  }

  const blocked = new Set((openRows ?? []).map((r) => r.account_id));
  const eligible = accounts.filter((a) => !blocked.has(a.id));
  const skipped = accounts.length - eligible.length;

  if (eligible.length === 0) {
    throw new Error(
      `All accounts in ${sitio} already have an open reading assignment.`
    );
  }

  const previousReadings = await Promise.all(
    eligible.map((account) => getPreviousReading(account.id))
  );

  const rows = eligible.map((account, index) => ({
    account_id: account.id,
    resident_id: account.resident_id,
    meter_id: account.meter_id,
    meter_reader_id: input.meter_reader_id,
    assigned_by: assignedBy,
    assignment_date: input.assignment_date,
    previous_reading: previousReadings[index],
    status: 'assigned' as const,
  }));

  const { data, error } = await supabase
    .from('meter_readings')
    .insert(rows)
    .select(READING_SELECT);

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return {
    created: data?.length ?? 0,
    skipped,
    readings: (data ?? []).map((row) => mapRow(row as unknown as MeterReadingRow)),
  };
}

/** Approve a submitted reading. */
export async function approveReading(id: string, reviewerId: string): Promise<MeterReading> {
  const { data, error } = await supabase
    .from('meter_readings')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(READING_SELECT)
    .single();

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return mapRow(data as unknown as MeterReadingRow);
}

/** Reject a submitted reading. A rejection reason is required. */
export async function rejectReading(
  id: string,
  reviewerId: string,
  reason: string
): Promise<MeterReading> {
  const trimmed = reason.trim();
  if (trimmed.length === 0) {
    throw new Error('A rejection reason is required.');
  }

  const { data, error } = await supabase
    .from('meter_readings')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: trimmed,
    })
    .eq('id', id)
    .select(READING_SELECT)
    .single();

  if (error) {
    throw new Error(getMeterReadingErrorMessage(error));
  }

  return mapRow(data as unknown as MeterReadingRow);
}

// ── Realtime ──

/**
 * Subscribe to insert/update/delete events on the meter_readings table.
 * Returns an unsubscribe function.
 */
export function subscribeToMeterReadings(
  callback: (event: 'INSERT' | 'UPDATE' | 'DELETE', row?: MeterReading | null) => void
): () => void {
  // Supabase channels are singletons keyed by name, and components can mount
  // multiple subscriptions at once. Using a unique name per call avoids
  // "cannot add callbacks after subscribe()".
  const channel = supabase
    .channel(`meter-readings-changes-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'meter_readings' },
      (payload) => {
        const event = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const row = payload.new ? mapRow(payload.new as MeterReadingRow) : null;
        callback(event, row);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

