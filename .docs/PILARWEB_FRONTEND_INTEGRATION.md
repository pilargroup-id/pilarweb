# Pilarweb Frontend Integration Guide

> Frontend source of truth for the current Pilarweb backend.
>
> This version is aligned with the latest backend supplied on 2026-10-06 plus the Finance rejected-qty, Warehouse shortage-enum, and Handover-list update.
>
> Production UI terminology must use English.

---

## 1. Application Scope

Pilarweb is an internal goods-request application.

System ownership:

- **PilarGroup**: authentication, user identity, department, company, and job level.
- **Itembase**: item master data.
- **Pilarweb**: request transactions, Department Approval, Finance Review, Warehouse fulfillment, NetSuite Inventory Transfer references, handover, return tracking, activity history, and Finance closing / Inventory Adjustment data.

Pilarweb does not copy Itembase master tables. Item data is fetched from Itembase and snapshotted into the transaction when a request is created.

---

## 2. API Base and Authentication

Frontend should call the same host using the `/api` prefix.

Example production base:

```text
https://pilarweb.pilargroup.id/api
```

Every protected request uses:

```http
Authorization: Bearer <PILARGROUP_JWT>
```

### Current User

```http
GET /api/auth/me
```

Example response wrapper:

```json
{
  "success": true,
  "message": "Authenticated",
  "data": {
    "id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
    "internal_id": 7411,
    "username": "azi",
    "name": "Azi Fauzi",
    "email": "azi@piagam.id",
    "departments": [],
    "companies": [],
    "department_id": 8,
    "department": "IT",
    "company_id": "comp-pnm-0001",
    "company": "PT Pilar Niaga Makmur",
    "job_position": "Programmer",
    "job_level": "Staff",
    "job_level_value": "1.00",
    "apps": ["pilarweb"]
  }
}
```

Do not infer permissions from UI-only role labels. Use backend capabilities.

### Capabilities

```http
GET /api/auth/capabilities
```

Response data:

```json
{
  "can_create_request": true,
  "can_approve_department": false,
  "finance_access": false,
  "warehouse_access": false,
  "admin_access": false,
  "approval_rule_configured": true
}
```

Use these flags for menu/action visibility:

- `can_create_request`: show New Request.
- `can_approve_department`: show Approvals.
- `finance_access`: show Finance Review and Finance Closing.
- `warehouse_access`: show Warehouse, Handover, and Returns operational menus.
- `admin_access`: show Settings / master configuration.
- `approval_rule_configured`: if false, request creation is not operational for that department.

**Current backend behavior:** IT department (`department_id = 8`) is treated as having module access by the backend. FE must still read `/api/auth/capabilities`; do not duplicate this condition in frontend code.

---

## 3. Standard Response Format

### Normal success

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

### Paginated success

```json
{
  "success": true,
  "message": "...",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error

```json
{
  "success": false,
  "message": "...",
  "errors": {
    "code": "SOME_ERROR_CODE"
  }
}
```

Recommended FE handling:

| HTTP | FE behavior |
|---|---|
| 401 | Recover/login session. |
| 403 | No-access state. Do not retry automatically. |
| 404 | Not found / stale record. |
| 409 | Business-state conflict. Refresh detail before retry. |
| 422 | Field/business validation. Show backend message close to the affected control. |
| 5xx | Generic server/upstream error with manual retry. |

---

## 4. Itembase Integration

Pilarweb exposes only these Itembase-backed routes:

```http
GET /api/item/items
GET /api/item/items/:id
```

### Item List

```http
GET /api/item/items?page=1&limit=20&search=fan
```

Backend always forces:

```text
item_kind=regular
```

FE does not need to send `item_kind`. If FE sends another value, backend ignores it.

### Item Detail

```http
GET /api/item/items/:id
```

Use the selected Itembase `id` when creating a request item. Do not submit manually typed SKU/name as the source of truth.

---

## 5. Master Bootstrap

Recommended application bootstrap:

```http
GET /api/master/bootstrap
```

Response `data` contains:

```json
{
  "request_purposes": [],
  "workflows": [],
  "purpose_workflow_assignments": [],
  "approval_rules": [],
  "warehouse_locations": [],
  "financial_closing": null
}
```

Individual read routes:

```http
GET /api/master/request-purposes
GET /api/master/workflows
GET /api/master/purpose-workflows
GET /api/master/approval-rules
GET /api/master/approval-rules?department_id=8
GET /api/master/warehouse-locations
GET /api/master/financial-closing
```

### Request Purpose labels

Current intended values:

| Code | UI Label |
|---|---|
| `TIKTOK_AFFILIATE` | TikTok Affiliate |
| `YOUTUBE_AFFILIATE` | YouTube Affiliate |
| `EXTERNAL_DELIVERY` | External Delivery |
| `INTERNAL_USE` | Internal Use |
| `LOAN` | Loan |

Do not hardcode which purpose is returnable. Read `purpose_workflow_assignments` / workflow `requires_return`.

---

## 6. Request Lifecycle Overview

Main flow:

```text
PENDING_DEPARTMENT_APPROVAL
        ↓ approve
