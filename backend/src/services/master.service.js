const { requireDatabase } = require('../config/database.config');

async function getRequestPurposes() {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT id, code, name, description, sort_order, is_active
    FROM master_request_purposes
    WHERE is_active = 1
    ORDER BY sort_order ASC, name ASC
  `);
  return rows;
}

async function getWorkflowDefinitions() {
  const db = requireDatabase();
  const [definitions] = await db.query(`
    SELECT id, code, name, version, description, requires_return, is_active
    FROM workflow_definitions
    WHERE is_active = 1
    ORDER BY code ASC, version DESC
  `);

  if (!definitions.length) return [];

  const ids = definitions.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(',');
  const [steps] = await db.query(`
    SELECT
      id,
      workflow_definition_id,
      step_order,
      step_code,
      step_name,
      step_type,
      is_required,
      config_json
    FROM workflow_steps
    WHERE workflow_definition_id IN (${placeholders})
    ORDER BY workflow_definition_id ASC, step_order ASC
  `, ids);

  const byWorkflow = new Map();
  for (const step of steps) {
    const list = byWorkflow.get(step.workflow_definition_id) || [];
    list.push(step);
    byWorkflow.set(step.workflow_definition_id, list);
  }

  return definitions.map((definition) => ({
    ...definition,
    steps: byWorkflow.get(definition.id) || [],
  }));
}

async function getPurposeWorkflowAssignments() {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT
      rpw.id,
      rpw.request_purpose_id,
      mrp.code AS request_purpose_code,
      mrp.name AS request_purpose_name,
      rpw.workflow_definition_id,
      wd.code AS workflow_code,
      wd.name AS workflow_name,
      wd.version AS workflow_version,
      wd.requires_return,
      rpw.effective_from,
      rpw.effective_to,
      rpw.is_active
    FROM request_purpose_workflows rpw
    INNER JOIN master_request_purposes mrp
      ON mrp.id = rpw.request_purpose_id
    INNER JOIN workflow_definitions wd
      ON wd.id = rpw.workflow_definition_id
    WHERE rpw.is_active = 1
      AND rpw.effective_from <= NOW()
      AND (rpw.effective_to IS NULL OR rpw.effective_to > NOW())
    ORDER BY mrp.sort_order ASC, rpw.effective_from DESC
  `);
  return rows;
}

async function getApprovalRules(departmentId = null) {
  const db = requireDatabase();
  const params = [];
  let where = 'WHERE is_active = 1';

  if (departmentId !== null && departmentId !== undefined && departmentId !== '') {
    where += ' AND department_id = ?';
    params.push(Number(departmentId));
  }

  const [rows] = await db.query(`
    SELECT
      id,
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
    FROM approval_rules
    ${where}
    ORDER BY priority ASC, id ASC
  `, params);
  return rows;
}

async function getWarehouseLocations() {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT id, code, name, is_loan_warehouse, is_active
    FROM warehouse_locations
    WHERE is_active = 1
    ORDER BY is_loan_warehouse DESC, name ASC
  `);
  return rows;
}

async function getFinancialClosingSetting() {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT id, closing_day, timezone, is_active, created_at, updated_at
    FROM financial_closing_settings
    WHERE is_active = 1
    ORDER BY id DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

async function getBootstrap() {
  const [
    requestPurposes,
    workflows,
    purposeWorkflowAssignments,
    approvalRules,
    warehouseLocations,
    financialClosing,
  ] = await Promise.all([
    getRequestPurposes(),
    getWorkflowDefinitions(),
    getPurposeWorkflowAssignments(),
    getApprovalRules(),
    getWarehouseLocations(),
    getFinancialClosingSetting(),
  ]);

  return {
    request_purposes: requestPurposes,
    workflows,
    purpose_workflow_assignments: purposeWorkflowAssignments,
    approval_rules: approvalRules,
    warehouse_locations: warehouseLocations,
    financial_closing: financialClosing,
  };
}

module.exports = {
  getRequestPurposes,
  getWorkflowDefinitions,
  getPurposeWorkflowAssignments,
  getApprovalRules,
  getWarehouseLocations,
  getFinancialClosingSetting,
  getBootstrap,
};

async function getModuleAccessRules() {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT id, module_code, user_id, department_id, company_id,
           min_job_level_value, max_job_level_value, priority, is_active,
           created_by_user_id, created_by_name, created_at, updated_at
    FROM module_access_rules
    ORDER BY module_code, priority, id
  `);
  return rows;
}

