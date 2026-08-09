---
title: 12-BILLING-PAYMENTS
created: 2026-08-09T12:06:09.190Z
updated: 2026-08-09T12:06:09.190Z
---

# 12-BILLING-PAYMENTS

# BKWB — Billing and Payments

## Status

BILLING AND PAYMENTS ARE CURRENTLY DEFERRED.

Do not make billing/payment implementation the immediate priority unless explicitly requested.

## Why

The team decided to finish the remaining application infrastructure and user-management functionality first.

## Billing Dependency

Future billing will depend heavily on:

- Resident accounts
- Meter readings
- Consumption
- Water rates
- Penalty settings
- Billing periods

Therefore meter reading infrastructure should remain stable.

See [[09-METER-READINGS]].

## Planned Billing Concepts

Potential billing information includes:

- Bill
- Account
- Reading
- Consumption
- Water rate
- Amount due
- Due date
- Penalty
- Billing status

## Payments

Payments will be implemented after billing.

Potential payment information includes:

- Bill
- Payment amount
- Payment date
- Payment method
- Verification
- Receipt

## System Settings

Billing placeholders already exist in system_settings.

Examples:

- water rate
- penalty rate
- grace period

These should not be removed.

## Reports

Operational reports can work without billing.

Billing reports should be added after billing/payment implementation.

See [[11-AUDIT-LOGS-REPORTS-SETTINGS]].

## Important AI-Agent Instruction

Do NOT rewrite billing schemas or build a complete billing module simply because billing tables exist.

Billing is intentionally postponed.