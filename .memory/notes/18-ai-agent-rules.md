---
title: 18-AI-AGENT-RULES
created: 2026-08-09T12:09:11.662Z
updated: 2026-08-09T12:09:11.662Z
---

# 18-AI-AGENT-RULES

# BKWB — AI Agent Rules

## Purpose

This document is the most important file for AI coding agents working on BKWB.

## Rule 1 — Understand Before Editing

Before modifying code:

1. Inspect the repository.
2. Inspect the relevant application.
3. Inspect existing services.
4. Inspect hooks.
5. Inspect types.
6. Inspect Supabase queries.
7. Inspect related database tables.
8. Check whether the feature already exists.

Do not recreate existing functionality.

## Rule 2 — Preserve Working Features

BKWB is an existing partially completed system.

Do not rewrite working modules simply to use a preferred architecture.

## Rule 3 — Database Is Not the First Suspect

If a feature fails:

```text
1. Read actual runtime error
2. Check frontend logic
3. Check service/query
4. Check authentication/session
5. Check RLS
6. Check relationships
7. Check Edge Functions
8. Check database schema

Do NOT immediately recommend:

"Run the entire SQL migration again."

The database has already undergone extensive schema verification and fixes.

Rule 4 — Never Reset the Database Casually

Do not:

DROP tables
DROP the database
reset Supabase
delete production-like records
rerun destructive migrations

unless explicitly instructed.

Rule 5 — Respect RLS

Frontend access control is not enough.

Database RLS must enforce authorization.

Rule 6 — No Service Role Key in Frontend

Never put the Supabase service-role key in:

React code
mobile code
desktop client code
.env values shipped to clients

Privileged operations belong in secure server-side infrastructure.

Rule 7 — Inspect Existing Services

Before creating:

notificationService
analyticsService
auditLogService

or similar services, search the repository first.

These already exist.

Rule 8 — Don't Duplicate Database Triggers

Notifications and audit logs already use database automation.

Do not create duplicate client-side events unless necessary.

Rule 9 — Error Messages Must Be Honest

Do not convert every database error into:

Table not set up yet.

Only actual missing-table errors should produce a migration/setup message.

Real RLS, relationship, authentication, column, or query errors should remain visible during development.

Rule 10 — Test After Changes

At minimum:

tsc --noEmit

for affected applications.

Then test the actual user flow.

Rule 11 — Billing Is Deferred

Do not make Billing and Payments the current priority.

See [[12-BILLING-PAYMENTS]].

Rule 12 — Resident Creation Is Important

The Add Resident flow must actually:

Validate form data.
Create the Auth account securely.
Create/update the profile.
Create the resident/service account.
Assign the correct resident role.
Generate the temporary password according to requirements.
Handle credential email if implemented.
Return a meaningful success/error result.

See [[13-RESIDENT-MANAGEMENT]].

Rule 13 — Residents List Must Be Role-Correct

The Residents page must not display:

staff
super_admin
meter_reader

Only resident accounts should appear.

Rule 14 — Forgot Password Must Work Everywhere

Forgot-password flow is required for all four applications.

See [[05-AUTHENTICATION-ROLES]].

Rule 15 — Do Not Guess Unknown Data

If the Barangay's database format is unknown, do not invent an import schema.

See [[14-IMPORT-DATABASE]].

Rule 16 — Keep Agents Focused

When asked to fix one feature:

fix that feature
test related functionality
avoid unrelated refactors
Rule 17 — Use the Memory Vault

Before making architectural decisions, read the relevant files:

[[00-PROJECT-OVERVIEW]]
[[01-SYSTEM-ARCHITECTURE]]
[[04-DATABASE]]
[[05-AUTHENTICATION-ROLES]]
[[15-CURRENT-PROGRESS]]
[[16-PROFESSOR-FEEDBACK]]

Then read the module-specific file.

Rule 18 — Current Priority

The current priority is to make the existing non-billing functionality stable and complete.

Billing and Payments come later.

Rule 19 — Ask Only When a Real Decision Is Required

If a reasonable implementation can be determined from the repository and these documents, implement it.

Ask the developer only when a decision genuinely affects:

architecture
security
data integrity
destructive database operations
external service configuration
an ambiguous professor requirement
Rule 20 — Final Response

After making changes, report:

What was changed
Files changed
Database changes, if any
Whether SQL was required
Whether Edge Functions were changed
Validation performed
Remaining issues

Do not claim something works if it was not actually tested.


---

## Recommended vault structure

Once you paste these into your memory vault, the relationship looks roughly like this:

```text
                         ┌──────────────────────┐
                         │ 00 PROJECT OVERVIEW   │
                         └──────────┬───────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  ↓                 ↓                 ↓
          ARCHITECTURE          DATABASE          CURRENT STATUS
                  │                 │                 │
          ┌───────┴───────┐         │          ┌──────┴──────┐
          ↓               ↓         ↓          ↓             ↓
      DESKTOP          MOBILE    AUTH       PROFESSOR    BILLING
                                      │       FEEDBACK    DEFERRED
                                      ↓
                              RESIDENT MANAGEMENT
                                      │
                                      ↓
                              IMPORT DATABASE

Database
   │
   ├── Announcements
   ├── Tickets
   ├── Meter Readings
   ├── Notifications
   └── Audit / Settings / Reports