PENDING_FINANCE_REVIEW
        ↓ Finance has at least one approved quantity
READY_FOR_WAREHOUSE
        ↓ Warehouse accepts
PICKING
        ↓ Confirm picking with actual qty > 0
PENDING_INVENTORY_TRANSFER
        ↓ IT coverage complete
READY_FOR_HANDOVER
        ↓ Warehouse handover
HANDED_OVER
        ↓ receipt confirmed
PARTIALLY_FULFILLED / COMPLETED / RETURN_PENDING
```

Terminal states:

```text
COMPLETED
REJECTED
CANCELED
```

Other status used by the schema/backend:

```text
DRAFT
REVERTED_TO_REQUESTER
PARTIALLY_RETURNED
```

### Important implementation note

In the **current backend**, `POST /api/requests` creates a complete request and immediately puts it into:

```text
PENDING_DEPARTMENT_APPROVAL
```

So the normal FE flow is **Create & Submit in one action**.

The backend still contains `POST /api/requests/:id/submit` for records that are actually in `DRAFT` or `REVERTED_TO_REQUESTER`, but a normal newly-created request does not require a second submit call.

---

## 7. Requester Rules

Requester eligibility comes from `approval_rules`.

Backend behavior:

- user must have a department and numeric job level;
- the selected department approval rule determines the requester blocking level;
- user can create only when their job level is below `requester_block_min_job_level_value`;
- request owner is the only normal user allowed to edit their request;
- requester cannot approve their own request.

FE must use `/api/auth/capabilities` and backend errors instead of recreating job-level logic.

---

## 8. Request Endpoints

### My Requests

Both routes currently point to the same requester list:

```http
GET /api/requests
GET /api/requests/my
```

Supported query parameters:

```text
page
limit
status
search
```

Example:

```http
GET /api/requests/my?page=1&limit=20&status=PENDING_DEPARTMENT_APPROVAL&search=PWR
```

Search checks request number, purpose name, and reason.

### Create Request

```http
POST /api/requests
Content-Type: application/json
```

Payload:

```json
{
  "request_purpose_id": 1,
  "reason": "Goods required for affiliate content",
  "return_due_date": null,
  "items": [
    {
      "itembase_item_id": "<ITEMBASE_UUID>",
      "requested_qty": 10,
      "notes": "Optional item note"
    }
  ]
}
```

Required now:

- `request_purpose_id`
- `reason`
- at least one item
- every `requested_qty > 0`
- `return_due_date` when mapped workflow has `requires_return = 1`

Backend automatically:

- resolves active Purpose -> Workflow mapping;
- snapshots workflow/version;
- fetches item detail from Itembase;
- snapshots item data;
- generates request number;
- snapshots requester/department/company/job level;
- creates Department Approval;
- returns the full Request Detail object.

Request number format:

```text
PWR-YY-00001
```

### Request Detail

```http
GET /api/requests/:id
```

The returned `data` is a composed object:

```json
{
  "id": "<REQUEST_UUID>",
  "request_number": "PWR-26-00001",
  "status": "PENDING_FINANCE_REVIEW",
  "request_purpose_code": "LOAN",
  "request_purpose_name": "Loan",
  "requires_return": 1,
  "return_due_date": "2026-10-20",
  "requester_name": "...",
  "department_name": "...",
  "reason": "...",
  "items": [],
  "approvals": [],
  "finance_review": {
    "id": 1,
    "status": "PENDING",
    "items": []
  },
  "fulfillments": [
    {
      "id": 1,
      "items": [],
      "inventory_transfers": [
        {
          "id": 1,
          "items": []
        }
      ],
      "handover": null
    }
  ],
  "returns": []
}
```

Use Request Detail as the primary detail-page source instead of joining multiple frontend calls unnecessarily.

### Edit Request Header

```http
PUT /api/requests/:id
```

Payload may include:

```json
{
  "request_purpose_id": 2,
  "reason": "Updated reason",
  "return_due_date": "2026-10-30"
}
```

Current editable statuses:

```text
DRAFT
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
```

### Add Item

```http
POST /api/requests/:id/items
```

```json
{
  "itembase_item_id": "<ITEMBASE_UUID>",
  "requested_qty": 3,
  "notes": null
}
```

### Edit Item

```http
PUT /api/requests/:id/items/:itemId
```

```json
{
  "requested_qty": 8,
  "notes": "Updated quantity"
}
```

Canceled rows cannot be edited.

### Delete Item

```http
DELETE /api/requests/:id/items/:itemId
```

Physical delete is allowed **only for DRAFT** records.

For submitted records, use item cancellation instead.

### Requester Cancel Item

```http
POST /api/requests/:id/items/:itemId/cancel
```

```json
{
  "reason": "Item is no longer needed"
}
```

Requester may cancel while status is:

```text
DRAFT
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
```

Cancellation is per item. If the last ACTIVE request item is canceled, backend automatically sets the request to:

```text
CANCELED
```

There is intentionally no whole-form cancellation action.

### Submit Existing Draft/Reverted Record

```http
POST /api/requests/:id/submit
```

Only valid for:

```text
DRAFT
REVERTED_TO_REQUESTER
```

Do not call this after normal `POST /api/requests`, because normal create already submits the request.

### Activity

```http
GET /api/requests/:id/activity
```

### Comments

```http
GET  /api/requests/:id/comments
POST /api/requests/:id/comments
```

Create comment:

```json
{
  "comment_text": "Please prioritize this request."
}
```

---

## 9. Department Approval

### Approval Queue

```http
GET /api/approvals?page=1&limit=20&search=...
```

Backend only returns records that match the current user's department/job-level snapshot.

The queue can include:

- pending Department Approvals;
- already-approved requests still waiting for Finance, because these may still be reverted/cancel-item by the eligible approver.

### Approval Detail

```http
GET /api/approvals/:id
```

Returns the full Request Detail object.

### Approve

```http
POST /api/approvals/:id/approve
```

```json
{
  "note": "Approved"
}
```

After approval:

```text
request_approval.status = APPROVED
request.status = PENDING_FINANCE_REVIEW
```

Backend creates/reset the Finance Review and one Finance Review item per ACTIVE request item.

### Reject Whole Department Approval

```http
POST /api/approvals/:id/reject
```

```json
{
  "reason": "Request does not meet department requirement"
}
```

Reason is mandatory.

Result:

```text
request.status = REJECTED
```

### Revert Approved Request Before Finance Processes It

```http
POST /api/approvals/:id/revert
```

```json
{
  "reason": "Please revise quantity and justification"
}
```

Current backend behavior after revert:

- approval is reset to `PENDING`;
- Finance Review is changed to `REVERTED`;
- Finance Review item decisions are changed to `REVERTED`;
- request is set back to `PENDING_DEPARTMENT_APPROVAL`;
- revert metadata/reason is recorded;
- requester can edit because `PENDING_DEPARTMENT_APPROVAL` is editable.

**FE should not wait for a literal `REVERTED_TO_REQUESTER` status in this current implementation.** Use the request/approval data and revert metadata returned by backend.

Revert is blocked once Finance has processed the request.

### Approver Cancel One Item

```http
POST /api/approvals/:approvalId/items/:itemId/cancel
```

```json
{
  "reason": "This item is not allowed"
}
```

Can be used:

- while Department Approval is pending; or
- after approval while Finance is still `PENDING`.

If all active items are canceled, request becomes `CANCELED`.

---

## 10. Finance Review

Requires `finance_access` capability / `FINANCE` module access.

### Queue

```http
GET /api/finance/requests?page=1&limit=20&search=...
```

Queue only includes:

```text
finance_reviews.status = PENDING
request.status = PENDING_FINANCE_REVIEW
```

Each row contains approximately:

```text
finance_review_id
finance_review_status
request_id
request_number
request_purpose_name
requester_name
department_name
reason
submitted_at
request_status
```

### Detail

```http
GET /api/finance/requests/:requestId
```

Returns the full Request Detail object.

### Submit Finance Review

```http
POST /api/finance/requests/:requestId/review
```

Finance must provide a decision for every active Finance Review item.

Example partial approval:

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

Suppose original requested quantities are:

```text
Item A requested = 10
Item B requested = 5
```

Backend stores:

```text
Item A
requested_qty_snapshot = 10
approved_qty           = 8
rejected_qty           = 2

