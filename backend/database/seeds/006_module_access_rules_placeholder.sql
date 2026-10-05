USE pilarweb;

-- Confirmed PilarGroup department mapping:
-- Finance = 7
-- Warehouse GOTO = 5
-- Warehouse Gosave = 6

INSERT INTO module_access_rules
  (module_code, department_id, min_job_level_value, max_job_level_value, priority, is_active)
SELECT 'FINANCE', 7, NULL, NULL, 100, 1
WHERE NOT EXISTS (
  SELECT 1 FROM module_access_rules
  WHERE module_code = 'FINANCE' AND department_id = 7 AND user_id IS NULL
);

INSERT INTO module_access_rules
  (module_code, department_id, min_job_level_value, max_job_level_value, priority, is_active)
SELECT 'WAREHOUSE', 5, NULL, NULL, 100, 1
WHERE NOT EXISTS (
  SELECT 1 FROM module_access_rules
  WHERE module_code = 'WAREHOUSE' AND department_id = 5 AND user_id IS NULL
);

INSERT INTO module_access_rules
  (module_code, department_id, min_job_level_value, max_job_level_value, priority, is_active)
SELECT 'WAREHOUSE', 6, NULL, NULL, 100, 1
WHERE NOT EXISTS (
  SELECT 1 FROM module_access_rules
  WHERE module_code = 'WAREHOUSE' AND department_id = 6 AND user_id IS NULL
);

-- Initial Pilarweb administrator confirmed from /api/auth/me.
INSERT INTO module_access_rules
  (module_code, user_id, priority, is_active)
SELECT 'ADMIN', 'bd625aff-7fc4-44e9-b95c-549f99f47991', 1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM module_access_rules
  WHERE module_code = 'ADMIN'
    AND user_id = 'bd625aff-7fc4-44e9-b95c-549f99f47991'
);
