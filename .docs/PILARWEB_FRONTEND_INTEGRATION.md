# Pilarweb Frontend Integration Guide

This document is the frontend source of truth for the current Pilarweb backend.

## 1. Purpose

Pilarweb is an internal goods-request application. Item master data stays in Itembase. Pilarweb owns request workflow, Department Approval, Finance Review, Warehouse fulfillment, NetSuite Inventory Transfer references, handover, returns, activity history, and monthly Inventory Adjustment closing data.

All production UI terminology must use English.

## 2. Authentication and Capabilities

Protected requests use the PilarGroup JWT:

```http
Authorization: Bearer <PILARGROUP_JWT>
```

Current user:

```http
GET /api/auth/me
```

Frontend capability source:

```http
GET /api/auth/capabilities
```

Example response data:

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

Do not reproduce job-level authorization logic in the frontend. Use these capability flags for menu/action visibility; backend authorization remains authoritative.

## 3. Itembase Integration

Only these Itembase-backed endpoints are exposed by Pilarweb:

```http
GET /api/item/items
GET /api/item/items/:id
```

For the list endpoint, Pilarweb always forces:

```text
item_kind=regular
```

A client-supplied `item_kind` is ignored. Search/pagination parameters supported by Itembase are forwarded.

Pilarweb calls Itembase server-to-server using `ITEMBASE_INTERNAL_SECRET`. The secret must never be exposed to frontend code.

## 4. Common Response Shape

Normal Pilarweb success:

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

Recommended FE handling: `401` session recovery, `403` no-access, `404` not found, `409` refresh transaction state, `422` business/field validation, `5xx` server/upstream error.

## 5. Request Purposes and Workflow

Initial purposes:

| Code | Label |
|---|---|
| `TIKTOK_AFFILIATE` | TikTok Affiliate |
| `YOUTUBE_AFFILIATE` | YouTube Affiliate |
| `EXTERNAL_DELIVERY` | External Delivery |
| `INTERNAL_USE` | Internal Use |
| `LOAN` | Loan |

Request Purpose and Workflow are separate. The active mapping is stored in `request_purpose_workflows`. A purpose can be moved from Returnable to Non-Returnable (or vice versa) for future requests without changing old transactions.

Workflow is snapshotted when a DRAFT request is submitted, not when the draft is created.

## 6. Requester / Approver Rule

`approval_rules` controls both requester eligibility and Department Approval.

- Users below `requester_block_min_job_level_value` may create requests.
- Users at or above the configured blocking level cannot create requests.
- The approver must meet `approver_min_job_level_value`.
- `allow_higher_job_level=1` allows higher levels to approve.
- The rule is selected by requester's department; a global rule (`department_id=NULL`) may be used as fallback.
- Product or any other department can use Assistant Manager without source-code special cases.
- Approval requirement is snapshotted into `request_approvals` at submit time.
- Requester cannot approve their own request.

## 7. Request Endpoints

### My Requests

```http
GET /api/requests/my?page=1&limit=20&status=DRAFT&search=...
```

### Create Draft

```http
POST /api/requests
Content-Type: application/json
```

Example:

```json
{
  "request_purpose_id": 1,
  "reason": "Goods required for content production",
  "return_due_date": null,
  "items": [
    {
      "itembase_item_id": "<ITEMBASE_UUID>",
      "requested_qty": 2,
      "notes": "Optional line note"
    }
  ]
}
```

`items` may be omitted and added later. Backend fetches each Itembase item and stores a snapshot: item ID, SKU code, item name, selling name, parent, variant summary, UOM, and `item_kind=regular`.

Request number is generated as:

```text
PWR-YY-00001
```

### Request Detail

```http
GET /api/requests/:id
```

The detail includes header, request items, approvals, Finance Review, fulfillments, Inventory Transfers, handovers, and returns.

### Edit Draft

```http
PUT /api/requests/:id
```

Editable only while `DRAFT`.

Example:

