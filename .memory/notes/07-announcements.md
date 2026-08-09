---
title: 07-ANNOUNCEMENTS
created: 2026-08-09T12:02:58.638Z
updated: 2026-08-09T12:02:58.638Z
---

# 07-ANNOUNCEMENTS

# BKWB — Announcements

## Status

Announcements are implemented and working.

## Database

The announcements table includes:

- id
- title
- content
- category
- priority
- target_audience
- created_by
- is_published
- expires_at
- deleted_at
- created_at
- updated_at

## Categories

Known categories:

- schedule
- interruption
- maintenance
- billing
- general
- emergency

## Priority

- normal
- important
- emergency

## Audience

- all
- residents
- meter_readers
- staff

## Scheduling

Announcements need to support scheduling.

The system should distinguish:

- immediate publication
- scheduled publication
- expiration

## Important Previous Bug

The announcement query previously attempted:

```text
expires_at.is.null,expires_at.gt.now()

PostgREST treated now() incorrectly in the filter.

The fix was to calculate the current timestamp in the client:

new Date().toISOString()

and use that timestamp in the query.

Expiration

expires_at should remain nullable.

If there is no expiration:

null

must be stored as SQL NULL, not the string:

"null"
Related
[[10-NOTIFICATIONS]]
[[04-DATABASE]]
[[16-PROFESSOR-FEEDBACK]]