# Pilarweb Database Guide

## SQL Location Rule

Every SQL file is under:

```text
backend/database/
```

Required naming style uses ordered numeric prefixes:

```text
001_<name>.sql
002_<name>.sql
003_<name>.sql
```

## Structure

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
│   └── 008_activity_audit.sql
├── schema/
│   └── pilarweb-schema.sql
└── seeds/
    ├── 001_request_purposes.sql
    ├── 002_workflow_definitions.sql
    ├── 003_warehouse_locations.sql
    ├── 004_financial_closing_settings.sql
    └── 005_approval_rules_placeholder.sql
```

## Fresh Install Order

Option A - consolidated schema:

```bash
mysql -u root -p < backend/database/schema/pilarweb-schema.sql
mysql -u root -p pilarweb < backend/database/seeds/001_request_purposes.sql
mysql -u root -p pilarweb < backend/database/seeds/002_workflow_definitions.sql
mysql -u root -p pilarweb < backend/database/seeds/003_warehouse_locations.sql
mysql -u root -p pilarweb < backend/database/seeds/004_financial_closing_settings.sql
```

`005_approval_rules_placeholder.sql` contains documentation only and intentionally inserts no guessed job-level values.

Option B - migrations in numeric order, then seeds in numeric order.

## No Foreign Keys

Pilarweb uses snapshot-style transaction storage and intentionally avoids database FK constraints to central PilarGroup or Itembase data. IDs are retained for traceability and display snapshots are stored on transaction rows where historical accuracy matters.
