# Pilarweb Frontend Integration Guide

This document is the frontend source of truth for the simplified Pilarweb flow introduced on 2026-10-13.

## 0. Delete Files Unused

Delete files unsued first on 'backend' directory in powershell

```Remove-Item `
  "database/migrations/002_workflow_configuration.sql", `
  "database/migrations/006_returns.sql", `
  "database/migrations/007_financial_closing.sql", `
  "database/migrations/008_activity_audit.sql", `
  "database/migrations/009_transaction_api_support.sql", `
  "database/migrations/010_request_edit_revert_item_cancel.sql", `
  "database/migrations/011_finance_rejected_qty_shortage_enum_handover_list.sql", `
  "database/seeds/002_workflow_definitions.sql", `
  "database/seeds/003_warehouse_locations.sql", `
  "database/seeds/004_financial_closing_settings.sql", `
  "database/seeds/005_approval_rules_placeholder.sql", `
  "database/seeds/006_module_access_rules_placeholder.sql", `
  "src/controllers/return.controller.js", `
  "src/routes/return.routes.js", `
  "src/services/return.service.js" `
  -Force```

## 1. Core Flow

Pilarweb now uses one fixed, non-returnable operational flow for every Request Purpose:

```text
Staff Request
→ Manager Approval
→ Finance Review
→ Picking / Fulfillment
→ Ready for Delivery
→ Print Delivery Order
→ HANDED_OVER
```

Manager can choose:

```text
Approve
Revert
Cancel
```

Finance decides per SKU/item and may approve only part of the requested quantity.

Warehouse no longer resolves shortages, backorders, remainders, or returns. The actual picked quantity is stored as a historical fact even when it is lower than Finance-approved quantity.

## 2. Removed Concepts

Frontend must remove all UI and API integrations related to:

```text
Returnable / Non-Returnable workflow selection
Return Due Date
Returns / Return Inspection
Warehouse Request Queue / Accept Request
Shortage Reason
Shortage Qty
Backorder Remainder
Close Short
Confirm Picking as a separate shortage-resolution step
Separate Inventory Transfer screen
Separate Handover button
Requester Receive / Confirm Receipt
```

The following request statuses are no longer used:

```text
READY_FOR_WAREHOUSE
PENDING_INVENTORY_TRANSFER
READY_FOR_HANDOVER
PARTIALLY_FULFILLED
RETURN_PENDING
PARTIALLY_RETURNED
COMPLETED
```

## 3. Current Request Statuses

Frontend should recognize only these business statuses:

```text
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
PENDING_FINANCE_REVIEW
PICKING
READY_FOR_DELIVERY
HANDED_OVER
REJECTED
CANCELED
```

Meaning:

| Status | Meaning |
|---|---|
| `PENDING_DEPARTMENT_APPROVAL` | Waiting for Manager action |
| `REVERTED_TO_REQUESTER` | Manager returned request to requester for revision |
| `PENDING_FINANCE_REVIEW` | Manager approved; waiting for Finance |
| `PICKING` | Finance approved at least one quantity; fulfillment was created automatically |
| `READY_FOR_DELIVERY` | Warehouse finished picking and IWT data is complete |
| `HANDED_OVER` | Delivery Order was printed and goods are considered dispatched / handed over |
| `REJECTED` | Finance rejected all quantities |
| `CANCELED` | Manager canceled the request |

`HANDED_OVER` is the final successful operational status.

## 4. Authentication and Capabilities

Use the existing PilarGroup JWT.

```http
Authorization: Bearer <PILARGROUP_JWT>
```

Current user:

```http
GET /api/auth/me
```

Capabilities:

```http
GET /api/auth/capabilities
```

Use capability flags for menu/action visibility. Do not duplicate backend job-level rules in frontend code.

## 5. Master Data

Bootstrap:

```http
GET /api/master/bootstrap
```

The bootstrap response contains:

```text
request_purposes
approval_rules
warehouse_locations
financial_closing
flow
```

There is no workflow definition or purpose-to-workflow mapping anymore.

