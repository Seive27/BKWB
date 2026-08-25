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
  /** True when the sitio already has open reading assignments for the target month. */
  isAssigned: boolean;
  /** Reader currently covering this sitio (when isAssigned). */
  assignedReaderName: string | null;
}

/** Inclusive start + exclusive end (YYYY-MM-DD) for the calendar month of a date. */
function assignmentMonthBounds(assignmentDate: string): { start: string; endExclusive: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(assignmentDate.trim());
  if (!match) {
    throw new Error('Assignment date must be a valid YYYY-MM-DD value.');
  }
  const year = Number(match[1]);
  const month = Number(match[2]); // 1–12
  if (month < 1 || month > 12) {
    throw new Error('Assignment date must be a valid YYYY-MM-DD value.');
  }
  const start = `${match[1]}-${match[2]}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const endExclusive = `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01`;
  return { start, endExclusive };
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

/**
 * Fetch sitios with active account counts for the assign-reading picker.
 * Open assignments only block a sitio for the same calendar month as
 * `assignmentDate` — a new month starts fresh.
 */
export async function getSitioOptions(assignmentDate: string): Promise<SitioAssignOption[]> {
  const { start, endExclusive } = assignmentMonthBounds(assignmentDate);

  const [accountsResult, openResult] = await Promise.all([
    supabase
      .from('resident_accounts')
      .select('sitio')
      .eq('connection_status', 'active')
      .not('sitio', 'is', null),
    // Open assignments in this month mark a sitio as already assigned.
    supabase
      .from('meter_readings')
      .select(
        'meter_reader_id, account:resident_accounts!meter_readings_account_id_fkey(sitio), meter_reader:profiles!meter_readings_meter_reader_id_fkey(first_name, last_name)'
      )
      .in('status', ['assigned', 'pending_review'])
      .gte('assignment_date', start)
      .lt('assignment_date', endExclusive)
      .is('deleted_at', null),
  ]);

  if (accountsResult.error) {
    throw new Error(getMeterReadingErrorMessage(accountsResult.error));
  }
  if (openResult.error) {
    throw new Error(getMeterReadingErrorMessage(openResult.error));
  }

  const counts = new Map<string, number>();
  for (const row of accountsResult.data ?? []) {
    const name = (row.sitio ?? '').trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const assignedBySitio = new Map<string, string>();
  for (const row of openResult.data ?? []) {
    const r = row as unknown as {
      account?: { sitio: string | null } | null;
      meter_reader?: { first_name: string; last_name: string } | null;
    };
    const sitio = (r.account?.sitio ?? '').trim();
    if (!sitio || assignedBySitio.has(sitio)) continue;
    const reader = r.meter_reader
      ? `${r.meter_reader.first_name} ${r.meter_reader.last_name}`.trim()
      : 'a meter reader';
    assignedBySitio.set(sitio, reader || 'a meter reader');
  }

  // Prefer the canonical list so the dropdown stays stable, then append any
  // unexpected sitios that already exist on accounts.
  const known = new Set<string>(SITIO_OPTIONS);
  const toOption = (name: string, activeAccountCount: number): SitioAssignOption => ({
    name,
    activeAccountCount,
    isAssigned: assignedBySitio.has(name),
    assignedReaderName: assignedBySitio.get(name) ?? null,
  });

  const options: SitioAssignOption[] = SITIO_OPTIONS.map((name) =>
    toOption(name, counts.get(name) ?? 0)
  );

  for (const [name, activeAccountCount] of counts) {
    if (!known.has(name)) {
      options.push(toOption(name, activeAccountCount));
    }
  }

  return options;
}

/** Fetch active meter reader profiles for the assign-reading picker. */
export async function getMeterReaders(): Promise<MeterReaderOption[]> {
  // `roles!inner` is required: filtering on an outer-joined embed does not
  // remove parent rows, so staff/residents would otherwise leak into the list.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role:roles!inner(name)')
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
 * A sitio that already has open assignments (assigned / pending_review)
 * for the same calendar month cannot be selected again until those
 * readings are finished. A different month is treated as a new cycle.
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

  const { start, endExclusive } = assignmentMonthBounds(input.assignment_date);

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
    .select('account_id, meter_reader:profiles!meter_readings_meter_reader_id_fkey(first_name, last_name)')
    .in('account_id', accountIds)
    .in('status', ['assigned', 'pending_review'])
    .gte('assignment_date', start)
    .lt('assignment_date', endExclusive)
    .is('deleted_at', null);

  if (openError) {
    throw new Error(getMeterReadingErrorMessage(openError));
  }

  if (openRows && openRows.length > 0) {
    const first = openRows[0] as unknown as {
      meter_reader?: { first_name: string; last_name: string } | null;
    };
    const reader = first.meter_reader
      ? `${first.meter_reader.first_name} ${first.meter_reader.last_name}`.trim()
      : 'a meter reader';
    throw new Error(
      `${sitio} is already assigned to ${reader || 'a meter reader'} for this month. Finish or clear those readings before reassigning.`
    );
  }

  const previousReadings = await Promise.all(
    accounts.map((account) => getPreviousReading(account.id))
  );

  const rows = accounts.map((account, index) => ({
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
    skipped: 0,
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

