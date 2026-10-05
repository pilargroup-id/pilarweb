# Pilarweb Database Guide

## SQL Location Rule

All SQL belongs under:

```text
backend/database/
```

Ordered numeric prefixes are mandatory.

## Current Structure

```text
backend/database/
├── migrations/
│   ├── 001_master_configuration.sql
│   ├── 002_workflow_configuration.sql
│   ├── 003_requests.sql
│   ├── 004_approvals_finance.sql
│   ├── 005_warehouse_fulfillment.sql
│   ├── 006_returns.sql
│   ├── 007_financial_closing.sql
│   ├── 008_activity_audit.sql
│   └── 009_transaction_api_support.sql
├── schema/
│   └── pilarweb-schema.sql
└── seeds/
    ├── 001_request_purposes.sql
    ├── 002_workflow_definitions.sql
    ├── 003_warehouse_locations.sql
    ├── 004_financial_closing_settings.sql
    ├── 005_approval_rules_placeholder.sql
    └── 006_module_access_rules_placeholder.sql
```

## Existing Database Upgrade

If migrations `001`-`008` were already applied, run only:

```text
backend/database/migrations/009_transaction_api_support.sql
```

`009` adds transaction API support fields, approval snapshots, module access rules, return stock quantity, and closing-batch columns.

## Fresh Install

Use the consolidated schema:

```text
backend/database/schema/pilarweb-schema.sql
```

Then run seeds in numeric order.

The placeholder seeds do not guess organization-specific values.

## Required Business Configuration Before Submit/Operational Actions

Before request submit is usable, configure:

1. `approval_rules` for each relevant department (or a deliberate global fallback).
2. `request_purpose_workflows` for each Request Purpose.

Before Finance/Warehouse/Admin APIs are usable, configure `module_access_rules`.

Supported module codes:

```text
ADMIN
FINANCE
WAREHOUSE
```

The first `ADMIN` rule must be inserted directly with a confirmed PilarGroup user UUID. Example template is in `006_module_access_rules_placeholder.sql`.

## Snapshot / No-FK Principle

Pilarweb deliberately avoids foreign-key constraints to PilarGroup and Itembase. External IDs are retained for traceability, while user/item/department/company names and business facts are snapshotted on transactions.
