const { requireDatabase } = require('../config/database.config');
const UserUtil = require('../utils/user.util');
const { createError } = require('../utils/business.util');

async function findModuleRules(moduleCode, connection = null) {
  const db = connection || requireDatabase();
  const [rows] = await db.query(`
    SELECT id, module_code, user_id, name, department_id, company_id,
           min_job_level_value, max_job_level_value, priority, is_active
    FROM module_access_rules
    WHERE module_code = ? AND is_active = 1
    ORDER BY priority ASC, id ASC
  `, [String(moduleCode).toUpperCase()]);
  return rows;
}

function matchesRule(user, rule) {
  const department = UserUtil.primaryDepartment(user);
  const company = UserUtil.primaryCompany(user);
  const level = UserUtil.jobLevelValue(user);
  if (rule.user_id && String(rule.user_id) !== String(user?.id || '')) return false;
  if (rule.department_id !== null && rule.department_id !== undefined) {
    if (!department || Number(rule.department_id) !== Number(department.id)) return false;
  }
  if (rule.company_id) {
    if (!company || String(rule.company_id) !== String(company.id)) return false;
  }
  if (rule.min_job_level_value !== null && rule.min_job_level_value !== undefined) {
    if (level === null || level < Number(rule.min_job_level_value)) return false;
  }
  if (rule.max_job_level_value !== null && rule.max_job_level_value !== undefined) {
    if (level === null || level > Number(rule.max_job_level_value)) return false;
  }
  return true;
}

async function hasModuleAccess(user, moduleCode, connection = null) {
  const rules = await findModuleRules(moduleCode, connection);
  return rules.some((rule) => matchesRule(user, rule));
}

async function requireModuleAccess(user, moduleCode, connection = null) {
  if (!(await hasModuleAccess(user, moduleCode, connection))) {
    throw createError(`User does not have ${String(moduleCode).toUpperCase()} access`, 403, 'MODULE_ACCESS_FORBIDDEN');
  }
}

async function hasValidationOverrideAccess(user, connection = null) {
  if (!user?.id) return false;
  const db = connection || requireDatabase();
  const [rows] = await db.query('SELECT id FROM validation_override_users WHERE user_id=? AND is_active=1 LIMIT 1', [String(user.id)]);
  return Boolean(rows[0]);
}

async function requireValidationOverrideAccess(user, connection = null) {
  if (!(await hasValidationOverrideAccess(user, connection))) {
    throw createError('User does not have Validation Override access', 403, 'VALIDATION_OVERRIDE_ACCESS_FORBIDDEN');
  }
}

async function findApprovalRuleForDepartment(departmentId, connection = null) {
  const db = connection || requireDatabase();
  const [rows] = await db.query(`
    SELECT id,code,name,department_id,department_name,requester_block_min_job_level_value,
           approver_min_job_level_value,approver_job_level_name,allow_higher_job_level,priority,is_active
    FROM approval_rules
    WHERE is_active=1 AND (department_id=? OR department_id IS NULL)
    ORDER BY CASE WHEN department_id=? THEN 0 ELSE 1 END,priority ASC,id ASC LIMIT 1
  `, [departmentId, departmentId]);
  return rows[0] || null;
}

function canCreateRequestWithRule(user, rule) {
  if (!rule) return false;
  const level = UserUtil.jobLevelValue(user);
  if (level === null) return false;
  const block = rule.requester_block_min_job_level_value !== null && rule.requester_block_min_job_level_value !== undefined
    ? Number(rule.requester_block_min_job_level_value) : Number(rule.approver_min_job_level_value);
  return Number.isFinite(block) && level < block;
}

function canApproveWithSnapshot(user, approval) {
  const department = UserUtil.primaryDepartment(user);
  const level = UserUtil.jobLevelValue(user);
  if (!department || level === null) return false;
  if (Number(department.id) !== Number(approval.department_id)) return false;
  const min = Number(approval.required_job_level_value);
  if (!Number.isFinite(min)) return false;
  return Number(approval.allow_higher_job_level) === 1 ? level >= min : level === min;
}

async function getCapabilities(user, connection = null) {
  const db = connection || requireDatabase();
  const department = UserUtil.primaryDepartment(user);
  const rule = department ? await findApprovalRuleForDepartment(department.id, db) : null;
  const [admin, finance, warehouse, override, supervisor] = await Promise.all([
    hasModuleAccess(user, 'ADMIN', db),
    hasModuleAccess(user, 'FINANCE', db),
    hasModuleAccess(user, 'WAREHOUSE', db),
    hasValidationOverrideAccess(user, db),
    hasModuleAccess(user, 'WAREHOUSE_DISCREPANCY_SUPERVISOR', db),
  ]);
  let canApproveDepartment = false;
  if (department && rule) {
    const level = UserUtil.jobLevelValue(user);
    const min = Number(rule.approver_min_job_level_value);
    if (Number.isFinite(level) && Number.isFinite(min)) {
      canApproveDepartment = Number(rule.allow_higher_job_level) === 1 ? level >= min : level === min;
    }
  }
  return {
    can_create_request: canCreateRequestWithRule(user, rule),
    can_approve_department: canApproveDepartment,
    finance_access: finance,
    warehouse_access: warehouse,
    warehouse_discrepancy_supervisor_access: supervisor,
    admin_access: admin,
    validation_override_access: override,
    approval_rule_configured: Boolean(rule),
  };
}

module.exports = {
  findModuleRules, hasModuleAccess, requireModuleAccess,
  hasValidationOverrideAccess, requireValidationOverrideAccess,
  findApprovalRuleForDepartment, canCreateRequestWithRule, canApproveWithSnapshot, getCapabilities,
};
