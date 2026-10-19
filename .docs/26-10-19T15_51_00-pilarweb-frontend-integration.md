# Pilarweb Frontend Integration Guide

Baseline: 19 October 2026.

This document is the frontend contract for the backend in this ZIP. Do not use older Pilarweb flow documentation as the source of truth.

## 1. Final business flow

```text
Requester creates request
  -> Manager Approval
     -> Revert -> requester edits -> submit again
     -> Cancel -> terminal CANCELED
     -> Approve
        -> Finance Review per SKU / per quantity
           -> all rejected -> REJECTED
           -> at least one approved quantity
              -> Fulfillment auto-created
              -> PICKING
                 -> Print Picking Form
                 -> Save Progress as many times as needed
                 -> fill Source Warehouse at fulfillment HEADER
                 -> fill Actual Qty per SKU
                 -> fill IWT Number at fulfillment HEADER
                 -> Complete Picking
                    -> READY_FOR_DELIVERY
                    -> Print DO
                       -> automatic physical Handover
                       -> NON_RETURNABLE: HANDED_OVER final
                       -> RETURNABLE: RETURN_PENDING
                          -> Requester submits return declaration
                          -> Warehouse records actual returned quantity
                          -> partial actual return: RETURN_PARTIAL + department restriction
                          -> full actual return: COMPLETED
```

There is no Warehouse Request Queue / Accept step, no shortage/remainder/backorder flow, no manual Handover button, and no requester receipt-confirmation button.

## 2. Authentication and capability flags

Protected calls use PilarGroup JWT:

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

Relevant fields:

```json
{
  "can_create_request": true,
  "can_approve_department": false,
  "finance_access": false,
  "warehouse_access": false,
  "admin_access": false,
  "validation_override_access": false,
  "approval_rule_configured": true
}
```

`can_create_request` above represents job-level/approval-rule eligibility. Return restrictions are dynamic and must be checked with `GET /api/requests/eligibility`.

## 3. Target Department

Request form has a new field called **Target Department**.

- Default value = requester's own department.
- User may select another department.
- Use department data from:

```http
GET /api/internal/directory/departments
```

Request stores two independent snapshots:

```text
Requester Department = actual department of requester
Target Department    = business/historical target selected in form
```

Important:

- Manager approval uses **Requester Department**.
- Return restriction uses **Requester Department**.
- Target Department is historical/reporting data only.

Create request field:

```json
{
  "target_department_id": 14
}
```

If omitted, backend automatically uses requester's own department.

## 4. Request Purpose: Returnable vs Non-Returnable

Master purpose now has:

```text
return_type = NON_RETURNABLE | RETURNABLE
```

Read:

```http
GET /api/master/request-purposes
```

Example:

```json
{
  "id": 5,
  "code": "LOAN",
  "name": "Loan",
  "return_type": "RETURNABLE"
}
```

`return_type` is snapshotted into the transaction as `purpose_return_type` so changing the master later does not modify old requests.

When selected purpose is `RETURNABLE`, request form MUST provide:

```json
{
  "return_due_date": "2026-10-31"
}
```

Format is `YYYY-MM-DD`.

For `NON_RETURNABLE`, `return_due_date` is ignored/cleared by backend.

## 5. Request eligibility and department block

Before opening/enabling the New Request submit action, FE should call:

```http
GET /api/requests/eligibility
```

Example allowed:

```json
{
  "success": true,
  "data": {
    "can_create_request": true,
    "job_level_allowed": true,
    "approval_rule_configured": true,
    "department_id": 8,
    "department_name": "IT",
    "restrictions": [],
    "blocking_restrictions": []
  }
}
```

Example blocked:

```json
{
  "success": true,
  "data": {
    "can_create_request": false,
    "department_id": 8,
    "department_name": "IT",
    "blocking_restrictions": [
      {
        "code": "RETURN_QTY_INCOMPLETE",
        "request_number": "PWR-26-00125",
        "return_number": "RET-26-00010",
        "expected_qty": 10,
        "received_qty": 8,
        "outstanding_qty": 2,
        "due_date": "2026-10-25",
        "is_overridden": false
      }
    ]
  }
}
```

Backend also checks this again on `POST /api/requests` and on resubmit. Hiding a button is not the security control.

Restriction codes:

```text
RETURN_OVERDUE
RETURN_QTY_INCOMPLETE
```

Rules:

- `RETURN_OVERDUE`: return obligation is not complete and due date has passed.
- `RETURN_QTY_INCOMPLETE`: Warehouse has already recorded at least one return receipt, but total Warehouse actual received qty is still below actual issued qty.
- Restriction applies to the whole **Requester Department**, not only the user who created the problem request.
- An active Validation Override can bypass a restriction without modifying transaction facts.

## 6. Create Request

```http
POST /api/requests
Content-Type: application/json
```

Non-returnable example:

```json
{
  "request_purpose_id": 1,
  "target_department_id": 14,
  "reason": "Content production",
  "items": [
    {
      "itembase_item_id": "<ITEMBASE_UUID>",
      "requested_qty": 10,
      "notes": null
    }
  ]
}
```

Returnable example:

```json
{
  "request_purpose_id": 5,
  "target_department_id": 8,
  "reason": "Temporary equipment loan",
  "return_due_date": "2026-10-31",
  "items": [
    {
      "itembase_item_id": "<ITEMBASE_UUID>",
      "requested_qty": 10
    }
  ]
}
```

Create immediately creates a submitted request with status:

```text
PENDING_DEPARTMENT_APPROVAL
```

## 7. Requester endpoints

```http
GET  /api/requests/my
GET  /api/requests/:id
PUT  /api/requests/:id
POST /api/requests/:id/items
PUT  /api/requests/:id/items/:itemId
DELETE /api/requests/:id/items/:itemId
POST /api/requests/:id/submit
GET  /api/requests/:id/activity
GET  /api/requests/:id/comments
POST /api/requests/:id/comments
```

Requester may edit while status is:

```text
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
```

After Manager approval, requester can no longer directly edit.

## 8. Manager Approval

```http
GET  /api/approvals
GET  /api/approvals/:id
POST /api/approvals/:id/approve
POST /api/approvals/:id/revert
POST /api/approvals/:id/cancel
```

Approve:

```json
{ "note": "Approved" }
```

Revert:

```json
{ "reason": "Please correct request details" }
```

Cancel:

```json
{ "reason": "Request canceled by Manager" }
```

Manager approval is based on Requester Department, never Target Department.

## 9. Finance Review

Queue:

```http
GET /api/finance/requests
GET /api/finance/requests/history
GET /api/finance/requests/:requestId
```

Review:

```http
POST /api/finance/requests/:requestId/review
```

Finance works per SKU and may partially approve quantity.

Example request:

```text
SKU A requested 10
SKU B requested 5
```

Finance:

```json
{
  "note": "Finance review completed",
  "items": [
    {
      "request_item_id": 11,
      "decision": "APPROVED",
      "approved_qty": 8
    },
    {
      "request_item_id": 12,
      "decision": "APPROVED",
      "approved_qty": 3
    }
  ]
}
```

Backend stores:

```text
SKU A requested 10 -> approved 8 -> rejected 2
SKU B requested  5 -> approved 3 -> rejected 2
```

Full item rejection:

```json
{
  "request_item_id": 12,
  "decision": "REJECTED"
}
```

Then:

```text
approved_qty = 0
rejected_qty = requested_qty
```

At least one approved quantity automatically creates the Warehouse fulfillment and request becomes `PICKING`.

There is no Warehouse Accept action.

## 10. Finance XLSX download report

Finance can download a complete report where **one Excel row = one SKU/request item**:

```http
GET /api/finance/reports/requests/export
```

Response is an XLSX attachment, not JSON.

Optional filters:

```text
date_from=YYYY-MM-DD
date_to=YYYY-MM-DD
department_id=<requester department>
target_department_id=<target department>
purpose_id=<purpose id>
return_type=RETURNABLE|NON_RETURNABLE
status=<request status>
sku=<exact SKU>
search=<text>
```

Example:

```http
GET /api/finance/reports/requests/export?date_from=2026-10-01&date_to=2026-10-31&return_type=RETURNABLE
```

Excel includes request, Manager, Finance, SKU quantity, Warehouse, IWT, handover, return, restriction, and Validation Override columns.

Important quantity columns:

```text
Requested Qty
Finance Approved Qty
Finance Rejected Qty
Actual Picked Qty
Qty Difference
Requester Return Qty
Warehouse Actual Return Qty
Outstanding Return Qty
```

## 11. Warehouse fulfillment

Queue/list:

```http
GET /api/warehouse/fulfillments
```

Detail:

```http
GET /api/warehouse/fulfillments/:fulfillmentId
```

### Source Warehouse is now HEADER-level

