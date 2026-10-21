# Pilarweb Frontend Integration Guide

Timestamp baseline: 21 October 2026 09:36 WIB  
Backend baseline: `backend(20261021-032043).zip` rewritten to the final PB/RB + delivery receipt + return-shortfall flow.

This document is the frontend contract for the current Pilarweb backend. Do not reuse UI assumptions from the previous Handover, remainder, shortage, or old Return flow.

---

## 1. Core Business Flow

### 1.1 Normal PB

```text
Requester creates PB
PB[yy][mm][xxxxx]
        |
        v
PENDING_DEPARTMENT_APPROVAL
        |
        +-- Manager Revert --> REVERTED_TO_REQUESTER --> requester edits --> submit again
        +-- Manager Cancel --> CANCELED
        +-- Manager Approve
                 |
                 v
        PENDING_FINANCE_REVIEW
                 |
                 +-- all SKU rejected --> REJECTED
                 +-- at least one SKU approved
                              |
                              v
                           PICKING
                              |
                    Warehouse flow
                              |
                              v
                    READY_FOR_DISPATCH
                              |
                         Print DO
                              |
                              v
                         DISPATCHED
                              |
                    Requester confirms
                    physical receipt
                              |
              +---------------+---------------+
              |                               |
         full receipt                    partial receipt
              |                               |
              v                               v
          RECEIVED                    PARTIALLY_RECEIVED
              |                               |
              |                      Warehouse discrepancy
              |                     RESEND / CLOSE_WITH_REASON
              |                               |
              +---------------+---------------+
                              |
                         final receipt
                              |
                +-------------+-------------+
                |                           |
        NON_RETURNABLE                 RETURNABLE
                |                           |
           COMPLETED                  RETURN_PENDING
                                            |
                                    one final RB cycle
                                            |
                                       COMPLETED
```

There is no `HANDED_OVER` status in this baseline.

`DISPATCHED` means Warehouse has physically sent the goods. `RECEIVED` means the requester has confirmed the actual physical quantity, or the system has auto-accepted after the configured confirmation deadline.

---

## 2. Document Numbering

### PB request number

Format:

```text
PB[yy][mm][xxxxx]
```

Examples:

```text
PB261000001
PB261000002
PB261100001
```

The 5-digit increment resets every calendar month. Month resolution follows `Asia/Jakarta`.

### RB return number

Format:

```text
RB[yy][mm][xxxxx]
```

PB and RB have separate monthly sequences.

Examples:

```text
RB261000001
RB261000002
RB261100001
```

The frontend must never generate PB/RB numbers.

---

## 3. Authentication and Capabilities

Protected APIs use the PilarGroup JWT.

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

Relevant capability fields:

```json
{
  "can_create_request": true,
  "can_approve_department": false,
  "finance_access": false,
  "warehouse_access": false,
  "warehouse_discrepancy_supervisor_access": false,
  "admin_access": false,
  "validation_override_access": false,
  "approval_rule_configured": true
}
```

Frontend menu/action visibility should use these flags. Backend authorization remains authoritative.

Important: `can_create_request` reflects job-level eligibility. Return violations are checked separately by the request eligibility endpoint and again by backend on create/resubmit.

---

## 4. Request Eligibility / Dynamic Blocking

Before showing an enabled New Request action, call:

```http
GET /api/requests/eligibility
```

Example allowed:

```json
{
  "success": true,
  "data": {
    "can_create_request": true,
    "restrictions": []
  }
}
```

Example blocked:

```json
{
  "success": true,
  "data": {
    "can_create_request": false,
    "restrictions": [
      {
        "violation_id": 15,
        "code": "RETURN_OVERDUE",
        "name": "Return Overdue",
        "block_scope": "DEPARTMENT",
        "request_number": "PB261000123",
        "return_number": "RB261000044",
        "return_due_at": "2026-11-04 10:15:00",
        "allow_override": true
      }
    ]
  }
}
```

Blocking scope is dynamic master data:

```text
NONE
USER
DEPARTMENT
```

Do not implement block scope logic in FE. Render the backend result.

Current default rules:

```text
RECEIPT_AUTO_ACCEPTED  -> USER       -> not blocking by default
RETURN_OVERDUE         -> DEPARTMENT -> blocking
RETURN_SHORTFALL       -> USER       -> blocking
```

