# Supabase Backend TODO — Sitio Support

App code now expects `resident_accounts.sitio` and the `create-user` Edge Function to accept `sitio`. **Do the steps below on every Supabase project** the team uses (each teammate’s backend), not just one.

Known linked project in this repo: `lnnkvqxvqhbdvsomdfyh` (“Seive27's Project”). Repeat for any other project refs used by staff / super-admin / mobile `.env` files.

---

## Per project checklist

For **each** Supabase backend:

### 1. Database — add `sitio` + backfill

1. Open the project in the [Supabase Dashboard](https://supabase.com/dashboard) → **SQL Editor**.
2. Run the contents of:

   `desktop-app/add-sitio-column.sql`

   That script:

   - Adds `public.resident_accounts.sitio` (`TEXT`) if missing
   - Creates index `idx_resident_accounts_sitio`
   - Backfills empty/null sitios across the official Kalunasan coverage areas:
     - Back Crisanto
     - Ellena Homes
     - Lariha
     - Lokana
     - Lower Awihaw
     - Lower Camparang
     - Lower Kalunasan
     - Mountain View Village
     - Pang Pang Lanog
     - San Jose Ville
     - San Marcelo
     - Sobusteha
     - Unit 2
     - Unit 3
     - Unit 4
     - Unit 5
     - Upper Awiha
     - Upper Camprang
     - Upper Kalunasan
     - Valle Estrella

3. Confirm:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resident_accounts'
  AND column_name = 'sitio';

SELECT sitio, count(*)
FROM public.resident_accounts
GROUP BY sitio
ORDER BY sitio;
```

Safe to re-run. Prefer this file over re-running the full `desktop-app/supabase-migration.sql` on a live DB that already has data.

### 2. Edge Function — redeploy `create-user`

Local `supabase/functions/create-user` now persists `sitio` on new resident accounts. Deploy the updated function to **each** project:

```bash
# From repo root
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy create-user
```

Optional (if you also changed it): `supabase functions deploy send-email`

### 3. Smoke test

After schema + deploy on that project:

| Check | Expected |
| --- | --- |
| Staff → Residents table | Sitio column shows values (not all `—`) |
| Staff → Add Resident with a sitio | New account has `sitio` set |
| Staff → Assign Reading by sitio | Creates assignments for active accounts in that sitio |
| Meter Reader → Assigned | Readings grouped by sitio with progress |

If Add Resident fails with a column error, the SQL from step 1 was not applied on that project.  
If sitio is missing on newly created residents only, the Edge Function was not redeployed on that project.

---

## Why both backends

Clients point at whichever Supabase URL is in their `.env` / `app.json`. Schema and functions must match on **every** project the team runs against, or sitio features will work for one person and break for another.

---

## Status

| Backend / project ref | SQL applied | `create-user` redeployed | Notes |
| --- | --- | --- | --- |
| `lnnkvqxvqhbdvsomdfyh` | ☑ | ☐ | Sitio column applied 2026-08-11; `create-user` still needs redeploy |
| _(other project ref)_ | ☐ | ☐ | Fill in if used |