Removed endpoints:

```http
GET  /api/master/workflows
GET  /api/master/purpose-workflows
POST /api/master/purpose-workflows
```

Request purposes:

```http
GET /api/master/request-purposes
```

All purposes use the same non-returnable flow.

Warehouse locations:

```http
GET /api/master/warehouse-locations
```

These are source warehouses only, for example:

```text
GOTO
GOSAVE
```

Frontend no longer needs to display or configure a Loan warehouse selector.

## 6. Itembase

Item list:

```http
GET /api/item/items
```

Item detail:

```http
GET /api/item/items/:id
```

Pilarweb only accepts regular items.

## 7. Create Request

```http
POST /api/requests
Content-Type: application/json
```

Example:

```json
{
  "request_purpose_id": 1,
  "reason": "Goods required for campaign activity",
  "items": [
    {
      "itembase_item_id": "<ITEMBASE_UUID>",
      "requested_qty": 10,
      "notes": null
    },
    {
      "itembase_item_id": "<ITEMBASE_UUID>",
      "requested_qty": 5,
      "notes": "Optional note"
    }
  ]
}
```

Do not send:

```text
workflow_definition_id
workflow_code
requires_return
return_due_date
```

A newly created request immediately becomes:

```text
PENDING_DEPARTMENT_APPROVAL
```

There is no Draft step in the primary flow.

## 8. Requester Editing

Request detail:

```http
GET /api/requests/:id
```

Update header:

```http
PUT /api/requests/:id
```

Example:

```json
{
  "request_purpose_id": 2,
  "reason": "Updated business reason"
}
```

Add item:

```http
POST /api/requests/:id/items
```

Update item:

```http
PUT /api/requests/:id/items/:itemId
```

Remove item:

```http
DELETE /api/requests/:id/items/:itemId
```

Requester editing is allowed while status is:

```text
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
```

At least one item must remain in the request.

When Manager reverts a request, requester edits it and submits it again using:

```http
POST /api/requests/:id/submit
```

This endpoint is specifically for a request in `REVERTED_TO_REQUESTER` state.

After resubmit:

```text
REVERTED_TO_REQUESTER
→ PENDING_DEPARTMENT_APPROVAL
```

## 9. Manager Approval

Queue:

```http
GET /api/approvals
```

Detail:

```http
GET /api/approvals/:id
```

Manager has exactly three main actions.

### Approve

```http
POST /api/approvals/:id/approve
```

Example:

```json
{
  "note": "Approved"
}
```

Result:

```text
PENDING_DEPARTMENT_APPROVAL
→ PENDING_FINANCE_REVIEW
```

Finance Review records are created automatically.

### Revert

```http
POST /api/approvals/:id/revert
```

Payload:

```json
{
  "reason": "Please revise quantity and justification"
}
```

Result:

```text
PENDING_DEPARTMENT_APPROVAL
→ REVERTED_TO_REQUESTER
```

Frontend should show the revert reason to requester.

### Cancel

```http
POST /api/approvals/:id/cancel
```

Payload:

```json
{
  "reason": "Request is no longer required"
}
```

Result:

```text
PENDING_DEPARTMENT_APPROVAL
→ CANCELED
```

Removed Manager endpoints:

```http
POST /api/approvals/:id/reject
POST /api/approvals/:id/items/:itemId/cancel
```

Manager cancellation is now request-level.

## 10. Finance Review

Finance queue:

```http
GET /api/finance/requests
```

Finance history:

```http
GET /api/finance/requests/history
```

Detail:

```http
GET /api/finance/requests/:requestId
```

Submit review:

```http
POST /api/finance/requests/:requestId/review
```

Finance has only two item decisions:

```text
APPROVED
REJECTED
```

There is no `CANCELED` Finance item decision.

Example requested quantities:

```text
Item A requested = 10
Item B requested = 5
```

Finance can submit:

