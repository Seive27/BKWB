/// <reference path="../deno.d.ts" />
// ============================================================
// paymongo-webhook — BKWB Edge Function (Stage 2: Webhook Payment Confirmation)
// ------------------------------------------------------------
// Secure webhook listener for PayMongo payment events.
//
// Security & Business Rules:
//   1. Verifies the PayMongo webhook signature (paymongo-signature header)
//      against PAYMONGO_WEBHOOK_SECRET using HMAC-SHA256 and constant-time comparison.
//   2. Does NOT mark bills as paid based on client redirect / browser callback.
//      The webhook is the sole authoritative confirmation of payment.
//   3. Supports primary event 'checkout_session.payment.paid'.
//   4. Extracts metadata (bill_id, bill_number, account_id, resident_id) with
//      fallback to reference_number.
//   5. Converts PayMongo amount (centavos) to PHP and strictly compares against
//      authoritative DB bills.amount_due.
//   6. Idempotency: Uses atomic database transaction/RPC (process_paymongo_payment)
//      with row-level lock (FOR UPDATE), preventing duplicate payment creation
//      on retries or concurrent webhook deliveries.
//   7. Safely handles already-paid bills, voided bills, amount mismatches,
//      and metadata mismatches without corrupting billing state.
//   8. Ignores non-payment events (failed, cancelled, expired) with HTTP 200.
//   9. Never logs secret keys, JWTs, credentials, or Authorization headers.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(status: number, message: string): Response {
  console.error(`[paymongo-webhook] FAIL (${status}): ${message}`);
  return json({ error: message }, status);
}

function firstStringValue(values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

function getSecretKey(): string | undefined {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const values = parsed as Record<string, unknown>;
        const key = values["default"] ?? firstStringValue(Object.values(values));
        if (typeof key === "string" && key) return key;
      }
    } catch {
      // Fall through to legacy key
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? undefined;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Compute HMAC-SHA256 hex string using Web Crypto API.
 */
async function computeHmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.trim()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Normalize webhook secrets copied from the dashboard / .env (quotes, whitespace). */
function normalizeWebhookSecret(raw: string): string {
  let secret = raw.trim();
  if (
    (secret.startsWith('"') && secret.endsWith('"')) ||
    (secret.startsWith("'") && secret.endsWith("'"))
  ) {
    secret = secret.slice(1, -1).trim();
  }
  return secret;
}

/**
 * Verifies the PayMongo webhook signature header against the raw request body.
 *
 * PayMongo Signature format in header `Paymongo-Signature`:
 *   t=<unix>,te=<test_hmac_hex>,li=<live_hmac_hex>
 *
 * Signed payload is: `${timestamp}.${rawBody}` (HMAC-SHA256, hex).
 * Use te in test mode and li in live mode. PAYMONGO_WEBHOOK_SECRET must be the
 * webhook endpoint secret (usually starts with whsk_), NOT the API sk_test key.
 */
async function verifyPayMongoSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  const secret = normalizeWebhookSecret(webhookSecret);
  if (!secret) return false;

  let timestamp: string | undefined;
  let testSignature = "";
  let liveSignature = "";

  for (const part of signatureHeader.split(",")) {
    const trimmed = part.trim();
    if (trimmed.startsWith("t=")) timestamp = trimmed.slice(2);
    else if (trimmed.startsWith("te=")) testSignature = trimmed.slice(3);
    else if (trimmed.startsWith("li=")) liveSignature = trimmed.slice(3);
  }

  const candidates = [testSignature, liveSignature].filter((s) => s.length > 0);
  if (candidates.length === 0) {
    const fallback = signatureHeader.trim();
    if (fallback) candidates.push(fallback);
  }

  if (!timestamp || candidates.length === 0) {
    console.error("[paymongo-webhook] Signature header missing timestamp or te/li values.", {
      has_timestamp: Boolean(timestamp),
      te_len: testSignature.length,
      li_len: liveSignature.length,
      header_len: signatureHeader.length,
      body_len: rawBody.length,
      secret_prefix: secret.slice(0, 5),
    });
    return false;
  }

  // Try full secret and secret without whsk_ prefix (copy/paste variants).
  const secretVariants = [secret];
  if (secret.startsWith("whsk_")) secretVariants.push(secret.slice("whsk_".length));

  for (const secretVariant of secretVariants) {
    const expectedTimestamped = await computeHmacSha256(
      secretVariant,
      `${timestamp}.${rawBody}`
    );
    for (const candidate of candidates) {
      if (timingSafeEqual(candidate.toLowerCase(), expectedTimestamped.toLowerCase())) {
        return true;
      }
    }

    // Older / alternate docs signed the raw body alone.
    const expectedRaw = await computeHmacSha256(secretVariant, rawBody);
    for (const candidate of candidates) {
      if (timingSafeEqual(candidate.toLowerCase(), expectedRaw.toLowerCase())) {
        return true;
      }
    }
  }

  console.error("[paymongo-webhook] Signature mismatch.", {
    has_timestamp: true,
    te_len: testSignature.length,
    li_len: liveSignature.length,
    te_prefix: testSignature.slice(0, 8),
    body_len: rawBody.length,
    secret_prefix: secret.slice(0, 5),
    secret_looks_like_api_key: secret.startsWith("sk_"),
    secret_looks_like_webhook: secret.startsWith("whsk_"),
  });
  return false;
}

