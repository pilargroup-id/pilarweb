# Pilarweb Backend & Database Guide

Timestamp baseline: 21 October 2026 09:36 WIB  
Source baseline: `backend(20261021-032043).zip`  
Database: MariaDB / `pilarweb`

This is a clean development baseline. It intentionally replaces obsolete flow tables/migrations instead of maintaining backward compatibility with earlier development schemas.

---

## 1. Architecture Rules

1. PilarGroup remains the source for identity, department, company, job level, and app access context.
2. Itembase remains the source of truth for item master. Pilarweb stores item snapshots on transactions.
3. Pilarweb owns PB request, Manager Approval, Finance Review, fulfillment, dispatch, requester physical receipt, discrepancy, RB return, validation, and financial-closing transaction data.
4. External PilarGroup/Itembase entities are snapshots; database foreign keys to external systems are intentionally not used.
5. Person-name columns use `name`, `*_name`, `created_by_name`, etc. Do not create `user_name` / `user_name_snapshot` columns.
6. Warehouse master `internal_id` is optional and is the NetSuite Location Internal ID.
7. No old shortage/remainder/handover workflow is retained.

---

## 2. Clean Database File Layout

```text
backend/database/
├── migrations/
│   ├── 001_master_configuration.sql
│   ├── 002_access_approval_validation.sql
│   ├── 003_requests.sql
│   ├── 004_approvals_finance.sql
│   ├── 005_fulfillment_delivery.sql
│   ├── 006_returns_shortfall.sql
│   ├── 007_validation_violations.sql
│   ├── 008_financial_closing.sql
│   └── 009_activity_audit.sql
│
├── schema/
│   └── pilarweb-schema.sql
│
└── seeds/
    ├── 001_request_purposes.sql
    ├── 002_warehouse_locations.sql
    ├── 003_request_policy_settings.sql
    ├── 004_financial_closing_settings.sql
    ├── 005_approval_rules.sql
    ├── 006_module_access_rules.sql
    ├── 007_validation_override_users.sql
    └── 008_validation_rules.sql
```

`pilarweb-schema.sql` is the concatenated clean DDL of migration 001-009.

For a clean dev reset, use either the consolidated schema OR migrations, not both.

---

## 3. Clean Reset

Example MariaDB reset:

```bash
sudo mariadb -e "DROP DATABASE IF EXISTS pilarweb;"
sudo mariadb < backend/database/schema/pilarweb-schema.sql

for f in backend/database/seeds/*.sql; do
  sudo mariadb pilarweb < "$f"
done
```

Then:

```bash
cd backend
npm install
npm run check
pm2 restart pilarweb-api --update-env
pm2 save
```

---

## 4. Master Tables

### `master_request_purposes`

Key fields:

```text
code
name
description
return_type       NON_RETURNABLE | RETURNABLE
is_system
sort_order
is_active
```

System purpose:

```text
RETURN_SHORTFALL
return_type = NON_RETURNABLE
is_system = 1
```

It cannot be manually selected or deleted.

### `warehouse_locations`

```text
id
internal_id   nullable NetSuite Location Internal ID
code
name
is_active
```

`internal_id` is optional.

The seed contains the existing warehouse/location master supplied by the project, including `LOAN`.

### `request_policy_settings`

Dynamic flow/SLA master:

```text
receipt_confirmation_days
discrepancy_resolution_days
discrepancy_escalation_days
discrepancy_supervisor_lock_days
return_due_days
timezone
is_active
```

Initial seed:

```text
receipt_confirmation_days = 2
discrepancy_resolution_days = 2
discrepancy_escalation_days = 3
discrepancy_supervisor_lock_days = 5
return_due_days = 14
timezone = Asia/Jakarta
```

Policy is versioned by deactivating old row and inserting a new active row.

Relevant values are snapshotted into `requests` and `delivery_discrepancies`.

### `number_sequences`

```text
sequence_key
period_key
last_number
```

Unique key:

```text
(sequence_key, period_key)
```

PB and RB use separate keys with `period_key = yymm`.

Generated output:

```text
PB261000001
RB261000001
```

Sequence generation uses `SELECT ... FOR UPDATE` and Jakarta year/month resolution.

