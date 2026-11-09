-- Pilarweb 010: remove Warehouse department ownership from fulfillment/discrepancy flow
-- Source Warehouse is a NetSuite location snapshot only. Authorization is module-access based.
USE pilarweb;

-- Supervisor capability is user-specific and global across Warehouse locations.
UPDATE module_access_rules
SET department_id = NULL
WHERE module_code = 'WAREHOUSE_DISCREPANCY_SUPERVISOR';

-- Remove stale actor-derived ownership from SLA records first.
ALTER TABLE warehouse_sla_violations
  DROP INDEX IF EXISTS idx_warehouse_sla_violations_department;

ALTER TABLE warehouse_sla_violations
  DROP COLUMN IF EXISTS warehouse_department_id,
  DROP COLUMN IF EXISTS warehouse_department_name;

-- Fulfillment keeps only the selected NetSuite source warehouse snapshot and actor audit fields.
ALTER TABLE warehouse_fulfillments
  DROP COLUMN IF EXISTS warehouse_department_id,
  DROP COLUMN IF EXISTS warehouse_department_name;
