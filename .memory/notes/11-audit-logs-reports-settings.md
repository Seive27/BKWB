---
title: 11-AUDIT-LOGS-REPORTS-SETTINGS
created: 2026-08-09T12:05:39.422Z
updated: 2026-08-09T12:05:39.422Z
---

# 11-AUDIT-LOGS-REPORTS-SETTINGS

# BKWB — Audit Logs, Reports, Analytics, System Settings

## Audit Logs

Audit logs provide an immutable activity trail.

Important information includes:

- User
- Role
- Module
- Action
- Target
- Old values
- New values
- Timestamp

JSONB is used for old/new values where applicable.

## Automatically Audited Events

Known audited modules/events include:

### Authentication

- Login
- Logout

### Announcements

- Create
- Update
- Delete

### Tickets

- Create
- Assign
- Status changes
- Resolve
- Close

### Meter Readings

- Assignment
- Submission
- Approval
- Rejection

### Profiles

- Create
- Update
- Delete

### System Settings

- Changes

## Audit Logs UI

Super Admin has:

- Search
- Module filter
- Action filter
- Sorting
- CSV export
- Realtime audit console

## Reports

Operational reports are implemented separately from billing reports.

Current reports can include:

- Recent tickets
- Recent meter readings
- Operational statistics
- CSV export

## Analytics

Analytics includes statistics such as:

- Residents
- Tickets
- Meter readings
- Announcements
- Staff

Trend charts include:

- Ticket trends
- Reading completion
- Announcement activity

Time selectors include:

- 7 days
- 30 days
- 90 days

## System Settings

System settings use a flexible key/value model with JSONB values.

Current categories:

- General
- System
- Security
- Billing

The UI supports:

- Typed inputs
- Number inputs
- Boolean toggles
- Dirty-state tracking
- Save
- Realtime synchronization

## Billing Settings

Billing settings are currently placeholders.

Examples include:

- Water rate
- Penalty rate
- Grace period

They are intentionally prepared for the billing phase.

See [[12-BILLING-PAYMENTS]].

## Important

Operational reports and audit logs do not require billing to exist.

Billing-specific reports will depend on the billing/payment data.

## Related

- [[04-DATABASE]]
- [[10-NOTIFICATIONS]]
- [[12-BILLING-PAYMENTS]]