Item B
requested_qty_snapshot = 5
approved_qty           = 3
rejected_qty           = 2
```

### Finance Quantity Semantics

This distinction is mandatory in FE:

```text
Requested Qty
    ↓ Finance decision
Approved Qty + Finance Rejected Qty
    ↓ Warehouse
Actual Qty + Warehouse Shortage Qty
```

Do **not** show Finance rejected quantity as Warehouse shortage.

Formula for `APPROVED` decision:

```text
rejected_qty = requested_qty_snapshot - approved_qty
```

`rejected_qty` is calculated by backend. FE does not send it.

### Fully Reject One Item

```json
{
  "request_item_id": 11,
  "decision": "REJECTED",
  "note": "Not permitted"
}
```

Backend stores:

```text
approved_qty = 0
rejected_qty = full requested quantity
```

### Cancel One Item at Finance Stage

```json
{
  "request_item_id": 11,
  "decision": "CANCELED",
  "note": "Requester confirmed this item is no longer needed"
}
```

`CANCELED` requires a note/reason.

Canceled semantics are different from rejected quantity:

```text
approved_qty = 0
rejected_qty = 0
request_item.status = CANCELED
```

### Overall request result

Backend computes overall result:

- at least one approved quantity > 0 -> `READY_FOR_WAREHOUSE`;
- no approved qty + at least one rejected item -> `REJECTED`;
- all remaining decisions canceled -> `CANCELED`.

---

## 11. Warehouse Request Queue

Requires `warehouse_access` capability / `WAREHOUSE` module access.

### Queue

```http
GET /api/warehouse/requests
```

Supported:

```text
page
limit
status
search
```

Warehouse queue can include these request statuses:

```text
READY_FOR_WAREHOUSE
PICKING
PENDING_INVENTORY_TRANSFER
READY_FOR_HANDOVER
HANDED_OVER
PARTIALLY_FULFILLED
```

Search checks request number, requester name, and request purpose.

### Detail

```http
GET /api/warehouse/requests/:requestId
```

Returns full Request Detail.

### Accept / Create Fulfillment

```http
POST /api/warehouse/requests/:requestId/accept
```

Valid for:

```text
READY_FOR_WAREHOUSE
PARTIALLY_FULFILLED
```

Backend creates a fulfillment only for remaining Finance-approved quantity.

One request may therefore have multiple fulfillments.

---

## 12. Warehouse Fulfillment / Picking

### Record Print Event

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print
```