Admin can change these rules without deployment.

---

## 5. Request Form

### Request purposes

```http
GET /api/master/request-purposes
```

Normal selectable purposes exclude the system purpose `RETURN_SHORTFALL`.

Each purpose contains:

```text
return_type = NON_RETURNABLE | RETURNABLE
```

`RETURN_SHORTFALL` is system-only and cannot be selected manually.

### Target Department

The request stores two department contexts:

```text
Requester Department
Target Department
```

Requester Department is derived from `/api/auth/me` and controls Manager approval and requester violations.

Target Department is historical/reporting metadata only. Default it to the requester's own department, but allow the user to select another department.

Department source:

```http
GET /api/internal/directory/departments
```

Do not use Target Department to choose Manager approval.

### Create request

```http
POST /api/requests
Content-Type: application/json
```

Example:

```json
{
  "request_purpose_id": 5,
  "target_department_id": 14,
  "reason": "Loan items for Marketing activity",
  "items": [
    {
      "itembase_item_id": "<ITEMBASE_UUID>",
      "requested_qty": 10,
      "notes": null
    }
  ]
}
```

Important:

- Request is created directly as `PENDING_DEPARTMENT_APPROVAL`.
- FE does not generate PB number.
- FE does not input `return_due_at`.
- Return due date is created later, only after physical delivery is fully resolved.
- Only regular Itembase items are accepted.

### My requests

```http
GET /api/requests/my?page=1&limit=20
GET /api/requests/my?status=PENDING_DEPARTMENT_APPROVAL
GET /api/requests/my?search=PB2610
```

Alias:

```http
GET /api/requests
```

### Detail

```http
GET /api/requests/:id
```

Request detail can contain:

```text
items
approvals
finance_review
fulfillments[]
fulfillments[].delivery_receipt
delivery_discrepancies[]
return
```

### Request editing

Editable requester statuses:

```text
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
```

Endpoints:

```http
PUT    /api/requests/:id
POST   /api/requests/:id/items
PUT    /api/requests/:id/items/:itemId
DELETE /api/requests/:id/items/:itemId
```

System-generated shortfall PB cannot be edited by the requester.

### Resubmit after Manager revert

```http
POST /api/requests/:id/submit
```

Only `REVERTED_TO_REQUESTER` normal PB can use this endpoint.

---

## 6. Itembase

Pilarweb exposes only:

```http
GET /api/item/items
GET /api/item/items/:id
```

Pilarweb forces `item_kind=regular` server-side. Do not expose internal Itembase secret in FE.

---

## 7. Manager Approval

Queue:

```http
GET /api/approvals
```

Detail:

```http
GET /api/approvals/:id
```

Actions:

```http
POST /api/approvals/:id/approve
POST /api/approvals/:id/revert
POST /api/approvals/:id/cancel
```

Approve payload:

```json
{
  "note": "Approved"
}
```

Revert payload:

```json
{
  "reason": "Please revise the quantity"
}
```

Cancel payload:

```json
{
  "reason": "Request is not required"
}
```

Manager flow only applies to `request_origin=NORMAL`.

System-generated `RETURN_SHORTFALL` PB skips Manager entirely and starts at Finance Review.

---

## 8. Finance Review

Queue:

```http
GET /api/finance/requests
GET /api/finance/requests?origin=NORMAL
GET /api/finance/requests?origin=RETURN_SHORTFALL
```

History:

```http
GET /api/finance/requests/history
```

Detail:

```http
GET /api/finance/requests/:requestId
```

Review:

```http
POST /api/finance/requests/:requestId/review
```

Example:

```json
{
  "note": "Finance review completed",
  "items": [
    {
      "request_item_id": 101,
      "decision": "APPROVED",
      "approved_qty": 8,
      "note": null
    },
    {
      "request_item_id": 102,
      "decision": "REJECTED",
      "approved_qty": 0,
      "note": "Not approved"
    }
  ]
}
```

Backend stores three distinct quantities:

```text
requested_qty_snapshot
approved_qty
rejected_qty
```

For an approved item:

```text
rejected_qty = requested_qty_snapshot - approved_qty
```

Example:

