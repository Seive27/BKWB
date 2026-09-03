/// <reference path="../deno.d.ts" />
// ============================================================
// create-paymongo-checkout — BKWB Edge Function (Stage 1: Hosted Checkout)
// ------------------------------------------------------------
// Creates a secure PayMongo Hosted Checkout Session for an existing
// BKWB water bill.
//
// Security & Business Rules:
//   1. Requires an authenticated Supabase user (Bearer JWT).
//   2. Retrieves the bill amount and metadata directly from the Supabase DB.
//      NEVER trusts any amount supplied by the mobile app/client.
//   3. Validates that the requested bill belongs to the authenticated resident
//      (or an authorized staff/super_admin).
//   4. Rejects already-paid or voided bills (Duplicate Payment Protection).
//   5. Converts the exact DB amount to centavos (e.g. PHP 520.00 -> 52000).
//   6. Reads PAYMONGO_SECRET_KEY from Edge Function environment secrets.
//      NEVER hardcodes or exposes the secret key to frontend/client.
//   7. Creating a Checkout Session is NOT proof of payment. The bill remains
//      unpaid until a later webhook confirmation stage.
//
// PayMongo API Endpoint:
//   POST https://api.paymongo.com/v2/checkout_sessions
//   Basic Auth: secret_key: (no password)
//
// Deploy:
//   supabase secrets set PAYMONGO_SECRET_KEY=sk_test_...
//   supabase functions deploy create-paymongo-checkout
//
// Invoke from mobile/web app:
//   supabase.functions.invoke("create-paymongo-checkout", {
//     body: {
//       bill_id: "<bill-uuid>",
//       success_url: "https://...", // optional
//       cancel_url: "https://..."  // optional
//     }
//   })
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
  console.error(`[create-paymongo-checkout] FAIL (${status}): ${message}`);
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

function getPublishableKey(): string | undefined {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
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
  return Deno.env.get("SUPABASE_ANON_KEY") ?? undefined;
}

interface CreateCheckoutPayload {
  /** Supabase bill UUID to pay. */
  bill_id?: string;
  /** Optional custom redirect URL after successful payment. */
  success_url?: string;
  /** Optional custom redirect URL if the resident cancels checkout. */
  cancel_url?: string;
}

