USE pilarweb;

-- Confirmed PilarGroup job-level mapping (master_job_levels):
-- Commissioner = 7, President Director = 6, Finance Director = 6,
-- Senior Manager = 5, Manager = 4, Ass. Manager = 3, Supervisor = 2,
-- Staff / Ops / Driver / Ops. Hours / Leader = 1, Office Boy = 0.50
--
-- Confirmed PilarGroup department mapping (master_departments):
-- Product = 13
--
-- Required business rules:
-- 1. Assistant Manager level and above cannot create requests.
-- 2. Department approval is configurable through approval_rules.
-- 3. Product Department may approve at Assistant Manager when no Manager exists.
-- 4. Other departments can use their configured minimum approver level.

-- Global fallback rule (department_id = NULL): used by any department that
-- has no rule of its own. Ass. Manager (level 3) and above cannot create
-- requests; Manager (level 4) and above may approve.
INSERT INTO approval_rules
  (code, name, department_id, department_name, requester_block_min_job_level_value,
   approver_min_job_level_value, approver_job_level_name, allow_higher_job_level, priority, is_active)
SELECT 'DEFAULT', 'Default Approval Rule', NULL, NULL, 3, 4, 'Manager', 1, 100, 1
WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE code = 'DEFAULT');

-- Product department exception: may approve at Ass. Manager (level 3) when
-- no Manager exists in the department.
INSERT INTO approval_rules
  (code, name, department_id, department_name, requester_block_min_job_level_value,
   approver_min_job_level_value, approver_job_level_name, allow_higher_job_level, priority, is_active)
SELECT 'PRODUCT', 'Product Department Approval Rule', 13, 'Product', 3, 3, 'Ass. Manager', 1, 100, 1
WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE code = 'PRODUCT');

-- IT department: same minimum approver level as the global fallback
-- (Manager, level 4), kept as an explicit row for visibility/future tuning.
INSERT INTO approval_rules
  (code, name, department_id, department_name, requester_block_min_job_level_value,
   approver_min_job_level_value, approver_job_level_name, allow_higher_job_level, priority, is_active)
SELECT 'IT', 'IT Department Approval Rule', 8, 'IT', 3, 4, 'Manager', 1, 100, 1
WHERE NOT EXISTS (SELECT 1 FROM approval_rules WHERE code = 'IT');