```json
{
  "note": "Finance review completed",
  "items": [
    {
      "request_item_id": 11,
      "decision": "APPROVED",
      "approved_qty": 8,
      "note": null
    },
    {
      "request_item_id": 12,
      "decision": "APPROVED",
      "approved_qty": 3,
      "note": null
    }
  ]
}
```

Backend stores:

```text
Item A:
requested_qty_snapshot = 10
approved_qty           = 8
rejected_qty           = 2

Item B:
requested_qty_snapshot = 5
approved_qty           = 3
rejected_qty           = 2
```

For a fully rejected item:

```json
{
  "request_item_id": 12,
  "decision": "REJECTED",
  "approved_qty": 0,
  "note": "Not approved"
}
```

Backend stores:

```text
approved_qty = 0
rejected_qty = requested_qty_snapshot
```

`rejected_qty` is calculated by backend. Frontend does not need to send it.

If Finance approves at least one quantity, backend automatically creates the Warehouse fulfillment and request status becomes:

```text
PICKING
```

There is no Warehouse Accept step.

If every item is rejected:

```text
REJECTED
```

## 11. Warehouse Fulfillment List

There is no Request Queue anymore.

Use:

```http
GET /api/warehouse/fulfillments
```

Optional filters:

```http
GET /api/warehouse/fulfillments?status=PICKING
GET /api/warehouse/fulfillments?status=READY_FOR_DELIVERY
GET /api/warehouse/fulfillments?status=HANDED_OVER
GET /api/warehouse/fulfillments?search=PWR-26
GET /api/warehouse/fulfillments?page=1&limit=20
```

Valid fulfillment statuses:

```text
PICKING
READY_FOR_DELIVERY
HANDED_OVER
```

Fulfillment detail:

```http
GET /api/warehouse/fulfillments/:fulfillmentId
```

Each Finance-approved request creates exactly one fulfillment.

## 12. Picking Form Print

Before physical picking, Warehouse may print the Picking Form:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print-picking
```

This increments print audit fields:

```text
picking_print_count
last_picking_printed_by_user_id
last_picking_printed_by_name
last_picking_printed_at
```

Printing does not move the status.

## 13. Picking Screen

The Picking screen should show per item:

```text
SKU
Item Name
Requested Qty
Finance Approved Qty
Finance Rejected Qty
Actual Qty
Source Warehouse
IWT Number
IWT Recorded At
Note
```

Do not show:

```text
Shortage Qty
Shortage Reason
Remainder Action
Backorder
Close Short
```

There is no shortage workflow anymore.

## 14. Save Progress

Warehouse must still have a `Save Progress` action.

Endpoint:

```http
PUT /api/warehouse/fulfillments/:fulfillmentId/progress
```

Payload can contain only the rows currently changed by user.

Example:

```json
{
  "items": [
    {
      "fulfillment_item_id": 21,
      "actual_qty": 7,
      "source_warehouse_code": "GOTO",
      "inventory_transfer_number": "IT2604868",
      "note": null
    },
    {
      "fulfillment_item_id": 22,
      "actual_qty": 3,
      "source_warehouse_code": "GOSAVE",
      "inventory_transfer_number": "IT2604869",
      "note": "Picked from Gosave"
    }
  ]
}
```

Save Progress does not finalize picking.

Status remains:

```text
PICKING
```

Backend updates:

```text
progress_saved_by_user_id
progress_saved_by_name
progress_saved_at
```

### IWT timestamp

Frontend must not send an IWT date/time field.

When a non-empty `inventory_transfer_number` is saved for the first time or changed to another number, backend automatically records:

```text
inventory_transfer_recorded_at = NOW()
```

Therefore the IWT timestamp represents when that IWT number was submitted to Pilarweb.

If the IWT number is cleared, `inventory_transfer_recorded_at` is also cleared.

## 15. Actual Qty Rule

Actual Qty does not need to equal Finance Approved Qty.

Example:

```text
Requested        = 10
Finance Approved = 8
Finance Rejected = 2
Actual Picked    = 7
```

This is valid.

There is no remainder/backorder action for the missing 1 unit.

The difference is simply historical/reporting data:

```text
difference_qty = finance_approved_qty - actual_qty
               = 8 - 7
               = 1
