---
title: 04-DATABASE
created: 2026-08-09T11:56:18.592Z
updated: 2026-08-09T11:56:18.592Z
---

# 04-DATABASE

# BKWB — Database

## Database Platform

Supabase PostgreSQL.

The project uses:

- Tables
- Foreign keys
- Indexes
- RLS
- Database functions
- Database triggers
- Realtime publication

## Important Principle

The database is already populated with existing project data.

DO NOT recommend resetting or dropping the database unless explicitly instructed.

The project previously experienced issues caused by schema mismatch and missing foreign-key relationships. These have now been resolved.

## Core Tables

Known core tables include:

### Authentication / Identity

- profiles
- roles

### Communication

- announcements
- notifications

### Service Management

- tickets
- ticket_timeline
- ticket_messages

### Metering

- meters
- resident_accounts
- meter_readings

### Administrative

- audit_logs
- system_settings

### Existing/Planned Billing

- bills
- payments

There are also existing supporting tables such as residents and other project tables.

## Important Foreign Keys

The tickets table includes:

```text
tickets.resident_id → profiles.id
tickets.assigned_staff_id → profiles.id

The expected relationship:

tickets_resident_id_fkey

exists in the current database.

This relationship was previously a major source of ticket-query errors.

Announcements

Important relationships:

announcements.created_by → profiles.id
Meter Readings

Important relationships include:

meter_readings.account_id → resident_accounts.id
meter_readings.resident_id → profiles.id
meter_readings.meter_id → meters.id
meter_readings.meter_reader_id → profiles.id
meter_readings.assigned_by → profiles.id
meter_readings.reviewed_by → profiles.id
Resident Accounts
resident_accounts.resident_id → profiles.id
resident_accounts.meter_id → meters.id
Ticket Timeline
ticket_timeline.ticket_id → tickets.id
ticket_timeline.performed_by → profiles.id
Database Migration

The project has a large idempotent migration file:

desktop-app/supabase-migration.sql

It contains self-healing logic and can be re-run where appropriate.

However:

Do not automatically tell the developer to rerun/reset the migration when a frontend error occurs.

First determine whether the issue is:

Code
Query
RLS
Relationship
Authentication
Edge Function
Actual schema
Current Database Principle

The SQL/schema has already been verified and the previous major schema/relationship problems were fixed.

If a feature fails, investigate the actual runtime error before modifying the database.

Related
[[05-AUTHENTICATION-ROLES]]
[[08-TICKETS]]
[[09-METER-READINGS]]
[[10-NOTIFICATIONS]]
[[11-AUDIT-LOGS-REPORTS-SETTINGS]]
[[12-BILLING-PAYMENTS]]