```json
{
  "request_purpose_id": 2,
  "reason": "Updated reason",
  "return_due_date": "2026-10-20"
}
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

### Update Item

```http
PUT /api/requests/:id/items/:itemId
```

```json
{
  "requested_qty": 4,
  "notes": "Updated"
}
```

### Remove Item (Draft Only)

```http
DELETE /api/requests/:id/items/:itemId
```

Physical removal is only allowed while the request is still `DRAFT`. After submission, keep the row for audit history and use the item-cancel endpoint instead.

### Submit

```http
POST /api/requests/:id/submit
```

Submit validates: request owner, requester eligibility, at least one item, reason, active Request Purpose -> Workflow mapping, approval rule, and `return_due_date` when the selected workflow requires return.

### Cancel

Whole-form cancellation is not exposed as an action. Cancellation is performed per request item. When the last active item is canceled, backend automatically changes the request header status to `CANCELED`.

Requester item cancellation:

```http
POST /api/requests/:id/items/:itemId/cancel
```

### Activity and Comments

```http
GET  /api/requests/:id/activity
GET  /api/requests/:id/comments
POST /api/requests/:id/comments
```

Comment payload:

```json
{
  "comment_text": "Warehouse, please prioritize this request."
}
```

## 8. Department Approval

Queue:

```http
GET /api/approvals?page=1&limit=20&search=...
```

The backend only returns pending approvals where the current user's department and job level satisfy the snapshotted approval requirement.

Detail:

```http
GET /api/approvals/:id
```

Approve:

```http
POST /api/approvals/:id/approve
```

```json
{
  "note": "Approved"
}
```

Reject:

```http
POST /api/approvals/:id/reject
```

```json
{
  "reason": "Request does not meet department requirements"
}
```

Rejection reason is required. Approval creates the Finance Review records and moves the request to `PENDING_FINANCE_REVIEW`. Rejection moves the request to `REJECTED`.

## 9. Finance Review

Requires `FINANCE` access from `module_access_rules`.

Queue:

```http
GET /api/finance/requests?page=1&limit=20&search=...
```

Detail:

```http
GET /api/finance/requests/:requestId
```

Submit review:

```http
POST /api/finance/requests/:requestId/review
```

Example:

```json
{
  "note": "Finance review completed",
  "items": [
    {
      "request_item_id": 11,
      "decision": "APPROVED",
      "approved_qty": 5,
      "note": null
    },
    {
      "request_item_id": 12,
      "decision": "REJECTED",
      "approved_qty": 0,
      "note": "Not permitted"
    }
  ]
}
```

Finance decision is per item. `approved_qty` must not exceed `requested_qty`. If at least one item has approved quantity > 0, request becomes `READY_FOR_WAREHOUSE`; otherwise it becomes `REJECTED`.

## 10. Warehouse Queue and Fulfillment

Requires `WAREHOUSE` access from `module_access_rules`.

Queue:

```http
GET /api/warehouse/requests
```

Detail:

```http
GET /api/warehouse/requests/:requestId
```

Accept request / create next fulfillment:

```http
POST /api/warehouse/requests/:requestId/accept
```

A request can have multiple fulfillments. New fulfillment lines use remaining Finance-approved quantity after previously resolved quantity.

Fulfillment number:

```text
FUL-YY-00001
```

### Print Event

```http
POST /api/warehouse/fulfillments/:fulfillmentId/print
```

Printing is tracked by `print_count`, printer snapshot, and timestamp; it is not a request status.

### Input Actual Qty

```http
PUT /api/warehouse/fulfillments/:fulfillmentId/items/:fulfillmentItemId
```

Full quantity:

```json
{
  "actual_qty": 10
}
```

Shortage / backorder:

```json
{
  "actual_qty": 7,
  "shortage_reason_code": "INSUFFICIENT_STOCK",
  "remainder_disposition": "BACKORDER_REMAINDER",
  "shortage_note": "3 units expected later"
}
```

Shortage / close short:

```json
{
  "actual_qty": 7,
  "shortage_reason_code": "OUT_OF_STOCK",
  "remainder_disposition": "CLOSE_SHORT",
  "shortage_note": "Remaining quantity will not be fulfilled"
}
```

Allowed shortage reason codes:

```text
OUT_OF_STOCK
DAMAGED
NOT_FOUND
INSUFFICIENT_STOCK
OTHER
```

Remainder disposition:

```text
NONE
BACKORDER_REMAINDER
CLOSE_SHORT
```

Requested quantity is never overwritten.

### Confirm Picking

```http
POST /api/warehouse/fulfillments/:fulfillmentId/confirm-picking
```

Every fulfillment line must resolve its Finance-approved snapshot as `actual_qty + shortage_qty`. If actual quantity exists, status becomes `PENDING_INVENTORY_TRANSFER`.

## 11. NetSuite Inventory Transfer

Before handover, Warehouse must transfer physical stock in NetSuite from the source warehouse to the Loan warehouse.

Create IT record:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/inventory-transfers
```

