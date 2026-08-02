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
//   Supabase Admin API (service role)  →  auth.users
//        │
//        ▼
//   handle_new_user trigger  →  profiles (role seeded as resident)
//        │
//        ▼
//   Function updates profile: names, phone, requested role
//        │
//        ▼
//   (residents only) meter + resident_account rows
//
// Deploy:
//   supabase functions deploy create-user
//
// Invoke from the apps:
//   supabase.functions.invoke('create-user', { body: { ... } })
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const VALID_ROLES = ['resident', 'meter_reader', 'staff', 'super_admin'] as const;
type RoleName = (typeof VALID_ROLES)[number];

interface CreateUserPayload {
  email: string;
  password: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  phone?: string | null;
  role: RoleName;
  /** Residents only: optional consumer account number (e.g. ACC-0001). */
  account_number?: string | null;
  /** Residents only: service address for the new account. */
  service_address?: string | null;
  /** Residents only: meter serial number. A meters row is created if absent. */
  meter_number?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(
      { error: 'Edge function is missing required environment variables.' },
      500
    );
  }

  // ── 1. Verify the caller: the JWT in the Authorization header ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Unauthorized: missing Authorization header.' }, 401);
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser(token);
  if (callerError || !caller) {
    return json({ error: 'Unauthorized: invalid or expired token.' }, 401);
  }

  // ── 2. Only staff / super admins may create users ──
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role:roles(name)')
    .eq('id', caller.id)
    .maybeSingle();
  const callerRole = (callerProfile as { role?: { name?: string } } | null)
    ?.role?.name;
  if (callerRole !== 'staff' && callerRole !== 'super_admin') {
    return json(
      { error: 'Forbidden: only staff and administrators can create users.' },
      403
    );
  }

  // ── 3. Validate the payload ──
  let body: CreateUserPayload;
  try {
    body = (await req.json()) as CreateUserPayload;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const firstName = (body.first_name ?? '').trim();
  const lastName = (body.last_name ?? '').trim();
  const role = body.role;

  if (!email || !password || !firstName || !lastName) {
    return json(
      { error: 'Email, password, first name and last name are required.' },
      400
    );
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters.' }, 400);
  }
  if (!VALID_ROLES.includes(role)) {
    return json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.` }, 400);
  }

  // ── 4. Create the auth user via the Admin API (service role) ──
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (createError) {
    return json({ error: createError.message }, 400);
  }
  const userId = created.user.id;

  // ── 5. handle_new_user already inserted a profile (role = resident).
  //        Update it with names, phone and the requested role. ──
  const { data: roleRow } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', role)
    .maybeSingle();

  const profilePatch: Record<string, unknown> = {
    first_name: firstName,
    middle_name: body.middle_name?.trim() || null,
    last_name: lastName,
    phone: body.phone?.trim() || null,
  };
  if (roleRow) {
    profilePatch.role_id = roleRow.id;
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update(profilePatch)
    .eq('id', userId);
  if (profileError) {
    return json({ error: profileError.message }, 500);
  }

  // ── 6. Residents: create the service account (+ meter) ──
  if (role === 'resident' && body.account_number) {
    let meterId: string | null = null;
    const meterNumber = (body.meter_number ?? '').trim();
    if (meterNumber) {
      const { data: meterRow } = await adminClient
        .from('meters')
        .insert({ meter_number: meterNumber, is_active: true })
        .select('id')
        .maybeSingle();
      meterId = meterRow?.id ?? null;
    }

    const { error: accountError } = await adminClient
      .from('resident_accounts')
      .insert({
        resident_id: userId,
        account_number: body.account_number.trim(),
        meter_id: meterId,
        service_address: body.service_address?.trim() || null,
        connection_status: 'active',
      });
    if (accountError) {
      return json({ error: accountError.message }, 500);
    }
  }

  return json({
    ok: true,
    user_id: userId,
    email,
    role,
  });
});