```text
Requested = 10
Approved  = 8
Rejected  = 2
```

For a full item rejection:

```text
Requested = 5
Approved  = 0
Rejected  = 5
```

If at least one SKU is approved, backend automatically creates the fulfillment. There is no Warehouse Request Queue / Accept action.

---

## 9. Warehouse Fulfillment

### List

```http
GET /api/warehouse/fulfillments
GET /api/warehouse/fulfillments?status=PICKING
GET /api/warehouse/fulfillments?mode=PHYSICAL
GET /api/warehouse/fulfillments?mode=ADMINISTRATIVE
```

Detail:

```http
GET /api/warehouse/fulfillments/:fulfillmentId
```

### Source Warehouse location

Source Warehouse is stored on the fulfillment HEADER, not per SKU row.

Warehouse master:

```http
GET /api/master/warehouse-locations
```

Fields include:

```text
id
internal_id  // optional NetSuite location internal ID
code
name
```

One fulfillment = one Source Warehouse.

If operationally another warehouse must send a supplemental quantity, that is represented by another fulfillment.

### Print Picking Form

Physical fulfillment only:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print-picking
```

Printing is an audited event, not a new request status.

### Save Progress

```http
PUT /api/warehouse/fulfillments/:fulfillmentId/progress
```

Example:

```json
{
  "source_warehouse_id": 12,
  "inventory_transfer_number": "IT2604868",
  "items": [
    {
      "fulfillment_item_id": 51,
      "actual_qty": 8,
      "note": null
    },
    {
      "fulfillment_item_id": 52,
      "actual_qty": 3,
      "note": null
    }
  ]
}
```

`Save Progress` may be called multiple times while fulfillment is editable.

Important:

- IWT is stored at fulfillment header.
- `inventory_transfer_recorded_at` is generated by backend when a new/changed IWT number is saved.
- FE must not send IWT timestamp.
- Actual Qty cannot exceed Finance Approved Qty.
- There is no shortage/remainder field anymore.

Removed concepts:

```text
shortage_qty
shortage_reason_code
shortage_note
remainder_disposition
BACKORDER_REMAINDER
CLOSE_SHORT
```

### Complete Physical Picking

```http
POST /api/warehouse/fulfillments/:fulfillmentId/complete
```

Payload may contain the same fields as Save Progress so FE can save the final values in the same request.

Before completion, backend requires:

```text
Source Warehouse
IWT Number
Actual Qty for every fulfillment item
At least one Actual Qty > 0
```

Result:

```text
PICKING -> READY_FOR_DISPATCH
```

### Print DO / Dispatch

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print-do
```

First successful Print DO changes physical fulfillment to:

```text
DISPATCHED
```

and creates a `delivery_receipt` for requester confirmation.

This does NOT mean the requester has physically received the goods yet.

---

## 10. Requester Physical Receipt

### My delivery confirmations

```http
GET /api/deliveries/my
GET /api/deliveries/my?status=PENDING
```

Detail:

```http
GET /api/deliveries/:id
```

The requester must input actual physical quantity received for every row.

### Confirm receipt

```http
POST /api/deliveries/:id/confirm
```

Example full receipt:

```json
{
  "items": [
    {
      "delivery_receipt_item_id": 201,
      "received_qty": 5
    }
  ]
}
```

Example partial receipt:

```json
{
  "items": [
    {
      "delivery_receipt_item_id": 201,
      "received_qty": 3
    }
  ]
}
```

If Warehouse dispatched 5 and requester receives 3:

```text
dispatched_qty  = 5
received_qty    = 3
discrepancy_qty = 2
```

The receipt becomes `PARTIAL` and request becomes `PARTIALLY_RECEIVED`.

Requester cannot manually confirm after the receipt confirmation deadline.

---

## 11. Automatic Receipt Acceptance

Policy field:

```text
receipt_confirmation_days
```

Initial seed:

```text
2 calendar days
```

If requester has not confirmed before the deadline, backend automatically sets:

```text
received_qty = dispatched_qty
confirmation_method = AUTO
status = RECEIVED
```

Manual confirmation is permanently closed for that shipment after auto-accept.

The app creates a `RECEIPT_AUTO_ACCEPTED` validation violation for audit. It is non-blocking by default, but the validation rule is Admin-configurable.

