---
title: 08-TICKETS
created: 2026-08-09T12:03:42.198Z
updated: 2026-08-09T12:03:42.198Z
---

# 08-TICKETS

# BKWB — Tickets

## Purpose

The ticketing system replaced the previous generic messaging concept for service concerns.

Tickets allow residents to report issues and allow staff to manage them.

## Categories

Known categories:

- water_supply
- billing
- plumbing
- water_quality
- meter_concern
- other

## Priority

- low
- medium
- high

## Status

- open
- assigned
- in_progress
- resolved
- closed

## Main Fields

Tickets include:

- ticket_number
- resident_id
- assigned_staff_id
- category
- subject
- description
- priority
- status
- resolution
- internal_notes
- attachment_url
- created_at
- updated_at
- resolved_at
- closed_at
- deleted_at

## Ticket Number

Ticket numbers are automatically generated.

Format:

```text
TKT-YYYY-000001
Permissions
Residents

Residents can:

Create their own tickets
Read their own tickets
Update eligible open tickets
Read their ticket timeline
Staff / Super Admin

They can manage tickets according to their role permissions.

Previous Major Issue

Ticket queries previously produced misleading:

"The tickets table has not been set up yet."

The application error handler was incorrectly interpreting relationship/query errors as a missing table.

The error handling was corrected to distinguish actual SQLSTATE 42P01 missing-table errors from relationship/RLS/query errors.

A missing relationship was later identified and fixed.

Current Principle

If tickets fail again:

Inspect the actual Supabase error.
Check authentication.
Check RLS.
Check foreign-key relationships.
Check query shape.
Only then consider a database migration.

Do not immediately reset the database.

Related
[[04-DATABASE]]
[[05-AUTHENTICATION-ROLES]]
[[10-NOTIFICATIONS]]
[[11-AUDIT-LOGS-REPORTS-SETTINGS]]