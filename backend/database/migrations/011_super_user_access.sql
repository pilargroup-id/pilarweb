-- Pilarweb 011: explicit SUPER_USER access for IT and Board Of Director
USE pilarweb;

-- SUPER_USER is an umbrella permission resolved by the backend. It grants
-- ADMIN, FINANCE, WAREHOUSE, WAREHOUSE_DISCREPANCY_SUPERVISOR and
-- Validation Override access without duplicating department rules.
INSERT INTO module_access_rules (module_code, department_id, priority, is_active)
SELECT 'SUPER_USER', 8, 1, 1
WHERE NOT EXISTS (
  SELECT 1
  FROM module_access_rules
  WHERE module_code = 'SUPER_USER'
    AND department_id = 8
    AND user_id IS NULL
);

INSERT INTO module_access_rules (module_code, department_id, priority, is_active)
SELECT 'SUPER_USER', 9, 1, 1
WHERE NOT EXISTS (
  SELECT 1
  FROM module_access_rules
  WHERE module_code = 'SUPER_USER'
    AND department_id = 9
    AND user_id IS NULL
);