async function assignPurposeWorkflow(user, payload = {}) {
  const AccessService = require('./access.service');
  const { createError } = require('../utils/business.util');
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const purposeId = Number(payload.request_purpose_id);
    const workflowId = Number(payload.workflow_definition_id);
    if (!Number.isFinite(purposeId) || !Number.isFinite(workflowId)) {
      throw createError('request_purpose_id and workflow_definition_id are required', 422, 'VALIDATION_ERROR');
    }
    const [purpose] = await connection.query('SELECT id FROM master_request_purposes WHERE id = ? AND is_active = 1 LIMIT 1', [purposeId]);
    const [workflow] = await connection.query('SELECT id FROM workflow_definitions WHERE id = ? AND is_active = 1 LIMIT 1', [workflowId]);
    if (!purpose[0]) throw createError('Request purpose not found', 404, 'REQUEST_PURPOSE_NOT_FOUND');
    if (!workflow[0]) throw createError('Workflow definition not found', 404, 'WORKFLOW_NOT_FOUND');
    await connection.query(`
      UPDATE request_purpose_workflows
      SET is_active = 0, effective_to = NOW()
      WHERE request_purpose_id = ? AND is_active = 1
        AND (effective_to IS NULL OR effective_to > NOW())
    `, [purposeId]);
    const [result] = await connection.query(`
      INSERT INTO request_purpose_workflows (
        request_purpose_id, workflow_definition_id, effective_from, effective_to,
        is_active, created_by_user_id, created_by_name
      ) VALUES (?, ?, NOW(), NULL, 1, ?, ?)
    `, [purposeId, workflowId, user.id, user.name]);
    await connection.commit();
    return { id: result.insertId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function saveApprovalRule(user, ruleId, payload = {}) {
  const AccessService = require('./access.service');
  const { createError, optionalText } = require('../utils/business.util');
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    if (!code || !name) throw createError('code and name are required', 422, 'VALIDATION_ERROR');
    const departmentId = payload.department_id === null || payload.department_id === '' ? null : Number(payload.department_id);
    const requesterBlock = payload.requester_block_min_job_level_value === null || payload.requester_block_min_job_level_value === '' ? null : Number(payload.requester_block_min_job_level_value);
    const approverMin = Number(payload.approver_min_job_level_value);
    if (!Number.isFinite(approverMin)) throw createError('approver_min_job_level_value is required', 422, 'VALIDATION_ERROR');
    const params = [
      code, name, Number.isFinite(departmentId) ? departmentId : null,
      optionalText(payload.department_name, 255),
      Number.isFinite(requesterBlock) ? requesterBlock : approverMin,
      approverMin,
      optionalText(payload.approver_job_level_name, 150),
      payload.allow_higher_job_level === undefined ? 1 : (Number(payload.allow_higher_job_level) ? 1 : 0),
      Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : 100,
      payload.is_active === undefined ? 1 : (Number(payload.is_active) ? 1 : 0),
    ];
    if (ruleId) {
      const [exists] = await connection.query('SELECT id FROM approval_rules WHERE id = ? LIMIT 1', [Number(ruleId)]);
      if (!exists[0]) throw createError('Approval rule not found', 404, 'APPROVAL_RULE_NOT_FOUND');
      await connection.query(`
        UPDATE approval_rules
        SET code=?, name=?, department_id=?, department_name=?, requester_block_min_job_level_value=?,
            approver_min_job_level_value=?, approver_job_level_name=?, allow_higher_job_level=?, priority=?, is_active=?
        WHERE id=?
      `, [...params, Number(ruleId)]);
      await connection.commit();
      return { id: Number(ruleId) };
    }
    const [result] = await connection.query(`
      INSERT INTO approval_rules (
        code, name, department_id, department_name, requester_block_min_job_level_value,
        approver_min_job_level_value, approver_job_level_name, allow_higher_job_level,
        priority, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);
    await connection.commit();
    return { id: result.insertId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function updateFinancialClosing(user, payload = {}) {
  const AccessService = require('./access.service');
  const { createError } = require('../utils/business.util');
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const closingDay = Number(payload.closing_day);
    if (!Number.isInteger(closingDay) || closingDay < 1 || closingDay > 31) {
      throw createError('closing_day must be between 1 and 31', 422, 'VALIDATION_ERROR');
    }
    const timezone = String(payload.timezone || 'Asia/Jakarta').trim();
    await connection.query('UPDATE financial_closing_settings SET is_active = 0 WHERE is_active = 1');
    const [result] = await connection.query(`
      INSERT INTO financial_closing_settings (
        closing_day, timezone, is_active, created_by_user_id, created_by_name
      ) VALUES (?, ?, 1, ?, ?)
    `, [closingDay, timezone, user.id, user.name]);
    await connection.commit();
    return { id: result.insertId, closing_day: closingDay, timezone, is_active: 1 };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function saveModuleAccessRule(user, ruleId, payload = {}) {
  const AccessService = require('./access.service');
  const { createError, optionalText } = require('../utils/business.util');
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const moduleCode = String(payload.module_code || '').trim().toUpperCase();
    if (!['ADMIN', 'FINANCE', 'WAREHOUSE'].includes(moduleCode)) {
      throw createError('module_code must be ADMIN, FINANCE, or WAREHOUSE', 422, 'MODULE_CODE_INVALID');
    }
    const userId = optionalText(payload.user_id, 36);
    const departmentId = payload.department_id === null || payload.department_id === '' ? null : Number(payload.department_id);
    const companyId = optionalText(payload.company_id, 100);
    const minLevel = payload.min_job_level_value === null || payload.min_job_level_value === '' ? null : Number(payload.min_job_level_value);
    const maxLevel = payload.max_job_level_value === null || payload.max_job_level_value === '' ? null : Number(payload.max_job_level_value);
    const priority = Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : 100;
    const isActive = payload.is_active === undefined ? 1 : (Number(payload.is_active) ? 1 : 0);
    const params = [moduleCode, userId, Number.isFinite(departmentId) ? departmentId : null, companyId,
      Number.isFinite(minLevel) ? minLevel : null, Number.isFinite(maxLevel) ? maxLevel : null,
      priority, isActive, user.id, user.name];
    if (ruleId) {
      const [exists] = await connection.query('SELECT id FROM module_access_rules WHERE id = ? LIMIT 1', [Number(ruleId)]);
      if (!exists[0]) throw createError('Module access rule not found', 404, 'MODULE_ACCESS_RULE_NOT_FOUND');
      await connection.query(`
        UPDATE module_access_rules
        SET module_code=?, user_id=?, department_id=?, company_id=?, min_job_level_value=?, max_job_level_value=?,
            priority=?, is_active=?, created_by_user_id=?, created_by_name=?
        WHERE id=?
      `, [...params, Number(ruleId)]);
      await connection.commit();
      return { id: Number(ruleId) };
    }
    const [result] = await connection.query(`
      INSERT INTO module_access_rules (
        module_code, user_id, department_id, company_id, min_job_level_value, max_job_level_value,
        priority, is_active, created_by_user_id, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);
    await connection.commit();
    return { id: result.insertId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

Object.assign(module.exports, {
  getModuleAccessRules,
  assignPurposeWorkflow,
  saveApprovalRule,
  updateFinancialClosing,
  saveModuleAccessRule,
});