Printing is an event/counter, not a workflow state.

### Input Actual Quantity

```http
PUT /api/warehouse/fulfillments/:fulfillmentId/items/:fulfillmentItemId
```

Full fulfillment example:

```json
{
  "actual_qty": 8
}
```

Shortage example:

```json
{
  "actual_qty": 5,
  "shortage_reason_code": "STOCK_SHORTAGE",
  "remainder_disposition": "BACKORDER_REMAINDER",
  "shortage_note": "3 units will be fulfilled later"
}
```

### Current shortage reason enum

`warehouse_fulfillment_items.shortage_reason_code` is now restricted to:

```text
STOCK_SHORTAGE
DAMAGED
NOT_FOUND
OTHER
```

Recommended labels:

| Backend Value | FE Label |
|---|---|
| `STOCK_SHORTAGE` | Stock Shortage |
| `DAMAGED` | Damaged |
| `NOT_FOUND` | Not Found |
| `OTHER` | Other |

**Do not send old values** such as:

```text
OUT_OF_STOCK
INSUFFICIENT_STOCK
```

Those were consolidated into `STOCK_SHORTAGE`.

### Remaining Qty Action

Backend field:

```text
remainder_disposition
```

Allowed values:

```text
NONE
BACKORDER_REMAINDER
CLOSE_SHORT
```

Recommended FE label:

```text
Remaining Qty Action
```

Recommended options:

| Backend Value | FE Label | Meaning |
|---|---|---|
| `NONE` | None | No shortage / nothing remains. |
| `BACKORDER_REMAINDER` | Keep as Backorder | Remaining quantity stays outstanding for another fulfillment. |
| `CLOSE_SHORT` | Close Remaining Qty | Remaining quantity will never be fulfilled. |

Example:

```text
Finance Approved Qty = 8
Actual Qty           = 5
Shortage Qty         = 3
```

If `BACKORDER_REMAINDER`:

```text
5 units proceed now
3 units remain open
```

If `CLOSE_SHORT`:

```text
5 units proceed
3 units are treated as resolved and no future fulfillment is expected
```

### Confirm Picking

```http
POST /api/warehouse/fulfillments/:fulfillmentId/confirm-picking
```

Before confirmation, for every fulfillment item:

```text
actual_qty + shortage_qty = finance_approved_qty_snapshot
```

If shortage exists, `remainder_disposition` must be `BACKORDER_REMAINDER` or `CLOSE_SHORT`.

If total actual quantity > 0:

```text
fulfillment.status = PENDING_INVENTORY_TRANSFER
request.status     = PENDING_INVENTORY_TRANSFER
```

If actual quantity is zero and quantities are otherwise resolved, fulfillment can complete without an Inventory Transfer.

---

## 13. Warehouse Location Rules

Load locations with:

```http
GET /api/master/warehouse-locations
```

Example intended configuration:

