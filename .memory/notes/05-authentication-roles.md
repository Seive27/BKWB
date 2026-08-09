---
title: 05-AUTHENTICATION-ROLES
created: 2026-08-09T11:57:15.015Z
updated: 2026-08-09T11:57:15.015Z
---

# 05-AUTHENTICATION-ROLES

# BKWB — Authentication and Roles

## Authentication

Supabase Authentication is used for user login.

Users are represented in:

```text
auth.users

and application-specific information is stored in:

public.profiles
Roles

The system has four roles:

super_admin
staff
resident
meter_reader

Roles are stored in the roles table.

Profiles reference roles through:

profiles.role_id → roles.id
Role Responsibilities
Super Admin

Administrative access.

Examples:

User management
Analytics
Audit logs
System settings
Monitoring
Staff

Operational access.

Examples:

Resident management
Meter management
Meter reading workflow
Tickets
Announcements
Operational reports
Resident

Resident-facing access.

Examples:

Own profile
Own tickets
Announcements
Notifications
Water schedule
Billing information when implemented
Meter Reader

Meter-reading access.

Examples:

Assigned readings
Submit readings
Reading history
Notifications
RLS

RLS is an important security layer.

Do not rely solely on frontend route guards.

A user who manually calls Supabase must still be restricted by RLS.

Resident Creation

Creating a new resident involves two concepts:

Creating an Auth user.
Creating/maintaining the corresponding profile and resident/service-account information.

A browser using only the Supabase anon key cannot safely create arbitrary Auth users with privileged role assignments.

Therefore privileged user creation should use a server-side Edge Function.

Current Resident Creation Issue

The Add Resident UI was implemented with:

Email
Date of birth
Generated temporary password
Meter serial number
Account number
Service address

The password format is:

LastNameFirstNameMMDDYYYY

Example:

DelaCruzJuan05122003

The temporary password is based on the resident's date of birth.

The professor specifically requested that date of birth be included because it is needed for this password generation.

The current implementation has previously displayed:

Failed to send a request to the Edge Function

when saving a resident.

This should be investigated as an Edge Function/deployment/configuration/runtime issue before changing the database.

Forgot Password

Forgot-password functionality is intended for all four application sides.

The current approach uses Supabase password reset functionality.

Desktop Tauri apps do not have a normal public browser URL, so the reset flow requires a hosted reset-password page.

The intended architecture is:

Desktop/Mobile
      ↓
Supabase resetPasswordForEmail()
      ↓
Hosted reset-password page
      ↓
User sets new password

A small hosted page can be deployed separately and used by all four applications.

Important

Never expose a Supabase service-role key in frontend code.

Related
[[01-SYSTEM-ARCHITECTURE]]
[[02-DESKTOP-APPS]]
[[03-MOBILE-APPS]]
[[13-RESIDENT-MANAGEMENT]]
[[16-PROFESSOR-FEEDBACK]]