---
title: 13-RESIDENT-MANAGEMENT
created: 2026-08-09T12:06:38.814Z
updated: 2026-08-09T12:06:38.814Z
---

# 13-RESIDENT-MANAGEMENT

# BKWB — Resident Management

## Current Priority

Resident management is one of the current areas requiring attention.

## Add Resident

The Staff application has an "Add New Resident" modal.

The form contains:

### Resident information

- First name
- Middle name where applicable
- Last name
- Email
- Date of birth
- Cell number

### Temporary Password

The temporary password is automatically generated using:

```text
LastNameFirstNameMMDDYYYY

Example:

CruzJuan08082003

The password is based on the date of birth.

The resident should be able to change it after first login.

Service Account
Meter serial number
Account number
Service address

Account number should be automatically generated when the resident is successfully created.

Current Problem

The Add Resident form previously showed:

Failed to send a request to the Edge Function

This happened when attempting to save a resident.

Likely Architecture

Resident creation requires privileged Auth user creation.

The frontend should call a secure Edge Function.

Expected flow:

Staff
 ↓
Add Resident Form
 ↓
Edge Function
 ↓
Create auth.users user
 ↓
Create/update profile
 ↓
Create resident/service account
 ↓
Return success

The service-role key must remain server-side.

Email Credentials

A professor requirement is to email the resident their credentials after account creation.

A secure email service/Edge Function should handle this.

Do not put email provider secret keys in frontend code.

Residents List

The Residents page must show ONLY resident accounts.

It must NOT show:

Staff
Super Admin
Meter Reader

The role filter must be based on the actual role relationship rather than simply listing all profiles.

Cell Number

Professor feedback requires validation for cell numbers.

The exact required prefix/format should follow the professor's specified requirement in the current issue tracker.

Do not silently invent a different validation format.

Date of Birth

Date of birth must remain in the Add Resident form because it is required for the temporary password template.

Importing Existing Database

The team plans to obtain the existing Barangay Kalunasan database so they do not have to manually enter historical residents and data.

See [[14-IMPORT-DATABASE]].

Related
[[05-AUTHENTICATION-ROLES]]
[[06-UI-UX]]
[[14-IMPORT-DATABASE]]
[[16-PROFESSOR-FEEDBACK]]