```

Backend still prevents Warehouse from entering an `actual_qty` greater than the Finance-approved quantity.

`actual_qty = 0` is allowed if Warehouse actually picked zero, but Source Warehouse and IWT are still required when finalizing the current flow.

## 16. Complete Picking

Final picking endpoint:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/complete-picking
```

The final button may send the same item payload directly, so frontend does not need to call Save Progress first.

Example:

```json
{
  "items": [
    {
      "fulfillment_item_id": 21,
      "actual_qty": 7,
      "source_warehouse_code": "GOTO",
      "inventory_transfer_number": "IT2604868"
    },
    {
      "fulfillment_item_id": 22,
      "actual_qty": 3,
      "source_warehouse_code": "GOSAVE",
      "inventory_transfer_number": "IT2604869"
    }
  ]
}
```

This endpoint saves the submitted values and validates all fulfillment items in one transaction.

Every fulfillment item must have:

```text
actual_qty
source_warehouse_code
inventory_transfer_number
inventory_transfer_recorded_at
```

On success:

```text
PICKING
→ READY_FOR_DELIVERY
```

This is the recommended UX:

```text
[Save Progress]       [Complete Picking]
```

`Save Progress` is optional and repeatable.

`Complete Picking` is the final Warehouse data submission before printing DO.

## 17. Source Warehouse and IWT

Source Warehouse values come from:

```http
GET /api/master/warehouse-locations
```

Examples:

```text
GOTO
GOSAVE
```

`inventory_transfer_number` is stored as uppercase text.

Frontend should not generate an IWT number.

Different SKUs may have different Source Warehouse and IWT Number in the same fulfillment.

## 18. Print Delivery Order and Automatic Handover

