# Pilarweb - Grouped Discrepancy Resend

Baseline: Pilarweb backend final 21 October 2026.

## Change

Delivery discrepancy resolution is now submitted per PB form, not one API call per discrepancy row.

Each unresolved item still has its own resolution:

- `RESEND`
- `CLOSE_WITH_REASON`

However, all rows marked `RESEND` in one PB form submission are grouped into one supplemental physical fulfillment.

Example:

```text
PB261000123

Item A difference 3 -> RESEND
Item B difference 3 -> RESEND
Item C difference 1 -> CLOSE_WITH_REASON
```

Result:

```text
1 supplemental fulfillment
  Item A qty 3
  Item B qty 3

Item C does not enter the resend fulfillment.
```

The PB number does not change. A new PB is NOT created for delivery resend.

## Warehouse endpoints

### List discrepancy forms

```http
GET /api/warehouse/discrepancy-forms
```

Optional query parameters:

```text
page
limit
status
search
```

One result row represents one PB that still has unresolved delivery discrepancies.

### Detail form

```http
GET /api/warehouse/discrepancy-forms/:requestId
```

The response contains all unresolved discrepancy item rows for the PB.

### Submit the whole form

```http
POST /api/warehouse/discrepancy-forms/:requestId/resolve
Content-Type: application/json
```

Example:

```json
{
  "items": [
    {
      "discrepancy_id": 101,
      "resolution_type": "RESEND",
      "resolution_note": null
    },
    {
      "discrepancy_id": 102,
      "resolution_type": "RESEND",
      "resolution_note": null
    },
    {
      "discrepancy_id": 103,
      "resolution_type": "CLOSE_WITH_REASON",
      "resolution_note": "Item will not be resent"
    }
  ]
}
```

Frontend must submit a resolution for every unresolved row shown in the PB form. Partial form submission is rejected.

If a row is already past the Warehouse resolution SLA, send `late_resolution_reason` for that row, or one top-level `late_resolution_reason` to apply to overdue rows.

Example:

```json
{
  "late_resolution_reason": "Warehouse follow-up was delayed",
  "items": [
    {
      "discrepancy_id": 101,
      "resolution_type": "RESEND"
    },
    {
      "discrepancy_id": 102,
      "resolution_type": "CLOSE_WITH_REASON",
      "resolution_note": "Remaining item will not be resent"
    }
  ]
}
```

## RESEND behavior

All `RESEND` rows in the submitted form receive the same `resend_fulfillment_id`.

The new fulfillment starts at:

```text
PICKING
```

and follows the existing physical fulfillment flow:

```text
PICKING
-> Save Progress
-> Source Warehouse + IWT + Actual Qty
-> READY_FOR_DISPATCH
-> Print DO
-> DISPATCHED
-> Requester physical receipt
```

Resend quantity is generated from `difference_qty`. Warehouse cannot change the resend obligation during discrepancy resolution.

Warehouse may still enter an `actual_qty` lower than the resend obligation during the resend Picking flow. If the requester later physically receives less than the resent shipment, a new discrepancy is generated for that shipment.

## CLOSE_WITH_REASON behavior

`resolution_note` is mandatory.

A `CLOSE_WITH_REASON` row does not create a fulfillment and does not require a new IWT.

If the form contains only `CLOSE_WITH_REASON`, `resend_fulfillment_id` is `null`.

## Removed FE action

Do not use the old per-item resolution endpoint:

```http
POST /api/warehouse/discrepancies/:id/resolve
```

It is removed from the Warehouse router to prevent multiple supplemental fulfillments being generated from one PB form.

The existing item-level read endpoint remains available for diagnostics:

```http
GET /api/warehouse/discrepancies
```

## Database

No schema or migration change is required. Existing fields already support multiple discrepancy rows pointing to the same `resend_fulfillment_id`.
