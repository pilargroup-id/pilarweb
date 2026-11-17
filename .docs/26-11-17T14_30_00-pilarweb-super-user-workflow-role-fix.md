# Pilarweb - SUPER_USER Workflow Role Fix

## Scope

Backend fix to keep `SUPER_USER` as a module/access umbrella only. It must not convert a Staff user into a Manager approver.

Departments currently granted `SUPER_USER` remain unchanged:

- IT (`department_id = 8`)
- Board Of Director (`department_id = 9`)

No database migration is required for this fix.

## Correct Access Model

`SUPER_USER` controls broad module access:

- ADMIN
- FINANCE
- WAREHOUSE
- WAREHOUSE_DISCREPANCY_SUPERVISOR
- VALIDATION_OVERRIDE

Manager Approval remains controlled only by:

- user's real department
- user's real `job_level_value`
- `approval_rules`
- approval snapshot (`department_id`, `required_job_level_value`, `allow_higher_job_level`)

`SUPER_USER` must never bypass those workflow rules.

## Backend Changes

### `backend/src/services/access.service.js`

`can_approve_department` no longer uses `super_user_access` as a bypass.

Before conceptually:

```text
SUPER_USER OR matches approval rule/job level
```

After:

```text
matches approval rule/job level only
```

`approval_rule_configured` also reflects actual approval rules only.

`can_create_request` is unchanged and continues to use `requester_block_min_job_level_value` from `approval_rules`.

### `backend/src/services/approval.service.js`

Removed SUPER_USER bypass from:

- pending Manager Approval queue
- Manager Approval history
- approve action
- revert action
- cancel action

All actions now go through `canApproveWithSnapshot()`.

Self-approval protection remains unchanged.

## Expected Capability Examples

### Staff - IT / Board Of Director

```json
{
  "can_create_request": true,
  "can_approve_department": false,
  "super_user_access": true,
  "admin_access": true,
  "finance_access": true,
  "warehouse_access": true,
  "warehouse_discrepancy_supervisor_access": true,
  "validation_override_access": true
}
```

The exact values still depend on the user's real job level and configured approval rule, but `super_user_access` no longer forces approval eligibility.

### Manager - IT / Board Of Director

A Manager can receive `can_approve_department = true` only when the configured approval rule/job level matches.

Request creation remains governed by `can_create_request`; broad module access must not be used to infer whether a user is requester or approver.

## Frontend Requirement

Frontend must use capability fields independently.

Use:

```text
Create Request / requester UI -> can_create_request
Manager Approval menu/action -> can_approve_department
Finance UI -> finance_access
Warehouse UI -> warehouse_access
Admin/Master UI -> admin_access
Validation Override -> validation_override_access
```

Do not use any of these as a replacement for Manager Approval eligibility:

```text
super_user_access
admin_access
finance_access
warehouse_access
department_id === 8
department_id === 9
```

In particular, do not write UI logic equivalent to:

```text
if (super_user_access) show Manager Approval
if (admin_access) hide Create Request
```

A Staff user can be both:

```text
super_user_access = true
can_create_request = true
can_approve_department = false
```

That combination is valid and expected.

## Database

No SQL/data change is required. Existing `SUPER_USER` rows for IT and Board Of Director remain valid.
