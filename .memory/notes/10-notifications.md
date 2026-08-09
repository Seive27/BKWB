---
title: 10-NOTIFICATIONS
created: 2026-08-09T12:05:12.534Z
updated: 2026-08-09T12:05:12.534Z
---

# 10-NOTIFICATIONS

# BKWB — Notifications

## Status

Notifications are implemented across all four applications.

## Applications

Notifications exist in:

- Staff desktop
- Super Admin desktop
- Resident mobile
- Meter Reader mobile

## Features

Implemented functionality includes:

- All notifications
- Unread filter
- Search where applicable
- Mark as read
- Mark all as read
- Soft delete
- Relative timestamps
- Type-specific icons
- Realtime updates
- Sidebar/header unread badges

## Automatic Notifications

Database triggers generate notifications for domain events.

Examples:

### Announcement

Published announcements notify the target audience.

### Ticket

Ticket creation can notify:

- Staff
- Super Admin

Ticket assignment/status/resolution can notify:

- Assigned staff
- Resident

### Meter Reading

Reading assignment can notify:

- Meter reader

Approval/rejection can notify:

- Meter reader
- Resident

## Architecture

Notification flow:

```text
Domain Event
    ↓
Database Trigger
    ↓
notifications
    ↓
Supabase Realtime
    ↓
Application Hook
    ↓
UI
Important

Notifications should not be manually duplicated in every UI when a database trigger already handles the event.

Check existing notification services/hooks before adding new notification logic.

Related
[[07-ANNOUNCEMENTS]]
[[08-TICKETS]]
[[09-METER-READINGS]]
[[11-AUDIT-LOGS-REPORTS-SETTINGS]]