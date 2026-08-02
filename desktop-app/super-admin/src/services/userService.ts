import { supabase } from '../lib/supabase';
import type { Role } from '../types';

// ── Types ──

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  role: Role['name'];
  roleLabel: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  role: Role['name'];
  /** Residents only — optional consumer account details. */
  accountNumber?: string;
  serviceAddress?: string;
  meterNumber?: string;
}

// ── Labels ──

const ROLE_LABELS: Record<Role['name'], string> = {
  super_admin: 'Super Admin',
  staff: 'Staff',
  resident: 'Resident',
  meter_reader: 'Meter Reader',
};

export function getRoleLabel(role: Role['name']): string {
  return ROLE_LABELS[role] ?? role;
}

// ── Error handling ──

export function getUserServiceErrorMessage(error: {
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
    return 'The profiles table has not been set up yet. Please run the SQL migration.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to manage users.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

// ── Queries ──

interface ProfileRow {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  role?: { name: Role['name'] } | null;
}

function mapRow(row: ProfileRow): ManagedUser {
  const roleName = row.role?.name ?? 'resident';
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    phone: row.phone,
    role: roleName,
    roleLabel: getRoleLabel(roleName),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/** List all profiles with their role, newest first. */
export async function getUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, middle_name, last_name, phone, is_active, created_at, role:roles(name)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getUserServiceErrorMessage(error));
  }

  return (data ?? []).map((r) => mapRow(r as unknown as ProfileRow));
}

// ── User creation (server-side via edge function) ──

/**
 * Create a user through the `create-user` edge function. Auth users are
 * never created from the browser — the function uses the Admin API.
 */
export async function createUser(input: CreateUserInput): Promise<{ user_id: string }> {
  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      email: input.email,
      password: input.password,
      first_name: input.firstName,
      middle_name: input.middleName ?? null,
      last_name: input.lastName,
      phone: input.phone ?? null,
      role: input.role,
      account_number: input.accountNumber ?? null,
      service_address: input.serviceAddress ?? null,
      meter_number: input.meterNumber ?? null,
    },
  });

  if (error) {
    // PostgREST-style error object from the edge function.
    const message =
      typeof (error as { message?: string }).message === 'string'
        ? (error as { message: string }).message
        : 'Failed to create user. Make sure the create-user edge function is deployed.';
    throw new Error(message);
  }
  if (!data?.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ??
        'Failed to create user. Please try again.'
    );
  }

  return { user_id: data.user_id as string };
}
