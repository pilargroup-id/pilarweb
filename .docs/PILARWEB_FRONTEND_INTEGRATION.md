# Pilarweb Frontend Integration Guide

This document is the frontend source of truth for the current Pilarweb backend baseline.

## 1. Application Purpose

Pilarweb is used internally to request physical goods from Warehouse. Item master data remains owned by Itembase. Pilarweb owns request workflow, approvals, Finance review, Warehouse fulfillment, NetSuite Inventory Transfer references, return tracking, and monthly financial closing data.

## 2. Current Backend Scope

Implemented now:

- PilarGroup authentication through `/api/auth/me`.
- Pilarweb application access check using the `pilarweb` app slug.
- Item search/list proxy at `GET /api/item/items`.
- Itembase filtering is enforced by backend: `item_kind=regular` only.
- Read-only master/bootstrap endpoints.
- Database schema and seeds for the complete business flow.

Not implemented in this baseline yet:

- Request create/edit/submit endpoints.
- Approval actions.
- Finance decision actions.
- Warehouse fulfillment write actions.
- Return write actions.
- Financial-closing write actions.

Do not invent frontend request/action endpoints before the backend contract is added. The UI/state guidance below defines the intended behavior so screen implementation can be prepared without guessing business rules.

## 3. Authentication

Every protected request uses:

```http
Authorization: Bearer <PILARGROUP_JWT>
```

Current user:

```http
GET /api/auth/me
```

Expected backend response wrapper:

```json
{
  "success": true,
  "message": "Authenticated",
  "data": {}
}
```

Use the returned user profile as the current user. Do not build authorization from localStorage-only role assumptions.

General handling:

| HTTP | FE behavior |
|---|---|
| 401 | Clear auth state and return user to login/session recovery. |
| 403 | Show no-access state. Do not retry automatically. |
| 404 | Show not-found or stale-resource state. |
| 409 | Show conflict and refresh current transaction state. |
| 422 | Show field/business validation messages. |
| 5xx | Show server/upstream error and allow manual retry. |

## 4. Item API

Pilarweb exposes the same route name used by Itembase:

```http
GET /api/item/items
```

The backend calls Itembase:

```http
GET https://itembase.pilargroup.id/api/item/items?item_kind=regular
```

Important rules:

1. FE must never assume bundle items can be requested.
2. FE does not need to send `item_kind`.
3. If FE sends `item_kind=bundle`, backend ignores it and still forwards `item_kind=regular`.
4. Other query parameters are forwarded to Itembase, including pagination/search parameters supported by the existing Itembase endpoint.
5. The response body is passed through from Itembase without Pilarweb reshaping it. Use the existing Itembase item-list response contract.

Example FE call:

```http
GET /api/item/items?page=1&limit=20&search=fan
Authorization: Bearer <token>
```

## 5. Master Bootstrap

Recommended initial page bootstrap:

```http
GET /api/master/bootstrap
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "message": "Pilarweb master data loaded",
  "data": {
    "request_purposes": [],
    "workflows": [],
    "purpose_workflow_assignments": [],
    "approval_rules": [],
    "warehouse_locations": [],
    "financial_closing": null
  }
}
```

Individual routes also exist:

```text
GET /api/master/request-purposes
GET /api/master/workflows
GET /api/master/purpose-workflows
GET /api/master/approval-rules
GET /api/master/approval-rules?department_id=<id>
GET /api/master/warehouse-locations
GET /api/master/financial-closing
```

## 6. Request Purposes

Initial codes and labels:

| Code | Label |
|---|---|
| `TIKTOK_SHIPMENT` | TikTok Shipment |
| `YOUTUBE_SHIPMENT` | YouTube Shipment |
| `INTERNAL_USE` | Internal Use |
| `MARKETING_REQUEST` | Marketing Request |
| `PRODUCT_SAMPLE` | Product Sample |