After status becomes `READY_FOR_DELIVERY`, Warehouse prints the Delivery Order using:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print-do
```

Optional payload:

```json
{
  "note": "Dispatched to requester"
}
```

On the first successful DO print, backend automatically performs all of these actions:

```text
increment DO print count
record DO print user/time
create warehouse_handover
set handed_over_at = NOW()
fulfillment status = HANDED_OVER
request status = HANDED_OVER
request completed_at = NOW()
```

There is no separate Handover button.

There is no requester Receive button.

The first DO print is the business event that means goods have left Warehouse.

Reprinting an already handed-over DO is allowed. A reprint only increments print audit data and does not replace the original `handed_over_at`.

## 19. Handover List

Use:

```http
GET /api/warehouse/handovers
```

Filters:

```http
GET /api/warehouse/handovers?page=1&limit=20
GET /api/warehouse/handovers?search=PWR-26
```

Handover is now a history/list view, not a separate action queue.

Typical response fields include:

```text
handover_id
handover_status
handed_over_by_name
handed_over_at
request_id
request_number
request_purpose_name
requester_name
department_name
fulfillment_id
fulfillment_number
do_print_count
last_do_printed_at
item_count
total_actual_qty
```

Removed endpoints:

```http
POST /api/warehouse/requests/:requestId/accept
PUT  /api/warehouse/fulfillments/:fulfillmentId/items/:fulfillmentItemId
POST /api/warehouse/fulfillments/:fulfillmentId/confirm-picking
POST /api/warehouse/fulfillments/:fulfillmentId/inventory-transfers
PUT  /api/warehouse/inventory-transfers/:transferId
DELETE /api/warehouse/inventory-transfers/:transferId
POST /api/warehouse/fulfillments/:fulfillmentId/handover
POST /api/warehouse/handovers/:handoverId/receive
```

## 20. Request Report

New report endpoint:

```http
GET /api/reports/requests
```

The report is item/SKU-level: one row per request item.

Access is available to users with at least one of these module capabilities:

```text
ADMIN
FINANCE
WAREHOUSE
```

Supported filters:

```http
GET /api/reports/requests?page=1&limit=50
GET /api/reports/requests?date_from=2026-10-01&date_to=2026-10-31
GET /api/reports/requests?department_id=14
GET /api/reports/requests?purpose_id=1
GET /api/reports/requests?status=HANDED_OVER
GET /api/reports/requests?search=PWR-26
```

Search covers:

```text
Request Number
Requester Name
Department Name
SKU / Item Code
Item Name
IWT Number
```

Important report fields:

```text
request_id
request_number
request_date
request_status
request_purpose_name
requester_name
department_name
company_name
manager_status
manager_name
manager_decided_at
manager_revert_reason
finance_status
finance_reviewer_name
finance_reviewed_at
request_item_id
item_code
item_name
selling_name
variant_name
uom_code
requested_qty
finance_item_decision
finance_approved_qty
finance_rejected_qty
fulfillment_id
fulfillment_number
fulfillment_status
last_picking_printed_at
progress_saved_at
picking_completed_at
last_do_printed_at
actual_qty
difference_qty
source_warehouse_code
source_warehouse_name
inventory_transfer_number
inventory_transfer_recorded_at
handed_over_by_name
handed_over_at
```

For quantity reporting, use:

```text
Requested Qty
Finance Approved Qty
Finance Rejected Qty
Actual Qty
Difference Qty
```

Do not reconstruct these numbers in frontend from old shortage/remainder logic.

## 21. Financial Closing

Financial Closing still exists.

Because all requests are non-returnable, closing uses only actual handed-over quantities.

Issued date is:

```text
warehouse_handovers.handed_over_at
```

Adjustment quantity is:

```text
adjustment_qty = actual_issued_qty
```

There is no returned quantity offset anymore.

Existing Financial Closing endpoints remain:

```http
GET  /api/financial-closing/periods
POST /api/financial-closing/periods
GET  /api/financial-closing/periods/:id
POST /api/financial-closing/periods/:id/start-closing
POST /api/financial-closing/periods/:id/generate-batch
POST /api/financial-closing/periods/:id/close
GET  /api/financial-closing/batches/:id
POST /api/financial-closing/batches/:id/post
```

## 22. Recommended Sidebar

Recommended menu after flow simplification:

```text
Dashboard
Requests
  - My Requests
  - New Request
Approvals
Finance Review
Warehouse
  - Picking / Fulfillment
  - Handovers
Reports
Finance Closing
Settings
```

Remove:

```text
Warehouse Request Queue
Returns
Return Inspection
```

## 23. Recommended Warehouse Picking UI

A single fulfillment screen is recommended:

```text
Request Header
Manager / Finance Summary

Picking Form
[Print Picking Form]

Items Table
-------------------------------------------------------------
SKU | Approved | Actual | Source Warehouse | IWT No. | Note
-------------------------------------------------------------

[Save Progress]                         [Complete Picking]
```

After `Complete Picking` succeeds and status becomes `READY_FOR_DELIVERY`:

```text
[Print Delivery Order]
```

When Print Delivery Order succeeds, UI should immediately refresh to:

```text
HANDED_OVER
```

Do not display another Handover confirmation button.

## 24. Important Frontend Migration Checklist

Frontend team should make these changes together:

1. Remove returnable/workflow UI.
2. Remove Return Due Date from request form.
3. Replace Manager Reject with Manager Cancel.
4. Remove Manager per-item cancellation UI.
5. Keep Finance quantity-level Approve/Reject.
6. Remove Warehouse Request Queue and Accept button.
7. Use `/api/warehouse/fulfillments` as Warehouse operational list.
8. Remove shortage/remainder fields completely.
9. Put Actual Qty, Source Warehouse, and IWT No. on the same Picking screen.
10. Keep `Save Progress`.
11. Use `Complete Picking` for final Warehouse submission.
12. Do not send IWT date/time; backend generates it.
13. Replace separate Handover action with `Print DO`.
14. Remove requester receipt confirmation.
15. Add overall Request Report using `/api/reports/requests`.
16. Use `HANDED_OVER` as the successful final status.

