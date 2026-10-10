# BKWB optimization plan

Plan for keeping Seive27's Project (`lnnkvqxvqhbdvsomdfyh`) responsive and inside its Supabase quotas. Findings below come from the app code and a read-only look at the live database on 2026-10-09.

The database is small (about 17 MB, cache hit rate 100%). The Disk IO warning is from memory pressure, temporary files, and extra work on every request. It is not from missing data or broken tables.

Do the safe steps first. Leave the later items until those have been in production without problems.

## Already in good shape

- Bill generation goes through one database function, `generate_bill_for_reading`.
- Sitio assignment inserts every account in one statement.
- `meter_readings`, `bills`, `payments`, `tickets`, and `notifications` already have indexes on the columns those screens filter by.
- Several counts use head-only queries, so they do not download the rows.
- Meter-reading row-level security already wraps `auth.uid()` in `(select auth.uid())`.

## Do this first

These steps do not delete residents, readings, bills, or payments, and they do not change who can see a row.

### 1. Check Memory and Swap

Open Supabase Dashboard → Observability → Database for Seive27's Project and look at Memory, Swap, and Disk IO %.

- Swap is the operating system moving memory onto disk when RAM is full. Sustained swap is the usual reason a small project drains its Disk IO budget.
- If swap stays high, upgrade Micro to Small. That is the fix Supabase documents for this warning. A compute change restarts the database for a short time. It does not change the data. Do the code and SQL steps below either way, so usage does not grow back.
- If swap stays low, leave the compute size as it is.

Looking at this page changes nothing.

### 2. Confirm a backup exists

In the Supabase dashboard, confirm a recent backup or point-in-time recovery is available before any SQL change.

### 3. Drop four duplicate indexes

Each index below is an exact second copy of one that stays. Postgres keeps using the remaining index. Recreating the dropped index restores it.

```sql
drop index if exists public.idx_bills_resident;       -- duplicate of idx_bills_resident_id
drop index if exists public.idx_payments_bill;        -- duplicate of idx_payments_bill_id
drop index if exists public.idx_tickets_resident;     -- duplicate of idx_tickets_resident_id
drop index if exists public.idx_meter_serial;         -- duplicate of meters_meter_serial_key
```

Restore statements, if ever needed:

```sql
create index if not exists idx_bills_resident on public.bills (resident_id);
create index if not exists idx_payments_bill on public.payments (bill_id);
create index if not exists idx_tickets_resident on public.tickets (resident_id);
create index if not exists idx_meter_serial on public.meters (meter_serial);
```

Leave `profiles_id_key` in place. Other tables' foreign keys may depend on it.

Put this in a migration file in the repo. Do not run it only in the SQL editor, or a fresh setup will recreate the duplicates.

### 4. Evaluate `auth.uid()` once per query

Eleven policies call `auth.uid()` once per row. Supabase's documented fix is to wrap it: `(select auth.uid())`. The rule stays the same. Postgres runs the check once per query.

Change one policy, then log in as a resident, a meter reader, and a staff account and confirm each still sees only their own rows. Then do the next policy.

`ALTER POLICY` replaces the whole expression. Copy both `USING` and `WITH CHECK` from the live policy, and only wrap `auth.uid()`.

- `Residents can create tickets` is an insert policy. It has `WITH CHECK` and no `USING`. Replacing it with only a `USING` clause stops residents from creating tickets.
- `Residents can update own open tickets` has both clauses, including the rule that resolved and closed tickets cannot be edited. The advisor did not list this policy. If you touch it, copy both clauses.
- `Meter readers can read accounts in their sitio` calls `auth.uid()` twice: once in the sitio lookup and once in the assigned-readings lookup. Wrap both calls and leave the rest of the condition as it is.

Policies the advisor flagged:

| Table | Policy |
| --- | --- |
| `profiles` | Users can read own profile |
| `profiles` | Users can update own profile |
| `tickets` | Residents can create tickets |
| `tickets` | Residents can read own tickets |
| `ticket_timeline` | Residents can read timeline for own tickets |
| `notifications` | Users can update own notifications |
| `bills` | Residents can read own bills |
| `payments` | Residents can read own payments |
| `sitio_assignments` | Meter readers can read own sitio assignment |
| `resident_accounts` | Residents can read own accounts |
| `resident_accounts` | Meter readers can read accounts in their sitio |