Production must run the due-action processor periodically:

```bash
npm run process:due
```

Recommended cadence: hourly.

The delivery list/detail endpoints also opportunistically process expired receipts, but the scheduled processor is the production mechanism for true automatic behavior.

---

## 12. Partial Receipt / Delivery Discrepancy

Partial Receipt is NOT a Validation Override use case and does NOT require Finance approval.

Warehouse discrepancy queue:

```http
GET /api/warehouse/discrepancies
GET /api/warehouse/discrepancies?status=OPEN
GET /api/warehouse/discrepancies?status=OVERDUE
GET /api/warehouse/discrepancies?status=ESCALATED
GET /api/warehouse/discrepancies?status=SUPERVISOR_REQUIRED
```

Dynamic lifecycle:

```text
OPEN
  -> OVERDUE
  -> ESCALATED
  -> SUPERVISOR_REQUIRED
  -> RESOLVED
```

Initial policy:

```text
discrepancy_resolution_days       = 2
discrepancy_escalation_days       = 3
discrepancy_supervisor_lock_days  = 5
```

These values are snapshotted when the discrepancy is created.

Changing master policy later does not move old deadlines.

### Resolve discrepancy

```http
POST /api/warehouse/discrepancies/:id/resolve
```

Allowed resolution:

```text
RESEND
CLOSE_WITH_REASON
```

#### RESEND

```json
{
  "resolution_type": "RESEND",
  "resolution_note": "Remaining stock will be resent",
  "late_resolution_reason": null
}
```

Backend creates a supplemental physical fulfillment on the SAME PB for the difference quantity.

The supplemental fulfillment runs the normal physical flow:

```text
PICKING -> READY_FOR_DISPATCH -> DISPATCHED -> requester receipt
```

If the supplemental delivery is also partial, a new discrepancy can be created for that shipment.

#### CLOSE_WITH_REASON

```json
{
  "resolution_type": "CLOSE_WITH_REASON",
  "resolution_note": "Two units were not shipped and will not be resent",
  "late_resolution_reason": null
}
```

`resolution_note` is mandatory for `CLOSE_WITH_REASON`.

The final quantity considered physically received is only the sum of actual requester received quantities.

### Late resolution

After `resolution_due_at`, the discrepancy becomes overdue.

Warehouse can still resolve it, but `late_resolution_reason` becomes mandatory.

After `supervisor_lock_at`, only a user with:

```text
WAREHOUSE_DISCREPANCY_SUPERVISOR
```

can resolve it.

This SLA never blocks the requester or requester department. It is Warehouse operational accountability only.

There is no IT Validation Override for partial receipt.

---

## 13. When Return Due Date Starts

Return due date does NOT start at PB creation, Manager approval, Finance approval, Picking, or first dispatch.

For a Returnable PB, it starts only after delivery is FULLY resolved:

```text
final_received_at
+ return_due_days_snapshot
= return_due_at
```

Initial policy:

```text
return_due_days = 14 calendar days
```

Examples:

### Full first shipment

```text
Requester fully received: 21 Oct 10:00
return_due_days: 14
Due: 4 Nov 10:00
```

### Partial + RESEND

```text
21 Oct: dispatched 10 / requester received 8
22 Oct: Warehouse chooses RESEND 2
23 Oct: resend dispatched
24 Oct: requester receives 2

final_received_at = 24 Oct
return_due_at = 24 Oct + policy days
```

### Partial + CLOSE_WITH_REASON

```text
Dispatched = 10
Requester received = 8
Difference 2 is closed by Warehouse

Final return obligation = 8
```

Due date begins when the discrepancy is resolved and delivery is finalized.

There is no Return Due Date extension action.

---

## 14. Returnable Flow / One Final RB Cycle

After a Returnable PB is fully received, backend creates exactly one RB transaction:

```text
RB[yy][mm][xxxxx]
```

List:

```http
GET /api/returns
```

Detail:

```http
GET /api/returns/:id
```

### Requester final return submission

```http
POST /api/returns/:id/submit
```

Example:

```json
{
  "items": [
    {
      "return_item_id": 301,
      "requester_return_qty": 8,
      "note": null
    }
  ]
}
```

