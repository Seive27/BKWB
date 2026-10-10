/// <reference path="../deno.d.ts" />
// ============================================================
// send-email-confirmation — BKWB Edge Function
// ------------------------------------------------------------
// First-login email confirmation for an account that was created
// with a real email address.
//
// The signed-in user calls this function. It generates a one-time
// code with the Admin API (no email is sent by Auth) and delivers
// that code through send-email as "Verification code for email
// confirmation". The code is never returned to the app. The app
// checks it with verifyOtp({ type: 'magiclink' }).
//
// Forgot-password keeps the separate recovery template.
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
  console.error(`[send-email-confirmation] FAIL (${status}): ${message}`);
  return json({ error: message }, status);
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
      // fall through
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
      // fall through
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? undefined;
}

function isPlaceholderEmail(email: string): boolean {
  return /^(acc-[a-z0-9-]+|no-email-[a-f0-9]+)@example\.com$/i.test(email);
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

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return fail(401, 'Unauthorized: missing Authorization header.');
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error: callerError,
  } = await callerClient.auth.getUser(token);
  if (callerError || !user) {
    return fail(401, 'Unauthorized: invalid or expired token.');
  }

  const caller = user as {
    id: string;
    email?: string | null;
    user_metadata?: { first_name?: string; last_name?: string };
  };
  const email = caller.email?.trim().toLowerCase() ?? '';
  if (!email || isPlaceholderEmail(email)) {
    return fail(400, 'This account has no email address to confirm.');
  }

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  const code = linkData?.properties?.email_otp?.trim() ?? '';
  if (linkError || !code) {
    return fail(500, linkError?.message || 'Could not create a verification code.');
  }

  const first = caller.user_metadata?.first_name?.trim() ?? '';
  const last = caller.user_metadata?.last_name?.trim() ?? '';
  const name = `${first} ${last}`.trim();

  const { data: sent, error: sendError } = (await adminClient.functions.invoke('send-email', {
    body: {
      to: email,
      template: 'email_confirmation',
      data: { name, email, code },
    },
  })) as { data: { ok?: boolean; error?: string } | null; error: { message: string } | null };

  if (sendError || !sent?.ok) {
    console.error('[send-email-confirmation] send-email failed', sendError?.message ?? sent?.error);
    return fail(502, 'Could not send the verification code. Please try again.');
  }

  console.log('[send-email-confirmation] sent', { user_id: caller.id });
  return json({ ok: true });
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected internal error.';
    console.error('[send-email-confirmation] UNCAUGHT ERROR:', err);
    return json({ error: message }, 500);
  }
});
