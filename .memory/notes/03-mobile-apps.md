---
title: 03-MOBILE-APPS
created: 2026-08-09T11:55:50.678Z
updated: 2026-08-09T11:55:50.678Z
---

# 03-MOBILE-APPS

# BKWB — Mobile Applications

## Mobile Applications

There are two mobile applications:

1. Resident
2. Meter Reader

Both communicate with the shared Supabase backend.

## Resident Mobile App

Resident functionality includes:

- Dashboard
- Notifications
- Announcements
- Tickets
- Water schedule
- Profile
- Billing-related screens planned for later

The resident dashboard has a notification bell with an unread badge.

## Resident Notifications

The notification infrastructure includes:

- All notifications
- Unread filtering
- Mark as read
- Mark all as read
- Relative timestamps
- Empty states
- Error states
- Realtime unread badge

See [[10-NOTIFICATIONS]].

## Resident Tickets

Residents can:

- Create tickets
- View their own tickets
- Update eligible open tickets
- View ticket timeline information

See [[08-TICKETS]].

## Meter Reader Mobile App

Meter reader functionality includes:

- Dashboard
- Assigned readings
- Reading submission
- Reading history
- Notifications

Meter readers should only be able to modify fields intended for meter-reader submission.

Database-level policies/triggers help enforce this.

See [[09-METER-READINGS]].

## Navigation

Notification items should navigate to their related feature when practical.

Examples:

- Ticket notification → ticket
- Reading notification → reading
- Announcement notification → announcement

## Important

Do not expose staff/super-admin functionality in the resident mobile app.

Role-based access must be enforced by both UI and backend RLS.

See [[05-AUTHENTICATION-ROLES]].