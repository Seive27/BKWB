/// <reference path="../deno.d.ts" />
// ============================================================
// verify-paymongo-payment — BKWB Edge Function
// ------------------------------------------------------------
// Backup confirmation path when the PayMongo webhook is delayed,
// misconfigured, or not delivered. The resident app calls this
// after returning from hosted checkout.
//
// Resolution order:
//   1. checkout_session_id from request body
//   2. bills.paymongo_checkout_session_id
//   3. PayMongo payments list matched by bill_id / bill_number
//
// Business failures return HTTP 200 with { success:false } so the
// mobile client can show a clear message (supabase-js treats non-2xx
// as a generic "Edge Function returned a non-2xx status code").
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Always HTTP 200 for client-readable failures (except OPTIONS). */
function fail(message: string, extra: Record<string, unknown> = {}): Response {
  console.error(`[verify-paymongo-payment] FAIL: ${message}`, extra);
  return json({ success: false, error: message, ...extra }, 200);
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
      // Fall through
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
      // Fall through
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? undefined;
}

function mapPayMongoPaymentMethod(rawMethod?: string): string {
  if (!rawMethod) return "online";
  const m = rawMethod.toLowerCase().trim();
  if (m === "gcash") return "gcash";
  if (m === "card" || m === "credit_card" || m === "debit_card") return "card";
  if (m === "paymaya" || m === "maya") return "paymaya";
  if (m === "grab_pay") return "grab_pay";
  if (m === "dob" || m === "dob_ubp" || m === "bank") return "bank";
  return "online";
}

const PAID_STATUSES = new Set([
  "paid",
  "succeeded",
  "successful",
  "complete",
  "completed",
]);

interface VerifyPayload {
  bill_id?: string;
  checkout_session_id?: string;
}

type PayMongoPayment = {
  id?: string;
  attributes?: {
    amount?: number;
    status?: string;
    description?: string;
    external_reference_number?: string;
    source?: { type?: string };
    payment_method_used?: string;
    payment_method_type?: string;
    metadata?: Record<string, string>;
  };
};

type CheckoutAttrs = {
  status?: string;
  payment_status?: string;
  reference_number?: string;
  metadata?: Record<string, string>;
  payments?: PayMongoPayment[];
  line_items?: Array<{ amount?: number }>;
};

async function fetchCheckoutSession(
  checkoutSessionId: string,
  basicAuthHeader: string
): Promise<{ ok: true; attrs: CheckoutAttrs; id: string } | { ok: false; status: number; body: string }> {
  // PayMongo has used both /v2 and /v1 for checkout sessions — try both.
  const urls = [
    `https://api.paymongo.com/v2/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`,
    `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`,
  ];

  let lastStatus = 0;
  let lastBody = "";
  for (const url of urls) {
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: basicAuthHeader, Accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    lastStatus = res.status;
    lastBody = text;
    if (!res.ok) continue;
    try {
      const parsed = JSON.parse(text) as {
        data?: { id?: string; attributes?: CheckoutAttrs };
      };
      if (parsed?.data?.attributes) {
        return {
          ok: true,
          id: parsed.data.id ?? checkoutSessionId,
          attrs: parsed.data.attributes,
        };
      }
    } catch {
      // try next
    }
  }
  return { ok: false, status: lastStatus, body: lastBody };
}