Example. Keep the rest of the policy text exactly as it is today, and only wrap the function call:

```sql
alter policy "Residents can read own tickets" on public.tickets
  using (resident_id = (select auth.uid()) and deleted_at is null);
```

Read the live `pg_policy` definition before altering each one, so `WITH CHECK` clauses are copied and not dropped.

## App changes after the database steps are stable

These save the most ongoing quota. Done with the limits in each step, screens keep the same data. A mistake makes a list go blank, a search miss someone, or a photo fail to open. It does not delete bills or readings.

### 5. Stop refetching whole lists on every realtime event

Today, each subscription calls `load(true)` or `getBills()` when any row in the table changes.

| Surface | What happens now |
| --- | --- |
| Staff meter readings | One submitted reading makes every open staff window download all readings again, with six joins. |
| Staff payments (`Payments.tsx`) | One payment change downloads all bills, pending payments, and recent payments. |
| Meter reader dashboard | Opens two `meter_readings` channels (assignments and history), and each refetches. |

Changes:

- Prefer a debounced full reload (1–2 seconds). The list still refreshes, and a burst of events causes one reload.
- A database change event does not include joined names. `payload.new` is the reading or bill row only, not the resident, account, or meter. Updating the list from that payload alone blanks those names. If you patch one row, fetch that row again with the existing select.
- Filters below are only for the signed-in user's own rows (meter reader app, resident app, notification bell). Staff and super-admin screens must keep an unfiltered subscription so they still see every reading, bill, and payment.

```ts
{ event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }
{ event: '*', schema: 'public', table: 'meter_readings', filter: `meter_reader_id=eq.${userId}` }
{ event: '*', schema: 'public', table: 'bills', filter: `resident_id=eq.${userId}` }
```

- Reuse one channel per screen. Channel names currently include `Date.now()`, so every mount creates a new subscription. About 12,000 realtime setups were recorded between 2026-07-25 and 2026-10-09. A shared channel is fine only when every listener on it needs the same rows.
- Unsubscribe when the app is in the background (`AppState` on mobile, `visibilitychange` on desktop). Reload once when it comes back, so a change that happened while it was closed still appears.

### 6. Remove the always-on timers

- `useAnnouncements.ts` in both mobile apps polls every 60 seconds on top of realtime. That is about 1,440 requests per day per open app. Realtime still covers a post staff publish immediately. The timer is only for an announcement whose `scheduled_at` comes due with no new database event. Schedule one `setTimeout` for the next `scheduled_at`, then schedule the one after that. While the app is in the background, a scheduled post can wait until the app is open again.
- `usePayMongoCheckout.ts` polls every 3 seconds and can call `verify-paymongo-payment` each tick. The webhook still records the payment. Back off (3s, 5s, 10s, 20s) and stop after about 2 minutes. Keep the manual "Check again" button so a delayed webhook can still be confirmed in the app.
- The 3-second timer in `CloudStatusIcon` reads local storage only. Leave it.

### 7. Stop calling `auth.getUser()` before every query

`requireUserId()` and `getCurrentReaderProfile()` call `supabase.auth.getUser()`, which hits the Auth server. After the session exists, use `getSession()` to read the user id for filters. Row-level security still uses the token on the request, so one user cannot read another user's rows. Calling `getSession()` before the session is loaded makes the screen look empty and the user look logged out.

### 8. Download less per request

- `READING_SELECT` and `BILL_SELECT` are `*` plus several joins, including on list cards. A list select must still include every field that card renders. A detail modal that reuses the list row needs those columns, or its own fetch. Dropping a column the card still reads shows a blank meter number, sitio, or amount.
- Page residents, bills, meter readings, and payments on the server with `.range()` and `{ count: 'exact' }`. Supabase returns at most 1,000 rows unless you page, so lists and reports will silently omit rows after that. Those pages currently search the full list in the browser. Send the search text and status to Supabase, and let export walk every page. Loading only one page makes search miss anyone not on that page, and a report total comes out short.
- `getResidentStats()` downloads every resident only to count them. Use head-only count queries so the stat cards still match the full table.
- `getAnalyticsSummary()` runs about 17 count queries, then the charts download every `created_at` in the period. Replace that with one SQL function using `GROUP BY` and `date_trunc`. Compare the function's totals with the current dashboard before switching the page over.
- `getSitioConsumers()` downloads every reading for the reader and filters by sitio in JavaScript. Filter sitio in SQL. "Unassigned Sitio" is a label the app adds for a blank sitio. It is not stored in the database. A filter that only matches the text `Unassigned Sitio` returns no consumers for those accounts.
- `createSitioAssignment` calls `getPreviousReading()` once per account. A 200-account sitio is 200–400 requests. `calculate_consumption` already overwrites `previous_reading` on insert from the last approved or billed reading, then from the account snapshot. Before removing the client lookups, confirm the live function still contains `NEW.previous_reading := COALESCE(v_resolved, 0)`. If that trigger is missing, new assignments keep a previous reading of 0 and the bill is wrong.

