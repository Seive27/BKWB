#!/usr/bin/env bash
# Updates the hosted Supabase "Reset password" email template to OTP-only.
# Usage:
#   export SUPABASE_ACCESS_TOKEN=sbp_...   # from https://supabase.com/dashboard/account/tokens
#   ./supabase/scripts/update-recovery-otp-template.sh
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-lnnkvqxvqhbdvsomdfyh}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Set SUPABASE_ACCESS_TOKEN first (Dashboard → Account → Access Tokens)." >&2
  exit 1
fi

BODY=$(python3 - <<'PY'
import json
html = """<h2>Reset your password</h2>
<p>We received a request to reset the password for <strong>{{ .Email }}</strong>.</p>
<p>Enter this code in the app to continue:</p>
<p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{{ .Token }}</p>
<p>This code expires shortly. If you didn't request a password reset, you can ignore this email.</p>"""
print(json.dumps({
  "mailer_subjects_recovery": "Your BKWB password reset code",
  "mailer_templates_recovery_content": html,
}))
PY
)

curl -sS -X PATCH "https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${BODY}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('subject:', d.get('mailer_subjects_recovery')); print('has {{ .Token }}:', '{{ .Token }}' in (d.get('mailer_templates_recovery_content') or ''))"
