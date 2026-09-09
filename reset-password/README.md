# BKWB — Password Reset (in-app OTP)

Forgot Password no longer uses a hosted Netlify page. All four apps
(Residents, Meter Reader, Staff, Super Admin) verify a **6-digit email OTP**
inside the app, then set a new password.

## Flow

1. User enters their account email in the app.
2. App calls `supabase.auth.resetPasswordForEmail(email)`.
3. Supabase Auth emails a recovery message containing `{{ .Token }}`.
4. User enters the code in the app → `verifyOtp({ email, token, type: 'recovery' })`.
5. User sets a new password → `updateUser({ password })` → `signOut` → sign in.

## Required: Recovery email template (hosted project)

Local/dev uses [`supabase/templates/recovery.html`](../supabase/templates/recovery.html)
via `supabase/config.toml`. For the **hosted** project, set the same content in:

**Supabase Dashboard → Authentication → Email Templates → Reset password**

Suggested subject: `Your BKWB password reset code`

Suggested body (must include `{{ .Token }}`, no Netlify link):

```html
<html>
  <body>
    <h2>Reset your password</h2>
    <p>We received a request to reset the password for <strong>{{ .Email }}</strong>.</p>
    <p>Enter this code in the app to continue:</p>
    <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
    <p>This code expires shortly. If you didn't request a password reset, you can ignore this email.</p>
  </body>
</html>
```

Or patch via Management API (`mailer_subjects_recovery` /
`mailer_templates_recovery_content`) — see Supabase Email Templates docs.

## Email delivery (unchanged)

Password-reset emails are sent by **Supabase Auth SMTP** (not the
`send-email` edge function). Configure Auth SMTP under
**Authentication → SMTP Settings** (e.g. Resend).

## Deprecated: Netlify reset page

The previous `index.html` Netlify landing page
(`https://idyllic-lolly-7c6e23.netlify.app/`) is **no longer used** by the apps.
You can leave the deploy up or delete the Netlify site; reset emails should not
link to it once the recovery template is OTP-only.
