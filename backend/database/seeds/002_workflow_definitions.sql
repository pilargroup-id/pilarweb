USE pilarweb;

INSERT INTO workflow_definitions
  (code, name, version, description, requires_return, is_active)
VALUES
  ('NON_RETURNABLE', 'Non-Returnable Request', 1, 'Goods are issued and are not expected to be returned to Warehouse.', 0, 1),
  ('RETURNABLE', 'Returnable Request', 1, 'Goods are issued to the requester and must later be returned and inspected.', 1, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  requires_return = VALUES(requires_return),
  is_active = VALUES(is_active);

SET @non_returnable_workflow_id = (
  SELECT id FROM workflow_definitions
  WHERE code = 'NON_RETURNABLE' AND version = 1
  LIMIT 1
);

SET @returnable_workflow_id = (
  SELECT id FROM workflow_definitions
  WHERE code = 'RETURNABLE' AND version = 1
  LIMIT 1
);

INSERT INTO workflow_steps
  (workflow_definition_id, step_order, step_code, step_name, step_type, is_required)
VALUES
  (@non_returnable_workflow_id, 10, 'DEPARTMENT_APPROVAL', 'Department Approval', 'APPROVAL', 1),
  (@non_returnable_workflow_id, 20, 'FINANCE_REVIEW', 'Finance Review', 'FINANCE_REVIEW', 1),
  (@non_returnable_workflow_id, 30, 'WAREHOUSE_PICKING', 'Warehouse Picking', 'WAREHOUSE', 1),
  (@non_returnable_workflow_id, 40, 'INVENTORY_TRANSFER', 'NetSuite Inventory Transfer', 'INVENTORY_TRANSFER', 1),
  (@non_returnable_workflow_id, 50, 'HANDOVER', 'Goods Handover', 'HANDOVER', 1),
  (@non_returnable_workflow_id, 60, 'COMPLETION', 'Completion', 'COMPLETION', 1),

  (@returnable_workflow_id, 10, 'DEPARTMENT_APPROVAL', 'Department Approval', 'APPROVAL', 1),
  (@returnable_workflow_id, 20, 'FINANCE_REVIEW', 'Finance Review', 'FINANCE_REVIEW', 1),
  (@returnable_workflow_id, 30, 'WAREHOUSE_PICKING', 'Warehouse Picking', 'WAREHOUSE', 1),
  (@returnable_workflow_id, 40, 'INVENTORY_TRANSFER', 'NetSuite Inventory Transfer', 'INVENTORY_TRANSFER', 1),
  (@returnable_workflow_id, 50, 'HANDOVER', 'Goods Handover', 'HANDOVER', 1),
  (@returnable_workflow_id, 60, 'RETURN_MONITORING', 'Return Monitoring', 'RETURN', 1),
  (@returnable_workflow_id, 70, 'WAREHOUSE_RETURN_RECEIPT', 'Warehouse Return Receipt', 'RETURN_RECEIPT', 1),
  (@returnable_workflow_id, 80, 'COMPLETION', 'Completion', 'COMPLETION', 1)
ON DUPLICATE KEY UPDATE
  step_name = VALUES(step_name),
  step_type = VALUES(step_type),
  is_required = VALUES(is_required);

-- Intentionally not seeded:
-- request_purpose_workflows. Business must decide which purpose uses which workflow.
-- Existing requests keep their workflow/version snapshot even if future assignments change.
