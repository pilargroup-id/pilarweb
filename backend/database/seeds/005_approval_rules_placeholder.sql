USE pilarweb;

-- No approval rule is inserted here intentionally.
-- Pilarweb must use the actual PilarGroup job_level_value mapping.
-- Required business rules:
-- 1. Assistant Manager level and above cannot create requests.
-- 2. Department approval is configurable through approval_rules.
-- 3. Product Department may approve at Assistant Manager when no Manager exists.
-- 4. Other departments can use their configured minimum approver level.
--
-- Insert real values only after the exact PilarGroup job-level mapping is confirmed.