The FE must use `code`/`id` from API data. Do not hardcode which purpose is returnable.

## 7. Dynamic Workflow Rule

A Request Purpose is not permanently tied to one flow.

The backend database maps:

```text
Request Purpose -> Active Workflow Definition + Version
```

Example:

```text
PRODUCT_SAMPLE -> RETURNABLE v1
```

can later become:

```text
PRODUCT_SAMPLE -> NON_RETURNABLE v2
```

without changing old transactions.

FE rule:

- For a new request, use the active assignment returned by backend.
- For an existing request, render the workflow snapshot stored on that request.
- Never recompute an old request's workflow from the current purpose configuration.

## 8. Requester / Approver Behavior

Business requirement:

- Staff below Assistant Manager may create requests.
- Assistant Manager level and above cannot create requests.
- Approval minimum is configurable in `approval_rules`.
- A department that has no Manager may use Assistant Manager as its approval level.
- Product Department is the known case where Assistant Manager may be the effective approver.

The exact PilarGroup numeric `job_level_value` for Assistant Manager is intentionally not seeded yet. FE must not hardcode a number before backend configuration is finalized.

When backend later returns capability flags, FE should use those flags instead of reproducing numeric authorization rules locally.

## 9. Intended Main Flow

```text
DRAFT
  -> PENDING_DEPARTMENT_APPROVAL
  -> PENDING_FINANCE_REVIEW
  -> READY_FOR_WAREHOUSE
  -> PICKING
  -> PENDING_INVENTORY_TRANSFER
  -> READY_FOR_HANDOVER
  -> HANDED_OVER
```

Non-returnable:

```text
HANDED_OVER -> COMPLETED
```

Returnable:

```text
HANDED_OVER
  -> RETURN_PENDING
  -> PARTIALLY_RETURNED (optional)
  -> RETURNED
  -> RETURN_INSPECTION
  -> COMPLETED
```

Rejected/canceled branches can stop the flow before Warehouse fulfillment.

## 10. Create Request Screen

Recommended fields:

| Field | Type | Required | Notes |
|---|---|---:|---|
| Request Purpose | Select | Yes | Load from master API. |
| Reason | Textarea | Yes | Business justification. |
| Return Due Date | Date | Conditional | Show only when selected workflow `requires_return = 1`. |
| Items | Repeating rows | Yes | Source only from `/api/item/items`. |
| Requested Qty | Decimal/number | Yes | Must be > 0. |
| Item Notes | Text | No | Per-item note. |

Do not allow manual SKU free typing as the primary path. User should select an Itembase item so the backend can later snapshot the correct item ID/code/name.

## 11. Finance Review Screen

Finance decides whether requested goods are permitted.

The schema supports per-item decisions:

```text
PENDING
APPROVED
REJECTED
```

and `approved_qty` per item.

FE should be prepared for a request where some items are approved and others rejected. Do not assume Finance approval is always all-or-nothing.

## 12. Warehouse Queue and Picking

Warehouse receives requests after Finance approval.

Warehouse flow:

```text
Accept Request
-> Print Picking Request
-> Physically Pick Goods
-> Input Actual Qty
-> Resolve Shortages
-> Create Inventory Transfer in NetSuite
-> Input NetSuite IT No. in Pilarweb
-> Handover Goods
```

Printing is an event, not a business status. The database keeps `print_count`, `last_printed_at`, and last printer snapshot.

## 13. Actual Quantity and Shortage

Never overwrite requested quantity with picked quantity.

For each line show at minimum:

```text
Requested Qty
Finance Approved Qty
Actual Qty
Shortage Qty
Shortage Reason
Remainder Disposition
```

Suggested shortage reason codes:

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

Example:

```text
Requested: 10
Approved: 10
Actual: 7
Shortage: 3
Disposition: BACKORDER_REMAINDER
```

The remaining 3 can be fulfilled later without changing the original requested quantity.

