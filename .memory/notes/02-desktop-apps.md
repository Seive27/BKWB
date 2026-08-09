---
title: 02-DESKTOP-APPS
created: 2026-08-09T11:55:17.543Z
updated: 2026-08-09T11:55:17.543Z
---

# 02-DESKTOP-APPS

# BKWB — Desktop Applications

## Desktop Applications

BKWB has two desktop-side applications:

1. Staff
2. Super Admin

The desktop direction uses React + TypeScript + Tailwind CSS with Tauri for desktop packaging.

## Staff Application

The Staff application is the main operational application.

Important areas include:

- Dashboard
- Residents
- Meter readings
- Tickets
- Announcements
- Notifications
- Reports
- Messages/service communication
- Profile/settings

Billing and payment implementation is currently deferred.

See [[12-BILLING-PAYMENTS]].

## Super Admin Application

The Super Admin application focuses on administration, monitoring, and configuration.

Implemented areas include:

- Dashboard
- Notifications
- Audit Logs
- Audit Logs Console
- Analytics
- Reports
- System Settings
- User management
- Profile/settings

## Existing Services / Hooks

The project has introduced services/hooks such as:

- notificationService
- analyticsService
- auditLogService
- useNotifications
- useAnalytics

Additional services exist for other modules.

AI agents should inspect the repository before creating duplicate services.

## Desktop Authentication

Authentication uses Supabase Auth.

Login/logout activity is also recorded in audit logs.

See [[05-AUTHENTICATION-ROLES]] and [[11-AUDIT-LOGS-REPORTS-SETTINGS]].

## Current Important Issue

The Staff "Add Resident" feature previously failed with:

"Failed to send a request to the Edge Function"

This indicates that resident creation depends on a Supabase Edge Function or equivalent server-side mechanism.

See [[13-RESIDENT-MANAGEMENT]].

## Important UI Principle

The desktop apps should maintain the existing visual language rather than introducing unrelated layouts.

See [[06-UI-UX]].

## Related

- [[01-SYSTEM-ARCHITECTURE]]
- [[05-AUTHENTICATION-ROLES]]
- [[06-UI-UX]]
- [[13-RESIDENT-MANAGEMENT]]