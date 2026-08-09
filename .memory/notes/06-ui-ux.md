---
title: 06-UI-UX
created: 2026-08-09T11:57:57.862Z
updated: 2026-08-09T11:57:57.862Z
---

# 06-UI-UX

# BKWB — UI/UX Guidelines

## General Direction

The UI should remain consistent across all applications.

Existing pages should be preserved rather than redesigned unnecessarily.

## Desktop

The desktop applications use a dashboard-style layout with:

- Sidebar navigation
- Header
- Content area
- Cards
- Tables
- Modals
- Toast notifications
- Empty states
- Error states

## Mobile

Mobile applications use mobile-friendly:

- Dashboard cards
- Bottom/navigation patterns where applicable
- Notification lists
- Detail screens
- Forms
- Sheets/modals where appropriate

## Modals

Existing modal patterns should be reused.

The Add Resident form is a modal and contains:

- Resident information
- Date of birth
- Temporary password
- Service account information
- Meter information
- Service address

## Feedback

Use:

- Success toast
- Error toast/banner
- Loading state
- Empty state
- Validation message

Avoid displaying a generic success message if the backend operation actually failed.

## Forms

Forms must:

- Validate required fields
- Show field-level errors
- Prevent invalid submissions
- Display meaningful backend errors
- Handle loading states
- Prevent duplicate submissions

## Professor Requirements

Known UI/functional requirements include:

- Announcement calendar date selection should be disabled where appropriate.
- Announcements should support scheduling.
- Announcements should support expiration.
- Add Resident must actually create a resident.
- Residents page must only show resident accounts, not staff, meter readers, or super admins.
- Cell number validation is required.
- Forgot-password flow must be accessible on all four application sides.

See [[16-PROFESSOR-FEEDBACK]].

## Important

Do not make visual changes unrelated to the requested feature.

When fixing functionality, preserve the existing design unless the design itself is part of the problem.