## 14. NetSuite Inventory Transfer Gate

Before Warehouse may hand goods to the requester, the physical source stock must first be transferred in NetSuite to the Loan warehouse.

Example:

```text
GOTO Warehouse -> LOAN
GOSAVE Warehouse -> LOAN
```

A single Pilarweb request may need multiple Inventory Transfer records when goods come from different source warehouses.

The Inventory Transfer number is stored as string/free text because NetSuite is the source of truth.

Current NetSuite example format:

```text
IT2604868
```

Meaning:

```text
IT = Inventory Transfer
26 = year 2026
04868 = incrementing sequence portion
```

Frontend field:

```text
Label: Inventory Transfer No.
Example placeholder: IT2604868
Required: Yes before handover
```

Recommended client-side validation: trim whitespace and uppercase. A lightweight `^IT\d+$` check may be used for typo prevention, but Pilarweb must not generate the NetSuite number or increment.

Critical gate:

```text
Actual Qty saved
+ all issued quantities covered by Inventory Transfer records
+ Inventory Transfer No. present
= handover may continue
```

If IT number is missing, disable the final Handover/Confirm Shipment action and show a clear blocking message.

## 15. Multiple Inventory Transfers

Do not design the UI as one IT number per request header.

Example:

```text
Request WP-001

Transfer 1
Source: GOTO
IT No.: IT2604868
Items: SKU A x 5

Transfer 2
Source: GOSAVE
IT No.: IT2604869
Items: SKU B x 3
```

UI should therefore use an Inventory Transfer section/list, with each transfer containing:

- Source Warehouse
- Destination Warehouse (normally LOAN)
- IT No.
- Transfer Date
- Covered item lines and transferred quantities
- Optional note

## 16. Returnable Flow

The return obligation is based on actual goods issued, not originally requested quantity.

Example:

```text
Requested 10
Actually issued 7
Return obligation 7
```

Partial returns are supported:

```text
Issued: 7
Return #1: 4
Return #2: 3
Balance: 0
```

Condition codes prepared by schema:

```text
GOOD
DAMAGED
MISSING
OTHER
```

Warehouse performs final receipt/inspection.

## 17. Activity Timeline

Every important action should be rendered as a chronological timeline when the API is implemented:

- Request created/submitted.
- Approval decision.
- Finance decision.
- Warehouse acceptance.
- Print event.
- Actual quantity entry.
- Shortage resolution.
- Inventory Transfer recorded.
- Handover.
- Return events.
- Completion.
- Financial close/batch inclusion.

Free comments are separate from system activity events.

## 18. Financial Closing

Default business setting:

```text
Closing day: 7
Timezone: Asia/Jakarta
```

This is configuration, not a frontend constant. Always load it from backend.

The planned period lifecycle is:

```text
OPEN -> CLOSING -> CLOSED
```

Inventory Adjustment output must be based on actual issued quantity, not requested quantity.

Once a transaction is included in a closed Finance batch, historical records should be treated as immutable. Corrections belong to a later adjustment instead of silently editing the old closed period.

## 19. Recommended FE Navigation

Suggested modules:

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
Settings (future admin-only)
```

Menu visibility must eventually follow backend capability/permission data. Hiding a menu is not authorization.

## 20. Loading and Empty States

Use skeletons for item/master/request lists rather than plain "Loading..." text.

Required empty states:

- No Itembase item matches search.
- No pending approvals.
- No Finance requests.
- No Warehouse requests.
- No pending returns.
- No closing batch for selected period.

## 21. Terminology

Use these English terms consistently:

```text
Request Purpose
Requested Qty
Approved Qty
Actual Qty
Shortage Qty
Inventory Transfer No.
Source Warehouse
Loan Warehouse
Handover
Return Due Date
Return Balance
Finance Review
Financial Closing
Inventory Adjustment
```

Do not mix Indonesian labels into the production UI unless a later localization requirement is explicitly added.
