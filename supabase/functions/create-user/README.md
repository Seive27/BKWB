# create-user Edge Function

Server-side user creation for BKWB. Auth users are **never** created from the
browser — only this edge function may call the Supabase Admin API.

## Architecture

```
Super Admin / Staff
        │  (supabase.functions.invoke('create-user', { body }))
        ▼
Edge Function (this folder)
        │  (validates caller is staff / super_admin via their JWT)
        ▼
Supabase Admin API (service role)  →  auth.users
        │
        ▼
handle_new_user trigger  →  profiles (seeded as resident)
        │
        ▼
Function updates profile: names, phone, requested role
        │
        ▼
(residents only) meter + resident_account rows
```

## Deploy

```bash
# From the repo root
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy create-user
```

## Payload

```json
{
  "email": "resident@example.com",
  "password": "temp_pass_123",
  "first_name": "Juan",
  "middle_name": "Santos",
  "last_name": "Dela Cruz",
  "phone": "+639123456789",
  "role": "resident",
  "account_number": "ACC-0042",
  "service_address": "Purok 3, Barangay Kalunasan",
  "meter_number": "MTR-0007"
}
```

`role` must be one of: `resident | meter_reader | staff | super_admin`.
For residents, `account_number` (and optionally `meter_number`) creates the
service account and meter row.

## Response

```json
{ "ok": true, "user_id": "...", "email": "...", "role": "resident" }
```

Errors return a `4xx`/`5xx` status with `{ "error": "..." }`.