Example:

```json
{
  "inventory_transfer_number": "IT2604868",
  "source_warehouse_code": "GOTO",
  "transfer_date": "2026-10-05",
  "note": null,
  "items": [
    {
      "fulfillment_item_id": 21,
      "transferred_qty": 5
    }
  ]
}
```

`inventory_transfer_number` is a required free-text string, trimmed and uppercased. Pilarweb does not generate the NetSuite increment. Current NetSuite convention is `IT` + two-digit year + increment, e.g. `IT2604868`.

Multiple IT records are supported for one fulfillment and one request. A transfer item may not exceed the uncovered actual quantity.

When all actual quantities are exactly covered by Inventory Transfer item quantities, the fulfillment becomes `READY_FOR_HANDOVER`.

Before handover, Warehouse may correct or remove an IT record:

```http
PUT    /api/warehouse/inventory-transfers/:transferId
DELETE /api/warehouse/inventory-transfers/:transferId
```

`PUT` updates IT number/source warehouse/date/note. If line coverage itself is wrong, delete the transfer and recreate it. After deletion, backend recalculates the IT coverage gate. IT records cannot be changed after handover.

## 12. Handover

Warehouse handover:

```http
POST /api/warehouse/fulfillments/:fulfillmentId/handover
```

```json
{
  "note": "Handed to requester"
}
```

This action is blocked unless all actual quantities are covered by IT records.

Requester (or Warehouse) confirms receipt:

```http
POST /api/warehouse/handovers/:handoverId/receive
```

After receipt:

- If approved quantity still remains as backorder: request -> `PARTIALLY_FULFILLED`.
- If all quantity is resolved and request is non-returnable: -> `COMPLETED`.
- If all quantity is resolved and request is returnable: -> `RETURN_PENDING`.

## 13. Return Flow

Return obligation is based on actual received/issued quantity, not requested quantity.

List / queue:

```http
GET /api/returns
```

Warehouse users see return queue. A normal requester sees their own returns.

Requester submits return:

```http
POST /api/returns
```

```json
{
  "request_id": "<REQUEST_UUID>",
  "note": "Returning equipment",
  "items": [
    {
      "request_item_id": 11,
      "returned_qty": 2
    }
  ]
}
```

Return number:

```text
RET-YY-00001
```

Detail:

```http
GET /api/returns/:id
```

Warehouse receives:

```http
POST /api/returns/:id/receive
```

Warehouse inspection:

```http
POST /api/returns/:id/inspect
```

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

`stock_returned_qty` is intentionally explicit and must be between `0` and `returned_qty`. Finance closing uses this numeric field rather than guessing inventory impact from the condition label.

## 14. Financial Closing

Finance closing uses `FINANCE` module access.

Closing day is loaded from master configuration. Default seed is day 7 / `Asia/Jakarta`, but it can be changed without code deployment.

List periods:

```http
GET /api/financial-closing/periods
```

Create period:

```http
POST /api/financial-closing/periods
```

```json
{
  "period_key": "2026-09"
}
```

Backend derives:

```text
period_start = 2026-09-01
period_end   = 2026-09-30
closing_date = 2026-10-07 (using current closing setting)
```

Get period and batches:

```http
GET /api/financial-closing/periods/:id
```

Start closing:

```http
POST /api/financial-closing/periods/:id/start-closing
```

Generate / regenerate DRAFT Inventory Adjustment batch:

```http
POST /api/financial-closing/periods/:id/generate-batch
```

Batch number:

```text
IA-YYYYMM-001
```

Batch detail:

```http
GET /api/financial-closing/batches/:id
```

Record NetSuite posting/reference:

```http
POST /api/financial-closing/batches/:id/post
```

```json
{
  "netsuite_reference": "<NetSuite Inventory Adjustment reference>"
}
```

Close period:

```http
POST /api/financial-closing/periods/:id/close
```

Period lifecycle:

