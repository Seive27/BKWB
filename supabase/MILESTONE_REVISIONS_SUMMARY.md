# Milestone Revisions — Implementation Summary

All revisions requested in the milestone check have been implemented across the
four applications (Staff, Super Admin, Residents, Meter Reader) and the Supabase
backend. TypeScript passes with **zero errors** in all four apps.

---

## 1. Announcement Improvements

**Past-date protection (frontend + backend)**
- Expiration and *Publish At* inputs are `datetime-local` with `min` = current
  minute, so past dates/times cannot be selected (past times on today are
  blocked automatically).
- Frontend `validate()` rejects past expiration / past schedule times.
- **Backend**: new `validate_announcement_dates` trigger raises a friendly error
  when `expires_at` or `scheduled_at` is in the past, or when `expires_at`
  precedes `scheduled_at`.

**Scheduling (`scheduled_at`)**
- New `scheduled_at TIMESTAMPTZ` column. Announcements stay hidden until the
  timestamp is reached, then become visible automatically.
- RLS read policy for non-staff now requires
  `(scheduled_at IS NULL OR scheduled_at <= NOW())`.
- Client queries enforce the same rule (single distributive `.or()` filter).
- Mobile hooks poll every 60s so a scheduled announcement appears without a
  manual refresh (realtime still handles instant changes).
- Staff/Super Admin see all announcements; the status badge + filter + stats now
  distinguish **Draft / Scheduled / Published / Expired** (Scheduled = published
  with a future `scheduled_at`).
- Edit form clears a `scheduled_at` that already fired (the announcement is
  live), so editing it later never blocks on a past schedule time.

**Notification trigger** updated so residents are only notified when the
announcement is actually visible (not while still scheduled).

---

## 2. Resident Creation (end-to-end fix)

The `create-user` edge function now performs the full flow correctly:
1. Creates the `auth.users` row (email confirmed) via the Admin API.
2. `handle_new_user` trigger inserts the profile (defaults to resident role).
3. Edge function patches the profile: names, **date of birth**, **phone**, and
   the requested role.
4. **Residents always get a `resident_accounts` row** — the consumer code input
   was removed, so the account number is **auto-generated** server-side
   (`ACC-####` via a DB sequence/RPC). Meter (optional) + service address are
   attached.
5. Best-effort **credential email** via the new `send-email` function.

---

## 3. Automatic Password Generation

