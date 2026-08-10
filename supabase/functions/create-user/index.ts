// ============================================================
// create-user — BKWB Edge Function
// ------------------------------------------------------------
// Server-side user creation. Auth users are NEVER created from
// the browser; only this function may touch the Admin API.
//
// Flow:
//   Super Admin / Staff
//        │  (supabase.functions.invoke('create-user', { body }))
//        ▼
//   Edge Function (this file)
//        │  (validates caller is staff / super_admin)
//        ▼
//   Supabase Admin API (secret key)  →  auth.users
//        │
//        ▼
//   handle_new_user trigger  →  profiles (role seeded as resident)
//        │
//        ▼
//   Function updates profile: names, phone, DOB, requested role
//        │
//        ▼
//   (residents only) resident_account (+ meter) row — the account
//   number is always created (auto-generated ACC-#### when absent)
//        │
//        ▼
//   (best-effort) send-email → resident gets email + temporary password
//
// Credentials (ALL auto-provisioned by the platform — nothing to set manually):
//   * Admin client  → SUPABASE_SECRET_KEYS (current architecture:
//     {"default": "sb_secret_..."}). Falls back to the auto-provisioned
//     legacy SUPABASE_SERVICE_ROLE_KEY for projects still on legacy keys.
//   * Caller client → SUPABASE_PUBLISHABLE_KEYS (current architecture:
//     {"default": "sb_publishable_..."}). Falls back to the legacy
//     auto-provisioned SUPABASE_ANON_KEY.
//
// Deploy:
//   supabase functions deploy create-user
//   supabase functions deploy send-email
//
// Invoke from the apps:
//   supabase.functions.invoke('create-user', { body: { ... } })
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Log an error and return a sanitized JSON error response. */
function fail(status: number, message: string): Response {
  console.error(`[create-user] FAIL (${status}): ${message}`);
  return json({ error: message }, status);
}

const VALID_ROLES = ['resident', 'meter_reader', 'staff', 'super_admin'] as const;
type RoleName = (typeof VALID_ROLES)[number];

/** Strict PH cell number: starts with 09, exactly 11 digits, numbers only. */
const PHONE_REGEX = /^09\d{9}$/;

interface CreateUserPayload {
  email: string;
  password?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  /** Profiles.date_of_birth — required for residents (drives auto password). */
  date_of_birth?: string | null;
  /** PH cell number (09XXXXXXXXX) — required for residents, unique. */
  phone?: string | null;
  role: RoleName;
  /** Residents only: optional consumer account number (e.g. ACC-0001).
   *  Auto-generated (ACC-####) when omitted. */
  account_number?: string | null;
  /** Residents only: service address for the new account. */
  service_address?: string | null;
  /** Residents only: meter serial number. A meters row is created if absent. */
  meter_number?: string | null;
}

/**
 * Temporary password format requested by the professor:
 *   LastNameFirstNameMMDDYYYY  e.g. "Dela Cruz", "Juan", 2003-05-12
 *   → "DelaCruzJuan05122003"
 *
 * The birth date is parsed manually (never via `new Date()`): date-only
 * strings parse as UTC midnight, which shifts the day in negative-offset
 * timezones and would produce a password that differs from the one the
 * staff app displays.
 */
function parseBirthDate(dateOfBirth: string): { y: number; m: number; d: number } | null {
  const iso = dateOfBirth.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  const us = dateOfBirth.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (us) return { y: Number(us[3]), m: Number(us[1]), d: Number(us[2]) };
  return null;
}

function generateTemporaryPassword(
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
    throw new Error('Invalid date of birth format.');
  }
  const mm = String(parts.m).padStart(2, '0');
  const dd = String(parts.d).padStart(2, '0');
  const yyyy = String(parts.y);

  return `${titleCase(lastName)}${titleCase(firstName)}${mm}${dd}${yyyy}`;
}

function firstStringValue(values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
}

/**
 * Admin credential (auto-provisioned, never set manually — the CLI rejects
 * custom SUPABASE_-prefixed secrets):
 *   - current: SUPABASE_SECRET_KEYS = {"default": "sb_secret_..."} (dict)
 *   - legacy:  SUPABASE_SERVICE_ROLE_KEY (auto-provisioned on projects that
 *     still use the legacy service-role JWT)
 * Returns undefined when nothing is available (caller then gets a clear 500).
 */
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
      // Malformed JSON — fall through to the legacy key below.
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined;
}

