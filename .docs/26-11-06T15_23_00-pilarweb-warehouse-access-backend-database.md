# Pilarweb Backend & Database — Warehouse Access Without Department Ownership

Baseline: `pilarweb.zip` supplied on 6 November 2026.

## Final Rule

`warehouse_locations` is a NetSuite location master only. A source warehouse does not belong to Warehouse GOTO or Warehouse Gosave for Pilarweb authorization.

Fulfillment stores the selected source location as a transaction snapshot:

```text
source_warehouse_id
source_warehouse_internal_id
source_warehouse_code
source_warehouse_name
```

Actor identity is stored separately in existing audit fields such as:

```text
created_by_*
progress_saved_by_*
picking_completed_by_*
last_do_printed_by_*
resolved_by_*
warehouse_received_by_*
```

The actor's PilarGroup department must never become fulfillment ownership.

## Authorization

Operational Warehouse actions require module access:

```text
WAREHOUSE
```

No comparison is performed between actor department and fulfillment/source warehouse.

For discrepancy status `SUPERVISOR_REQUIRED`, the additional module capability is required:

```text
WAREHOUSE_DISCREPANCY_SUPERVISOR
```

That capability is user-specific and global across Warehouse locations.

## Database Change

Removed from `warehouse_fulfillments`:

```text
warehouse_department_id
warehouse_department_name
```

Removed from `warehouse_sla_violations`:

```text
warehouse_department_id
warehouse_department_name
idx_warehouse_sla_violations_department
```

Migration:

```text
backend/database/migrations/010_remove_warehouse_department_ownership.sql
```

The migration also sets `department_id = NULL` for existing `WAREHOUSE_DISCREPANCY_SUPERVISOR` access rules so the capability is not restricted by PilarGroup department.

## Existing Data Repair

No location-to-department mapping is required. Old values such as:

```text
warehouse_department_id = 8
warehouse_department_name = IT
```

are obsolete metadata and are removed by migration `010`.

Existing source warehouse snapshots, IWT numbers, fulfillment status, receipts, discrepancies, returns, and activity history are not modified.

## RESEND

Grouped RESEND remains one supplemental fulfillment per PB form submission. It no longer copies Warehouse department ownership from the parent discrepancy/fulfillment.

The supplemental fulfillment starts at `PICKING`; any `WAREHOUSE`-authorized user can choose an active source warehouse and continue the flow.
