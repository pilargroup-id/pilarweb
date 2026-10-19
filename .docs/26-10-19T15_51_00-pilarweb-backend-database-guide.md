# Pilarweb Backend and Database Baseline

Baseline: 19 October 2026.

This ZIP is a clean development baseline. It is intentionally not backward-compatible with the previous development schema. Since Pilarweb is still in development, reset the database instead of stacking compatibility migrations.

## Clean rebuild

Recommended:

```sql
DROP DATABASE IF EXISTS pilarweb;
```

Then run either the consolidated schema:

```text
backend/database/schema/pilarweb-schema.sql
```

or migrations in exact order:

```text
001_master_configuration.sql
002_access_approval_configuration.sql
003_requests.sql
004_approvals_finance.sql
005_warehouse_fulfillment.sql
006_returns_validation_override.sql
007_financial_closing.sql
008_activity_audit.sql
```

Then seeds in exact order:

```text
001_request_purposes.sql
002_warehouse_locations.sql
003_financial_closing_settings.sql
004_approval_rules.sql
005_module_access_rules.sql
006_validation_override_users.sql
```

Example Linux/MariaDB:

```bash
sudo mariadb < backend/database/schema/pilarweb-schema.sql
sudo mariadb pilarweb < backend/database/seeds/001_request_purposes.sql
sudo mariadb pilarweb < backend/database/seeds/002_warehouse_locations.sql
sudo mariadb pilarweb < backend/database/seeds/003_financial_closing_settings.sql
sudo mariadb pilarweb < backend/database/seeds/004_approval_rules.sql
sudo mariadb pilarweb < backend/database/seeds/005_module_access_rules.sql
sudo mariadb pilarweb < backend/database/seeds/006_validation_override_users.sql
```

## Core schema decisions

### Request department snapshots

`requests.department_id/name` = requester department snapshot. This controls approval and return restriction.

`requests.target_department_id/name` = selected Target Department snapshot. Historical/reporting only.

### Purpose snapshot

`master_request_purposes.return_type`:

```text
NON_RETURNABLE
RETURNABLE
```

`requests.purpose_return_type` snapshots it at transaction creation/update before Manager approval.

`requests.return_due_date` is mandatory only for returnable requests.

### Warehouse source and IWT

Source warehouse and IWT are fulfillment-header facts:

```text
warehouse_fulfillments.source_warehouse_id
warehouse_fulfillments.source_warehouse_internal_id
warehouse_fulfillments.source_warehouse_code
warehouse_fulfillments.source_warehouse_name
warehouse_fulfillments.inventory_transfer_number
warehouse_fulfillments.inventory_transfer_recorded_at
```

They do not exist at `warehouse_fulfillment_items` level.

`warehouse_fulfillment_items` stores per-SKU actual quantity only.

### Warehouse master and NetSuite Internal ID

`warehouse_locations.internal_id` is nullable and stores the optional NetSuite Location Internal ID.

The provided `warehouse.xlsx` Locations sheet was converted into `002_warehouse_locations.sql` with all 30 rows.

### Return facts

Return obligation is generated from Warehouse Actual Qty after the first DO print/handover for a RETURNABLE request.

`return_items.expected_qty` = actual qty issued by Warehouse.

`return_items.requester_return_qty` = requester declaration and must equal expected qty.

`return_items.warehouse_received_qty` = cumulative physical qty actually accepted back by Warehouse.

Each Warehouse physical receipt is append-only:

```text
return_receipts
return_receipt_items
```

This supports partial return and makes Finance period movement auditable.

### Department restriction

Restriction is calculated dynamically. There is no permanent `department.is_blocked` flag.

Blocking validations:

```text
RETURN_OVERDUE
RETURN_QTY_INCOMPLETE
```

An active row in `validation_overrides` can bypass a matching restriction without changing request/return quantities.

### Validation Override access

Who may operate the override feature is stored separately in:

```text
validation_override_users
```

It is intentionally independent from department membership and `module_access_rules`.

### Finance reporting

`GET /api/finance/reports/requests/export` generates an XLSX file directly from backend with one row per request SKU.

No third-party XLSX npm dependency is required; backend contains a small internal single-sheet XLSX writer under `src/utils/xlsx.util.js`.

### Financial Closing

Closing now records signed movement rows:

```text
ISSUE  = positive adjustment_qty
RETURN = negative adjustment_qty
```

Issue timing comes from `warehouse_handovers.handed_over_at`.

Return timing comes from each `return_receipts.received_at` event, so a return in a later month is booked in that later period instead of rewriting an older period.

## Legacy concepts intentionally removed

Do not restore these from older branches:

```text
shortage_qty
shortage_reason_code
shortage_note
remainder_disposition
BACKORDER_REMAINDER
CLOSE_SHORT
Warehouse Request Queue / Accept
manual Handover action
requester receipt confirmation
source warehouse per fulfillment item
IWT per fulfillment item
old dynamic workflow definition tables
```

## Default purpose seed

Current initial seed treats only `LOAN` as RETURNABLE. Other seeded purposes are NON_RETURNABLE. Admin can change master `return_type` later; historical transaction snapshots remain unchanged.

## Access baseline

Operational module access remains data-driven through `module_access_rules`:

```text
FINANCE
WAREHOUSE
ADMIN
```

There is no automatic "all IT users get all modules" bypass.

Validation Override access is controlled only by `validation_override_users`.
