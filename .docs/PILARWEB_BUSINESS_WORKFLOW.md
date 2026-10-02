# Pilarweb Business Workflow

## Core Design Principle

Request Purpose and Workflow are separate configuration objects. A purpose may change workflow for future requests without changing historical requests.

## Workflow A - Non-Returnable

```text
Requester
-> Department Approval
-> Finance Review
-> Warehouse Accept
-> Print / Pick
-> Input Actual Qty
-> Resolve Shortage
-> NetSuite Inventory Transfer to LOAN
-> Record IT No.
-> Handover
-> Complete
-> Eligible Financial Closing Data
```

## Workflow B - Returnable

```text
Requester
-> Department Approval
-> Finance Review
-> Warehouse Accept
-> Print / Pick
-> Input Actual Qty
-> Resolve Shortage
-> NetSuite Inventory Transfer to LOAN
-> Record IT No.
-> Handover
-> Return Pending
-> Partial/Full Return
-> Warehouse Inspection
-> Complete
-> Eligible Financial Closing Data
```

## Approval

`approval_rules` is the configurable master. No source-code special case should say "Product Department always uses Assistant Manager". Product can be configured that way today and changed later without deployment.

Assistant Manager and higher levels are approver-only for this request process and may not create requests. The exact numeric Assistant Manager job-level mapping must be loaded from confirmed PilarGroup data before production rules are seeded.

## Shortage

Original request quantities are immutable historical intent. Warehouse records actual quantity separately. Remaining quantity can either stay open as backorder or be closed short with a reason.

## Inventory Transfer

Inventory Transfer is a mandatory operational gate before handover. NetSuite remains the system of record for the IT number. Pilarweb records the reference and item coverage to prevent Warehouse from forgetting the transfer step.

## Financial Closing

Closing date is dynamic. Default is day 7. Periods should be explicit records so Finance can see OPEN/CLOSING/CLOSED state and later produce an Inventory Adjustment batch from actual issued quantities.