### 9. Shrink photo storage

- Resize new meter photos to about 1024 px wide at quality 0.6 before upload (`StartReadingModal` currently uses quality 0.7 at camera resolution). Profile avatars can be about 512 px. A smaller image still shows the meter.
- Existing `photo_url` values are full signed links, not file paths. Display code must keep opening those links. New rows can store a storage path and request a short-lived signed URL when someone opens the photo.
- Keep offline photos as files on disk once a file still uploads after the app is closed and reopened. Until that is proven, keep the `photo_base64` copy in `offlineSyncService.ts`. Android often drops the original camera URI, and dropping base64 first loses the photo on sync.

## Leave these until you are comfortable

| Change | Why it waits |
| --- | --- |
| Merging overlapping row-level security policies (21 advisor findings) | Can change who may read or update a row. Test each role after any merge. |
| Dropping indexes the advisor calls unused | "Unused" only means unused since statistics reset on 2026-07-25. Keep `idx_payments_reference_number` (PayMongo lookup) and `idx_knowledge_chunks_embedding_hnsw` (chatbot embeddings). |
| Adding indexes on all 15 unindexed foreign keys | Index the ones you filter, join, or delete by. Columns such as `generated_by` and `updated_by` rarely need one. |
| Switching staff live screens to Broadcast | Larger redesign. Database change events are enough at the current size. |
| `pg_cron` cleanup of read notifications (about 90 days) and old audit logs | This deletes history. `audit_logs` is the largest table (about 1 MB, 952 rows). Useful later, not urgent. |
| Per-user rate limit on `lunas-chat` | Protects edge-function and AI spend. Cap messages per hour and send only the last few turns. |

Indexes worth adding when you do touch schema again:

```sql
create index on public.meter_readings (meter_reader_id, status) where deleted_at is null;
create index on public.meter_readings (assignment_date) where deleted_at is null;
create index on public.resident_accounts (lower(sitio), connection_status);
create index on public.bills (resident_id, billing_period desc) where deleted_at is null;
```

## What the live database showed

Checked read-only on 2026-10-09. Project status was `ACTIVE_HEALTHY`.

| Signal | Value | Meaning |
| --- | --- | --- |
| Database size | 17 MB | Data volume is not the problem. |
| Cache hit rate | 100% | Reads are served from memory. |
| WAL since 2026-07-25 | 84 MB | App writes are modest. |
| Temp files | about 102 GB across about 54,000 files | Queries spill to disk because `work_mem` is about 2 MB (Micro-sized). |
| Largest traced spill | about 1.5 GB over 167 calls | A dashboard query that lists database functions, run as `postgres`. Close unused dashboard tabs (Functions, Query Performance, Table Editor). |
| Realtime subscription setups | about 12,000 since 2026-07-25 | Matches unique channel names on every mount. |
| `meters` sequential scans | about 119,000 | Fits in memory, so this is CPU, not disk. Some join or policy still reads the whole table. |

## Suggested order

1. Check Memory and Swap. Decide whether to upgrade compute.
2. Confirm a backup.
3. Migration: drop the four duplicate indexes.
4. Migration: wrap `auth.uid()` on one policy at a time, and test the three roles after each.
5. After those have been stable: debounced reloads and shared channels. Filter realtime only on the meter reader and resident apps. Leave staff and super-admin channels unfiltered.
6. Then timers, `getSession()`, slimmer selects, and server-side paging.
7. Then photo resizing and short-lived signed URLs.
8. Everything in "Leave these until you are comfortable" stays optional.

Compare Database egress, Storage egress, Realtime messages, and Edge Function invocations in Dashboard → Reports before and after steps 5–7.