This is one final cycle. Once submitted, requester cannot submit a second RB quantity later.

### Warehouse final physical return receipt

```http
POST /api/returns/:id/receive
```

Example:

```json
{
  "items": [
    {
      "return_item_id": 301,
      "warehouse_received_qty": 8,
      "note": null
    }
  ]
}
```

Warehouse physical quantity is authoritative.

`warehouse_received_qty` may differ from requester declaration but cannot exceed `expected_qty`.

Formula:

```text
shortfall_qty = expected_qty - warehouse_received_qty
```

---

## 15. Return Shortfall Auto PB

Example:

```text
Original PB received qty = 10
Requester final RB says 8
Warehouse physically receives 8
Shortfall = 2
```

Backend closes the RB and automatically creates a new PB for qty 2.

System-generated PB characteristics:

```text
purpose         = RETURN_SHORTFALL
return_type     = NON_RETURNABLE
request_origin  = RETURN_SHORTFALL
source_request_id = original PB
source_return_id  = source RB
```

The PB gets a normal monthly PB number, for example:

```text
Original PB : PB261000120
RB          : RB261000045
Generated PB: PB261000121
```

This generated PB is intentionally different from an organically created non-returnable PB.

### Approval flow for shortfall PB

```text
Auto-created PB
-> PENDING_FINANCE_REVIEW
-> Finance Review
-> ADMINISTRATIVE Warehouse Fulfillment
-> COMPLETED
```

Manager approval is skipped.

### Administrative fulfillment

Shortfall goods are already physically with the requester. Warehouse MUST NOT physically pick/send them again.

Therefore:

```text
fulfillment_mode = ADMINISTRATIVE
fulfillment_type = RETURN_SHORTFALL_CONVERSION
```

But Warehouse MUST provide:

```text
Source Warehouse
IWT / NetSuite Reference
```

IWT is mandatory, not optional.

Save Progress still works:

```http
PUT /api/warehouse/fulfillments/:fulfillmentId/progress
```