```text
GOTO   | GOTO Warehouse   | is_loan_warehouse = 0
GOSAVE | GOSAVE Warehouse | is_loan_warehouse = 0
LOAN   | Loan Warehouse   | is_loan_warehouse = 1
```

### Source Warehouse dropdown

Only show active locations where:

```text
is_loan_warehouse = 0
```

So `LOAN` should **not** appear in Source Warehouse.

### Destination

Backend automatically resolves the first active location where:

```text
is_loan_warehouse = 1
```

If no such row exists, backend returns:

```text
LOAN_WAREHOUSE_MISSING
Loan warehouse is not configured
```

---

## 14. NetSuite Inventory Transfer

Before goods may be handed over, every actual issued quantity must be covered by Inventory Transfer records.

### Create Inventory Transfer

```http
POST /api/warehouse/fulfillments/:fulfillmentId/inventory-transfers
```

Example:

```json
{
  "inventory_transfer_number": "IT2604868",
  "source_warehouse_code": "GOTO",
  "transfer_date": "2026-10-06",
  "note": null,
  "items": [
    {
      "fulfillment_item_id": 21,
      "transferred_qty": 5
    }
  ]
}
```

Rules:

- IT number is required.
- Backend trims and uppercases the value.
- Current NetSuite convention looks like `IT2604868`.
- Pilarweb does not generate the NetSuite sequence.
- source warehouse must be active and must not be the Loan warehouse.
- multiple IT records may exist for one fulfillment.
- transfer quantity cannot exceed uncovered actual quantity.

When every actual qty is fully covered:

```text
fulfillment.status = READY_FOR_HANDOVER
request.status     = READY_FOR_HANDOVER
```

### Edit IT header

```http
PUT /api/warehouse/inventory-transfers/:transferId
```

Use this to correct IT number, source warehouse, transfer date, or note before handover.

### Delete IT

```http
DELETE /api/warehouse/inventory-transfers/:transferId
```

After deleting, backend recalculates transfer coverage and may return the request to:

```text
PENDING_INVENTORY_TRANSFER
```

IT records cannot be modified after handover.

---

## 15. Handover Menu - NEW LIST ENDPOINT

The Handover menu should use:

```http
GET /api/warehouse/handovers
```

This is the endpoint for **all handover records visible to Warehouse**, rather than deriving the list from Warehouse Request Queue.

### Query parameters

```text
page
limit
status
search
```

Allowed `status` values:

```text
PENDING
HANDED_OVER
RECEIVED
```

Examples:

```http
GET /api/warehouse/handovers?page=1&limit=20
GET /api/warehouse/handovers?status=HANDED_OVER
GET /api/warehouse/handovers?status=RECEIVED
GET /api/warehouse/handovers?search=PWR-26
```

Invalid status returns `422 HANDOVER_STATUS_INVALID`.

### Search fields

Search matches:

```text
request_number
requester_name
department_name
fulfillment_number
handed_over_by_name
received_by_name
```

### Response row

```json
{
  "handover_id": 12,
  "handover_status": "HANDED_OVER",
  "handed_over_by_user_id": "...",
  "handed_over_by_name": "Warehouse User",
  "handed_over_at": "2026-10-06T09:00:00.000Z",
  "received_by_user_id": null,
  "received_by_name": null,
  "received_at": null,
  "note": "Handed to requester",
  "created_at": "...",
  "updated_at": "...",

  "request_id": "<REQUEST_UUID>",
  "request_number": "PWR-26-00001",
  "request_purpose_id": 5,
  "request_purpose_code": "LOAN",
  "request_purpose_name": "Loan",
  "requester_user_id": "...",
  "requester_name": "Requester Name",
  "department_id": 8,
  "department_name": "IT",
  "requires_return": 1,
  "return_due_date": "2026-10-20",
  "request_status": "HANDED_OVER",

  "fulfillment_id": 7,
  "fulfillment_number": "FUL-26-00001",
  "fulfillment_status": "HANDED_OVER",
  "item_count": 2,
  "total_actual_qty": "8.0000"
}
```

`total_actual_qty` may arrive as a decimal string from MariaDB. FE should parse/format it as a number for display when needed.

### Recommended Handover table columns

```text
Request No.
Fulfillment No.
Requester
Department
Purpose
Items
Actual Qty
Handover Status
Handed Over At
Received At
Return Due Date (only relevant for returnable flow)
```

### Handover action

```http
POST /api/warehouse/fulfillments/:fulfillmentId/handover
```

```json
{
  "note": "Handed to requester"
}
```

Blocked unless:

```text
fulfillment.status = READY_FOR_HANDOVER
```

and all actual quantities are fully covered by IT records.

### Confirm receipt

```http
POST /api/warehouse/handovers/:handoverId/receive
```

Optional payload:

