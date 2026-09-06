/// <reference path="../deno.d.ts" />
// ============================================================
// resident-account-login — BKWB Edge Function
// ------------------------------------------------------------
// Lets an ALREADY-ONBOARDED resident sign in with their Account
// Number (Cons Code) even though Supabase Auth now identifies
// them by their verified email.
//
// Why this exists:
//   Migrated residents first sign in with Account Number + temp
//   password via the acc-<conscode>@example.com handle. Account
//   Setup then swaps auth.users.email to their real Gmail — the
//   handle identifier no longer exists in GoTrue, so the resident
//   app can no longer rebuild it. This function restores
//   "Account Number + password" as a permanent login method:
//
//     1. Resolve resident_accounts.account_number -> resident_id.
//     2. Verify the PASSWORD against GoTrue (sign-in attempt with
//        the profile's current email).
//     3. Only on success, return the login email so the app can
//        complete signInWithPassword itself.
//
// SECURITY:
//   * The password is REQUIRED and verified against GoTrue. A
//     wrong/nonexistent account number returns the same generic
//     "invalid credentials" error — the endpoint can never be used
//     to discover whether an account number exists, or to learn
//     anyone's email address.
//   * No emails are returned, logged, or stored beyond the
//     successful caller's own login email in the HTTP response
//     (which the caller already knows after signing in).
//   * Caller identity is irrelevant here — authentication happens
//     against GoTrue below — so verify_jwt = false in config.toml
//     (CORS-safe) and the function authorizes via GoTrue directly.
//
// Deploy: supabase functions deploy resident-account-login
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Same generic error for every failure — no information leaks. */
const GENERIC_ERROR = 'Invalid account number or password.';

function fail(message: string = GENERIC_ERROR, status = 401): Response {
  console.error(`[resident-account-login] reject (${status})`);
  return json({ error: message }, status);
}

function getSecretKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const values = parsed as Record<string, unknown>;
        const first = Object.values(values).find((v) => typeof v === 'string' && v);
        if (typeof first === 'string' && first) return first;
      }
    } catch {
      // fall through to the legacy key
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined;
}

interface AccountLoginPayload {
  account_number?: string;
  password?: string;
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return fail('Method not allowed. Use POST.', 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json({ error: 'Server configuration error.' }, 500);
  }

  let body: AccountLoginPayload;
  try {
    body = (await req.json()) as AccountLoginPayload;
  } catch {
    return fail('Invalid request body.', 400);
  }

  const accountNumber = (body.account_number ?? '').trim();
  const password = body.password ?? '';
  if (!accountNumber || !password) {
    return fail();
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Resolve the account number to its resident profile.
  const { data: account, error: accountError } = await adminClient
    .from('resident_accounts')
    .select('resident_id')
    .eq('account_number', accountNumber)
    .maybeSingle();
  if (accountError) {
    console.error('[resident-account-login] account lookup failed:', accountError.message);
    return json({ error: 'Server error. Please try again.' }, 500);
  }
  // Unknown account number -> identical response to a wrong password.
  if (!account) {
    return fail();
  }

  // 2. Read the profile's current login email + activity state.
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('email, is_active, role:roles(name)')
    .eq('id', account.resident_id as string)
    .maybeSingle();
  if (profileError) {
    console.error('[resident-account-login] profile lookup failed:', profileError.message);
    return json({ error: 'Server error. Please try again.' }, 500);
  }
  const profileRow = profile as {
    email: string | null;
    is_active: boolean;
    role?: { name?: string } | null;
  } | null;
  if (!profileRow?.email) {
    // Not activated yet (no handle assigned) — indistinguishable from a
    // wrong password from the caller's point of view.
    return fail();
  }
  if (profileRow.role?.name !== 'resident') {
    return fail();
  }
  if (!profileRow.is_active) {
    return json({ error: 'Your account is deactivated. Please contact support.' }, 403);
  }

  // 3. Verify the password against GoTrue using the profile's email.
  //    This is the only proof that the caller owns the account.
  const verifyClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email: profileRow.email,
    password,
  });
  if (signInError) {
    return fail();
  }

  // 4. Success — return the login email so the app completes sign-in.
  //    (This response only ever reaches a caller who just proved the
  //    password, so the email is theirs to know.)
  return json({
    ok: true,
    login_email: profileRow.email,
    account_number: accountNumber,
  });
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error('[resident-account-login] UNCAUGHT ERROR:', err);
    return json({ error: 'Unexpected internal error.' }, 500);
  }
});
