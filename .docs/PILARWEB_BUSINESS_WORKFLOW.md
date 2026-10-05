# Pilarweb Business Workflow

## Core Principles

1. Itembase is the source of truth for item master data. Pilarweb stores transaction snapshots only.
2. Request Purpose is separate from Workflow. New requests can use a new mapping without changing historical transactions.
3. Workflow and approval requirements are snapshotted at submit time.
4. Staff below the configured requester block level may request. Assistant Manager/Manager rules are data-driven in `approval_rules`, not hardcoded by department.
5. Finance decision is per item and may reduce approved quantity.
6. Warehouse never overwrites requested or Finance-approved quantity; actual quantity is a separate fact.
7. Shortage can be `BACKORDER_REMAINDER` or `CLOSE_SHORT`.
8. NetSuite Inventory Transfer is a mandatory gate before handover. Multiple IT records are supported.
9. Return obligation is based on actual issued quantity.
10. Financial closing uses actual issue and explicit `stock_returned_qty`, not requested quantity or condition-label assumptions.
11. Historical/audit records are append-oriented. Closed Finance periods are immutable.

## Non-Returnable Flow

```text
DRAFT
-> Submit
-> PENDING_DEPARTMENT_APPROVAL
-> Department Approve
-> PENDING_FINANCE_REVIEW
-> Finance Approve / Reject per Item
-> READY_FOR_WAREHOUSE
-> Warehouse Accept
-> PICKING
-> Actual Qty + Shortage Resolution
-> PENDING_INVENTORY_TRANSFER
-> NetSuite Source Warehouse -> LOAN
-> Record IT No. / Coverage
-> READY_FOR_HANDOVER
-> HANDED_OVER
-> Requester Receipt
-> COMPLETED
-> Eligible for Financial Closing movement calculation
```

## Returnable Flow

```text
DRAFT
-> Department Approval
-> Finance Review
-> Warehouse Fulfillment
-> Inventory Transfer to LOAN
-> Handover / Receipt
-> RETURN_PENDING
-> Return Submitted
-> Warehouse Receive
-> Warehouse Inspect
-> PARTIALLY_RETURNED (when balance remains)
-> COMPLETED (when resolved)
```

## Partial Fulfillment

Example:

```text
Finance Approved: 10
Actual Picked: 7
Shortage: 3
```

`BACKORDER_REMAINDER`: 7 can be transferred/handed over, request becomes `PARTIALLY_FULFILLED`, and Warehouse can create another fulfillment for the remaining 3.

`CLOSE_SHORT`: the shortage is considered resolved and no future fulfillment is expected for that quantity.

## Inventory Transfer

Example NetSuite reference:

```text
IT2604868
```

Pilarweb stores it as a required string. It does not generate or increment the NetSuite number.

IT coverage is line-based. Sum of transferred quantity for a fulfillment line must equal its actual quantity before handover.

## Return Inspection and Finance

`condition_code` describes Warehouse inspection (`GOOD`, `DAMAGED`, `MISSING`, `OTHER`). Financial stock impact is not inferred from this label.

Warehouse explicitly records `stock_returned_qty`. This lets Finance calculate:

```text
period adjustment = issued quantity - stock_returned_qty
```

without guessing whether a damaged/missing line physically returned to inventory.