---

## 5. Access / Approval / Validation Master

### `module_access_rules`

Used for:

```text
ADMIN
FINANCE
WAREHOUSE
WAREHOUSE_DISCREPANCY_SUPERVISOR
```

Supports user, department, company, and job-level scope.

For user-specific rows, use:

```text
user_id = canonical PilarGroup UUID
name    = human-readable employee name
```

### `validation_override_users`

Dedicated table for users allowed to create/revoke validation overrides.

```text
user_id
name
is_active
```

This is deliberately separate from generic module access.

### `validation_rules`

```text
code
name
description
block_scope    NONE | USER | DEPARTMENT
is_blocking
allow_override
is_active
```

Seed:

```text
RECEIPT_AUTO_ACCEPTED
RETURN_OVERDUE
RETURN_SHORTFALL
```

This lets the business change blocking from Department to User without changing source code.

### `approval_rules`

Existing department/job-level rules remain data-driven.

Baseline:

```text
DEFAULT: requester blocked >= Assistant Manager; Manager min approver
Product dept 13: Assistant Manager min approver
```

---

## 6. User Access Seeds

### ADMIN

```text
17808bc0-9d46-4103-a384-735562f71c12  Al Fatih Zainul Falah
3ee1bae7-f256-44c1-8b38-fc38039fab92  Apriyanto
bd625aff-7fc4-44e9-b95c-549f99f47991  Azi Fauzi
d9d98720-ac7f-4798-8612-fef103acf07d  Bayu Noegroho
834110d0-bd59-4bd1-81a9-03e9341fb6e4  Yulliemty
```

### VALIDATION_OVERRIDE

Same five users above are seeded to `validation_override_users`.

### WAREHOUSE_DISCREPANCY_SUPERVISOR

```text
Department 5 / WH GOTO
b8d631ad-6921-45d0-9920-0ae02739b767  M.Rizky Fahrizal Lubis

Department 6 / WH Gosave
c6dba7cd-019c-4c66-a52a-398626b3357d  Nurna Bella AP.
```

Supervisor rules are user-specific and department-scoped.

---

## 7. `requests`

Important fields:

```text
id UUID
request_number
request_origin        NORMAL | RETURN_SHORTFALL
source_request_id
source_return_id

request_purpose_id
request_purpose_code
request_purpose_name
purpose_return_type   NON_RETURNABLE | RETURNABLE

status

requester_user_id
requester_internal_id
requester_name
requester_job_level_value
requester_job_level_name

department_id
 department_name

target_department_id
target_department_name

company_id
company_name
reason

receipt_confirmation_days_snapshot
discrepancy_resolution_days_snapshot
discrepancy_escalation_days_snapshot
discrepancy_supervisor_lock_days_snapshot
return_due_days_snapshot
policy_timezone_snapshot

final_received_at
return_due_at
```

Requester Department drives Manager approval and validation restriction.

Target Department is historical/reporting metadata only.

### Normal request

```text
request_origin = NORMAL
source_request_id = NULL
source_return_id = NULL
```

### Shortfall request

```text
request_origin = RETURN_SHORTFALL
purpose = RETURN_SHORTFALL
return_type = NON_RETURNABLE
source_request_id = original PB UUID
source_return_id = RB ID
```

---

## 8. `request_items`

Stores Itembase snapshot and request quantity.

Important fields:

```text
request_id
source_return_item_id
itembase_item_id
item_code
item_name
selling_name
parent_id
parent_name
variant_name
uom_code
item_kind
requested_qty
notes
```

`source_return_item_id` is used by system-generated Return Shortfall PB items.

---

## 9. Manager and Finance

### `request_approvals`

Normal PB only.

Manager actions:

```text
APPROVED
REVERTED
CANCELED
```

Return Shortfall PB does not create Manager approval.

### `finance_reviews`

One Finance review per PB.

### `finance_review_items`

Per SKU:

```text
requested_qty_snapshot
decision        PENDING | APPROVED | REJECTED
approved_qty
rejected_qty
```

For partial Finance approval:

```text
rejected_qty = requested_qty_snapshot - approved_qty
```

---

## 10. Warehouse Fulfillment

