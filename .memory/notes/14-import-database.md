---
title: 14-IMPORT-DATABASE
created: 2026-08-09T12:07:11.038Z
updated: 2026-08-09T12:07:11.038Z
---

# 14-IMPORT-DATABASE

# BKWB — Importing the Existing Barangay Database

## Goal

The team plans to obtain the existing Barangay Kalunasan water database.

The purpose is to avoid manually entering:

- Residents
- Historical records
- Existing accounts
- Existing meter information
- Other historical data

## Expected Source

The source format is currently unknown.

It may be:

- Excel
- CSV
- Existing database export
- Other structured data

Do not assume the exact format until the Barangay provides it.

## Planned UI

The Staff application may contain an:

```text
Import Database

button.

This would allow authorized staff to upload the existing data.

Important

The import process should NOT directly insert arbitrary spreadsheet columns into production tables.

Recommended conceptual pipeline:

Excel/CSV
    ↓
Upload
    ↓
Preview
    ↓
Column Mapping
    ↓
Validation
    ↓
Error Report
    ↓
Import
    ↓
Database
Validation

The import system should detect:

Missing required fields
Duplicate residents
Duplicate account numbers
Invalid meter numbers
Invalid dates
Invalid cell numbers
Invalid historical values
Unknown columns
Conflicting records
Historical Data

Historical records should be preserved where possible.

Do not overwrite existing production data without explicit confirmation.

Security

Only authorized Staff/Super Admin users should be allowed to perform imports.

Current Status

The import feature is PLANNED.

The actual Barangay database format has not yet been confirmed.

Do not implement a final importer until the source format is available.

Related
[[04-DATABASE]]
[[13-RESIDENT-MANAGEMENT]]
[[05-AUTHENTICATION-ROLES]]