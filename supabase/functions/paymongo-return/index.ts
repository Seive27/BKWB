/// <reference path="../deno.d.ts" />
// ============================================================
// paymongo-return — Post-checkout redirect back to the resident app
// ------------------------------------------------------------
// PayMongo success/cancel URLs point here (HTTPS). We hand off to the
// app deep link supplied by the client (Expo Go exp:// or residents://).
// Confirmation still comes from paymongo-webhook / verify-paymongo-payment.
// ============================================================

const FALLBACK_SUCCESS = "residents://payment-success";
const FALLBACK_CANCEL = "residents://payment-cancelled";

function isSafeAppUrl(value: string): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    // Expo Go / Dev Client / custom scheme — never allow http(s) open-redirects.
    return u.protocol === "exp:" ||
      u.protocol === "exps:" ||
      u.protocol === "residents:" ||
      u.protocol === "bkwb:";
  } catch {
    return false;
  }
}

function htmlPage(ok: boolean, appUrl: string): string {
  const title = ok ? "Payment submitted" : "Checkout closed";
  const message = ok
    ? "Returning you to the BKWB app. If nothing happens, tap the button below, then open Bills."
    : "Checkout was closed. Tap below to return to the BKWB app.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - BKWB</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
    .card { max-width: 26rem; margin: 1.5rem; padding: 1.75rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; text-align: center; }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; color: #047857; }
    p { margin: 0 0 1.25rem; line-height: 1.5; color: #475569; font-size: 0.95rem; }
    a { display: inline-block; padding: 0.75rem 1.25rem; background: #047857; color: #fff; text-decoration: none; border-radius: 0.5rem; font-weight: 600; }
  </style>
</head>
<body>
  <main class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a id="open-app" href="${appUrl}">Open BKWB app</a>
  </main>
  <script>
    (function () {
      var target = ${JSON.stringify(appUrl)};
      try { window.location.replace(target); } catch (e) {}
      setTimeout(function () {
        try { window.location.href = target; } catch (e) {}
      }, 400);
    })();
  </script>
</body>
</html>`;
}

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "success").toLowerCase();
  const ok = status !== "cancel" && status !== "cancelled";
  const billId = (url.searchParams.get("bill_id") || "").trim();
  const requestedAppUrl = (url.searchParams.get("app_url") || "").trim();

  let appUrl = isSafeAppUrl(requestedAppUrl)
    ? requestedAppUrl
    : (ok ? FALLBACK_SUCCESS : FALLBACK_CANCEL);

  // Ensure bill_id is present on the deep link for the resident app.
  if (billId) {
    try {
      const deep = new URL(appUrl);
      if (!deep.searchParams.get("bill_id")) {
        deep.searchParams.set("bill_id", billId);
      }
      appUrl = deep.toString();
    } catch {
      const sep = appUrl.includes("?") ? "&" : "?";
      appUrl = `${appUrl}${sep}bill_id=${encodeURIComponent(billId)}`;
    }
  }

  return new Response(htmlPage(ok, appUrl), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