```json
{
  "note": "Received in good condition"
}
```

Can be performed by:

- original requester; or
- Warehouse user.

After receipt, fulfillment becomes `COMPLETED`. Backend then recalculates the request state based on remaining fulfillment quantity and whether the request is returnable.

---

## 16. Return Flow

Return obligation is based on actual issued/received quantity, not requested quantity and not Finance approved quantity.

### Return List

```http
GET /api/returns
```

Warehouse users get operational return queue. Normal requester sees their own accessible returns.

### Create Return

```http
POST /api/returns
```

```json
{
  "request_id": "<REQUEST_UUID>",
  "note": "Returning loaned items",
  "items": [
    {
      "request_item_id": 11,
      "returned_qty": 2
    }
  ]
}
```

### Detail

```http
GET /api/returns/:id
```

### Warehouse Receive

```http
POST /api/returns/:id/receive
```

### Warehouse Inspect

```http
POST /api/returns/:id/inspect
```

Example:

```json
{
  "note": "Inspection completed",
  "items": [
    {
      "return_item_id": 31,
      "condition_code": "GOOD",
      "condition_note": null,
      "stock_returned_qty": 2
    }
  ]
}
```

Condition codes:

```text
GOOD
DAMAGED
MISSING
OTHER
```

`stock_returned_qty` is explicit. Finance calculation must not infer stock effect from condition labels.

---

## 17. Financial Closing

Requires Finance module access.

### Period list

```http
GET /api/financial-closing/periods
```

### Create period

```http
POST /api/financial-closing/periods
```

```json
{
  "period_key": "2026-09"
}
```

### Period detail

```http
GET /api/financial-closing/periods/:id
```

### Start closing

```http
POST /api/financial-closing/periods/:id/start-closing
```

### Generate batch

```http
POST /api/financial-closing/periods/:id/generate-batch
```

### Batch detail

```http
GET /api/financial-closing/batches/:id
```

### Record NetSuite posting

```http
POST /api/financial-closing/batches/:id/post
```

```json
{
  "netsuite_reference": "<NETSUITE_REFERENCE>"
}
```

### Close period

```http
POST /api/financial-closing/periods/:id/close
```

Lifecycle:

```text
OPEN -> CLOSING -> CLOSED
```

Adjustment principle:

```text
adjustment_qty = actual issued qty - stock returned qty
```

Do not use requested quantity or Finance rejected quantity for inventory movement.

---

## 18. Admin / Settings Endpoints

Requires `admin_access`.

### Module access rules

```http
GET  /api/master/module-access-rules
POST /api/master/module-access-rules
PUT  /api/master/module-access-rules/:id
```

Allowed module codes:

```text
ADMIN
FINANCE
WAREHOUSE
```

Example:

```json
{
  "module_code": "WAREHOUSE",
  "department_id": 5,
  "user_id": null,
  "company_id": null,
  "min_job_level_value": null,
  "max_job_level_value": null,
  "priority": 100,
  "is_active": 1
}
```

### Purpose -> Workflow assignment

```http
POST /api/master/purpose-workflows
```

```json
{
  "request_purpose_id": 5,
  "workflow_definition_id": 2
}
```

### Approval rules

```http
POST /api/master/approval-rules
PUT  /api/master/approval-rules/:id
```

Example:

```json
{
  "code": "PRODUCT_TO_ASS_MANAGER",
  "name": "Product to Assistant Manager",
  "department_id": 13,
  "department_name": "Product",
  "requester_block_min_job_level_value": 3,
  "approver_min_job_level_value": 3,
  "approver_job_level_name": "Assistant Manager",
  "allow_higher_job_level": 1,
  "priority": 10,
  "is_active": 1
}
```

### Financial closing setting

```http
PUT /api/master/financial-closing
```

```json
{
  "closing_day": 7,
  "timezone": "Asia/Jakarta"
}
```

### Request Purpose admin CRUD

```http
POST   /api/master/request-purposes
PUT    /api/master/request-purposes/:id
DELETE /api/master/request-purposes/:id
```

Create/update payload:

```json
{
  "code": "LOAN",
  "name": "Loan",
  "description": "Items temporarily borrowed and expected to return",
  "sort_order": 50,
  "is_active": 1
}
```

`DELETE` is a soft delete (`is_active = 0`).

### Warehouse location admin

```http
POST /api/master/warehouse-locations
PUT  /api/master/warehouse-locations/:id
```

```json
{
  "code": "GOTO",
  "name": "GOTO Warehouse",
  "is_loan_warehouse": 0,
  "is_active": 1
}
```

Only one active location should normally be configured as the Loan destination.

---

## 19. Quantity Model - FE Must Keep These Separate

This is one of the most important display rules.

For each requested item:

