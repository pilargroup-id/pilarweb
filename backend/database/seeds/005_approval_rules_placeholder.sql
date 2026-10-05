USE pilarweb;

-- Pilarweb approval rules
-- Confirmed PilarGroup job level mapping:
-- Staff          = 1
-- Ass. Manager   = 3
-- Manager        = 4
-- Senior Manager = 5
-- President Director = 6
--
-- Business rules:
-- 1. Ass. Manager level (3) and above cannot create requests.
-- 2. Default department approver is Manager level (4) or higher.
-- 3. Product department (id 13) has no Manager, so approval starts from Ass. Manager level (3).
-- 4. allow_higher_job_level = 1 means higher levels in the same department may also approve.
-- 5. department_id IS NULL is the fallback rule for every department without a more specific rule.

-- =========================================================
-- DEFAULT RULE
-- All departments except those with a more specific override.
-- Requester is blocked from creating requests starting at Ass. Manager (3).
-- Approval requires Manager (4) or higher in the requester's department.
-- =========================================================
INSERT INTO approval_rules (
  code,
  name,
  department_id,
  department_name,
  requester_block_min_job_level_value,
  approver_min_job_level_value,
  approver_job_level_name,
  allow_higher_job_level,
  priority,
  is_active
)
VALUES (
  'DEFAULT_DEPARTMENT_TO_MANAGER',
  'Default Department Approval to Manager',
  NULL,
  NULL,
  3,
  4,
  'Manager',
  1,
  100,
  1
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


-- =========================================================
-- PRODUCT OVERRIDE
-- Department 13 = Product
-- Product has no Manager, so Ass. Manager (3) is the minimum approver.
-- Request creation is still blocked starting from Ass. Manager (3).
-- =========================================================
INSERT INTO approval_rules (
  code,
  name,
  department_id,
  department_name,
  requester_block_min_job_level_value,
  approver_min_job_level_value,
  approver_job_level_name,
  allow_higher_job_level,
  priority,
  is_active
)
VALUES (
  'PRODUCT_TO_ASS_MANAGER',
  'Product Approval to Ass. Manager',
  13,
  'Product',
  3,
  3,
  'Ass. Manager',
  1,
  10,
  1
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
