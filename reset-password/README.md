# BKWB — Hosted Password Reset Page

All four apps ("Forgot Password?") send a Supabase password-reset email. The
email link must land on a public URL where the user can set a new password.
Desktop apps (Tauri) have no public URL, so this small, self-contained page
fills that role. It works from any static host.

## What is already configured

- ✅ Supabase credentials are **already filled in** (`index.html`):
  - URL: `https://lnnkvqxvqhbdvsomdfyh.supabase.co`
  - Anon key: project `lnnkvqxvqhbdvsomdfyh` (public client key — safe to embed)
- ✅ All four apps already call `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
  and point at this page:
  - Desktop (Staff / Super Admin): `VITE_RESET_REDIRECT_URL` in each `.env`
    (default fallback: `https://idyllic-lolly-7c6e23.netlify.app/`)
  - Mobile (Residents / Meter Reader): `RESET_REDIRECT_URL` in `app.json` →
    `expo.extra` (default fallback: `https://idyllic-lolly-7c6e23.netlify.app/`)

**This folder is deployed at `https://idyllic-lolly-7c6e23.netlify.app/` (Netlify).**

## 1. Deploy (pick one)

| Host | Steps |
| --- | --- |
| **Netlify** (used by the current default URL) | Drag this folder into app.netlify.com/drop. Current deployment: `https://idyllic-lolly-7c6e23.netlify.app/`. |
| **GitHub Pages** | Push `index.html` to `gh-pages` / a `docs/` folder. |
| **Supabase Storage** | Upload to a public bucket with `Content-Type: text/html`. |

Take note of the resulting URL, e.g. `https://idyllic-lolly-7c6e23.netlify.app/`.

> If you deploy somewhere other than `https://idyllic-lolly-7c6e23.netlify.app/`, update
> the apps to match (see section 3) — the URL the apps send MUST be the URL
> this page is served at.

## 2. Supabase redirect configuration (REQUIRED)

Supabase only follows `redirectTo` URLs that are allow-listed.

1. Supabase Dashboard → **Authentication → URL Configuration**.
2. **Site URL**: set to `https://idyllic-lolly-7c6e23.netlify.app/` (or keep your app URL —
   it only matters for links without an explicit redirect).
3. **Redirect URLs**: add **exactly** the deployed page URL:
   `https://idyllic-lolly-7c6e23.netlify.app/`
4. If you test locally, also add `http://localhost:8080` (see section 4).
5. Save. (Email templates under **Authentication → Emails** can be customized;
   the default Supabase reset template already links to the `redirectTo`.)

If this is not configured, Supabase silently falls back to the Site URL and
the user lands on the wrong page.

## 3. Point every app at the URL (only if you changed it)

- **Staff / Super Admin (desktop)**: add to each app's `.env`
  ```
  VITE_RESET_REDIRECT_URL=https://idyllic-lolly-7c6e23.netlify.app/
  ```
- **Residents / Meter Reader (mobile)**: add to each app's `app.json` →
  `expo.extra`
  ```json
  "RESET_REDIRECT_URL": "https://idyllic-lolly-7c6e23.netlify.app/"
  ```

The code already falls back to `https://idyllic-lolly-7c6e23.netlify.app/` by default, so
if you deploy there you don't need to change anything.

## 4. Local testing (before deploying)

1. Serve this folder locally:
   ```
   cd reset-password && python -m http.server 8080
   ```
2. Add `http://localhost:8080` to **Authentication → URL Configuration →
   Redirect URLs** (temporarily).
3. Point one desktop app at it for the test: add
   `VITE_RESET_REDIRECT_URL=http://localhost:8080` to that app's `.env`,
   restart the app.
4. Trigger **Forgot Password?** → open the email link (it will point to
   `http://localhost:8080/#access_token=…&type=recovery`) → set a new password
   → sign in with it.
5. Revert the `.env` change and remove the localhost redirect URL afterwards.

