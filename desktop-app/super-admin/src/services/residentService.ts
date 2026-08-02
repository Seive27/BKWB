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
  /** Primary (first) resident account. */
  accountId: string | null;
  accountNumber: string | null;
  serviceAddress: string | null;
  connectionStatus: 'active' | 'inactive' | 'disconnected' | null;
  meterId: string | null;
  meterNumber: string | null;
  createdAt: string;
}

export interface ResidentCreateInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  /** Consumer code, e.g. ACC-0001. */
  accountNumber?: string;
  serviceAddress?: string;
  meterNumber?: string;
}

export interface ResidentStats {
  totalResidents: number;
  activeAccounts: number;
  inactiveAccounts: number;
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
  created_at: string;
  accounts?: {
    id: string;
    account_number: string;
    service_address: string | null;
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
    accountId: account?.id ?? null,
    accountNumber: account?.account_number ?? null,
    serviceAddress: account?.service_address ?? null,
    connectionStatus: account?.connection_status ?? null,
    meterId: account?.meter?.meter_number ?? null,
    meterNumber: account?.meter?.meter_number ?? null,
    createdAt: row.created_at,
  };
}

/** List residents (profiles with role=resident) with their primary account. */
export async function getResidents(): Promise<ResidentRecord[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, first_name, last_name, email, phone, created_at, role:roles(name), accounts:resident_accounts(id, account_number, service_address, connection_status, meter:meters(meter_number))'
    )
    .eq('role.name', 'resident')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getResidentServiceErrorMessage(error));
  }

  return (data ?? []).map((r) => mapRow(r as unknown as ResidentRow));
}

/** Aggregate resident + account stats. */
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
 * Create a resident through the `create-user` edge function: auth user +
 * profile (role=resident) + optional meter + resident_account.
 */
export async function createResident(
  input: ResidentCreateInput
): Promise<{ user_id: string }> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      email: input.email,
      password: input.password,
      first_name: input.firstName,
      middle_name: input.middleName ?? null,
      last_name: input.lastName,
      phone: input.phone ?? null,
      role: 'resident',
      account_number: input.accountNumber ?? null,
      service_address: input.serviceAddress ?? null,
      meter_number: input.meterNumber ?? null,
    },
  });

  if (error) {
    const message =
      typeof (error as { message?: string }).message === 'string'
        ? (error as { message: string }).message
        : 'Failed to create resident. Make sure the create-user edge function is deployed.';
    throw new Error(message);
  }
  if (!data?.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ??
        'Failed to create resident. Please try again.'
    );
  }

  return { user_id: data.user_id as string };
}
