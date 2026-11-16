# Pilarweb Frontend Integration — SUPER USER Access

Baseline date: 16 November 2026 15:05 WIB  
Backend SOT: `pilarweb.zip` uploaded on 16 November 2026.

This document describes the frontend changes required for the new Pilarweb `SUPER_USER` access model.

## 1. Purpose

Pilarweb now has an explicit backend capability named:

```text
SUPER_USER
```

The initial department-level assignments are:

```text
PilarGroup Department 8 = IT
PilarGroup Department 9 = Board Of Director
```

These department IDs come from PilarGroup `master_departments`. Frontend must not hardcode department 8 or 9 to decide access.

Access must be driven by:

```http
GET /api/auth/capabilities
```

## 2. Capabilities Response

The capabilities response now includes:

```json
{
  "can_create_request": false,
  "can_approve_department": true,
  "super_user_access": true,
  "finance_access": true,
  "warehouse_access": true,
  "warehouse_discrepancy_supervisor_access": true,
  "admin_access": true,
  "validation_override_access": true,
  "approval_rule_configured": true
}
```

`can_create_request` in the example is intentionally independent from `SUPER_USER`.

A super user does not automatically become a requester. Request creation eligibility still follows the requester's job-level / approval rule and validation restrictions.

## 3. What SUPER USER Means

When `super_user_access = true`, backend treats the authenticated user as having these access scopes:

```text
ADMIN
FINANCE
WAREHOUSE
WAREHOUSE_DISCREPANCY_SUPERVISOR
VALIDATION_OVERRIDE
MANAGER APPROVAL ACROSS DEPARTMENTS
```

The frontend should therefore expose the same operational/admin features already controlled by the corresponding capability flags.

Do not add conditions like:

```js
if (departmentId === 8 || departmentId === 9) { ... }
```

Do this instead:

```js
if (capabilities.super_user_access) {
  // optional Super User badge / UI treatment
}

if (capabilities.admin_access) {
  // show Master / Admin menus
}

if (capabilities.finance_access) {
  // show Finance menu
}

if (capabilities.warehouse_access) {
  // show Warehouse menu
}

if (capabilities.can_approve_department) {
  // show Approval menu
}
```

The individual module flags remain authoritative for menu/action visibility.

## 4. Approval Behavior

Normal Manager users continue to see only approval records that match their department and job-level approval snapshot.

A super user can access the Manager Approval queue across departments:

```http
GET /api/approvals
GET /api/approvals/history
GET /api/approvals/:id
```

A super user can execute:

```http
POST /api/approvals/:id/approve
POST /api/approvals/:id/revert
POST /api/approvals/:id/cancel
```

for approval records outside their own department.

### Important restriction

Super user does **not** bypass self-approval protection.

If the logged-in super user is also the requester of the same PB, backend returns `403`:

```text
SELF_APPROVAL_FORBIDDEN
```

Frontend must not present this as an authorization bug.

## 5. Finance

For super users:

```text
finance_access = true
```

So the existing Finance UI can be shown without additional department checks.

Existing Finance endpoints and payloads do not change.

## 6. Warehouse

For super users:

```text
warehouse_access = true
warehouse_discrepancy_supervisor_access = true
```

This means they can use the normal Warehouse flow and can also resolve discrepancies that have reached:

```text
SUPERVISOR_REQUIRED
```

No Warehouse API payload changes are introduced by this update.

## 7. Validation Override

For super users:

```text
validation_override_access = true
```

Backend grants this through `SUPER_USER`; a separate row in `validation_override_users` is not required.

Existing explicitly configured `validation_override_users` remain valid for non-super users.

## 8. Admin / Master

For super users:

```text
admin_access = true
```

They can access existing Admin/Master endpoints, including:

```text
Module Access Rules
Approval Rules
Request Policy
Financial Closing Settings
Request Purposes
Warehouse Locations
Validation Override Users
Validation Rules
```

`SUPER_USER` is now also a valid `module_code` in Module Access Rule maintenance.

Supported module codes include:

```text
SUPER_USER
ADMIN
FINANCE
WAREHOUSE
WAREHOUSE_DISCREPANCY_SUPERVISOR
```

## 9. Physical Receipt Is Not Impersonation

`SUPER_USER` grants operational visibility and privileged module access, but it does not turn the user into another requester.

Requester physical receipt confirmation remains owned by the original requester.

For example, do not show another user's `Confirm Receipt` button merely because:

```text
super_user_access = true
```

Backend requester-ownership rules remain authoritative.

## 10. Recommended Navigation Logic

Use capability flags from `/api/auth/capabilities`.

Example:

```text
Dashboard
My Request
Approval              -> can_approve_department
Finance               -> finance_access
Warehouse             -> warehouse_access
Master / Administration -> admin_access
Validation Override   -> validation_override_access
```

A super user will naturally see all relevant menus because the backend returns the individual flags as `true`.

## 11. Optional UI Badge

Frontend may display an informational badge when:

```text
super_user_access = true
```

Recommended label:

```text
Super User
```

This is visual only. Never use the badge or PilarGroup department name as the authorization source.

## 12. Frontend Change Checklist

1. Extend the capabilities type/interface with:

```ts
super_user_access: boolean
```

2. Do not hardcode `IT`, `Board Of Director`, department `8`, or department `9` for authorization.
3. Continue using existing individual capability flags for menus/actions.
4. Approval menu may now contain cross-department records for a super user.
5. Handle `SELF_APPROVAL_FORBIDDEN` normally if a super user attempts to approve their own PB.
6. Do not use `super_user_access` to bypass requester-only actions such as physical receipt confirmation.
7. If the Module Access Rule UI has a module-code dropdown, add:

```text
SUPER_USER
```

## 13. Summary

Frontend authorization source of truth remains:

```http
GET /api/auth/capabilities
```

The key rule is:

```text
Department membership -> backend module rule -> capability flags -> frontend UI
```

not:

```text
Department name/id -> frontend hardcoded access
```