- New **Date of Birth** field in Add Resident (and Add User).
- Format: `LastNameFirstNameMMDDYYYY` → `DelaCruzJuan05122003` (title-cased,
  spaces removed; matches the professor's example exactly).
- Generated **before saving**, displayed in the modal with a **Copy** button.
- The same algorithm runs server-side as a fallback so the created password
  always matches what staff saw (parsed manually — no timezone drift).
- DOB is persisted to `profiles.date_of_birth`.

---

## 4. Email Credentials (modular)

- New **`send-email` edge function** (`supabase/functions/send-email`):
  - Uses **Resend** (`RESEND_API_KEY`) when configured; otherwise logs and
    returns success so nothing breaks in dev.
  - Ships an `account_credentials` template (email + temporary password +
    account no. + login instructions).
  - Add the key later with `supabase secrets set RESEND_API_KEY=re_...` and
    `supabase functions deploy send-email`. (`SEND_EMAIL_FROM` optionally
    overrides the from address.)

---

## 5. Forgot Password (all 4 apps)

- **Login pages/screens** now have a working **Forgot Password?** flow:
  - Desktop (Staff + Super Admin): link inside the login modal → reset view
    (enter email → "Check your inbox" success state, never reveals whether an
    account exists).
  - Mobile (Residents + Meter Reader): "Forgot Password?" opens a modal with the
    same flow.
- All four apps call `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
- The reset link lands on a **hosted reset page** (`reset-password/index.html`)
  that reads the recovery tokens and lets the user set a new password, then they
  sign in normally.
- Redirect target is configurable:
  - Desktop: `VITE_RESET_REDIRECT_URL` (default `https://idyllic-lolly-7c6e23.netlify.app/`)
  - Mobile: `RESET_REDIRECT_URL` in `app.json` → `expo.extra`
- See `reset-password/README.md` for deployment + Supabase redirect URL config.

---

## 6. Cell Number Validation

- **Required**, **starts with `09`**, **exactly 11 digits**, **numbers only**.
- Frontend: friendly per-field messages (e.g. "must start with 09",
  "exactly 11 digits") + input strips non-digits; enforced in Add Resident and
  Add User.
- Backend (`create-user` edge function): regex validation + **uniqueness check**
  with a clear "already registered" error.
- Database: **unique partial index** on `profiles.phone` (guarded — skips
  gracefully if legacy duplicates exist).

---

## 7. Residents Page — Resident Role Only

- `getResidents()` already filtered by `role.name = 'resident'`; a **defensive
  client-side role filter** was added so staff/super admins/meter readers can
  never appear, regardless of join behavior.
- Stats, search, CSV export, and the table all use the filtered list, so counts
  stay accurate.

---

## 8. Consumer Code Removal

- **Removed** from the Add Resident / Add User UI, validation, and creation flow.
- The account number is **auto-generated** server-side (`ACC-####`) and shown as
  a read-only "Account Number" field in the form.
- The `resident_accounts.account_number` **column is kept** — it is still used by
  bills, readings, and the Residents table.

---

## 9. Code Review

- Reviewed services, hooks, components, RLS, realtime, validation, and role
  permissions; no duplicate/dead code or broken imports introduced.
- Caught and fixed during review:
  - Timezone bug in password generation (date-only strings parsed via
    `new Date()` shift a day in negative-offset timezones) — now parsed manually
    in all copies.
  - Chained `.or()` filters on Supabase (OR semantics across groups) — replaced
    with a single distributive `.or()`.
  - Add User DOB validation gap (partial dates) — full `MM/DD/YYYY` required.
  - `generate_account_number` marked `STABLE` → `VOLATILE`.
- **TypeScript: zero errors in all four apps** (verified via `tsc --noEmit`).

---

## Database Changes (SQL — `desktop-app/supabase-migration.sql`)

Re-run the migration in the Supabase SQL editor (it is idempotent):

| Change | Detail |
| --- | --- |
| `announcements.scheduled_at` | New TIMESTAMPTZ column (+ self-heal ADD COLUMN, canonical list). |
| RLS read policy | Non-staff reads require `scheduled_at IS NULL OR scheduled_at <= NOW()`. |
| `validate_announcement_dates` trigger | Rejects past `expires_at`, past `scheduled_at`, `expires_at <= scheduled_at`. |
| `notify_announcement_published` | Only notifies when the announcement is actually visible. |
| `profiles_phone_unique` | Unique partial index on `profiles.phone` (guarded against duplicates). |
| `account_number_seq` + `generate_account_number()` | Race-safe `ACC-####` generator for resident accounts. |

## New Services / Hooks / Components

| Item | Where |
| --- | --- |
| `send-email` edge function | `supabase/functions/send-email/index.ts` |
| `generateTemporaryPassword` / `validatePhone` / `parseBirthDate` | `desktop-app/*/src/services/residentService.ts` |
| `requestPasswordReset` | `mobile-app/*/src/services/authService.ts` |
| `ForgotPasswordView` | `desktop-app/*/src/components/modals/LoginModal.tsx` |
| `ForgotPasswordModal` | `mobile-app/*/src/screens/Login.tsx` |
| Hosted reset page | `reset-password/index.html` + `reset-password/README.md` |

## Files Modified

**Backend**
- `desktop-app/supabase-migration.sql`
- `supabase/functions/create-user/index.ts`
- `supabase/functions/send-email/index.ts` *(new)*
- `supabase/config.toml`

**Staff desktop** (`desktop-app/staff/src/`)
- `types/index.ts`, `services/announcementService.ts`, `pages/Announcements.tsx`,
  `services/authService.ts`, `components/modals/LoginModal.tsx`,
  `services/residentService.ts`, `pages/Residents.tsx`

**Super Admin desktop** (`desktop-app/super-admin/src/`)
- Same list as staff, plus `services/userService.ts`,
  `components/modals/AddUserModal.tsx`, `pages/Users.tsx`

**Residents mobile** (`mobile-app/residents/src/`)
- `services/authService.ts`, `screens/Login.tsx`, `types/announcements.ts`,
  `services/announcementService.ts`, `hooks/useAnnouncements.ts`, `lib/env.ts`,
  `app.json`

**Meter Reader mobile** (`mobile-app/meterReader/src/`) — same list as residents.

**New**: `reset-password/index.html`, `reset-password/README.md`

---

## Manual Testing Checklist

**Announcements (Staff + Super Admin)**
- [ ] Create an announcement — expiration picker blocks past dates/times.
- [ ] Set a future *Publish At* → status shows **Scheduled**; filter + stats reflect it.
- [ ] As a resident, verify a scheduled announcement is **hidden** until the time
      passes, then appears automatically (≤ 60s).
- [ ] Expired announcements show **Expired**; editing one requires a future expiry.
- [ ] Try saving with a past schedule/expiry → blocked (frontend) and by DB trigger.

**Resident creation**
- [ ] Add Resident with valid data → auth user + profile + role + account
      (`ACC-####`) + meter (if given) all created.
- [ ] DOB required; generated password shown matches `LastNameFirstNameMMDDYYYY`;
      Copy works.
- [ ] Resident receives the credential email (requires `RESEND_API_KEY`; without
      it the email is logged — check function logs).
- [ ] Invalid phone (`09171234`, `0817…`, letters) → friendly errors frontend and
      backend; duplicate phone → "already registered".
- [ ] Residents page lists residents **only** — no staff/admins/meter readers.
- [ ] Consumer code input gone; account number auto-generated.

**Forgot Password (all 4 apps)**
- [ ] "Forgot Password?" → enter email → "Check your inbox".
- [ ] Open the link (deployed reset page) → set new password → success.
- [ ] Log in with the new password in the app.

**Regression**
- [ ] Login/logout, audit log entries, notifications, and realtime announcements
      still work.

## Email Delivery Status

- ✅ `RESEND_API_KEY` is set as a **Supabase edge-function secret** (never in
  any frontend `.env`). `send-email` is deployed and live.
- ✅ Default sender is now `BKWB <onboarding@resend.dev>` (Resend's free
  sandbox — no custom domain required).
- ⚠️ **Free sandbox restriction:** with `onboarding@resend.dev`, Resend delivers
  only to the Resend account owner's own email address. Real end-users won't
  receive emails until a domain is verified in Resend and the sender is changed
  via `SEND_EMAIL_FROM`. Sends to other recipients fail with a Resend `403`
  (`send-email` returns `502`) — **expected on the sandbox**, not a bug;
  `create-user` handles credential emails best-effort so resident creation is
  unaffected.
- Supabase Auth password-reset emails are sent via **custom SMTP** configured in
  the Dashboard (Authentication → SMTP Settings, `smtp.resend.com:465`,
  user `resend`, pass = Resend API key, sender `onboarding@resend.dev`) — the
  `send-email` edge function is NOT involved in password reset.
- See `reset-password/README.md` §5 for the full setup (both channels).

## Remaining Limitations

1. **Free-plan sender restriction** — emails sent via `onboarding@resend.dev`
   only reach the account owner's inbox until a domain is verified in Resend.
2. **Reset page must be deployed** — point `VITE_RESET_REDIRECT_URL` /
   `RESET_REDIRECT_URL` at your deployed `reset-password/index.html`; the default
   `https://idyllic-lolly-7c6e23.netlify.app/` is the current deployment.
3. **No push notification when a scheduled announcement publishes** — it becomes
   visible automatically (RLS), but the notification trigger cannot fire on time
   passage; a future `pg_cron` job could add it.
4. **`profiles_phone_unique` skips if legacy duplicates exist** — deduplicate
   `profiles.phone` and re-run the migration to enable it.
5. **Scheduled announcements appear within ~60s on mobile** (poll interval), not
   to the exact second.
6. **Clipboard copy in Tauri** uses the web Clipboard API; if the webview blocks
   it, a graceful "unable to copy" message appears (a Tauri clipboard plugin can
   be added later).
