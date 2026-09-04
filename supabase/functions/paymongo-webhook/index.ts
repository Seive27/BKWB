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

/**
 * Verifies the PayMongo webhook signature header against the raw request body.
 *
 * PayMongo Signature format in header `paymongo-signature`:
 *   e.g. "t=1612345678,te=abcdef...,li=123456..." or direct hex signature.
 *
 * Supports both test mode (te) and live mode (li), with or without timestamp prefixing.
 */
async function verifyPayMongoSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  if (!signatureHeader || !webhookSecret) {
    return false;
  }

  // Parse header parts
  let timestamp: string | undefined;
  const candidateSignatures: string[] = [];

  const parts = signatureHeader.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith("t=")) {
      timestamp = trimmed.slice(2);
    } else if (trimmed.startsWith("te=")) {
      candidateSignatures.push(trimmed.slice(3));
    } else if (trimmed.startsWith("li=")) {
      candidateSignatures.push(trimmed.slice(3));
    } else if (trimmed) {
      candidateSignatures.push(trimmed);
    }
  }

  if (candidateSignatures.length === 0) {
    candidateSignatures.push(signatureHeader.trim());
  }

  // Calculate expected hashes:
  // 1. Raw body hash
  const expectedRaw = await computeHmacSha256(webhookSecret, rawBody);

  // 2. Timestamped body hash if timestamp is present: `${timestamp}.${rawBody}`
  let expectedTimestamped: string | undefined;
  if (timestamp) {
    expectedTimestamped = await computeHmacSha256(webhookSecret, `${timestamp}.${rawBody}`);
  }

  // Compare each candidate against calculated expected hashes
  for (const candidate of candidateSignatures) {
    if (candidate && timingSafeEqual(candidate.toLowerCase(), expectedRaw.toLowerCase())) {
      return true;
    }
    if (
      timestamp &&
      expectedTimestamped &&
      candidate &&
      timingSafeEqual(candidate.toLowerCase(), expectedTimestamped.toLowerCase())
    ) {
      return true;
    }
  }

  return false;
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
  const webhookSecret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  if (!webhookSecret || !webhookSecret.trim()) {
    console.error("[paymongo-webhook] PAYMONGO_WEBHOOK_SECRET is not configured in Edge Function secrets.");
    return fail(500, "Webhook secret not configured.");
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
    console.error("[paymongo-webhook] Webhook signature verification failed.");
    return fail(401, "Invalid webhook signature.");
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
