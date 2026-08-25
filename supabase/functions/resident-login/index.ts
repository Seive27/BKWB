/// <reference path="../deno.d.ts" />
// ============================================================
// resident-login — BKWB Edge Function (Phase C: first-time login)
// ------------------------------------------------------------
// Staff / Super Admin issue login credentials for a resident who
// was imported from the masterlist WITHOUT contact data (no email,
// no password). The resident is identified by their Account Number
// / Cons Code, which alone can NEVER authenticate anyone.
//
// Flow:
//   Staff  ->  supabase.functions.invoke('resident-login', { body })
//          ->  caller verified as staff/super_admin via JWT
//          ->  account_number resolved to its auth user (Admin API)
//          ->  a LOGIN HANDLE email is assigned when the user has none:
//                acc-<cons code>@example.com   (internal identifier,
//                IANA-reserved domain — never a real mailbox)
//          ->  temporary password set (DOB-based when available,
//              otherwise a secure random one) and returned ONCE
//
// The resident then signs in on the mobile app using their Account
// Number + temporary password, and completes their profile.
// Deploy: supabase functions deploy resident-login
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, message: string): Response {
  console.error(`[resident-login] FAIL (${status}): ${message}`);
  return json({ error: message }, status);
}

/** Login-handle domain: IANA-reserved, can never receive mail. */
const LOGIN_HANDLE_DOMAIN = 'example.com';

/**
 * Deterministic login handle for an account number. MUST stay in sync with
 * the mobile apps' `loginHandleForAccount` helper: the resident signs in by
 * typing their Account Number, and the app rebuilds this same handle.
 */
export function loginHandleForAccount(accountNumber: string): string {
  const sanitized = accountNumber.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `acc-${sanitized}@${LOGIN_HANDLE_DOMAIN}`;
}

/** True when the profile/auth email is one of our internal login handles. */
export function isLoginHandle(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(`@${LOGIN_HANDLE_DOMAIN}`)) return false;
  return /^acc-[a-z0-9-]+@/.test(normalized);
}

function parseBirthDate(dateOfBirth: string): { y: number; m: number; d: number } | null {
  const iso = dateOfBirth.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  const us = dateOfBirth.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (us) return { y: Number(us[3]), m: Number(us[1]), d: Number(us[2]) };
  return null;
}

/** Same DOB-based pattern used across BKWB: DelaCruzJuan05122003 */
function generateTemporaryPassword(firstName: string, lastName: string, dateOfBirth: string): string {
  const titleCase = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

  const parts = parseBirthDate(dateOfBirth);
  if (!parts || parts.y < 1900 || parts.m < 1 || parts.m > 12 || parts.d < 1 || parts.d > 31) {
    throw new Error('Invalid date of birth format.');
  }
  const mm = String(parts.m).padStart(2, '0');
  const dd = String(parts.d).padStart(2, '0');
  const yyyy = String(parts.y);
  return `${titleCase(lastName)}${titleCase(firstName)}${mm}${dd}${yyyy}`;
}

/** Cryptographically random fallback password for records without a DOB. */
function generateRandomPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `Bkwb-${out.slice(0, 12)}!`;
}

function firstStringValue(values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
}

function getSecretKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const values = parsed as Record<string, unknown>;
        const key = values['default'] ?? firstStringValue(Object.values(values));
        if (typeof key === 'string' && key) return key;
      }
    } catch {
      // fall through to legacy key
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined;
}

function getPublishableKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const values = parsed as Record<string, unknown>;
        const key = values['default'] ?? firstStringValue(Object.values(values));
        if (typeof key === 'string' && key) return key;
      }
    } catch {
      // fall through to legacy key
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? undefined;
}

