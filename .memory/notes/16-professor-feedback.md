---
title: 16-PROFESSOR-FEEDBACK
created: 2026-08-09T12:08:10.182Z
updated: 2026-08-09T12:08:10.182Z
---

# 16-PROFESSOR-FEEDBACK

# BKWB — Professor Feedback

## Purpose

This file records requirements and issues identified during milestone checking.

## Announcement

Professor feedback:

- Disable/handle calendar selection appropriately.
- Add scheduled announcements.
- Add announcement expiration.

Related:

[[07-ANNOUNCEMENTS]]

## Password Template

Professor feedback:

Temporary password should follow:

```text
LastNameFirstNameMonthDateYear

The password is based on the resident's birthday.

Therefore Date of Birth must be present in Add Resident.

Related:

[[05-AUTHENTICATION-ROLES]]
[[13-RESIDENT-MANAGEMENT]]

Forgot Password

Requirement:

Add Forgot Password and the complete forgot-password flow to all four application sides.

Applications:

Staff
Super Admin
Resident
Meter Reader

Related:

[[05-AUTHENTICATION-ROLES]]

Cell Number

Requirement:

Cell number must have validation and a required format/prefix.

The exact format should follow the professor's issue specification rather than being guessed.

Add Resident

Issue:

The Add Resident form did not actually create a resident successfully.

Current known error during previous testing:

Failed to send a request to the Edge Function

This needs to be resolved.

Related:

[[13-RESIDENT-MANAGEMENT]]

Residents Page

Issue:

The Residents page displayed:

Meter reader
Staff
Super admin

These should NOT appear.

The page should display only resident accounts.

Other Recorded Issues

Issue tracker comments included:

Date of birth
Cell number required/content validation
Auto-generate password using lastname + date of birth
Email user after user creation with credentials
Consumer code removal

The exact current implementation should be checked before modifying these items.

Important

Professor requirements have priority over assumptions made by AI agents.

When an agent is unsure, it should inspect the existing issue/task and implementation rather than inventing behavior.