Final administrative completion:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/complete
```

No Picking print, DO, Dispatch, or requester receipt is created for this administrative conversion.

Finance Closing does not count this administrative conversion as a second physical issue; the physical inventory movement was already represented by the original issue minus the actual returned quantity.

---

## 16. Validation Override

Validation Override only bypasses request eligibility restrictions. It never edits historical transaction facts.

It is NOT used for Delivery Discrepancy / Partial Receipt.

Access is controlled by the dedicated `validation_override_users` master.

### Active violations

```http
GET /api/validation-overrides/violations
```

Filters:

```text
code
department_id
user_id
```

### Create override

```http
POST /api/validation-overrides
```

```json
{
  "violation_id": 15,
  "reason": "Management-approved exception",
  "valid_until": "2026-11-15 23:59:59"
}
```

### Revoke

```http
POST /api/validation-overrides/:id/revoke
```

```json
{
  "reason": "Exception is no longer valid"
}
```

### Manual resolve by authorized Validation Override user

```http
POST /api/validation-overrides/violations/:id/resolve
```

The system normally resolves return violations automatically when their underlying transaction is resolved.

Override does not modify original due date, quantity, PB, RB, or return status.

---

## 17. Dynamic Policy Master

Read:

```http
GET /api/master/request-policy
```

Admin update:

```http
PUT /api/master/request-policy
```

Send the complete policy payload:

```json
{
  "receipt_confirmation_days": 2,
  "discrepancy_resolution_days": 2,
  "discrepancy_escalation_days": 3,
  "discrepancy_supervisor_lock_days": 5,
  "return_due_days": 14,
  "timezone": "Asia/Jakarta"
}
```

Constraints:

```text
discrepancy_escalation_days >= discrepancy_resolution_days
discrepancy_supervisor_lock_days >= discrepancy_escalation_days
```

All thresholds use calendar days.

Relevant values are snapshotted to transaction data so a master change only affects future transactions/events.

---

## 18. Dynamic Validation Rules

Admin list:

```http
GET /api/master/validation-rules
```

Admin update:

```http
PUT /api/master/validation-rules/:id
```

Example:

```json
{
  "block_scope": "USER",
  "is_blocking": 1,
  "allow_override": 1,
  "is_active": 1
}
```

Scopes:

```text
NONE
USER
DEPARTMENT
```

This is intentionally dynamic so the business can change `RETURN_OVERDUE` from department-level to user-level blocking without backend deployment.

---

## 19. Finance XLSX Report

Finance download endpoint:

```http
GET /api/finance/reports/requests/export
```

Output:

```text
.xlsx
1 row = 1 PB SKU / request item
```

Example filters:

```http
GET /api/finance/reports/requests/export?date_from=2026-10-01&date_to=2026-10-31
GET /api/finance/reports/requests/export?department_id=8
GET /api/finance/reports/requests/export?target_department_id=14
GET /api/finance/reports/requests/export?purpose_id=5
GET /api/finance/reports/requests/export?return_type=RETURNABLE
GET /api/finance/reports/requests/export?origin=RETURN_SHORTFALL
GET /api/finance/reports/requests/export?status=COMPLETED
GET /api/finance/reports/requests/export?sku=682500002319
```

The report includes, among others:

```text
PB Number
Request Origin
Source PB
Source RB
Request Date
Request Status
Requester
Requester Department
Target Department
Company
Purpose
Return Type
Manager status/name/time
Finance status/reviewer/time
SKU
Item Name
UOM
Requested Qty
Finance Approved Qty
Finance Rejected Qty
Warehouse Dispatched Qty
Administrative Conversion Qty
Requester Received Qty
Delivery Difference Qty
Delivery Discrepancy Qty
Open Delivery Discrepancy Count
Source Warehouses
IWT Numbers
IWT Recorded At
Picking Printed At
DO Printed At
Dispatched At
Final Received At
RB Number
Return Due At
Return Status
Return Expected Qty
Requester Return Qty
Warehouse Actual Return Qty
Return Shortfall Qty
Generated Shortfall PB
Is Return Overdue
Has Active Validation Override
```

General paginated SKU-level report:

```http
GET /api/reports/requests
```

Finance or Admin access is required.

---

## 20. Master / Admin Endpoints

Read master:

```http
GET /api/master/bootstrap
GET /api/master/request-purposes
GET /api/master/approval-rules
GET /api/master/warehouse-locations
GET /api/master/financial-closing
GET /api/master/request-policy
GET /api/master/job-levels
```

Admin:

```http
GET  /api/master/module-access-rules
GET  /api/master/validation-override-users
GET  /api/master/validation-rules

POST /api/master/approval-rules
PUT  /api/master/approval-rules/:id

PUT  /api/master/financial-closing
PUT  /api/master/request-policy

POST /api/master/module-access-rules
PUT  /api/master/module-access-rules/:id

POST   /api/master/request-purposes
PUT    /api/master/request-purposes/:id
DELETE /api/master/request-purposes/:id

POST /api/master/warehouse-locations
PUT  /api/master/warehouse-locations/:id

POST /api/master/validation-override-users
PUT  /api/master/validation-override-users/:id