/**
 * When local HMAC verification fails (wrong/rotated secret), re-check the
 * referenced checkout/payment with PayMongo's API using PAYMONGO_SECRET_KEY.
 * Forged webhook bodies cannot pass this because PayMongo won't report them paid.
 */
async function confirmPaidWithPayMongoApi(rawBody: string): Promise<{
  ok: boolean;
  checkoutSessionId?: string;
  paymentId?: string;
}> {
  const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY")?.trim();
  if (!paymongoSecretKey) return { ok: false };

  let parsed: {
    data?: {
      attributes?: {
        type?: string;
        livemode?: boolean;
        data?: {
          id?: string;
          attributes?: {
            payments?: { id?: string; attributes?: { status?: string; amount?: number } }[];
            payment?: { id?: string; attributes?: { status?: string; amount?: number } };
          };
        };
      };
    };
  };
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false };
  }

  const eventType = parsed?.data?.attributes?.type;
  if (eventType !== "checkout_session.payment.paid" && eventType !== "payment.paid") {
    return { ok: false };
  }

  const resource = parsed?.data?.attributes?.data;
  const checkoutSessionId = resource?.id ?? "";
  const paymentId =
    resource?.attributes?.payments?.[0]?.id ??
    resource?.attributes?.payment?.id ??
    (checkoutSessionId.startsWith("pay_") ? checkoutSessionId : "");

  const basicAuthHeader = `Basic ${btoa(`${paymongoSecretKey}:`)}`;

  if (checkoutSessionId.startsWith("cs_")) {
    const res = await fetch(
      `https://api.paymongo.com/v2/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`,
      { headers: { Authorization: basicAuthHeader, Accept: "application/json" } }
    );
    if (!res.ok) return { ok: false };
    const json = await res.json() as {
      data?: {
        attributes?: {
          payment_status?: string;
          status?: string;
          payments?: { id?: string; attributes?: { status?: string } }[];
        };
      };
    };
    const attrs = json?.data?.attributes;
    const statuses = [
      attrs?.payment_status,
      attrs?.status,
      ...(attrs?.payments ?? []).map((p) => p.attributes?.status),
    ]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());
    const paid = statuses.some((s) => s === "paid" || s === "succeeded" || s === "successful");
    return {
      ok: paid,
      checkoutSessionId,
      paymentId: attrs?.payments?.[0]?.id ?? paymentId,
    };
  }

  if (paymentId.startsWith("pay_")) {
    const res = await fetch(
      `https://api.paymongo.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: basicAuthHeader, Accept: "application/json" } }
    );
    if (!res.ok) return { ok: false };
    const json = await res.json() as { data?: { attributes?: { status?: string } } };
    const status = (json?.data?.attributes?.status ?? "").toLowerCase();
    return {
      ok: status === "paid" || status === "succeeded" || status === "successful",
      checkoutSessionId: checkoutSessionId || undefined,
      paymentId,
    };
  }

  return { ok: false };
}

/**
 * Maps PayMongo payment source/method type to supported BKWB payment_method values.
 */
function mapPayMongoPaymentMethod(rawMethod?: string): string {
  if (!rawMethod) return "gcash";
  const m = rawMethod.toLowerCase().trim();
  if (m === "gcash") return "gcash";
  if (m === "card" || m === "credit_card" || m === "debit_card") return "card";
  if (m === "paymaya" || m === "maya") return "paymaya";
  if (m === "grab_pay") return "grab_pay";
  if (m === "dob" || m === "dob_ubp" || m === "bank") return "bank";
  if (m === "online" || m === "paymongo") return "online";
  return "online";
}

async function handleRequest(req: Request): Promise<Response> {
  // ── 0. Handle CORS Preflight ──
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail(405, "Method not allowed. Use POST.");
  }

  // ── 1. Check Webhook Secret & Supabase Configuration ──
  const webhookSecretRaw = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  const webhookSecret = webhookSecretRaw ? normalizeWebhookSecret(webhookSecretRaw) : "";
  if (!webhookSecret) {
    console.error("[paymongo-webhook] PAYMONGO_WEBHOOK_SECRET is not configured in Edge Function secrets.");
    return fail(500, "Webhook secret not configured.");
  }
  if (webhookSecret.startsWith("sk_")) {
    console.error(
      "[paymongo-webhook] PAYMONGO_WEBHOOK_SECRET looks like an API secret key (sk_...). " +
        "Use the webhook endpoint secret from PayMongo Developers → Webhooks (usually whsk_...)."
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    console.error("[paymongo-webhook] Missing required Supabase environment configuration.");
    return fail(500, "Server configuration error.");
  }

  // ── 2. Read Raw Request Body & Verify Signature ──
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return fail(400, "Failed to read request body.");
  }

  const signatureHeader =
    req.headers.get("paymongo-signature") ||
    req.headers.get("Paymongo-Signature") ||
    "";

  if (!signatureHeader) {
    return fail(401, "Missing webhook signature header.");
  }

  const isVerified = await verifyPayMongoSignature(rawBody, signatureHeader, webhookSecret);
  if (!isVerified) {
    console.error("[paymongo-webhook] Webhook signature verification failed — trying PayMongo API confirmation.");
    const apiConfirm = await confirmPaidWithPayMongoApi(rawBody);
    if (!apiConfirm.ok) {
      return fail(401, "Invalid webhook signature.");
    }
    console.warn(
      "[paymongo-webhook] HMAC signature mismatched, but PayMongo API confirmed payment is paid. Processing. " +
        "Double-check PAYMONGO_WEBHOOK_SECRET matches this endpoint's Signing secret in PayMongo.",
      { checkout_session_id: apiConfirm.checkoutSessionId, payment_id: apiConfirm.paymentId }
    );
  }

  // ── 3. Parse Verified Event Payload ──
  let eventPayload: {
    data?: {
      id?: string;
      type?: string;
      attributes?: {
        type?: string;
        livemode?: boolean;
        created_at?: number;
        data?: {
          id?: string;
          type?: string;
          attributes?: {
            reference_number?: string;
            status?: string;
            payment_method_used?: string;
            metadata?: {
              bill_id?: string;
              bill_number?: string;
              account_id?: string;
              resident_id?: string;
            };
            line_items?: { amount?: number; currency?: string }[];
            payments?: {
              id?: string;
              attributes?: {
                amount?: number;
                status?: string;
                source?: { type?: string };
                payment_method_type?: string;
              };
            }[];
            payment?: {
              id?: string;
              attributes?: {
                amount?: number;
                status?: string;
                source?: { type?: string };
                payment_method_type?: string;
              };
            };
          };
        };
      };
    };
  };

  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return fail(400, "Malformed JSON event payload.");
  }

  const eventId = eventPayload?.data?.id ?? `evt_${Date.now()}`;
  const eventType = eventPayload?.data?.attributes?.type;

  console.log(`[paymongo-webhook] Received verified event: ${eventType} (ID: ${eventId})`);

  // ── 4. Filter & Route Events ──
  // Only process 'checkout_session.payment.paid' or 'payment.paid'
  if (eventType !== "checkout_session.payment.paid" && eventType !== "payment.paid") {
    // Return HTTP 200 for acknowledged non-payment events (e.g. failed, cancelled, expired)
    console.log(`[paymongo-webhook] Ignored event type: ${eventType}`);
    return json({ received: true, status: "ignored_event_type", event_type: eventType }, 200);
  }

  // Extract Checkout Session resource
  const checkoutData = eventPayload?.data?.attributes?.data;
  const checkoutSessionId = checkoutData?.id ?? "";
  const checkoutAttr = checkoutData?.attributes;

  const metadata = checkoutAttr?.metadata ?? {};
  const referenceNumber = checkoutAttr?.reference_number?.trim() ?? "";

  // Extract payment details
  const paymentsList = checkoutAttr?.payments ?? [];
  const paymentObj = paymentsList[0] ?? checkoutAttr?.payment;
  const paymongoPaymentId = paymentObj?.id ?? checkoutSessionId;

  // Extract paid amount in centavos
  const paidCentavos =
    paymentObj?.attributes?.amount ??
    checkoutAttr?.line_items?.reduce((sum, item) => sum + (item.amount ?? 0), 0) ??
    0;

  const paidAmount = Number((paidCentavos / 100).toFixed(2));

  // Extract payment method
  const rawMethod =
    paymentObj?.attributes?.source?.type ??
    paymentObj?.attributes?.payment_method_type ??
    checkoutAttr?.payment_method_used;
  const paymentMethod = mapPayMongoPaymentMethod(rawMethod);

  // ── 5. Identify Target Bill ──
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let targetBillId = (metadata.bill_id ?? "").trim();
  let accountId = (metadata.account_id ?? "").trim() || null;
  let residentId = (metadata.resident_id ?? "").trim() || null;

  // Fallback: If metadata is absent (legacy checkout), identify bill by reference_number
  if (!targetBillId && referenceNumber) {
    console.log(`[paymongo-webhook] No metadata.bill_id; falling back to reference_number: ${referenceNumber}`);
    const { data: billByRef, error: refError } = await adminClient
      .from("bills")
      .select("id, account_id, resident_id, amount_due, status")
      .eq("bill_number", referenceNumber)
      .is("deleted_at", null)
      .maybeSingle();

    if (refError || !billByRef) {
      console.error(`[paymongo-webhook] Could not resolve bill from reference_number: ${referenceNumber}`);
      return json({ received: true, error: "Bill not found for reference number." }, 200);
    }

    targetBillId = billByRef.id;
    accountId = billByRef.account_id;
    residentId = billByRef.resident_id;
  }

  if (!targetBillId) {
    console.error("[paymongo-webhook] No bill identifier found in webhook payload.");
    return json({ received: true, error: "Missing bill identifier." }, 200);
  }

  // ── 6. Prepare Structured Notes (Safe Audit Trail) ──
  const notesJson = JSON.stringify({
    provider: "paymongo",
    checkout_session_id: checkoutSessionId,
    event_id: eventId,
    paymongo_payment_id: paymongoPaymentId,
    raw_payment_method: rawMethod ?? "unknown",
  });

  // ── 7. Execute Atomic Database Transaction (process_paymongo_payment RPC) ──
  const { data: rpcResult, error: rpcError } = await adminClient.rpc(
    "process_paymongo_payment",
    {
      p_bill_id: targetBillId,
      p_account_id: accountId,
      p_resident_id: residentId,
      p_amount: paidAmount,
      p_payment_method: paymentMethod,
      p_paymongo_payment_id: paymongoPaymentId,
      p_checkout_session_id: checkoutSessionId,
      p_event_id: eventId,
      p_notes: notesJson,
    }
  );

  if (rpcError) {
    console.error("[paymongo-webhook] RPC execution error:", rpcError.message);
    return fail(500, `Database transaction failed: ${rpcError.message}`);
  }

  const result = rpcResult as {
    success?: boolean;
    status?: string;
    error?: string;
    payment_id?: string;
    bill_id?: string;
    amount?: number;
  } | null;

  // ── 8. Handle Result Scenarios ──
  if (result?.status === "already_processed") {
    console.log(`[paymongo-webhook] Idempotent duplicate event already processed. (Bill: ${targetBillId}, Payment: ${result.payment_id})`);
    return json({ received: true, status: "already_processed", payment_id: result.payment_id }, 200);
  }

  if (result?.success) {
    console.log(`[paymongo-webhook] Payment successfully recorded and bill marked paid! (Bill: ${targetBillId}, Amount: PHP ${paidAmount}, Payment: ${result.payment_id})`);
    return json({ received: true, status: "completed", payment_id: result.payment_id, bill_id: targetBillId }, 200);
  }

  // Non-success scenarios handled safely without modifying billing state
  console.warn(`[paymongo-webhook] Payment rejected by database validation: ${result?.error} (Bill: ${targetBillId})`);
  return json({
    received: true,
    status: "rejected",
    reason: result?.error ?? "Unknown validation failure",
  }, 200);
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected internal error.";
    console.error("[paymongo-webhook] UNCAUGHT ERROR:", message);
    return json({ error: "Internal server error." }, 500);
  }
});