```text
OPEN -> CLOSING -> CLOSED
```

Closed period is immutable through these APIs.

Batch movement calculation for the selected period:

```text
adjustment_qty = actual issued quantity - stock_returned_qty
```

Issue timing uses confirmed handover receipt. Return timing uses completed Warehouse inspection. A later-period return can therefore create a negative adjustment in the later period.

## 15. Admin / Dynamic Configuration

Admin endpoints require `ADMIN` access in `module_access_rules`.

Current master read endpoints:

```http
GET /api/master/bootstrap
GET /api/master/request-purposes
GET /api/master/workflows
GET /api/master/purpose-workflows
GET /api/master/approval-rules
GET /api/master/approval-rules?department_id=<id>
GET /api/master/warehouse-locations
GET /api/master/financial-closing
```

Admin endpoints:

```http
GET  /api/master/module-access-rules
POST /api/master/purpose-workflows
POST /api/master/approval-rules
PUT  /api/master/approval-rules/:id
PUT  /api/master/financial-closing
POST /api/master/module-access-rules
PUT  /api/master/module-access-rules/:id
```

Assign purpose -> workflow:

```json
{
  "request_purpose_id": 5,
  "workflow_definition_id": 2
}
```

The previous active assignment is ended; historical requests are unaffected because workflow is snapshotted at submit.

Financial closing setting:

```json
{
  "closing_day": 7,
  "timezone": "Asia/Jakarta"
}
```

Module access example:

```json
{
  "module_code": "WAREHOUSE",
  "department_id": 123,
  "min_job_level_value": null,
  "max_job_level_value": null,
  "priority": 100,
  "is_active": 1
}
```

Supported operational modules:

```text
ADMIN
FINANCE
WAREHOUSE
```

The seed now includes the confirmed PilarGroup mappings for Finance (department 7), Warehouse GOTO (department 5), Warehouse Gosave (department 6), and the initial user-specific ADMIN bootstrap rule. Admin endpoints can maintain these rules afterward.

## 16. Request Status Reference

```text
DRAFT
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
PENDING_FINANCE_REVIEW
READY_FOR_WAREHOUSE
PICKING
PENDING_INVENTORY_TRANSFER
READY_FOR_HANDOVER
HANDED_OVER
PARTIALLY_FULFILLED
RETURN_PENDING
PARTIALLY_RETURNED
COMPLETED
REJECTED
CANCELED
```

Do not invent transitions in FE. Render backend state and enable only actions relevant to that state/capability.

## 17. Recommended Sidebar

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
  - Returns
Finance Closing
Settings
```

Visibility should use `/api/auth/capabilities`. Hiding a menu is not authorization.


## 22. Edit / Revert / Cancel Contract

### Requester edit

Requester may edit request header and active item rows while request status is:

```text
DRAFT
PENDING_DEPARTMENT_APPROVAL
REVERTED_TO_REQUESTER
```

A submitted item should not be physically deleted after submission. Use item cancellation instead so history remains auditable.

### Requester item cancellation

```http
POST /api/requests/:requestId/items/:itemId/cancel
```

Payload:

```json
{ "reason": "Item is no longer needed" }
```

Requester may use this while the request is `DRAFT`, `PENDING_DEPARTMENT_APPROVAL`, or `REVERTED_TO_REQUESTER`.

### Department approver item cancellation

```http
POST /api/approvals/:approvalId/items/:itemId/cancel
```

Payload:

```json
{ "reason": "This item is not allowed for this request" }
```

Cancellation is per item. Remaining active items continue in the same request. If no active item remains, request status becomes `CANCELED`.

### Department approval revert

```http
POST /api/approvals/:approvalId/revert
```

Payload:

```json
{ "reason": "Please revise quantity and justification" }
```

Resulting request status:

```text
REVERTED_TO_REQUESTER
```

Requester can edit and submit again. Revert is blocked after Finance has submitted a decision.

### Finance item decision

Finance review item `decision` accepts:

```text
APPROVED
REJECTED
CANCELED
```

`CANCELED` requires a note/reason. A canceled item is excluded from Warehouse fulfillment.

### Important status rule

`EDIT` is an action/capability, not a transaction status. The request status remains the current workflow state while edits are allowed. `CANCELED` is used at request level only when all request items have been canceled.
