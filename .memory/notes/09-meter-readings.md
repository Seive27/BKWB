---
title: 09-METER-READINGS
created: 2026-08-09T12:04:41.188Z
updated: 2026-08-09T12:04:41.188Z
---

# 09-METER-READINGS

# BKWB — Meter Readings

## Purpose

Meter readings are the foundation for future billing calculations.

Billing is intentionally being implemented later.

See [[12-BILLING-PAYMENTS]].

## Main Tables

- meters
- resident_accounts
- meter_readings

## Meter

A meter is a standalone device.

Important fields:

- meter_number
- is_active
- created_at
- updated_at

Example:

```text
MTR-0001
Resident Account

A resident account connects a resident to a water service.

Important fields:

resident_id
account_number
meter_id
service_address
connection_status
Meter Reading

Important fields:

account_id
resident_id
meter_id
meter_reader_id
assigned_by
assignment_date
reading_date
previous_reading
current_reading
consumption
status
remarks
photo_url
reviewed_by
reviewed_at
rejection_reason
deleted_at
Reading Status
assigned
pending_review
approved
rejected
billed
Consumption

Consumption is calculated at the database level:

current_reading - previous_reading

A current reading cannot be lower than the previous reading.

Meter Reader Permissions

Meter readers can:

Read their assigned readings
Submit assigned readings
Update intended submission fields

They must not alter assignment-level fields.

Staff

Staff manages:

Assignments
Approval
Rejection
Meter-reading workflow
Super Admin

Super Admin has monitoring/read access according to current policy.

Related
[[03-MOBILE-APPS]]
[[04-DATABASE]]
[[10-NOTIFICATIONS]]
[[12-BILLING-PAYMENTS]]