---
title: 00-PROJECT-OVERVIEW
created: 2026-08-09T11:53:46.207Z
updated: 2026-08-09T11:53:46.207Z
---

# 00-PROJECT-OVERVIEW

# BKWB — Project Overview

## Project Name

Barangay Kalunasan Water Billing (BKWB)

## Project Type

Web/mobile/desktop-based water billing and service information system for Barangay Kalunasan.

## Purpose

The system is intended to improve the efficiency, accuracy, security, and accessibility of water billing and water-service operations.

The system will centralize:

- Resident management
- Water service accounts
- Meter readings
- Billing
- Payments
- Announcements
- Ticketing/service concerns
- Notifications
- Reports
- Audit logs
- System settings
- User/account management

## Main User Roles

The system has four primary roles:

1. Super Admin
2. Staff
3. Resident
4. Meter Reader

See [[05-AUTHENTICATION-ROLES]].

## Application Structure

There are currently four application sides:

### Desktop

- Staff application
- Super Admin application

### Mobile

- Resident application
- Meter Reader application

See:

- [[02-DESKTOP-APPS]]
- [[03-MOBILE-APPS]]
- [[01-SYSTEM-ARCHITECTURE]]

## Technology Direction

The project uses:

- React
- TypeScript
- Tailwind CSS
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Realtime
- Supabase Storage where applicable
- Tauri for desktop application packaging

The exact repository structure may change as development continues. Do not assume an old structure is still current without inspecting the repository.

## Important Development Principle

The system is already partially implemented.

AI agents MUST NOT assume that the project is starting from scratch.

Before modifying code:

1. Inspect the existing implementation.
2. Inspect existing services/hooks/types/components.
3. Inspect the existing Supabase schema.
4. Determine whether the requested feature already exists partially.
5. Preserve working functionality.
6. Avoid unnecessary database resets.
7. Avoid rewriting existing modules unless necessary.

## Current Priority

Billing and payments are intentionally being deferred.

The team wants to complete the remaining operational infrastructure and user-management functionality first.

See [[12-BILLING-PAYMENTS]] and [[15-CURRENT-PROGRESS]].

## Important Existing Modules

Already implemented or substantially implemented:

- Authentication
- Profiles
- Roles
- Announcements
- Tickets
- Meter management
- Meter readings
- Notifications
- Audit logs
- Analytics
- Reports
- System settings

Some modules may still require testing, bug fixes, or integration improvements.

## Key Current Focus

Resident creation/user management is currently an important area.

The staff-side "Add Resident" flow has previously failed when attempting to create an account because the frontend attempted to call a Supabase Edge Function and received:

"Failed to send a request to the Edge Function"

See [[13-RESIDENT-MANAGEMENT]].

## Related Documents

- [[01-SYSTEM-ARCHITECTURE]]
- [[02-DESKTOP-APPS]]
- [[03-MOBILE-APPS]]
- [[04-DATABASE]]
- [[05-AUTHENTICATION-ROLES]]
- [[06-UI-UX]]
- [[15-CURRENT-PROGRESS]]
- [[16-PROFESSOR-FEEDBACK]]
- [[18-AI-AGENT-RULES]]