```text
1. Requested Qty
   User's original business request.

2. Finance Approved Qty
   Quantity Finance permits to proceed.

3. Finance Rejected Qty
   Requested Qty - Approved Qty.
   This is a Finance decision, not a Warehouse stock problem.

4. Warehouse Actual Qty
   Quantity physically picked/issued for the current fulfillment.

5. Warehouse Shortage Qty
   Finance Approved Qty snapshot - Actual Qty for the fulfillment.
   This is an operational fulfillment difference.

6. Transfer Qty
   Quantity covered by NetSuite Inventory Transfer records.

7. Returned Qty / Stock Returned Qty
   Quantities handled by the return flow.
```

Example:

```text
Requested          10
Finance Approved    8
Finance Rejected    2
Warehouse Actual    5
Warehouse Shortage  3
IT Covered          5
```

The `2` rejected by Finance and `3` shortage in Warehouse are **different business facts** and must never be merged in the UI.

---

## 20. Suggested Sidebar

Use capabilities to decide visibility.

```text
Dashboard

Requests
  - My Requests
  - New Request

Approvals

Finance Review

Warehouse
  - Request Queue
  - Fulfillment / Picking
  - Handover
  - Returns

Finance Closing

Settings
  - Request Purposes
  - Workflow Mapping
  - Approval Rules
  - Warehouse Locations
  - Financial Closing
  - Module Access
```

Suggested conditions:

- Requests: user has Pilarweb access.
- New Request: `can_create_request`.
- Approvals: `can_approve_department`.
- Finance Review / Finance Closing: `finance_access`.
- Warehouse Request Queue / Handover / Returns operations: `warehouse_access`.
- Settings: `admin_access`.

Hiding a menu is not authorization. Backend remains authoritative.

---

## 21. Recommended UI State Rules

### Requester

Show **Edit** while backend status is:

```text
DRAFT
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
```

For the current revert implementation, a reverted approval returns the request to `PENDING_DEPARTMENT_APPROVAL`; it remains editable.

Show **Cancel Item** only for active items and only while request is still requester-cancellable.

### Department Approver

When approval is `PENDING`:

```text
Approve
Reject
Cancel Item
```

When approval is already `APPROVED` and Finance is still pending:

```text
Revert
Cancel Item
```

Once Finance is processed, hide/disable Revert and Department-level item cancellation.

### Finance

For each active item provide:

```text
Decision: APPROVED / REJECTED / CANCELED
Approved Qty (only for APPROVED)
Reason/Note
```

Display calculated `rejected_qty` after review.

### Warehouse Picking

For each fulfillment item:

```text
Finance Approved Qty Snapshot
Actual Qty
Shortage Qty
Shortage Reason
Remaining Qty Action
Shortage Note
```

Only show Shortage Reason + Remaining Qty Action when actual quantity is below the Finance-approved snapshot.

### Handover

Use `/api/warehouse/handovers` for the menu list.

Use handover status badges:

```text
PENDING
HANDED_OVER
RECEIVED
```

---

## 22. Important Error Codes FE Should Handle Explicitly

The backend may return, among others:

```text
TOKEN_MISSING
APP_FORBIDDEN
MODULE_ACCESS_FORBIDDEN
REQUEST_OWNER_REQUIRED
REQUEST_NOT_EDITABLE
REQUEST_ITEM_NOT_ACTIVE
REQUEST_ITEM_CANCEL_NOT_ALLOWED
APPROVAL_NOT_PENDING
SELF_APPROVAL_FORBIDDEN
APPROVAL_ACCESS_FORBIDDEN
APPROVAL_REVERT_NOT_ALLOWED
FINANCE_ALREADY_PROCESSED
FINANCE_REVIEW_NOT_PENDING
FINANCE_DECISION_REQUIRED
FINANCE_DECISION_INVALID
FINANCE_APPROVED_QTY_INVALID
WAREHOUSE_ACCEPT_NOT_ALLOWED
FULFILLMENT_NOT_PICKING
FULFILLMENT_QTY_INCOMPLETE
SHORTAGE_DISPOSITION_REQUIRED
SOURCE_WAREHOUSE_INVALID
LOAN_WAREHOUSE_MISSING
INVENTORY_TRANSFER_COVERAGE_INCOMPLETE
HANDOVER_NOT_READY
HANDOVER_ALREADY_EXISTS
HANDOVER_ALREADY_RECEIVED
HANDOVER_STATUS_INVALID
```

Do not maintain a second copy of business rules just to avoid errors. Use these errors as backend-authoritative safeguards and refresh transaction detail on `409`.

---

## 23. Frontend Checklist for the 2026-10-06 Update

Update the FE implementation as follows:

