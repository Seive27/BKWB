import { supabase } from '../lib/supabase';

// ── Types ──

export interface ResidentRecord {
  /** The resident profile id (profiles.id). */
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  /** Primary (first) resident account. */
  accountId: string | null;
  accountNumber: string | null;
  serviceAddress: string | null;
  sitio: string | null;
  connectionStatus: 'active' | 'inactive' | 'disconnected' | null;
  meterId: string | null;
  meterNumber: string | null;
  createdAt: string;
}

export interface ResidentCreateInput {
  email: string;
  /** Optional — when blank the temporary password is generated from the DOB. */
  password?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  /** Required: starts with 09, exactly 11 digits, numbers only. */
  phone: string;
  /** Required: drives the automatic temporary password. */
  dateOfBirth: string;
  serviceAddress?: string;
  sitio?: string;
  meterNumber?: string;
}

export interface ResidentStats {
  totalResidents: number;
  activeAccounts: number;
  inactiveAccounts: number;
}

// ── Validation helpers ──

/** Strict PH cell number: 09 + 9 more digits, numbers only. */
const PHONE_REGEX = /^09\d{9}$/;

/** Validate a PH cell number, returning a user-friendly message or null. */
export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return 'Cell number is required.';
  if (!/^\d+$/.test(trimmed)) return 'Cell number must contain numbers only.';
  if (!trimmed.startsWith('09')) return 'Cell number must start with 09.';
  if (trimmed.length !== 11) return 'Cell number must be exactly 11 digits (e.g. 09171234567).';
  if (!PHONE_REGEX.test(trimmed)) return 'Enter a valid cell number like 09171234567.';
  return null;
}

/**
 * Parse a birth date WITHOUT going through `new Date()` (date-only strings
 * parse as UTC midnight, which shifts the day in negative-offset timezones
 * and would corrupt the password). Accepts YYYY-MM-DD (native date inputs)
 * and MM/DD/YYYY (typed US format). Returns null when malformed.
 */
function parseBirthDate(dateOfBirth: string): { y: number; m: number; d: number } | null {
  const iso = dateOfBirth.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  const us = dateOfBirth.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (us) return { y: Number(us[3]), m: Number(us[1]), d: Number(us[2]) };
  return null;
}

/**
 * Temporary password format requested by the professor:
 *   LastNameFirstNameMMDDYYYY — "Juan Dela Cruz", DOB 2003-05-12 → "DelaCruzJuan05122003"
 */
export function generateTemporaryPassword(
  firstName: string,
  lastName: string,
  dateOfBirth: string
): string {
  const titleCase = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

  const parts = parseBirthDate(dateOfBirth);
  if (!parts || parts.y < 1900 || parts.m < 1 || parts.m > 12 || parts.d < 1 || parts.d > 31) {
    throw new Error('Invalid date of birth.');
  }
  const mm = String(parts.m).padStart(2, '0');
  const dd = String(parts.d).padStart(2, '0');
  const yyyy = String(parts.y);

  return `${titleCase(lastName)}${titleCase(firstName)}${mm}${dd}${yyyy}`;
}

// ── Error handling ──

export function getResidentServiceErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';
  if (
    msg.includes('relation') ||
    msg.includes('does not exist') ||
    code === '42P01'
  ) {
    return 'The resident tables have not been set up yet. Please run the SQL migration.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to manage residents.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ── Queries ──

interface ResidentRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  created_at: string;
  role?: { name: string } | null;
  accounts?: {
    id: string;
    account_number: string;
    service_address: string | null;
    sitio: string | null;
    connection_status: 'active' | 'inactive' | 'disconnected';
    meter: { meter_number: string } | null;
  }[];
}

function mapRow(row: ResidentRow): ResidentRecord {
  const account = row.accounts?.[0] ?? null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    accountId: account?.id ?? null,
    accountNumber: account?.account_number ?? null,
    serviceAddress: account?.service_address ?? null,
    sitio: account?.sitio ?? null,
    connectionStatus: account?.connection_status ?? null,
    meterId: account?.meter?.meter_number ?? null,
    meterNumber: account?.meter?.meter_number ?? null,
    createdAt: row.created_at,
  };
}

/**
 * List residents — profiles with role=resident ONLY. Staff, super admins and
 * meter readers are explicitly excluded, both in the SQL filter and as a
 * defensive client-side check (so mis-assigned roles never leak into the page).
 */
