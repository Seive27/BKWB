// ============================================================
// send-email — BKWB Edge Function
// ------------------------------------------------------------
// Modular email service used by other edge functions (e.g.
// create-user → account credentials) and, later, any other
// transactional email (bills, notices, ...).
//
// Provider: Resend (https://resend.com) via its REST API.
//   * Set RESEND_API_KEY in the edge function secrets and emails
//     are sent for real.
//   * Without a key the function logs the payload and returns
//     { ok: true, mode: 'log' } so development is never blocked.
//
// Free plan (no verified domain): only the sandbox sender
// `onboarding@resend.dev` is allowed, and it delivers exclusively to the
// Resend account owner's own email address (for testing). Once a real domain
// is verified in Resend, override the sender with SEND_EMAIL_FROM,
// e.g. "BKWB <no-reply@yourdomain.com>".
//
// Deploy:
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase functions deploy send-email
//
// Invoke (edge-to-edge, using the secret key):
//   adminClient.functions.invoke('send-email', { body: { to, template, data } })
//
// Security: this function is internal-only and is configured with
// verify_jwt = false in config.toml — the platform cannot JWT-verify requests
// made with the new secret keys (SUPABASE_SECRET_KEYS), so the function
// authorizes callers itself: the caller must present the project's secret key
// in the apikey or Authorization header.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Collect every auto-provisioned admin credential so internal callers
 * (edge-to-edge) can be authorized regardless of project generation:
 *   - current: SUPABASE_SECRET_KEYS = {"default": "sb_secret_..."} (dict)
 *   - legacy:  SUPABASE_SERVICE_ROLE_KEY (auto-provisioned on legacy projects)
 * Matches create-user's credential resolution exactly (no array shapes).
 */
function resolveSecretCredentials(): string[] {
  const credentials: string[] = [];
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const v of Object.values(parsed)) {
          if (typeof v === 'string' && v) credentials.push(v);
        }
      }
    } catch {
      // Malformed JSON — the legacy key below may still be present.
    }
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) credentials.push(legacy);
  return credentials;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface SendEmailPayload {
  to: string;
  /** Which HTML template to render. */
  template: 'account_credentials' | string;
  /** Values interpolated into the template. */
  data?: Record<string, unknown>;
}

// ── Templates ──
// Kept inline so the function is fully self-contained. Each template is a
// function (data) => { subject, html }.
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTemplate(template: string, data: Record<string, unknown>) {
  const name = escapeHtml(data.name || 'there');
  const email = escapeHtml(data.email || '');
  const password = escapeHtml(data.password || '');
  const accountNumber = escapeHtml(data.account_number || '');

  switch (template) {
    case 'account_credentials':
      return {
        subject: 'Your Barangay Kalunasan Water Billing account is ready',
        html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;">
          <h2 style="color:#1E3A5F;margin:0 0 16px;">Barangay Kalunasan Water Billing System</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your resident account has been created. Use the credentials below to log in to the
             <strong>Residents</strong> mobile app:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
            <tr>
              <td style="padding:10px 12px;background:#f3f4f6;border:1px solid #e5e7eb;font-weight:bold;">Email</td>
              <td style="padding:10px 12px;background:#f3f4f6;border:1px solid #e5e7eb;">${email}</td>
            </tr>
            <tr>
              <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold;">Temporary password</td>
              <td style="padding:10px 12px;border:1px solid #e5e7eb;"><code style="font-size:15px;letter-spacing:0.5px;">${password}</code></td>
            </tr>
            ${accountNumber ? `<tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:bold;">Account No.</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">${accountNumber}</td></tr>` : ''}
          </table>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;">
            For security, please change your password after your first login
            (use <strong>Forgot Password?</strong> on the login screen if needed).
            If you did not request this account, please contact your water district office.
          </p>
        </div>`,
      };
    default:
      return {
        subject: 'Notification from Barangay Kalunasan Water Billing System',
        html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;padding:24px;">${escapeHtml(data.message || 'You have a new notification.')}</div>`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST.' }, 405);
  }

  // ── Caller authorization ──
  // verify_jwt is false for this function (the platform cannot JWT-verify
  // requests made with secret keys), so authorize here: the caller must
  // present one of the project's auto-provisioned admin credentials
  // (supabase-js sends the client key in both the `apikey` and
  // `Authorization: Bearer <key>` headers on admin clients). Supports both
  // the current SUPABASE_SECRET_KEYS dictionary and the legacy
  // SUPABASE_SERVICE_ROLE_KEY. Fails closed when nothing is resolvable.
  const validCredentials = resolveSecretCredentials();
  if (validCredentials.length === 0) {
    console.error('[send-email] no admin credential available in environment');
    return json({ error: 'Server configuration error.' }, 500);
  }
  const presented =
    (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '') ||
    req.headers.get('apikey') ||
    '';
  if (!validCredentials.includes(presented)) {
    console.warn('[send-email] unauthorized caller rejected');
    return json({ error: 'Unauthorized.' }, 401);
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  // Default to Resend's free sandbox sender (works without a verified domain,
  // but only delivers to the account owner's own email). Override with
  // SEND_EMAIL_FROM once a real domain is verified.
  const fromEmail =
    Deno.env.get('SEND_EMAIL_FROM') ?? 'BKWB <onboarding@resend.dev>';

  let body: SendEmailPayload;
  try {
    body = (await req.json()) as SendEmailPayload;
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const to = (body.to ?? '').trim().toLowerCase();
  if (!to || !to.includes('@')) {
    return json({ error: 'A valid recipient email is required.' }, 400);
  }

  const { subject, html } = renderTemplate(
    body.template ?? 'default',
    body.data ?? {}
  );

  // ── No API key: log-and-succeed so nothing breaks during development ──
  if (!resendApiKey) {
    console.log(
      `[send-email] (no RESEND_API_KEY — email logged) to=${to} subject="${subject}"\n${html}`
    );
    return json({ ok: true, mode: 'log', to, subject });
  }

  // ── Send via Resend REST API ──
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    console.error('[send-email] Resend error:', resendResponse.status, detail);
    return json(
      { ok: false, error: `Email provider error (${resendResponse.status}).` },
      502
    );
  }

  return json({ ok: true, mode: 'resend', to });
});