PUT  /api/master/validation-rules/:id
```

Warehouse `internal_id` is optional and represents NetSuite Location Internal ID.

Use field name `name` for person names. Do not introduce `user_name` or `user_name_snapshot` in FE contracts.

---

## 21. Request Statuses

Current relevant request statuses:

```text
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
PENDING_FINANCE_REVIEW
PICKING
ADMINISTRATIVE_FULFILLMENT
READY_FOR_DISPATCH
DISPATCHED
PARTIALLY_RECEIVED
RETURN_PENDING
COMPLETED
REJECTED
CANCELED
```

Do not invent transitions in FE.

### Fulfillment modes

```text
PHYSICAL
ADMINISTRATIVE
```

### Fulfillment types

```text
NORMAL
DISCREPANCY_RESEND
RETURN_SHORTFALL_CONVERSION
```

### Delivery receipt status

```text
PENDING
PARTIAL
RECEIVED
```

### Delivery receipt method

```text
MANUAL
AUTO
```

### Delivery discrepancy status

```text
OPEN
OVERDUE
ESCALATED
SUPERVISOR_REQUIRED
RESOLVED
```

### Delivery discrepancy resolution

```text
RESEND
CLOSE_WITH_REASON
```

### Return status

```text
PENDING_REQUESTER
SUBMITTED
COMPLETED
```

---

## 22. Removed Old Flow / FE Cleanup

Do not build or keep UI around these old concepts:

```text
Warehouse Request Queue / Accept
HANDED_OVER
manual Handover button
Requester Receive old Handover endpoint
shortage_reason_code
shortage_qty
remainder_disposition
BACKORDER_REMAINDER
CLOSE_SHORT
PENDING_INVENTORY_TRANSFER
READY_FOR_HANDOVER
multiple item-level source warehouse values
old return inspection condition flow
```

Replacement mapping:

```text
old Handover                  -> DISPATCHED + requester Delivery Receipt
old shortage/remainder        -> actual_qty only at Picking
physical delivery mismatch    -> Delivery Discrepancy after requester receipt
old item source warehouse     -> Fulfillment header Source Warehouse
old return partial cycles     -> one final RB + auto PB shortfall conversion
```

---

## 23. Error Handling

Standard success:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Paginated:

```json
{
  "success": true,
  "message": "...",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

Error:

```json
{
  "success": false,
  "message": "...",
  "errors": {
    "code": "..."
  }
}
```

Validation errors may include extra structured fields in `errors` in addition to `errors.code`.

Common FE handling:

```text
401 -> session/auth recovery
403 -> capability/access denied
404 -> transaction not found
409 -> transaction state conflict; refresh current state
422 -> field/business validation
500 -> backend/schema/internal issue
503 -> DB/upstream unavailable
```

Important example codes:

```text
REQUEST_VALIDATION_BLOCKED
DELIVERY_AUTO_ACCEPTED
DELIVERY_RECEIPT_ALREADY_CONFIRMED
RECEIVED_QTY_EXCEEDS_DISPATCHED
LATE_RESOLUTION_REASON_REQUIRED
WAREHOUSE_SUPERVISOR_REQUIRED
RETURN_FINAL_CYCLE_ALREADY_SUBMITTED
RETURN_RECEIVED_EXCEEDS_EXPECTED
IWT_REQUIRED
SOURCE_WAREHOUSE_REQUIRED
ACTUAL_QTY_EXCEEDS_APPROVED
```

---

## 24. Suggested Navigation

```text
Dashboard

Requests
- My Requests
- New Request
- Delivery Confirmation
- My Returns

Approvals

Finance
- Review Queue
- History
- Request Report / Export
- Financial Closing

Warehouse
- Fulfillment / Picking
- Delivery Discrepancies
- Returns

Administration
- Request Purposes
- Warehouse Locations
- Request Policy
- Approval Rules
- Validation Rules
- Validation Overrides
- Validation Override Users
- Module Access
```

Menu visibility should use backend capabilities.

---

## 25. FE Implementation Checklist

Before considering FE migration complete:

- Use PB/RB numbers returned from backend; never create locally.
- Add Target Department selector with requester department as default.
- Render `return_type` from Purpose.
- Remove old Warehouse Request Queue / Accept page.
- Source Warehouse must be fulfillment header input.
- Keep Warehouse Save Progress.
- Keep separate physical Actual Qty per SKU.
- Keep IWT header input; do not send IWT timestamp.
- Physical complete -> `READY_FOR_DISPATCH`.
- Print DO -> `DISPATCHED`.
- Add requester Delivery Confirmation screen.
- Add receipt countdown/deadline UI.
- On `DELIVERY_AUTO_ACCEPTED`, lock confirmation UI and refresh.
- Add Warehouse Delivery Discrepancy queue.
- Support `RESEND` and `CLOSE_WITH_REASON` only.
- Show SLA state and deadlines.
- Require Late Resolution Reason when overdue.
- Hide resolution from normal WH user when `SUPERVISOR_REQUIRED` unless capability exists.
- Do not show Return Due before final delivery resolution.
- Implement one final RB submission only.
- Warehouse Return Receive must use actual physical qty.
- Show generated Shortfall PB link/reference after RB completion when shortfall > 0.
- Treat Shortfall PB fulfillment as Administrative; no Picking print/DO/receipt.
- Still require Source Warehouse + IWT for Administrative Shortfall PB.
- Use `/api/requests/eligibility` before create screen and refresh after violations change.
- Implement Finance XLSX export as a direct file download.