Do not render a Source Warehouse selector per SKU.

Fulfillment header owns:

```text
source_warehouse_id
source_warehouse_internal_id
source_warehouse_code
source_warehouse_name
inventory_transfer_number
inventory_transfer_recorded_at
```

Every SKU inside one fulfillment uses the same Source Warehouse and IWT number.

Warehouse master:

```http
GET /api/master/warehouse-locations
```

Each row can contain:

```json
{
  "id": 13,
  "internal_id": 4,
  "code": "GOSAVE",
  "name": "Gosave"
}
```

`internal_id` is the optional NetSuite Location Internal ID.

## 12. Print Picking Form

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print-picking
```

Printing is an audited event. It does not advance the request status.

## 13. Save Progress

Save Progress is still required as a UX feature and may be called repeatedly while status is `PICKING`.

```http
PUT /api/warehouse/fulfillments/:fulfillmentId/progress
```

Example:

```json
{
  "source_warehouse_id": 13,
  "inventory_transfer_number": "IT2604868",
  "items": [
    {
      "fulfillment_item_id": 101,
      "actual_qty": 8,
      "note": null
    },
    {
      "fulfillment_item_id": 102,
      "actual_qty": 3,
      "note": null
    }
  ]
}
```

Rules:

- `actual_qty >= 0`.
- `actual_qty` cannot exceed Finance approved quantity.
- Actual quantity may be lower than approved quantity.
- There is no shortage reason, remainder action, backorder, or Close Short.
- Difference remains available for history/report only.
- Source Warehouse and IWT can be saved before final Complete Picking.

When a non-empty IWT Number is first saved or changed, backend automatically sets:

```text
inventory_transfer_recorded_at = NOW()
```

FE must not send the IWT timestamp.

## 14. Complete Picking

```http
POST /api/warehouse/fulfillments/:fulfillmentId/complete-picking
```

The endpoint accepts the same payload as Save Progress, so FE may send the final screen data directly.

Final validation requires:

- Source Warehouse selected.
- IWT Number present.
- Every SKU has Actual Qty.
- At least one SKU has Actual Qty > 0.
- Actual Qty never exceeds Finance Approved Qty.

Successful result:

```text
PICKING -> READY_FOR_DELIVERY
```

## 15. Print DO = automatic Handover

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print-do
```

First successful DO print automatically:

1. records DO print audit,
2. creates `warehouse_handovers`,
3. marks physical fulfillment as handed over,
4. branches by purpose return type.

For `NON_RETURNABLE`:

```text
READY_FOR_DELIVERY -> HANDED_OVER
```

`HANDED_OVER` is final for the request.

For `RETURNABLE`:

```text
READY_FOR_DELIVERY -> RETURN_PENDING
```

Backend automatically creates the return obligation from **Warehouse Actual Qty**, not requested/approved quantity.

DO reprint is allowed and does not create duplicate handover/return rows.

## 16. Return flow

List/detail:

```http
GET /api/returns
GET /api/returns/:id
```

For requesters, list only exposes their own return obligations. Warehouse/Admin/Finance/Validation-Override users may access broader operational return data.

### Requester submits return

```http
POST /api/returns/:id/submit
```

Payload:

```json
{
  "items": [
    {
      "return_item_id": 51,
      "requester_return_qty": 10,
      "note": null
    }
  ]
}
```

**Strict rule:** `requester_return_qty` MUST exactly equal `expected_qty`, where `expected_qty` is Warehouse Actual Qty issued during fulfillment.

Example:

```text
Requested       12
Finance Approved 10
Warehouse Actual 10
Return Expected  10
```

Requester must declare `10`.

### Warehouse records actual return

```http
POST /api/returns/:id/receive
```

`received_qty` is an incremental physical receipt quantity for this receipt event.

Example first physical receipt:

```json
{
  "note": "First physical return",
  "items": [
    {
      "return_item_id": 51,
      "received_qty": 8
    }
  ]
}
```

System becomes:

```text
Expected                  10
Requester declared        10
Warehouse actual received  8
Outstanding                2
Return status   PARTIALLY_RECEIVED
Request status  RETURN_PARTIAL
```

The requester department is now blocked from creating a new request because the physical return is incomplete.

Later Warehouse can receive the remaining 2 using the same endpoint:

```json
{
  "items": [
    {
      "return_item_id": 51,
      "received_qty": 2
    }
  ]
}
```

Then aggregate received qty reaches 10 and:

```text
Return status  COMPLETED
Request status COMPLETED
```

The incomplete-return restriction disappears automatically.

## 17. Validation Override

Validation Override is not transaction editing. It bypasses a restriction while keeping actual transaction facts unchanged.

Access is NOT based automatically on IT Department. It uses the dedicated access table `validation_override_users`.

Capability:

```text
validation_override_access = true
```

### See restrictions for a department

```http
GET /api/validation-overrides/restrictions?department_id=8
```

### List overrides

```http
GET /api/validation-overrides
```

Optional filters:

```text
department_id
request_id
active=1|0
```

### Create override

```http
POST /api/validation-overrides
```

Example:

```json
{
  "validation_code": "RETURN_QTY_INCOMPLETE",
  "department_id": 8,
  "department_name": "IT",
  "request_id": "<REQUEST_UUID>",
  "reason": "Management-approved exception for unresolved physical return",
  "valid_until": "2026-10-31T23:59:59+07:00"
}
```

Allowed codes:

```text
RETURN_OVERDUE
RETURN_QTY_INCOMPLETE
ALL_RETURN_RESTRICTIONS
```

`request_id` is optional. If omitted, the override can apply to the matching validation for the department generally.

### Revoke override

```http
POST /api/validation-overrides/:id/revoke
```

```json
{
  "reason": "Exception is no longer required"
}
```

Overrides are revoked, not hard-deleted, to preserve audit history.

## 18. Admin: who may use Validation Override

Admin-only:

```http
GET  /api/master/validation-override-users
POST /api/master/validation-override-users
PUT  /api/master/validation-override-users/:id
```

Create example:

```json
{
  "user_id": "<PILARGROUP_CANONICAL_UUID>",
  "user_name_snapshot": "User Name",
  "is_active": 1
}
```

To remove access, update `is_active` to `0`.

Do not infer this access from Department IT in frontend.

## 19. Admin Request Purpose

```http
POST /api/master/request-purposes
PUT  /api/master/request-purposes/:id
DELETE /api/master/request-purposes/:id
```

Payload includes:

```json
{
  "code": "LOAN",
  "name": "Loan",
  "description": "Temporary loan",
  "return_type": "RETURNABLE",
  "sort_order": 50,
  "is_active": 1
}
```

## 20. Admin Warehouse master

```http
GET  /api/master/warehouse-locations
POST /api/master/warehouse-locations
PUT  /api/master/warehouse-locations/:id
```

Create/update example:

```json
{
  "internal_id": 4,
  "code": "GOSAVE",
  "name": "Gosave",
  "is_active": 1
}
```

`internal_id` is optional:

```json
{
  "internal_id": null,
  "code": "LOCAL_TEMP",
  "name": "Local Temporary Warehouse",
  "is_active": 1
}
```

## 21. Generic request report

Operational report (JSON, one row per SKU):

```http
GET /api/reports/requests
```

Available to Admin / Finance / Warehouse according to backend authorization.

Supports the same major filter dimensions as the Finance XLSX export.

## 22. Request status reference

```text
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
PENDING_FINANCE_REVIEW
PICKING
READY_FOR_DELIVERY
HANDED_OVER
RETURN_PENDING
RETURN_SUBMITTED
RETURN_PARTIAL
COMPLETED
REJECTED
CANCELED
```

Interpretation:

- `HANDED_OVER`: non-returnable request is physically sent and complete.
- `RETURN_PENDING`: returnable goods handed over; waiting requester return declaration.
- `RETURN_SUBMITTED`: requester declared the full expected return quantity.
- `RETURN_PARTIAL`: Warehouse physically received less than the issued quantity.
- `COMPLETED`: returnable obligation fully physically received by Warehouse.

## 23. Removed frontend concepts

Delete old frontend logic/UI for:

```text
Warehouse Request Queue / Accept
Shortage Reason
Shortage Qty
Remainder Disposition
Backorder Remainder
Close Short
Manual Handover button
Requester Receive button
Source Warehouse per SKU
IWT Number per SKU
Dynamic Returnable workflow engine
```

## 24. Recommended sidebar

```text
Dashboard
Requests
  - My Requests
  - New Request
Approvals
Finance
  - Review
  - History
  - Download Report
Warehouse
  - Fulfillment / Picking
  - Handovers
  - Returns
Validation Override          # only when validation_override_access=true
Finance Closing
Settings                     # admin only
```

Frontend visibility is convenience only. Backend remains authoritative for access and workflow validation.