### `warehouse_fulfillments`

A request can have multiple fulfillment rows.

Header fields include:

```text
request_id
parent_fulfillment_id
fulfillment_number
fulfillment_mode
fulfillment_type
status

warehouse_department_id
warehouse_department_name

source_warehouse_id
source_warehouse_internal_id
source_warehouse_code
source_warehouse_name

inventory_transfer_number
inventory_transfer_recorded_at
```

Source Warehouse is not stored per fulfillment item.

### Fulfillment mode

```text
PHYSICAL
ADMINISTRATIVE
```

### Fulfillment type

```text
NORMAL
DISCREPANCY_RESEND
RETURN_SHORTFALL_CONVERSION
```

### `warehouse_fulfillment_items`

```text
fulfillment_id
request_item_id
requested_qty_snapshot
finance_approved_qty_snapshot
finance_rejected_qty_snapshot
actual_qty
```

There are no shortage/remainder columns.

### Physical flow

```text
PICKING
-> READY_FOR_DISPATCH
-> DISPATCHED
```

### Administrative shortfall flow

```text
ADMINISTRATIVE_PENDING
-> COMPLETED
```

Administrative completion requires Source Warehouse + IWT. `actual_qty` is set to Finance Approved Qty.

It does not create a physical delivery receipt.

---

## 11. Delivery Receipt

### `delivery_receipts`

One row per physical fulfillment after Print DO.

```text
request_id
fulfillment_id
status          PENDING | PARTIAL | RECEIVED
confirmation_method  MANUAL | AUTO
confirmation_deadline_at
confirmed_at
confirmed_by_user_id
confirmed_by_name
```

### `delivery_receipt_items`

```text
dispatched_qty
received_qty
discrepancy_qty
```

The Warehouse actual quantity is copied to `dispatched_qty`.

Requester confirms physical `received_qty`.

---

## 12. Delivery Discrepancy / Warehouse SLA

### `delivery_discrepancies`

Created when:

```text
received_qty < dispatched_qty
```

Fields include:

```text
expected_qty
received_qty
difference_qty
status
resolution_type
resolution_days_snapshot
escalation_days_snapshot
supervisor_lock_days_snapshot
resolution_due_at
escalation_due_at
supervisor_lock_at
resolution_note
late_resolution_reason
resend_fulfillment_id
```

Status:

```text
OPEN
OVERDUE
ESCALATED
SUPERVISOR_REQUIRED
RESOLVED
```

Resolution:

```text
RESEND
CLOSE_WITH_REASON
```

`RESEND` creates a new physical `DISCREPANCY_RESEND` fulfillment on the same PB.

`CLOSE_WITH_REASON` finalizes the discrepancy without another shipment.

No Finance approval and no Validation Override are involved.

### `warehouse_sla_violations`

Records overdue Warehouse discrepancy SLA history.

```text
violation_type = DELIVERY_DISCREPANCY_OVERDUE
warehouse_department_id
warehouse_department_name
fulfillment_id
discrepancy_id
due_at
breached_at
resolved_at
overdue_minutes
status
late_reason
```

Late resolution remains allowed. After supervisor lock only the scoped Warehouse Discrepancy Supervisor may resolve.

---

## 13. Returnable / RB

An RB record is created only when physical delivery of the Returnable PB is fully resolved.

### `returns`

```text
return_number
request_id
status

due_at
expected_total_qty
requester_declared_total_qty
warehouse_received_total_qty
shortfall_total_qty

generated_shortfall_request_id
```

Status:

```text
PENDING_REQUESTER
SUBMITTED
COMPLETED
```

There is only one final requester submission cycle.

### `return_items`

```text
expected_qty
requester_return_qty
warehouse_received_qty
shortfall_qty
```

Authoritative formula:

```text
shortfall_qty = expected_qty - warehouse_received_qty
```

Warehouse actual return quantity is authoritative and is allowed to differ from requester declaration, but cannot exceed `expected_qty`.

---

## 14. Return Shortfall Auto PB

If final RB has shortfall:

```text
expected 10
warehouse actual return 8
shortfall 2
```

backend auto-creates a PB for 2.

That PB:

