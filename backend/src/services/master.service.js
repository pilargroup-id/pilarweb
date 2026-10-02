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