> Note: the reset email is sent by Supabase Auth itself (NOT the `send-email`
> edge function). Until custom SMTP is configured, Supabase uses its built-in
> provider (very limited: ~2 msgs/hour and only to org team members), so
> configure custom SMTP below for real delivery.

## 5. Email delivery configuration (two separate channels)

There are **two independent email paths** — do not confuse them:

| Channel | What it sends | Configured where |
| --- | --- | --- |
| **Supabase Auth** | Password-reset links, email confirmations | Supabase Dashboard → **Authentication → SMTP Settings** |
| **`send-email` edge function** | Account-credential emails (from `create-user`) | Edge function **secrets** (`RESEND_API_KEY`, optional `SEND_EMAIL_FROM`) |

Both can use the same **Resend** account.

### 5a. Supabase Auth custom SMTP (password-reset emails)

Available on **all plans including Free**. Dashboard → **Authentication →
SMTP Settings** (or **Emails**):

| Field | Value |
| --- | --- |
| Enabled | ✅ Custom SMTP on |
| Host | `smtp.resend.com` |
| Port | `465` (SSL/TLS), or `587` (STARTTLS) |
| Sender email | `onboarding@resend.dev` (free sandbox) |
| Sender name | `BKWB` (or Barangay Kalunasan Water Billing) |
| Username | `resend` |
| Password | your Resend API key (`re_...`) |

> **Free-plan sender restriction:** with `onboarding@resend.dev`, Resend only
> delivers to the **account owner's own email address** — fine for testing the
> flow, but real users won't receive emails until a domain is verified.
> Once you verify a domain in Resend (Domains → Add Domain → add DNS records),
> change the sender to e.g. `no-reply@yourdomain.com` and you can email anyone.

### 5b. `send-email` edge function (credential emails)

Already configured and deployed:

```bash
supabase secrets set RESEND_API_KEY=re_...          # ✅ already set
supabase functions deploy send-email                # ✅ already deployed
```

- Default sender is `BKWB <onboarding@resend.dev>` (free sandbox).
- Optional override for later (after domain verification):
  ```bash
  supabase secrets set SEND_EMAIL_FROM="BKWB <no-reply@yourdomain.com>"
  ```
- The same free-plan sender restriction applies here: sandbox emails only
  reach the account owner's inbox.
- ⚠️ **Expected errors during testing:** with the key set, sends to any
  recipient other than the account owner fail with a Resend `403` and
  `send-email` returns `502 Email provider error (403)`. This is **normal** on
  the free sandbox — not a bug. `create-user` treats credential emails as
  best-effort, so resident creation still succeeds (it just logs a warning).
  Until a domain is verified, test by sending to the Resend account owner's
  own email address.

## How it works

1. User taps **Forgot Password?** in any app (Staff, Super Admin, Residents, or
   Meter Reader).
2. The app calls `supabase.auth.resetPasswordForEmail(email, { redirectTo })`.
3. Supabase emails a link like
   `https://idyllic-lolly-7c6e23.netlify.app/#access_token=…&type=recovery`.
4. This page detects the recovery session (waits for `PASSWORD_RECOVERY` /
   `getSession()`), lets the user choose a new password, validates it
   (min 8 chars, match check), and calls `supabase.auth.updateUser({ password })`.
5. The user returns to the app and signs in normally.

Security notes:

- Only the public anon key is used on this page — no service-role/secret keys.
  The Resend API key lives **only** in the Supabase edge-function secrets, never
  in any frontend `.env` file or app bundle.
- The anon key is embedded in this committed file. If you ever **rotate** the
  anon key in the Supabase dashboard, update it here **and redeploy** the page
  or password resets will silently stop working.
- No custom reset tokens and nothing is stored in our database — it is pure
  Supabase Auth.
- The apps always show a generic message ("Check your inbox…") so the email
  address's existence is never revealed.
- Invalid/expired links show a clear error on this page.
