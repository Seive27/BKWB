---
title: 01-SYSTEM-ARCHITECTURE
created: 2026-08-09T11:54:15.479Z
updated: 2026-08-09T11:54:15.479Z
---

# 01-SYSTEM-ARCHITECTURE

# BKWB — System Architecture

## High-Level Architecture

BKWB consists of four client applications connected to a shared Supabase backend.

```text
                    SUPABASE
        ┌───────────────────────────────┐
        │ Authentication                │
        │ PostgreSQL Database           │
        │ Row Level Security            │
        │ Realtime                      │
        │ Storage                       │
        │ Edge Functions                │
        └───────────────┬───────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       DESKTOP        MOBILE        MOBILE
          │             │             │
      Staff App     Resident App   Meter Reader
          │
    Super Admin App

Desktop Applications

The desktop side is intended for operational/admin users.

Staff

Staff handles operational water-service activities.

Examples:

Residents
Meter readings
Tickets
Announcements
Reports
Notifications
Other operational tasks
Super Admin

Super Admin handles administrative and monitoring functions.

Examples:

User management
Analytics
Audit logs
System settings
Reports
Notifications
Monitoring

See [[02-DESKTOP-APPS]].

Mobile Applications
Resident

Residents should be able to:

View account information
View bills
View billing history
View announcements
View notifications
Submit/manage tickets
View water schedules
Eventually view/manage payments
Meter Reader

Meter readers should be able to:

View assigned meter readings
Submit meter readings
View reading history
Receive notifications
Navigate from notifications to relevant records

See [[03-MOBILE-APPS]].

Backend

Supabase is the shared backend.

Important backend responsibilities:

Authentication
PostgreSQL database
RLS
Realtime
Database triggers
Edge Functions for privileged operations
Security Principle

Browser/mobile clients must NOT receive the Supabase service-role key.

Privileged operations such as creating Auth users with administrative role assignment should use a secure server-side mechanism such as an Edge Function.

See [[05-AUTHENTICATION-ROLES]] and [[13-RESIDENT-MANAGEMENT]].

Data Flow Principle

Client:

UI
 ↓
Service
 ↓
Supabase
 ↓
PostgreSQL / Auth / Realtime

Avoid putting large amounts of direct Supabase query logic inside UI components.

Prefer:

Component
   ↓
Hook
   ↓
Service
   ↓
Supabase
Important

Do not redesign the architecture simply because an AI agent prefers another architecture.

Inspect the current repository before making architectural changes.

Related
[[02-DESKTOP-APPS]]
[[03-MOBILE-APPS]]
[[04-DATABASE]]
[[05-AUTHENTICATION-ROLES]]
[[13-RESIDENT-MANAGEMENT]]