USE pilarweb;

-- Staff = 1, Ass. Manager = 3, Manager = 4, Senior Manager = 5, President Director = 6.
-- Ass. Manager and above cannot create requests.
INSERT INTO approval_rules (
  code, name, department_id, department_name,
  requester_block_min_job_level_value,
  approver_min_job_level_value, approver_job_level_name,
  allow_higher_job_level, priority, is_active
)
VALUES (
  'DEFAULT_DEPARTMENT_TO_MANAGER',
  'Default Department Approval to Manager',
  NULL, NULL, 3, 4, 'Manager', 1, 100, 1
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  requester_block_min_job_level_value = VALUES(requester_block_min_job_level_value),
  approver_min_job_level_value = VALUES(approver_min_job_level_value),
  approver_job_level_name = VALUES(approver_job_level_name),
  allow_higher_job_level = VALUES(allow_higher_job_level),
  priority = VALUES(priority),
  is_active = VALUES(is_active);

INSERT INTO approval_rules (
  code, name, department_id, department_name,
  requester_block_min_job_level_value,
  approver_min_job_level_value, approver_job_level_name,
  allow_higher_job_level, priority, is_active
)
VALUES (
  'PRODUCT_TO_ASS_MANAGER',
  'Product Approval to Ass. Manager',
  13, 'Product', 3, 3, 'Ass. Manager', 1, 10, 1
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  department_id = VALUES(department_id),
  department_name = VALUES(department_name),
  requester_block_min_job_level_value = VALUES(requester_block_min_job_level_value),
  approver_min_job_level_value = VALUES(approver_min_job_level_value),
  approver_job_level_name = VALUES(approver_job_level_name),
  allow_higher_job_level = VALUES(allow_higher_job_level),
  priority = VALUES(priority),
  is_active = VALUES(is_active);