async function findPaidPaymentForBill(
  basicAuthHeader: string,
  billId: string,
  billNumber: string,
  amountDue: number
): Promise<PayMongoPayment | null> {
  const res = await fetch("https://api.paymongo.com/v1/payments?limit=50", {
    headers: { Authorization: basicAuthHeader, Accept: "application/json" },
  });
  if (!res.ok) {
    console.warn("[verify-paymongo-payment] payments list failed", {
      status: res.status,
    });
    return null;
  }

  const parsed = (await res.json()) as { data?: PayMongoPayment[] };
  const rows = Array.isArray(parsed?.data) ? parsed.data : [];
  const amountCentavos = Math.round(Number(amountDue) * 100);
  const billNumberUpper = (billNumber || "").toUpperCase();

  for (const payment of rows) {
    const st = (payment.attributes?.status ?? "").toLowerCase();
    if (!PAID_STATUSES.has(st)) continue;

    const metaBill = (payment.attributes?.metadata?.bill_id ?? "").trim();
    const desc = `${payment.attributes?.description ?? ""} ${
      payment.attributes?.external_reference_number ?? ""
    }`.toUpperCase();
    const matchesBill =
      metaBill === billId ||
      (billNumberUpper.length > 0 && desc.includes(billNumberUpper));
    if (!matchesBill) continue;

    const amt = payment.attributes?.amount ?? 0;
    if (amountCentavos > 0 && Math.abs(amt - amountCentavos) > 1) continue;

    return payment;
  }
  return null;
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail("Method not allowed. Use POST.");
  }

  const paymongoSecretKey = Deno.env.get("PAYMONGO_SECRET_KEY");
  if (!paymongoSecretKey?.trim()) {
    return fail("Payment gateway configuration error. PAYMONGO_SECRET_KEY is missing.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = getSecretKey();
  const publishableKey = getPublishableKey();
  if (!supabaseUrl || !secretKey || !publishableKey) {
    return fail("Server configuration error.");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("Unauthorized: missing Authorization header.");
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return fail("Unauthorized: missing bearer token.");

  const callerClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser(token);

  if (callerError || !caller) {
    return fail("Your login session expired. Sign out, sign back in, then tap Check Payment Status.");
  }

  let body: VerifyPayload;
  try {
    body = (await req.json()) as VerifyPayload;
  } catch {
    return fail("Invalid JSON body.");
  }

  const billId = (body.bill_id ?? "").trim();
  if (!billId) return fail("bill_id is required.");

  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: bill, error: billError } = await adminClient
    .from("bills")
    .select(
      "id, bill_number, account_id, resident_id, amount_due, status, paymongo_checkout_session_id"
    )
    .eq("id", billId)
    .is("deleted_at", null)
    .maybeSingle();

  if (billError) return fail("Failed to retrieve bill record.");
  if (!bill) return fail("Bill not found.");

  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("id, role:roles(name)")
    .eq("id", caller.id)
    .maybeSingle();

  const callerRole = (callerProfile as { role?: { name?: string } } | null)?.role?.name;
  const isOwner = bill.resident_id === caller.id;
  const isStaffOrAdmin = callerRole === "staff" || callerRole === "super_admin";
  if (!isOwner && !isStaffOrAdmin) {
    return fail("Forbidden: you do not have permission to verify this bill.");
  }

  if (bill.status === "paid") {
    return json({
      success: true,
      status: "already_paid",
      bill_id: bill.id,
      message: "Bill is already marked paid.",
    });
  }

  const checkoutSessionId = (
    (body.checkout_session_id ?? "").trim() ||
    (bill.paymongo_checkout_session_id ?? "").trim()
  );

  const basicAuthHeader = `Basic ${btoa(`${paymongoSecretKey.trim()}:`)}`;

  let paidPayment: PayMongoPayment | undefined;
  let paidAmount = 0;
  let paymentMethod = "online";
  let paymongoPaymentId = checkoutSessionId || bill.id;
  let usedFallback = false;
  let resolvedCheckoutSessionId = checkoutSessionId;

  if (checkoutSessionId) {
    const checkout = await fetchCheckoutSession(checkoutSessionId, basicAuthHeader);

    if (checkout.ok) {
      const attrs = checkout.attrs;
      const metadata = attrs.metadata ?? {};
      const metaBillId = (metadata.bill_id ?? "").trim();
      if (metaBillId && metaBillId !== billId) {
        return fail("Checkout session does not match this bill.");
      }

      let paymentsList: PayMongoPayment[] = Array.isArray(attrs.payments) ? attrs.payments : [];

      if (
        paymentsList.length > 0 &&
        !paymentsList[0]?.attributes?.status &&
        typeof paymentsList[0]?.id === "string" &&
        paymentsList[0].id.startsWith("pay_")
      ) {
        const payId = paymentsList[0].id!;
        const payRes = await fetch(
          `https://api.paymongo.com/v1/payments/${encodeURIComponent(payId)}`,
          { headers: { Authorization: basicAuthHeader, Accept: "application/json" } }
        );
        if (payRes.ok) {
          const payJson = (await payRes.json()) as { data?: PayMongoPayment };
          if (payJson.data) paymentsList = [payJson.data];
        }
      }

      paidPayment =
        paymentsList.find((p) =>
          PAID_STATUSES.has((p.attributes?.status ?? "").toLowerCase())
        ) ?? (paymentsList.length > 0 ? paymentsList[0] : undefined);

      const statusCandidates = [
        paidPayment?.attributes?.status,
        attrs.payment_status,
        attrs.status,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      const isPaid = statusCandidates.some((s) => PAID_STATUSES.has(s));
      if (!isPaid) {
        const fallback = await findPaidPaymentForBill(
          basicAuthHeader,
          bill.id,
          bill.bill_number ?? "",
          Number(bill.amount_due)
        );
        if (!fallback) {
          return json({
            success: false,
            status: "not_paid_yet",
            message:
              "PayMongo has not confirmed this payment yet. If you already paid, wait a few seconds and try again.",
            statuses: statusCandidates,
          }, 200);
        }
        paidPayment = fallback;
        usedFallback = true;
      }

      const effectivePayment: PayMongoPayment = paidPayment ?? {
        id: checkoutSessionId,
        attributes: {
          amount: attrs.line_items?.reduce((sum, item) => sum + (item.amount ?? 0), 0) ?? 0,
          status: "paid",
        },
      };

      const paidCentavos =
        effectivePayment.attributes?.amount ??
        attrs.line_items?.reduce((sum, item) => sum + (item.amount ?? 0), 0) ??
        0;
      paidAmount = Number((paidCentavos / 100).toFixed(2));
      const attrsForMethod = effectivePayment.attributes;
      const rawMethod =
        attrsForMethod?.source?.type ??
        attrsForMethod?.payment_method_used ??
        attrsForMethod?.payment_method_type;
      paymentMethod = mapPayMongoPaymentMethod(rawMethod);
      paymongoPaymentId = effectivePayment.id ?? checkoutSessionId;
      resolvedCheckoutSessionId = checkout.id;
    } else {
      console.warn("[verify-paymongo-payment] checkout retrieve failed; trying payments list", {
        checkout_session_id: checkoutSessionId,
        status: checkout.status,
        body: checkout.body.slice(0, 300),
      });

      const fallback = await findPaidPaymentForBill(
        basicAuthHeader,
        bill.id,
        bill.bill_number ?? "",
        Number(bill.amount_due)
      );
      if (!fallback) {
        return fail(
          checkout.status === 404
            ? "Checkout session not found in PayMongo, and no matching paid payment was found for this bill. If you were charged, wait a moment and tap Check Payment Status again, or contact barangay billing with your PayMongo payment id (pay_…)."
            : `Could not verify with PayMongo (HTTP ${checkout.status}). Confirm PAYMONGO_SECRET_KEY is the TEST sk_test_… key.`,
          { status: "paymongo_retrieve_failed", http_status: checkout.status }
        );
      }

      usedFallback = true;
      paidPayment = fallback;
      const paidCentavos = fallback.attributes?.amount ?? 0;
      paidAmount = Number((paidCentavos / 100).toFixed(2));
      const rawMethod =
        fallback.attributes?.source?.type ??
        fallback.attributes?.payment_method_used ??
        fallback.attributes?.payment_method_type;
      paymentMethod = mapPayMongoPaymentMethod(rawMethod);
      paymongoPaymentId = fallback.id ?? checkoutSessionId;
    }
  } else {
    // No session on phone or bill — still try to match a paid PayMongo payment.
    const fallback = await findPaidPaymentForBill(
      basicAuthHeader,
      bill.id,
      bill.bill_number ?? "",
      Number(bill.amount_due)
    );
    if (!fallback) {
      return fail(
        "No checkout session found. Tap Pay Online again, complete payment, then return here."
      );
    }
    usedFallback = true;
    paidPayment = fallback;
    const paidCentavos = fallback.attributes?.amount ?? 0;
    paidAmount = Number((paidCentavos / 100).toFixed(2));
    const rawMethod =
      fallback.attributes?.source?.type ??
      fallback.attributes?.payment_method_used ??
      fallback.attributes?.payment_method_type;
    paymentMethod = mapPayMongoPaymentMethod(rawMethod);
    paymongoPaymentId = fallback.id ?? bill.id;
  }

  if (!(paidAmount > 0)) {
    return fail("PayMongo reported paid, but amount was missing. Contact barangay billing.");
  }

  const notesJson = JSON.stringify({
    provider: "paymongo",
    checkout_session_id: resolvedCheckoutSessionId || null,
    paymongo_payment_id: paymongoPaymentId,
    raw_payment_method: paymentMethod,
    source: "verify-paymongo-payment",
    used_payment_list_fallback: usedFallback,
  });

  const { data: rpcResult, error: rpcError } = await adminClient.rpc(
    "process_paymongo_payment",
    {
      p_bill_id: bill.id,
      p_account_id: bill.account_id,
      p_resident_id: bill.resident_id,
      p_amount: paidAmount,
      p_payment_method: paymentMethod,
      p_paymongo_payment_id: paymongoPaymentId,
      p_checkout_session_id: resolvedCheckoutSessionId || paymongoPaymentId,
      p_event_id: `verify_${resolvedCheckoutSessionId || paymongoPaymentId}`,
      p_notes: notesJson,
    }
  );

  if (rpcError) {
    console.error("[verify-paymongo-payment] RPC error:", rpcError.message);
    return fail(`Database transaction failed: ${rpcError.message}`);
  }

  const result = rpcResult as {
    success?: boolean;
    status?: string;
    error?: string;
    payment_id?: string;
    bill_id?: string;
    amount?: number;
  } | null;

  if (result?.status === "already_processed" || result?.success) {
    console.log("[verify-paymongo-payment] bill confirmed paid", {
      bill_id: bill.id,
      payment_id: result.payment_id,
      amount: paidAmount,
      used_fallback: usedFallback,
    });
    return json({
      success: true,
      status: result.status === "already_processed" ? "already_processed" : "paid",
      bill_id: bill.id,
      payment_id: result.payment_id,
      amount: paidAmount,
    });
  }

  return json({
    success: false,
    status: "rejected",
    error: result?.error ?? "Payment could not be recorded.",
  }, 200);
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected internal error.";
    console.error("[verify-paymongo-payment] UNCAUGHT ERROR:", message);
    return json({ success: false, error: "Internal server error." }, 200);
  }
});
