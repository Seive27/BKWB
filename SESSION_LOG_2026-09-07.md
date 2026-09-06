# BKWB System — Development Session Log
**Date:** September 7, 2026
**Scope:** Resident first-login onboarding (authentication/onboarding feature), deployment debugging, optional-email support, permanent Account Number login, error-handling UX overhaul

> **Standing constraint honored all session:** No PayMongo integration, no `create-paymongo-checkout` / `paymongo-webhook` edge functions, no payment processing, no billing calculations, no bills schema/business logic, no RLS policies, no staff/super-admin functionality, no meter reading logic, and no existing account numbers or migrated billing data were modified at any point.

---

## Table of Contents
1. [Initial Inspection Findings](#1-initial-inspection-findings)
2. [Database Migration — `add-onboarded-at-column.sql`](#2-database-migration--add-onboarded-at-columnsql)
3. [Resident App: Mandatory Account Setup Flow](#3-resident-app-mandatory-account-setup-flow)
4. [Supabase Dashboard Configuration Steps](#4-supabase-dashboard-configuration-steps)
5. [Post-Setup Email Sync Fix (RPC v2)](#5-post-setup-email-sync-fix-rpc-v2)
6. ["Issue Login" Button Bug](#6-issue-login-button-bug)
7. [Edge Function Deployment & CORS/verify_jwt](#7-edge-function-deployment--corsverify_jwt)
8. [Permanent Account Number Login (post-setup)](#8-permanent-account-number-login-post-setup)
9. [Optional Email on Resident Creation](#9-optional-email-on-resident-creation)
10. ["Email address is invalid" During Setup](#10-email-address-is-invalid-during-setup)
11. [OTP Length Mismatch (8-digit vs 6-digit)](#11-otp-length-mismatch-8-digit-vs-6-digit)
12. [RPC Guard Bug + Connection-Error UX](#12-rpc-guard-bug--connection-error-ux)
13. [UX Overhaul: Branded Dialogs & Toasts (final task)](#13-ux-overhaul-branded-dialogs--toasts-final-task)
14. [Complete File Inventory](#14-complete-file-inventory)
15. [Deployment / Operations Checklist](#15-deployment--operations-checklist)
16. [Explicit Non-Modifications](#16-explicit-non-modifications)

---

## 1. Initial Inspection Findings

Before writing any code, the existing authentication/migration implementation was inspected (read-only). Key findings:

| Question | Finding |
|---|---|
| How are migrated residents represented? | Rows in `profiles` + `resident_accounts`, imported by `import-masterlist-data.sql` with `email = NULL` (barangay did not authorize contact data). All 55 masterlist consumers had no email. |
| How does Account Number relate to profiles? | `resident_accounts.account_number` → `resident_id` → `profiles.id`. Account numbers (e.g. `ACC-0006`, `7001`, `180`) are permanent billing identifiers — never transformed. |
| How does Supabase Auth identify residents? | Initially `auth.users.email = NULL`. After staff runs `resident-login`, a login handle `acc-<sanitized-account-number>@example.com` is set (`auth.users.email` + synced to `profiles.email`). |
| Do migrated residents use the `acc-...@example.com` pattern? | Yes. `loginHandleForAccount()` is implemented identically in `supabase/functions/resident-login/index.ts` and `mobile-app/residents/src/services/authService.ts`. Note: account `ACC-0006` → handle `acc-acc-0006@example.com` (doubled prefix is expected and harmless). |
| Does `profiles.id` match `auth.users.id`? | Yes, structurally guaranteed (`REFERENCES auth.users(id)`, import uses `RETURNING id`). |
| Can OTP use existing Supabase Auth? | Yes — via GoTrue's email-change flow (`updateUser({ email })` → 6-digit `{{ .Token }}` code → `verifyOtp({ type: 'email_change' })`). **No custom OTP system was built.** No plaintext passwords or OTPs stored anywhere. |
| Schema changes required? | Minimal: one column (`profiles.onboarded_at`), one partial index, one RPC function. No new tables. |

**Account states** (single-field architecture, extending existing schema):
- `onboarded_at IS NULL` → first login / setup required
- email change pending (GoTrue-managed token) → email verification required
- `onboarded_at NOT NULL` → active / onboarded

---

## 2. Database Migration — `add-onboarded-at-column.sql`

**File:** `desktop-app/add-onboarded-at-column.sql` (created; revised twice later — see §5, §12)

Contents:
1. `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;`
2. **Backfill** — profiles with a *real* (non-handle) email are marked onboarded; migrated residents (NULL or `acc-...@example.com` emails) correctly remain **not** onboarded:
   ```sql
   UPDATE public.profiles
   SET onboarded_at = NOW()
   WHERE onboarded_at IS NULL
     AND email IS NOT NULL
     AND lower(btrim(email)) !~ '^acc-[a-z0-9-]+@example\.com$';
   ```
3. Partial index for fast login-path checks: `profiles_onboarded_at_idx ON profiles (onboarded_at) WHERE onboarded_at IS NULL;`
4. `complete_resident_onboarding()` — `SECURITY DEFINER` RPC, `SET search_path = ''`, locates the row strictly by `auth.uid()` (never by client-supplied account number), fails closed unless the auth user has a real, confirmed email, then flips `onboarded_at` atomically.
5. `GRANT EXECUTE ... TO authenticated;` + `NOTIFY pgrst, 'reload schema';`

Safety properties (all verified): idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`), touches only `profiles`, RLS untouched, cannot operate on another resident's account, safe for the current dataset (all 55 migrated residents have NULL/handle emails).

**Execution:** run once in Supabase SQL Editor.

---

## 3. Resident App: Mandatory Account Setup Flow

**Files (mobile-app/residents):**
- `src/screens/AccountSetup.tsx` (new) — 4-step wizard: **Email → OTP → Password → Profile → Done**, with step progress bar, BKWB brand styling (logo, `bg-brand` buttons, brand-50 info callouts), strength meter reuse (`PasswordStrengthHint`), and prefill of names/phone from the masterlist.
- `src/services/authService.ts` — added `sendVerificationEmail`, `verifyEmailOwnership`, `setPermanentPassword`, `completeAccountSetup`; `login()` now returns `needsOnboarding` so the shell can gate the dashboard.
- `src/app/index.tsx` — app shell gates: `isLoggedIn && needsSetup → <AccountSetup>`; session-restore also re-checks the gate so the setup is never skipped (e.g. app killed mid-setup).

**Flow:** Login (Account Number + temporary password) → setup required → enter Gmail → Send Code → verify OTP → create permanent password → review profile info → Finish Setup → dashboard. Temporary password is dead the moment the permanent one is set.

**Security properties enforced:**
- Resident can only complete setup for their own account (RPC keyed to `auth.uid()`).
- Account number alone is never proof of ownership; password required in every path.
- No passwords/OTPs logged or stored in plaintext; Supabase Auth handles all secrets.

---

## 4. Supabase Dashboard Configuration Steps

1. **Email Templates → "Confirm Email Change"** — `{{ .Token }}` must be in the **Confirm Email Change** template body (NOT the "email address has been changed" notification, which needs no token). Provided template renders the 6-digit code prominently.
2. **Authentication → Providers → Email → "Secure email change" = OFF** — required because the *old* address is the internal `example.com` handle that can never receive mail; with it on, GoTrue rejects the whole change (see §10).
3. *(Recommended)* **"Email OTP length" = 6** — the project was on the newer 8-digit default; set to 6 to match the app (see §11).

---

## 5. Post-Setup Email Sync Fix (RPC v2)

**Problem identified:** after the verified email change, `auth.users.email` becomes the resident's real Gmail but `profiles.email` still held the handle. Consequences: staff tooling (`canIssueLogin` / `resident-login`) keyed on `profiles.email` could later clobber a verified email, and the setup-completion check would read stale data.

**Fix:** RPC updated to **sync the verified auth email down into `profiles.email`** in the same atomic `UPDATE` that flips `onboarded_at`. `resident-login` never overwrites a real email, so once synced, issue-login is correctly unavailable for that resident (recovery shifts to the resident's own "Forgot Password" flow).

**Changed:** `add-onboarded-at-column.sql` (re-run in SQL Editor — idempotent), `authService.ts` (login error hint for post-setup residents), `AccountSetup.tsx` (success screen: "Next time, sign in with your email ... and your new password").

---

## 6. "Issue Login" Button Bug

**Report:** clicking **Issue Login** in the staff Residents page appeared to do nothing.

**Root cause (two layers):**
1. The real failure was `supabase.functions.invoke('resident-login')` rejecting — but the only feedback was `setError(...)` rendering a banner at the **top of the page**, invisible while scrolled at the table row.
2. Underlying cause of the fetch failure: see §7 (gateway `verify_jwt` breaking CORS).

**Fixes:**
- `desktop-app/staff/src/services/residentService.ts` — `issueResidentLogin` now logs the full edge-function error to console and passes `'resident-login'` to the error extractor (previously blamed `create-user`).
- `desktop-app/staff/src/pages/Residents.tsx` — issue-login failures now open an **amber warning modal** ("Could Not Issue Login — The request failed before any password was changed") with retry guidance, impossible to miss.

---

## 7. Edge Function Deployment & CORS/verify_jwt

**Diagnosis (read-only probes):** direct `curl` to `https://lnnkvqxvqhbdvsomdfyh.supabase.co/functions/v1/resident-login` showed the function **was** deployed (200 preflight, 401 with gateway error format). The 401 response was missing CORS headers → browser surfaced `TypeError: Failed to fetch`.

**Root cause:** newly deployed functions default `verify_jwt = true`. The gateway validates the JWT *before* the function runs, and on some gateway versions the 401 response strips `Access-Control-Allow-Origin`, so the browser blocks it. `resident-login` verifies the caller itself (`auth.getUser` + staff/super_admin role check), so platform-level verification is redundant.

**Fix:** `supabase/config.toml`:
```toml
[functions.resident-login]
verify_jwt = false
```
Redeploy with `supabase functions deploy resident-login`. Security unchanged — the function still authenticates + role-checks callers internally.

---

## 8. Permanent Account Number Login (post-setup)

**Requirement confirmed:** residents must **always** be able to sign in with their Account Number — before *and* after setup.

**Problem:** the email-change flow replaces the handle identity in GoTrue, so account-number login would permanently break after setup.

**Solution — new edge function:** `supabase/functions/resident-account-login/index.ts` (new)
- Resolves `account_number → resident_id → profiles.email` and **verifies the password against GoTrue before returning the email**. Wrong password / unknown account / not-activated all return the *same* generic error (no account enumeration, no email harvesting).
- Client (`authService.ts`) flow: try handle sign-in first (pre-setup path) → on "invalid credentials", call the resolver → sign in with the resolved email. Email logins unchanged.
- `supabase/config.toml`: `[functions.resident-account-login] verify_jwt = false` (must be callable pre-auth; its security is the GoTrue password check itself).
- Success screen updated: "Keep your account number! You can always sign in with your email or your Account Number, plus your new password."

**Deploy:** `supabase functions deploy resident-account-login`

**Staff credential boundary (explained/confirmed):** staff can issue a temp password *once* per issuance (shown in a modal, never retrievable); re-issue generates a fresh one; after setup completes, staff can no longer issue (real email present) and recovery is the resident's own email reset flow.

---

## 9. Optional Email on Resident Creation

**Request:** email no longer required when staff/super-admin add a new resident.

**Behavior now:**

| Email field | Result |
|---|---|
| Filled | Real email on auth + profile, credential email sent (as before) |
| Blank | Unique `no-email-<random>@example.com` placeholder on `auth.users` (GoTrue needs an identifier; can never receive mail), `profiles.email` stays **NULL**, no email sent → resident activates via **Issue Login → Account Setup** |

**Files:**
- `supabase/functions/create-user/index.ts` — email optional in payload; mints placeholder; response includes `email_skipped: true`. (**Deploy:** `supabase functions deploy create-user`)
- `desktop-app/staff/src/pages/Residents.tsx` + `desktop-app/super-admin/src/pages/Residents.tsx` — validation only format-checks email *if* filled; label "Email Address (optional)" with helper text; SuccessView shows "Not provided — the resident will add and verify their email during first-login setup."
- (types updated in both `residentService.ts` files.)

---

## 10. "Email address is invalid" During Setup

**Report:** `Email address "acc-acc-0007@example.com" is invalid` when verifying the email step.

**Root cause:** **dashboard setting**, not a code bug — "Secure email change" was enabled, so GoTrue tried to send confirmation to the old address (the internal handle on `example.com`), failed validation, and rejected the entire change.

**Fix:** Dashboard → Authentication → Providers → Email → **Secure email change OFF** (see §4.2). The doubled `acc-acc-` prefix is expected (account number is literally `ACC-0007`) and matches all regexes in the SQL migration/RPC.

---

## 11. OTP Length Mismatch (8-digit vs 6-digit)

**Report:** emailed code was **8 digits** but the app asked for 6; entering it gave a misleading "code has expired" error.

**Root cause:** newer Supabase projects default **"Email OTP length" to 8**; the app had hardcoded 6 (`maxLength={6}`), silently truncating the code to 6 digits → wrong token → GoTrue's generic expiry message.

**Fix (two parts):**
1. Dashboard: **Email OTP length = 6** (user applied this).
2. App (`AccountSetup.tsx`): input accepts up to 8 digits as a safety net (`OTP_MAX_LENGTH = 8`) while `OTP_LENGTH = 6` gates the Verify button and the hint text. Works regardless of the dashboard setting.

---

## 12. RPC Guard Bug + Connection-Error UX

**Report A:** on "Review your information" → Finish Setup → *"a real email address must be verified before completing setup"* even though a real `gmail.com` address had been verified.

**Root cause (genuine bug):** the RPC's "real email" guard read **`profiles.email`** — which still held the stale handle at that moment (the sync happens *inside* the RPC, after the guard) — so the check failed despite the Gmail being verified in GoTrue.

**Fix (final RPC, in `add-onboarded-at-column.sql`):** the guard now checks **`auth.users.email`** (authoritative, already verified) and also covers the `no-email-...@example.com` placeholders:
```sql
IF lower(btrim(v_email)) ~ '^(acc-[a-z0-9-]+|no-email-[a-f0-9]+)@example\.com$' THEN
```
The verified email syncs into `profiles` in the same atomic statement. The affected test account was **not lost** — the email change was already committed in GoTrue, so re-running the SQL then tapping Finish Setup again succeeds.

**Report B:** raw `fetch failed: java.net.UnknownHostException...` shown when Wi-Fi dropped.

**Fix:** every setup error funnels through a classifier — connectivity failures open a friendly **"Connection Problem"** modal (📡 icon, plain-language message, **Try Again** re-runs exactly the failed step, progress preserved); raw SDK internals are never surfaced; real business errors stay inline on their step.

---

## 13. UX Overhaul: Branded Dialogs & Toasts (final task)

**Request:** replace *every* native/default toast or modal (`Alert.alert`, native action sheets, native toasts) in the resident app with customized, branded equivalents — "from sign out modals to everything."

**Survey:** 30 native `Alert.alert` calls found across 9 files.

### New shared infrastructure

**`mobile-app/residents/src/lib/errors.ts`** (new)
- `isNetworkError()` — detects connectivity failures (UnknownHostException, "Unable to resolve host", timeouts, "Failed to fetch", offline, connection refused/reset, etc.)
- `networkErrorMessage()` — friendly retry-focused text
- `friendlyErrorMessage(err, fallback)` — maps any thrown error: network → friendly text; raw SDK internals (java.net.*, okhttp, ssl, http, socket…) → generic fallback; real business messages pass through.

**`mobile-app/residents/src/components/ui/AppDialog.tsx`** (new)
One provider (`<AppDialogProvider>`) mounted in `app/_layout.tsx`, exposing `useDialog()` with four APIs, all in the BKWB visual language (white `rounded-2xl` card, emoji icon chip, `bg-brand` primary button — matching the existing AccountSetup/ForgotPassword modals):

| API | Purpose | Replaces |
|---|---|---|
| `dialog.alert(title, message, { tone, actions })` | Branded modal; tones `info / success / warning / danger` with matching icon chips; supports extra action buttons | All informational & error alerts |
| `dialog.confirm({ destructive, confirmLabel, cancelLabel, onConfirm, onCancel })` | Two-button decision modal; destructive = red confirm button | All yes/no alerts (Sign Out, reject work, etc.) |
| `dialog.actionSheet({ options, cancelLabel })` | Stacked-choice modal with destructive-capable options | Native option alerts (avatar picker, chat attach) |
| `dialog.toast(message, tone)` | Auto-dismissing (2.8s) bottom toast, `success / error / info` | Success notices previously thrown into alerts |

### Conversions (all 30 calls, 9 files + layout)

| File | Conversions |
|---|---|
| `app/_layout.tsx` | Mounted `<AppDialogProvider>` around the app root |
| `screens/Login.tsx` | "Login failed" → `danger` modal with friendly network/text mapping |
| `screens/Profile.tsx` | Sign Out → destructive confirm; avatar "Take Selfie / Gallery" → action sheet; Profile/Password updates → success **toasts**; Missing Name / permission / load / update / upload errors → branded modals (10 calls) |
| `screens/AccountSetup.tsx` | Local connection modal **removed** in favor of the shared dialog (Try Again re-runs the failed step); "Code Sent" → toast; mid-setup sign-out → destructive confirm |
| `screens/Payments.tsx` | Already Paid, Pay-at-Barangay-Hall instructions, GCash/Maya unavailable notice, Add Payment Method → `info` modals (4 calls) |
| `screens/CreateTicket.tsx` | Ticket Submitted → `success` modal with **View Ticket** action; Submission Failed → `danger` modal |
| `screens/TicketDetails.tsx` | "Work not completed?" → destructive confirm; Could Not Confirm / Could Not Update → `danger` modals |
| `screens/ChatBot.tsx` | Permission Needed → `warning` modal; Attach → action sheet |
| `components/bills/CurrentBill.tsx` | No Bill Found → `warning`; Checkout Error → `danger` with friendly mapping |
| `components/bills/BillDetailModal.tsx` | No Bill Found → `warning`; Checkout Error + Download Failed → `danger` with friendly mapping |

### Outcome
- **Zero** native `Alert.alert` calls remain in the resident app (verified by grep; only a doc comment and the unrelated `AlertIcon` component remain).
- All connectivity failures app-wide (login, setup, tickets, profile, bills) now produce the same friendly "Connection Problem" experience.
- Raw SDK internals can never reach users from any screen.
- TypeScript: `npx tsc --noEmit` → **0 errors** after every change.

---

## 14. Complete File Inventory

### Created
| File | Purpose |
|---|---|
| `desktop-app/add-onboarded-at-column.sql` | Onboarding migration: `profiles.onboarded_at`, backfill, partial index, `complete_resident_onboarding()` RPC, grant |
| `supabase/functions/resident-account-login/index.ts` | Account Number → email resolver with GoTrue password verification |
| `mobile-app/residents/src/screens/AccountSetup.tsx` | Mandatory 4-step first-login setup wizard |
| `mobile-app/residents/src/components/ui/AppDialog.tsx` | App-wide branded dialog + toast system |
| `mobile-app/residents/src/lib/errors.ts` | Shared error classifier (network/SDK/business) |

### Modified
| File | Change |
|---|---|
| `mobile-app/residents/src/services/authService.ts` | Setup-flow auth methods; `needsOnboarding` on login; account-number fallback via resolver; post-setup error hints |
| `mobile-app/residents/src/app/index.tsx` | Setup gate (`needsSetup`) + session-restore re-check |
| `mobile-app/residents/src/app/_layout.tsx` | Mounted `AppDialogProvider` |
| `mobile-app/residents/src/screens/Login.tsx` | Branded login-failure dialog |
| `mobile-app/residents/src/screens/Profile.tsx` | Dialog/toast conversions (sign-out, avatar, passwords, profile) |
| `mobile-app/residents/src/screens/Payments.tsx` | Info dialogs for payment-method flows |
| `mobile-app/residents/src/screens/CreateTicket.tsx` | Success dialog + branded error |
| `mobile-app/residents/src/screens/TicketDetails.tsx` | Destructive confirm + branded errors |
| `mobile-app/residents/src/screens/ChatBot.tsx` | Permission modal + attach action sheet |
| `mobile-app/residents/src/components/bills/CurrentBill.tsx` | Branded error modals (PayMongo invoke logic untouched) |
| `mobile-app/residents/src/components/bills/BillDetailModal.tsx` | Branded error modals (PayMongo invoke logic untouched) |
| `supabase/config.toml` | `verify_jwt = false` for `resident-login` and `resident-account-login` |
| `supabase/functions/create-user/index.ts` | Email optional; `no-email-...` placeholder; `email_skipped` response |
| `desktop-app/staff/src/services/residentService.ts` | issue-login error logging + correct function attribution |
| `desktop-app/staff/src/pages/Residents.tsx` | Issue-Login failure modal; optional email UI; SuccessView no-email state |
| `desktop-app/super-admin/src/pages/Residents.tsx` | Same optional-email UI as staff |

### Database changes (complete list)
1. `profiles.onboarded_at TIMESTAMPTZ` (nullable column)
2. `profiles_onboarded_at_idx` (partial index, `WHERE onboarded_at IS NULL`)
3. `complete_resident_onboarding()` RPC (SECURITY DEFINER, `auth.uid()`-scoped)
4. Backfill of already-real-email profiles as onboarded
5. `GRANT EXECUTE ... TO authenticated`

No other schema, RLS, or data changes.

---

## 15. Deployment / Operations Checklist

**Edge functions to deploy:**
```bash
supabase functions deploy resident-login          # if not yet redeployed after config.toml change
supabase functions deploy resident-account-login  # NEW function
supabase functions deploy create-user             # optional-email change
```

**Supabase Dashboard (one-time):**
- [ ] SQL Editor: run `desktop-app/add-onboarded-at-column.sql` (final version, incl. RPC v3 guard fix)
- [ ] Authentication → Email Templates → **Confirm Email Change**: body includes `{{ .Token }}`
- [ ] Authentication → Providers → Email: **Secure email change = OFF**
- [ ] Authentication → Providers → Email: **Email OTP length = 6**
- [ ] (Optional hardening) enable edge-function rate limits

**Verification queries (read-only):**
```sql
-- After a resident completes setup: real email synced, onboarded_at set
SELECT id, email, onboarded_at FROM public.profiles WHERE email = '<resident-gmail>';

-- Who still needs onboarding
SELECT count(*) FROM public.profiles WHERE onboarded_at IS NULL;
```

**End-to-end test flow:**
1. Staff: Issue Login on a migrated resident → temp password shown once.
2. Resident app: Account Number + temp password → **Account Setup** appears (dashboard blocked).
3. Enter Gmail → Send Code → receive 6-digit code → Verify (test Resend / Change email).
4. Set new password (strength meter) → Continue.
5. Review profile (prefilled) → Finish Setup → success screen → Dashboard.
6. Sign out → old temp password must fail (with "sign in with email" hint) → Account Number **or** Gmail + new password both work.
7. Staff: Issue Login button for that resident now hidden (`canIssueLogin` sees real email).
8. Kill Wi-Fi mid-flow → friendly Connection Problem modal with Try Again, no raw errors.

**Known operational note:** Resend's free sandbox (`onboarding@resend.dev`) only delivers to the Resend account owner's own inbox — use that address for the first test or configure a verified domain.

---

## 16. Explicit Non-Modifications

The following were **not** touched at any point during the session:

- ❌ PayMongo integration / keys / webhook
- ❌ `supabase/functions/create-paymongo-checkout`
- ❌ `supabase/functions/paymongo-webhook`
- ❌ Payment processing logic (in apps or edge functions)
- ❌ Billing calculations, bills schema, bills business logic
- ❌ RLS policies (the new RPC is additive; existing policies untouched)
- ❌ Staff/super-admin functionality beyond the listed Residents-page changes
- ❌ Meter reading logic
- ❌ Existing account numbers (`ACC-0006`, `11161`, `7001`, `180`, …) — never transformed
- ❌ Existing migrated billing data
- ❌ No plaintext passwords, OTPs, or auth secrets stored or logged anywhere

In the bill components, only the `Alert.alert` error wrappers around the PayMongo test-checkout calls were replaced with branded dialogs — the `create-paymongo-checkout` invocation, payload, and handling code is unchanged.
