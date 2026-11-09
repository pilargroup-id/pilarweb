# Pilarweb Frontend Integration — Warehouse Access & Source Warehouse Snapshot

Baseline: `pilarweb.zip` supplied on 6 November 2026.

## Purpose

Warehouse source location is a NetSuite location selection/snapshot only. It no longer owns or restricts a fulfillment by PilarGroup department.

Any authenticated user who has backend `WAREHOUSE` module access can process Warehouse operational actions regardless of whether the original fulfillment was first handled by IT, Warehouse GOTO, or Warehouse Gosave.

## Source Warehouse

Frontend continues to load active locations from:

```http
GET /api/master/warehouse-locations
```

A location contains:

```text
id
internal_id
code
name
is_active
```

All active locations are selectable. Frontend must not map a location to Warehouse GOTO / Warehouse Gosave and must not derive transaction ownership from the current user's department.

When saving fulfillment progress, frontend sends only the selected location ID:

```json
{
  "source_warehouse_id": 22,
  "inventory_transfer_number": "IT261100001",
  "items": [
    {
      "fulfillment_item_id": 101,
      "actual_qty": 3
    }
  ]
}
```

Backend snapshots the location to the fulfillment:

```text
source_warehouse_id
source_warehouse_internal_id
source_warehouse_code
source_warehouse_name
```

## Warehouse Authorization

Frontend must not check or compare `warehouse_department_id` / `warehouse_department_name`. Those fields are removed from the API/DB model.

Normal Warehouse actions require:

```text
warehouse_access = true
```

This includes fulfillment/picking, save progress, complete, print DO, discrepancy form handling, return receiving, and administrative Return Shortfall fulfillment.

## Delivery Discrepancy

The grouped discrepancy form contract remains:

```http
GET  /api/warehouse/discrepancy-forms
GET  /api/warehouse/discrepancy-forms/:requestId
POST /api/warehouse/discrepancy-forms/:requestId/resolve
```

`RESEND` / `CLOSE_WITH_REASON` remain per item row. All `RESEND` rows submitted in the same PB form are combined into one supplemental fulfillment.

There is no Warehouse-department ownership validation anymore. Therefore a fulfillment initially processed by an IT user can later be resolved by a Warehouse user as long as that user has `WAREHOUSE` access.

## Supervisor SLA

When any row reaches:

```text
SUPERVISOR_REQUIRED
```

resolution requires:

```text
warehouse_discrepancy_supervisor_access = true
```

This supervisor capability is user-specific and global across Warehouse locations. It is not scoped by the user's department or by the selected source warehouse.

## Removed API Fields

Do not depend on:

```text
warehouse_department_id
warehouse_department_name
```

They are removed from discrepancy form/list API types and fulfillment ownership logic.