/**
 * Caller-facing credential (auto-provisioned, never set manually):
 *   - current: SUPABASE_PUBLISHABLE_KEYS = {"default": "sb_publishable_..."}
 *   - legacy:  SUPABASE_ANON_KEY (auto-provisioned on legacy projects)
 */
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
      // Malformed JSON — fall through to the legacy key below.
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? undefined;
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return fail(405, 'Method not allowed. Use POST.');
  }

  console.log('[create-user] invoked', {
    method: req.method,
    hasAuthHeader: !!req.headers.get('Authorization'),
  });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !secretKey || !publishableKey) {
    console.error('[create-user] credentials missing', {
      url: !!supabaseUrl,
      secretKey: !!secretKey,
      publishableKey: !!publishableKey,
    });
    return fail(500, 'Edge function is missing required environment variables.');
  }

  // ── 1. Verify the caller: the JWT in the Authorization header ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return fail(401, 'Unauthorized: missing Authorization header.');
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');

  // The caller's JWT is attached to the client so EVERY request it makes —
  // including the profile/role lookup below — runs AS that user. Without it
  // the role query executes as `anon`, is blocked by RLS, and rejects every
  // legitimate staff request with a 403.
  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser(token);
  if (callerError || !caller) {
    console.error('[create-user] caller authentication failed', {
      message: callerError?.message ?? 'no user returned',
    });
    return fail(401, 'Unauthorized: invalid or expired token.');
  }
  console.log('[create-user] caller authenticated', { id: caller.id });

  // ── 2. Only staff / super admins may create users ──
  const { data: callerProfile, error: profileQueryError } = await callerClient
    .from('profiles')
    .select('role:roles(name)')
    .eq('id', caller.id)
    .maybeSingle();
  if (profileQueryError) {
    return fail(500, `Could not verify your role: ${profileQueryError.message}`);
  }
  const callerRole = (callerProfile as { role?: { name?: string } } | null)
    ?.role?.name;
  console.log('[create-user] caller role', { role: callerRole ?? null });
  if (callerRole !== 'staff' && callerRole !== 'super_admin') {
    return fail(403, 'Forbidden: only staff and administrators can create users.');
  }

  // ── 3. Validate the payload ──
  let body: CreateUserPayload;
  try {
    body = (await req.json()) as CreateUserPayload;
  } catch {
    return fail(400, 'Invalid JSON body.');
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const firstName = (body.first_name ?? '').trim();
  const lastName = (body.last_name ?? '').trim();
  const role = body.role;
  const dateOfBirth = body.date_of_birth?.trim() || null;
  const phone = body.phone?.trim() || null;

  if (!email || !firstName || !lastName) {
    return fail(400, 'Email, first name and last name are required.');
  }
  if (!VALID_ROLES.includes(role)) {
    return fail(400, `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.`);
  }
  console.log('[create-user] payload parsed', {
    email,
    role,
    firstName,
    lastName,
    hasPhone: !!phone,
    hasDateOfBirth: !!dateOfBirth,
  });

  // ── 3a. Cell number validation: required + format + uniqueness ──
  if (phone) {
    if (!PHONE_REGEX.test(phone)) {
      return fail(
        400,
        'Cell number must start with 09, contain exactly 11 digits, and be numbers only (e.g. 09171234567).'
      );
    }
    const { data: phoneOwner } = await callerClient
      .from('profiles')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (phoneOwner) {
      return fail(409, 'This cell number is already registered to another account.');
    }
  } else if (role === 'resident') {
    return fail(400, 'Cell number is required for resident accounts.');
  }

  // ── 3b. Password: use provided value, otherwise auto-generate from DOB ──
  let password = body.password?.trim() ?? '';
  if (!password) {
    if (!dateOfBirth) {
      return fail(400, 'Date of birth is required to generate a temporary password.');
    }
    try {
      password = generateTemporaryPassword(firstName, lastName, dateOfBirth);
    } catch (err) {
      return fail(400, err instanceof Error ? err.message : 'Invalid date of birth format.');
    }
  }
  if (password.length < 8) {
    return fail(400, 'Password must be at least 8 characters.');
  }
  console.log('[create-user] password ready', { length: password.length });

  // ── 4. Create the auth user via the Admin API (secret key — bypasses RLS) ──
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('[create-user] creating auth user...', { email, role });
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (createError) {
    return fail(400, createError.message);
  }
  const userId = created.user.id;
  console.log('[create-user] auth user created', { user_id: userId });

  // ── 4b. Rollback: if any step after the auth user fails we must NOT leave
  //        an orphaned/incomplete account behind. Deleting the auth user also
  //        cascades to its profile row (FK ON DELETE CASCADE). ──
  const rollback = async () => {
    const { error: delError } = await adminClient.auth.admin.deleteUser(userId);
    if (delError) {
      console.warn('[create-user] rollback: failed to delete auth user', userId, delError.message);
    }
  };

  // ── 5. handle_new_user already inserted a profile (role = resident).
  //        Update it with names, phone, DOB and the requested role. ──
  const { data: roleRow, error: roleLookupError } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', role)
    .maybeSingle();
  if (roleLookupError || !roleRow) {
    await rollback();
    return fail(500, roleLookupError?.message ?? `Role "${role}" not found.`);
  }

  const profilePatch: Record<string, unknown> = {
    first_name: firstName,
    middle_name: body.middle_name?.trim() || null,
    last_name: lastName,
    date_of_birth: dateOfBirth,
    phone,
    role_id: roleRow.id,
  };

  const { error: profileError } = await adminClient
    .from('profiles')
    .update(profilePatch)
    .eq('id', userId);
  if (profileError) {
    await rollback();
    return fail(500, profileError.message);
  }
  console.log('[create-user] profile updated', { user_id: userId, role });

  // ── 6. Residents: always create the service account (+ meter).
  //        Consumer code input was removed from the UI — the account number
  //        is auto-generated via the DB sequence when none is supplied. ──
  let accountNumber: string | null = null;
  if (role === 'resident') {
    let meterId: string | null = null;
    const meterNumber = (body.meter_number ?? '').trim();
    if (meterNumber) {
      // Reuse an existing meter with the same serial instead of colliding
      // on the unique meter_number constraint.
      const { data: existingMeter } = await adminClient
        .from('meters')
        .select('id')
        .eq('meter_number', meterNumber)
        .maybeSingle();
      if (existingMeter) {
        meterId = existingMeter.id;
      } else {
        const { data: meterRow, error: meterError } = await adminClient
          .from('meters')
          .insert({ meter_number: meterNumber, is_active: true })
          .select('id')
          .maybeSingle();
        if (meterError) {
          await rollback();
          return fail(500, meterError.message);
        }
        meterId = meterRow?.id ?? null;
      }
    }

    const provided = (body.account_number ?? '').trim();
    if (provided) {
      accountNumber = provided;
    } else {
      const { data: generated, error: genError } = await adminClient
        .rpc('generate_account_number');
      if (genError) {
        await rollback();
        return fail(500, genError.message);
      }
      accountNumber = generated as string;
    }

    const { error: accountError } = await adminClient
      .from('resident_accounts')
      .insert({
        resident_id: userId,
        account_number: accountNumber,
        meter_id: meterId,
        service_address: body.service_address?.trim() || null,
        connection_status: 'active',
      });
    if (accountError) {
      await rollback();
      return fail(500, accountError.message);
    }
    console.log('[create-user] resident account created', { account_number: accountNumber });
  }

  // ── 7. Email the credentials (best-effort — never fails the request) ──
  //        Only residents receive the temporary password; other roles are
  //        provisioned by staff who already know the password they set.
  if (role === 'resident') {
    const fullName = `${firstName} ${lastName}`.trim();
    console.log('[create-user] invoking send-email...', { to: email });
    await adminClient.functions.invoke('send-email', {
      body: {
        to: email,
        template: 'account_credentials',
        data: {
          name: fullName,
          email,
          password,
          account_number: accountNumber,
        },
      },
    }).then(() => {
      console.log('[create-user] send-email succeeded', { to: email });
    }).catch((err: unknown) => {
      // Email delivery must never block account creation.
      console.warn('[create-user] send-email failed for', email, err);
    });
  }

  console.log('[create-user] success', { user_id: userId, role });
  return json({
    ok: true,
    user_id: userId,
    email,
    role,
    account_number: accountNumber,
    // The temporary password is returned so the caller can display it once
    // (it is never stored in plaintext anywhere).
    temporary_password: role === 'resident' ? password : null,
  });
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected internal error.';
    // Log the full error server-side; return it (plus CORS headers) so the
    // caller can see the real cause instead of a bare non-2xx.
    console.error('[create-user] UNCAUGHT ERROR:', err);
    return json({ error: message }, 500);
  }
});