async function handleRequest(req: Request): Promise<Response> {
  // ── 0. Handle CORS Preflight ──
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail(405, "Method not allowed. Use POST.");
  }

  // ── 1. Check Environment & Secrets ──
  const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
  if (!paymongoSecretKey || !paymongoSecretKey.trim()) {
    console.error("[create-paymongo-checkout] PAYMONGO_SECRET_KEY is not set in Edge Function secrets.");
    return fail(500, "Payment gateway configuration error. Please contact the barangay billing office.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSecretKey();
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !secretKey || !publishableKey) {
    return fail(500, "Edge function is missing required Supabase environment configuration.");
  }

  // ── 2. Authenticate the Caller ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return fail(401, "Unauthorized: missing Authorization header.");
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return fail(401, "Unauthorized: missing bearer token.");
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser(token);

  if (callerError || !caller) {
    console.error("[create-paymongo-checkout] caller authentication failed", callerError?.message);
    return fail(401, "Unauthorized: invalid or expired session token.");
  }

  // ── 3. Parse & Validate Payload ──
  let body: CreateCheckoutPayload;
  try {
    body = (await req.json()) as CreateCheckoutPayload;
  } catch {
    return fail(400, "Invalid JSON body.");
  }

  const billId = (body.bill_id ?? "").trim();
  if (!billId) {
    return fail(400, "bill_id is required.");
  }

  // ── 4. Retrieve Bill from Supabase Database ──
  // Always query database directly to get the real, tamper-proof amount.
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: bill, error: billError } = await adminClient
    .from("bills")
    .select(`
      id,
      bill_number,
      account_id,
      resident_id,
      billing_period,
      amount_due,
      status,
      due_date,
      account:resident_accounts!bills_account_id_fkey(id, account_number, service_address, sitio),
      resident:profiles!bills_resident_id_fkey(id, first_name, middle_name, last_name, email, phone)
    `)
    .eq("id", billId)
    .is("deleted_at", null)
    .maybeSingle();

  if (billError) {
    console.error("[create-paymongo-checkout] database error querying bill", billError.message);
    return fail(500, "Failed to retrieve bill record.");
  }

  if (!bill) {
    return fail(404, "Bill not found.");
  }

  // ── 5. Verify Bill Ownership & Permissions ──
  // Check caller role to allow residents (owner) or staff/admin.
  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from("profiles")
    .select("id, role:roles(name)")
    .eq("id", caller.id)
    .maybeSingle();

  if (callerProfileError) {
    return fail(500, "Could not verify user permissions.");
  }

  const callerRole = (callerProfile as { role?: { name?: string } } | null)?.role?.name;
  const isOwner = bill.resident_id === caller.id;
  const isStaffOrAdmin = callerRole === "staff" || callerRole === "super_admin";

  if (!isOwner && !isStaffOrAdmin) {
    return fail(403, "Forbidden: you do not have permission to pay this bill.");
  }

  // ── 6. Duplicate Payment & Status Protection ──
  if (bill.status === "paid") {
    return fail(400, "This bill has already been marked as paid.");
  }
  if (bill.status === "void") {
    return fail(400, "This bill is voided and cannot be processed for payment.");
  }

  // ── 7. Validate Amount & Convert to Centavos ──
  const amountNumber = Number(bill.amount_due);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return fail(400, "Invalid bill amount. Amount must be greater than zero.");
  }

  // PayMongo amounts are represented in integer centavos (e.g. PHP 520.00 = 52000).
  const amountInCentavos = Math.round(amountNumber * 100);
  if (amountInCentavos < 100) {
    return fail(400, "Bill amount is below minimum processing threshold.");
  }

  // ── 8. Prepare Customer & Line Item Metadata ──
  const resident = bill.resident as {
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
  } | null;

  const account = bill.account as {
    account_number?: string;
    service_address?: string | null;
    sitio?: string | null;
  } | null;

  const fullName = [resident?.first_name, resident?.last_name].filter(Boolean).join(" ").trim() || "Resident";
  const email = resident?.email && !resident.email.endsWith("@example.com") ? resident.email.trim() : undefined;
  const phone = resident?.phone?.trim() || undefined;
  const address = account?.service_address?.trim() || undefined;

  const billingInfo: Record<string, unknown> = {
    name: fullName,
  };
  if (email) billingInfo.email = email;
  if (phone) billingInfo.phone = phone;
  if (address) {
    billingInfo.address = {
      line1: address,
      city: "Cebu City",
      state: "Cebu",
      country: "PH",
    };
  }

  const referenceNumber = bill.bill_number || bill.id;
  const lineItemName = `Water Bill - ${referenceNumber}`;
  const lineItemDescription = bill.billing_period ? `Period: ${bill.billing_period}` : "Barangay Kalunasan Water Bill";

  // Fallback URLs if not explicitly provided by client
  const successUrl = (body.success_url ?? "").trim() || "https://bkwb.kalunasan.ph/payment-success";
  const cancelUrl = (body.cancel_url ?? "").trim() || "https://bkwb.kalunasan.ph/payment-cancelled";

  // ── 9. Create PayMongo Hosted Checkout Session ──
  const paymongoPayload = {
    data: {
      attributes: {
        billing: billingInfo,
        send_email_receipt: false,
        show_description: true,
        show_line_items: true,
        description: `Barangay Kalunasan Water Bill - ${referenceNumber}`,
        reference_number: referenceNumber,
        line_items: [
          {
            name: lineItemName,
            amount: amountInCentavos,
            currency: "PHP",
            quantity: 1,
            description: lineItemDescription,
          },
        ],
        payment_method_types: [
          "gcash",
          "paymaya",
          "card",
          "grab_pay",
          "dob",
          "dob_ubp",
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
    },
  };

  console.log("[create-paymongo-checkout] creating checkout session for bill", {
    bill_id: bill.id,
    bill_number: referenceNumber,
    amount: amountNumber,
    amount_in_centavos: amountInCentavos,
  });

  // Basic authentication using PayMongo secret key
  const basicAuthHeader = `Basic ${btoa(`${paymongoSecretKey.trim()}:`)}`;

  const paymongoResponse = await fetch("https://api.paymongo.com/v2/checkout_sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": basicAuthHeader,
    },
    body: JSON.stringify(paymongoPayload),
  });

  if (!paymongoResponse.ok) {
    let errorDetail = "Payment gateway rejected the request.";
    try {
      const errorJson = (await paymongoResponse.json()) as {
        errors?: { detail?: string; code?: string }[];
      };
      if (Array.isArray(errorJson?.errors) && errorJson.errors.length > 0) {
        errorDetail = errorJson.errors.map((e) => e.detail || e.code).filter(Boolean).join("; ") || errorDetail;
      }
    } catch {
      // Non-JSON response
    }

    console.error("[create-paymongo-checkout] PayMongo API error", {
      status: paymongoResponse.status,
      detail: errorDetail,
    });

    return fail(502, `Payment provider error: ${errorDetail}`);
  }

  let paymongoResult: {
    data?: {
      id?: string;
      attributes?: {
        checkout_url?: string;
        status?: string;
      };
    };
  };

  try {
    paymongoResult = (await paymongoResponse.json()) as typeof paymongoResult;
  } catch {
    console.error("[create-paymongo-checkout] Failed to parse PayMongo JSON response");
    return fail(502, "Malformed response from payment provider.");
  }

  const checkoutSessionId = paymongoResult?.data?.id;
  const checkoutUrl = paymongoResult?.data?.attributes?.checkout_url;

  if (!checkoutSessionId || !checkoutUrl) {
    console.error("[create-paymongo-checkout] Missing checkout_url or session ID in PayMongo response", paymongoResult);
    return fail(502, "Incomplete response from payment provider.");
  }

  console.log("[create-paymongo-checkout] checkout session successfully created", {
    bill_id: bill.id,
    session_id: checkoutSessionId,
  });

  // ── 10. Return Safe Client Payload ──
  // NOTE: Creating a checkout session is NOT proof of payment.
  // The bill remains unpaid until a verified webhook arrives in Stage 2.
  return json({
    success: true,
    checkout_url: checkoutUrl,
    checkout_session_id: checkoutSessionId,
    reference_number: referenceNumber,
    amount: amountNumber,
    currency: "PHP",
  });
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected internal error.";
    console.error("[create-paymongo-checkout] UNCAUGHT ERROR:", err);
    return json({ error: "Internal server error." }, 500);
  }
});