interface ResidentLoginPayload {
  /** Account Number / Cons Code of the resident service account. */
  account_number?: string;
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return fail(405, 'Method not allowed. Use POST.');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !secretKey || !publishableKey) {
    return fail(500, 'Edge function is missing required environment variables.');
  }

  // 1. Authenticate the caller.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return fail(401, 'Unauthorized: missing Authorization header.');
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser(token);
  if (callerError || !caller) {
    return fail(401, 'Unauthorized: invalid or expired token.');
  }

  // 2. Only staff / super admins may issue credentials.
  const { data: callerProfile, error: profileQueryError } = await callerClient
    .from('profiles')
    .select('role:roles(name)')
    .eq('id', caller.id)
    .maybeSingle();
  if (profileQueryError) {
    return fail(500, `Could not verify your role: ${profileQueryError.message}`);
  }
  const callerRole = (callerProfile as { role?: { name?: string } } | null)?.role?.name;
  if (callerRole !== 'staff' && callerRole !== 'super_admin') {
    return fail(403, 'Forbidden: only staff and administrators can issue resident credentials.');
  }

  // 3. Resolve the account.
  let body: ResidentLoginPayload;
  try {
    body = (await req.json()) as ResidentLoginPayload;
  } catch {
    return fail(400, 'Invalid JSON body.');
  }

  const accountNumber = (body.account_number ?? '').trim();
  if (!accountNumber) {
    return fail(400, 'account_number is required.');
  }

  const { data: account, error: accountError } = await callerClient
    .from('resident_accounts')
    .select('id, resident_id')
    .eq('account_number', accountNumber)
    .maybeSingle();
  if (accountError) {
    return fail(500, accountError.message);
  }
  if (!account) {
    return fail(404, 'No resident account found for that Account Number.');
  }

  const residentId = account.resident_id as string;

  const { data: profile, error: profileError } = await callerClient
    .from('profiles')
    .select('first_name, middle_name, last_name, email, date_of_birth, role:roles(name), is_active')
    .eq('id', residentId)
    .maybeSingle();
  if (profileError) {
    return fail(500, profileError.message);
  }
  if (!profile) {
    return fail(404, 'Resident profile not found.');
  }
  const profileRow = profile as {
    first_name: string;
    middle_name: string | null;
    last_name: string;
    email: string | null;
    date_of_birth: string | null;
    role?: { name?: string } | null;
    is_active: boolean;
  };
  if (profileRow.role?.name !== 'resident') {
    return fail(400, 'That account does not belong to a resident.');
  }

  // 4. Build the credentials.
  const existingEmail = profileRow.email?.trim() ?? '';
  const hasRealEmail = !!existingEmail && !isLoginHandle(existingEmail);
  const handle = loginHandleForAccount(accountNumber);

  // A resident whose record already carries a REAL email logs in with it;
  // we only assign the internal handle when no real email exists.
  const loginEmail = hasRealEmail ? existingEmail.toLowerCase() : handle;

  let temporaryPassword: string;
  let generatedFrom: 'dob' | 'random';
  try {
    if (profileRow.date_of_birth) {
      temporaryPassword = generateTemporaryPassword(
        profileRow.first_name ?? '',
        profileRow.last_name ?? '',
        profileRow.date_of_birth
      );
      generatedFrom = 'dob';
    } else {
      temporaryPassword = generateRandomPassword();
      generatedFrom = 'random';
    }
  } catch (err) {
    return fail(400, err instanceof Error ? err.message : 'Could not generate a password.');
  }

  // 5. Apply them through the Admin API.
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const updatePayload: Record<string, unknown> = {
    password: temporaryPassword,
    email_confirm: true,
  };
  if (!hasRealEmail) {
    // Imported masterlist users have a NULL email; give them the handle so
    // GoTrue has an identifier. Real emails are never overwritten.
    updatePayload.email = loginEmail;
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    residentId,
    updatePayload
  );
  if (updateError) {
    return fail(500, `Could not update the auth user: ${updateError.message}`);
  }

  // Keep profiles.email in sync so the mobile app shows the same identifier.
  if (!hasRealEmail) {
    const { error: syncError } = await adminClient
      .from('profiles')
      .update({ email: loginEmail })
      .eq('id', residentId);
    if (syncError) {
      console.warn('[resident-login] profile email sync failed:', syncError.message);
    }
  }

  // Reactivate a deactivated profile? No — deactivation must stay an explicit
  // staff decision. Report it instead so the UI can explain login failures.
  console.log('[resident-login] credentials issued', {
    account_number: accountNumber,
    generated_from: generatedFrom,
    profile_active: profileRow.is_active,
  });

  return json({
    ok: true,
    account_number: accountNumber,
    login_identifier: accountNumber,
    login_email: loginEmail,
    temporary_password: temporaryPassword,
    generated_from: generatedFrom,
    profile_is_active: profileRow.is_active === true,
  });
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected internal error.';
    console.error('[resident-login] UNCAUGHT ERROR:', err);
    return json({ error: message }, 500);
  }
});