1. **Finance Review**
   - Read/display `requested_qty_snapshot`.
   - Read/display `approved_qty`.
   - Read/display `rejected_qty`.
   - Do not calculate/store rejected qty client-side as source of truth.

2. **Warehouse shortage reason**
   - Replace old values `OUT_OF_STOCK` and `INSUFFICIENT_STOCK`.
   - Send only:

   ```text
   STOCK_SHORTAGE
   DAMAGED
   NOT_FOUND
   OTHER
   ```

3. **Warehouse Handover menu**
   - Stop deriving handovers from Warehouse Request Queue.
   - Use:

   ```http
   GET /api/warehouse/handovers
   ```

   - Support `page`, `limit`, `status`, and `search`.

4. **Quantity labels**
   - Finance Rejected Qty and Warehouse Shortage Qty must be displayed as separate concepts.

5. **Source Warehouse**
   - Do not show locations with `is_loan_warehouse = 1` as source choices.

6. **Loan Warehouse**
   - Destination is backend-resolved; FE does not need a destination selector for the standard flow.

---

## 24. Quick Endpoint Reference

```text
AUTH
GET  /api/auth/me
GET  /api/auth/capabilities

ITEMBASE
GET  /api/item/items
GET  /api/item/items/:id

REQUESTS
GET    /api/requests
GET    /api/requests/my
POST   /api/requests
GET    /api/requests/:id
PUT    /api/requests/:id
POST   /api/requests/:id/submit
POST   /api/requests/:id/items
PUT    /api/requests/:id/items/:itemId
DELETE /api/requests/:id/items/:itemId
POST   /api/requests/:id/items/:itemId/cancel
GET    /api/requests/:id/activity
GET    /api/requests/:id/comments
POST   /api/requests/:id/comments

APPROVALS
GET  /api/approvals
GET  /api/approvals/:id
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
POST /api/approvals/:id/revert
POST /api/approvals/:id/items/:itemId/cancel

FINANCE
GET  /api/finance/requests
GET  /api/finance/requests/:requestId
POST /api/finance/requests/:requestId/review

WAREHOUSE
GET    /api/warehouse/requests
GET    /api/warehouse/requests/:requestId
POST   /api/warehouse/requests/:requestId/accept
POST   /api/warehouse/fulfillments/:fulfillmentId/print
PUT    /api/warehouse/fulfillments/:fulfillmentId/items/:fulfillmentItemId
POST   /api/warehouse/fulfillments/:fulfillmentId/confirm-picking
POST   /api/warehouse/fulfillments/:fulfillmentId/inventory-transfers
PUT    /api/warehouse/inventory-transfers/:transferId
DELETE /api/warehouse/inventory-transfers/:transferId
GET    /api/warehouse/handovers
POST   /api/warehouse/fulfillments/:fulfillmentId/handover
POST   /api/warehouse/handovers/:handoverId/receive

RETURNS
GET  /api/returns
POST /api/returns
GET  /api/returns/:id
POST /api/returns/:id/receive
POST /api/returns/:id/inspect

FINANCIAL CLOSING
GET  /api/financial-closing/periods
POST /api/financial-closing/periods
GET  /api/financial-closing/periods/:id
POST /api/financial-closing/periods/:id/start-closing
POST /api/financial-closing/periods/:id/generate-batch
POST /api/financial-closing/periods/:id/close
GET  /api/financial-closing/batches/:id
POST /api/financial-closing/batches/:id/post

MASTER READ
GET /api/master/bootstrap
GET /api/master/request-purposes
GET /api/master/workflows
GET /api/master/purpose-workflows
GET /api/master/approval-rules
GET /api/master/warehouse-locations
GET /api/master/financial-closing

MASTER ADMIN
GET    /api/master/module-access-rules
POST   /api/master/purpose-workflows
POST   /api/master/approval-rules
PUT    /api/master/approval-rules/:id
PUT    /api/master/financial-closing
POST   /api/master/module-access-rules
PUT    /api/master/module-access-rules/:id
POST   /api/master/request-purposes
PUT    /api/master/request-purposes/:id
DELETE /api/master/request-purposes/:id
POST   /api/master/warehouse-locations
PUT    /api/master/warehouse-locations/:id
```

---

## 25. Terminology

Use these English labels consistently:

```text
Request Purpose
Requested Qty
Finance Approved Qty
Finance Rejected Qty
Actual Qty
Warehouse Shortage Qty
Shortage Reason
Remaining Qty Action
Source Warehouse
Loan Warehouse
Inventory Transfer No.
Handover
Received
Return Due Date
Return Balance
Finance Review
Financial Closing
Inventory Adjustment
```

Do not label `Finance Rejected Qty` as `Shortage`.
Do not label `Warehouse Shortage Qty` as `Rejected Qty`.
