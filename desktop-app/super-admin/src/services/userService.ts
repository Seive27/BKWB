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
  /** PH cell number (09XXXXXXXXX) — required for residents, unique. */
  phone?: string;
  /** Required for residents — drives the automatic temporary password. */
  dateOfBirth?: string;
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
 * Extract the REAL error from a supabase-js `functions.invoke` failure.
 * In supabase-js v2, FunctionsHttpError.context is a Response object whose
 * body is the function's JSON (e.g. { "error": "..." }).
 */
async function getCreateUserErrorMessage(error: unknown): Promise<string> {
  if (!error || typeof error !== 'object') {
    return 'Failed to create user. Please try again.';
  }
  const e = error as { name?: string; message?: string; context?: unknown };

  // FunctionsHttpError: read the actual response body from the function.
  if (typeof Response !== 'undefined' && e.context instanceof Response) {
    try {
      const body = await e.context.text();
      if (body.trim()) {
        try {
          const parsed = JSON.parse(body) as { error?: string; message?: string } | null;
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
    return e.message || 'Failed to create user. Please try again.';
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

  return e.message || 'Failed to create user. Please try again.';
}

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
      date_of_birth: input.dateOfBirth ?? null,
      phone: input.phone ?? null,
      role: input.role,
      account_number: input.accountNumber ?? null,
      service_address: input.serviceAddress ?? null,
      meter_number: input.meterNumber ?? null,
    },
  });

  if (error) {
    // Log the full error object (with its Response context) for debugging,
    // then surface the function's actual error message to the user.
    console.error('[createUser] edge function error:', error);
    throw new Error(await getCreateUserErrorMessage(error));
  }
  if (!data?.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      'Failed to create user. Please try again.';
    console.error('[createUser] function returned ok:false:', message);
    throw new Error(message);
  }

  return { user_id: data.user_id as string };
}