```text
purpose = RETURN_SHORTFALL
return_type = NON_RETURNABLE
request_origin = RETURN_SHORTFALL
source_request_id = original PB
source_return_id = RB
```

Flow:

```text
PENDING_FINANCE_REVIEW
-> ADMINISTRATIVE_FULFILLMENT
-> COMPLETED
```

No Manager approval.

No physical shipment.

Source Warehouse and IWT are mandatory in the administrative fulfillment.

The Return Shortfall request violation is resolved when the administrative conversion PB is completed.

---

## 15. Validation Violations and Overrides

### `validation_violations`

Instance-level violation records.

```text
validation_rule_id
validation_code
request_id
return_id
user_id
name
department_id
department_name
status
```

Status:

```text
ACTIVE
OVERRIDDEN
RESOLVED
```

### `validation_overrides`

```text
violation_id
reason
valid_from
valid_until
is_active
created_by_user_id
created_by_name
revoked_by_user_id
revoked_by_name
revoked_at
revoke_reason
```

Overrides bypass a request restriction only. They do not alter the source transaction or due date.

---

## 16. Due Action Processor

Script:

```text
backend/scripts/process-due-actions.mjs
```

Command:

```bash
npm run process:due
```

It performs:

```text
1. Auto-accept expired requester Delivery Receipts
2. Refresh Delivery Discrepancy SLA status
3. Record Warehouse SLA breach rows
4. Refresh Return Overdue / Return Shortfall validation violations
```

Run periodically in production, recommended hourly.

Example cron:

```cron
5 * * * * cd /var/www/pilarweb/backend && /usr/bin/npm run process:due >> /var/log/pilarweb-due-actions.log 2>&1
```

Adjust npm/node path to the production installation if required.

---

## 17. Finance Report

Endpoint:

```http
GET /api/finance/reports/requests/export
```

Generated without extra XLSX npm dependency. The project includes a lightweight single-sheet XLSX writer in:

```text
src/utils/xlsx.util.js
```

Output is one row per Request Item/SKU.

`administrative_conversion_qty` is separate from `warehouse_dispatched_qty` so Return Shortfall administrative conversion is visible without pretending a second physical delivery occurred.

Financial Closing intentionally excludes Administrative Return Shortfall fulfillment from a second ISSUE movement. The original physical issue minus the actual warehouse return already represents the remaining inventory movement.

---

## 18. Financial Closing

Financial movement source:

### ISSUE

Only physical fulfillment with `dispatched_at` and `actual_qty > 0`.

### RETURN

Completed RB using Warehouse physical `warehouse_received_qty`.

Return Shortfall administrative PB is not counted as a second physical issue.

---

## 19. API Modules Added / Reworked

New/reworked implementation includes:

```text
src/services/policy.service.js
src/services/delivery.service.js
src/controllers/delivery.controller.js
src/routes/delivery.routes.js
scripts/process-due-actions.mjs
```

Major rewrites:

```text
request.service.js
approval.service.js
finance.service.js
warehouse.service.js
return.service.js
validation.service.js
report.service.js
closing.service.js
master.service.js
access.service.js
sequence.util.js
```

---

## 20. Obsolete Development Concepts Removed

Do not restore these structures:

```text
warehouse_handovers
return_receipts
return_receipt_items
item-level source warehouse
shortage_qty
shortage_reason_code
shortage_note
remainder_disposition
BACKORDER_REMAINDER
CLOSE_SHORT
PENDING_INVENTORY_TRANSFER
READY_FOR_HANDOVER
HANDED_OVER
old multi-cycle return inspection design
```

Physical truth is now separated into:

```text
Warehouse actual/dispatched qty
Requester physical received qty
Warehouse physical return qty
```

---

## 21. Development Reset Recommendation

Because this is still development and the flow changed substantially:

1. Replace backend with this full baseline.
2. Remove old SQL migration/seed files before copying the new DB folder.
3. Drop `pilarweb` dev database.
4. Load the new consolidated schema.
5. Run seeds 001-008.
6. `npm install` and `npm run check`.
7. Restart PM2.
8. Configure hourly `npm run process:due` execution.
9. Rebuild FE against the accompanying frontend integration document.