export async function getResidents(): Promise<ResidentRecord[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, email, phone, date_of_birth, created_at, role:roles(name), accounts:resident_accounts(id, account_number, service_address, sitio, connection_status, meter:meters(meter_number))'
    )
    .eq('role.name', 'resident')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getResidentServiceErrorMessage(error));
  }

  // Defensive client-side role check in addition to the SQL filter.
  return (data ?? [])
    .filter((r) => (r as unknown as { role?: { name?: string } }).role?.name === 'resident')
    .map((r) => mapRow(r as unknown as ResidentRow));
}

/** Aggregate resident + account stats (resident role only). */
export async function getResidentStats(): Promise<ResidentStats> {
  const residents = await getResidents();
  const totalResidents = residents.length;
  const activeAccounts = residents.filter((r) => r.connectionStatus === 'active').length;
  const inactiveAccounts = residents.filter(
    (r) => r.connectionStatus !== 'active'
  ).length;
  return { totalResidents, activeAccounts, inactiveAccounts };
}

// ── Resident creation (server-side via edge function) ──

/**
 * Extract the REAL error from a supabase-js `functions.invoke` failure so the
 * UI never shows only the generic message. In supabase-js v2:
 *  - FunctionsHttpError:  the function responded non-2xx; `context` is a
 *    Response object whose body is the function's JSON (e.g.
 *    { "error": "Cell number must start with 09..." }).
 *  - FunctionsRelayError: the platform relay failed; `context` is a plain
 *    object (e.g. { requestId, message }).
 *  - FunctionsFetchError: the request never reached the function — almost
 *    always because the function is not deployed to the Supabase project.
 */
export async function getCreateUserErrorMessage(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return 'Failed to create resident. Please try again.';
  }
  const e = error as { name?: string; message?: string; context?: unknown };

  // FunctionsHttpError: read the actual response body from the function.
  if (typeof Response !== 'undefined' && e.context instanceof Response) {
    try {
      const body = await e.context.text();
      if (body.trim()) {
        try {
          const parsed = JSON.parse(body) as {
            error?: string;
            message?: string;
          } | null;
          if (parsed) {
            if (typeof parsed.error === 'string' && parsed.error) return parsed.error;
            if (typeof parsed.message === 'string' && parsed.message) return parsed.message;
          }
        } catch {
          // Not JSON — fall through to the raw body below.
        }
        return body.trim().slice(0, 500);
      }
    } catch {
      // Response body unreadable — fall through to the generic message.
    }
    return e.message || 'Failed to create resident. Please try again.';
  }

  // FunctionsRelayError: context is a plain object (e.g. { requestId, message }).
  if (e.context && typeof e.context === 'object' && 'message' in e.context) {
    const relayMessage = (e.context as { message?: unknown }).message;
    if (typeof relayMessage === 'string' && relayMessage) return relayMessage;
  }

  // Fetch-level failure: the request never reached the function.
  if (
    e.name === 'FunctionsFetchError' ||
    (e.message ?? '').includes('Failed to send a request to the Edge Function')
  ) {
    return 'Could not reach the create-user edge function. It may not be deployed — run "supabase functions deploy create-user" and try again.';
  }

  return e.message || 'Failed to create resident. Please try again.';
}

/**
 * Create a resident through the `create-user` edge function: auth user +
 * profile (role=resident) + resident_account (+ meter) + credential email.
 * The account number is auto-generated server-side (ACC-####).
 */
export async function createResident(
  input: ResidentCreateInput
): Promise<{
  user_id: string;
  temporary_password: string | null;
  account_number: string | null;
}> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      email: input.email,
      password: input.password ?? null,
      first_name: input.firstName,
      middle_name: input.middleName ?? null,
      last_name: input.lastName,
      date_of_birth: input.dateOfBirth,
      phone: input.phone,
      role: 'resident',
      service_address: input.serviceAddress ?? null,
      sitio: input.sitio ?? null,
      meter_number: input.meterNumber ?? null,
    },
  });

  if (error) {
    // Log the full error object (with its Response context) for debugging,
    // then surface the function's actual error message to the user.
    console.error('[createResident] edge function error:', error);
    throw new Error(await getCreateUserErrorMessage(error));
  }
  if (!data?.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      'Failed to create resident. Please try again.';
    console.error('[createResident] function returned ok:false:', message);
    throw new Error(message);
  }

  return {
    user_id: data.user_id as string,
    temporary_password: (data as { temporary_password?: string | null })
      .temporary_password ?? null,
    account_number: (data as { account_number?: string | null })
      .account_number ?? null,
  };
}
