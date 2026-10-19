const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const { createError, optionalText } = require('../utils/business.util');

async function getRequestPurposes() {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT id, code, name, description, return_type, sort_order, is_active
    FROM master_request_purposes
    WHERE is_active = 1
    ORDER BY sort_order ASC, name ASC
  `);
  return rows;
}

async function getApprovalRules(departmentId = null) {
  const db = requireDatabase();
  const params = [];
  let where = 'WHERE is_active = 1';
  if (departmentId !== null && departmentId !== undefined && departmentId !== '') {
    where += ' AND (department_id = ? OR department_id IS NULL)';
    params.push(Number(departmentId));
  }
  const [rows] = await db.query(`
    SELECT id, code, name, department_id, department_name,
           requester_block_min_job_level_value,
           approver_min_job_level_value, approver_job_level_name,
           allow_higher_job_level, priority, is_active
    FROM approval_rules
    ${where}
    ORDER BY CASE WHEN department_id IS NULL THEN 1 ELSE 0 END, priority ASC, id ASC
  `, params);
  return rows;
}

async function getWarehouseLocations() {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT id, internal_id, code, name, is_active
    FROM warehouse_locations
    WHERE is_active = 1
    ORDER BY name ASC
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
  const [requestPurposes, approvalRules, warehouseLocations, financialClosing] = await Promise.all([
    getRequestPurposes(),
    getApprovalRules(),
    getWarehouseLocations(),
    getFinancialClosingSetting(),
  ]);
  return {
    request_purposes: requestPurposes,
    approval_rules: approvalRules,
    warehouse_locations: warehouseLocations,
    financial_closing: financialClosing,
    flow: {
      purpose_return_types: ['NON_RETURNABLE', 'RETURNABLE'],
      statuses: [
        'PENDING_DEPARTMENT_APPROVAL',
        'REVERTED_TO_REQUESTER',
        'PENDING_FINANCE_REVIEW',
        'PICKING',
        'READY_FOR_DELIVERY',
        'HANDED_OVER',
        'RETURN_PENDING',
        'RETURN_SUBMITTED',
        'RETURN_PARTIAL',
        'COMPLETED',
        'REJECTED',
        'CANCELED',
      ],
    },
  };
}

async function getModuleAccessRules() {
  const db = requireDatabase();
  const [rows] = await db.query('SELECT * FROM module_access_rules ORDER BY module_code ASC, priority ASC, id ASC');
  return rows;
}

async function getValidationOverrideUsers() {
  const db = requireDatabase();
  const [rows] = await db.query('SELECT * FROM validation_override_users ORDER BY is_active DESC, user_name_snapshot ASC, id ASC');
  return rows;
}

async function saveApprovalRule(user, ruleId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    if (!code || !name) throw createError('code and name are required', 422, 'VALIDATION_ERROR');
    const departmentId = payload.department_id === null || payload.department_id === '' || payload.department_id === undefined
      ? null : Number(payload.department_id);
    const departmentName = optionalText(payload.department_name, 255);
    const requesterBlock = payload.requester_block_min_job_level_value === null || payload.requester_block_min_job_level_value === '' || payload.requester_block_min_job_level_value === undefined
      ? null : Number(payload.requester_block_min_job_level_value);
    const approverMin = Number(payload.approver_min_job_level_value);
    if (!Number.isFinite(approverMin)) throw createError('approver_min_job_level_value is required', 422, 'VALIDATION_ERROR');
    const approverName = optionalText(payload.approver_job_level_name, 150);
    const allowHigher = payload.allow_higher_job_level === undefined ? 1 : (Number(payload.allow_higher_job_level) ? 1 : 0);
    const priority = Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : 100;
    const isActive = payload.is_active === undefined ? 1 : (Number(payload.is_active) ? 1 : 0);
    const params = [code, name, Number.isFinite(departmentId) ? departmentId : null, departmentName,
      Number.isFinite(requesterBlock) ? requesterBlock : null, approverMin, approverName, allowHigher, priority, isActive];

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
        approver_min_job_level_value, approver_job_level_name, allow_higher_job_level, priority, is_active
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
      INSERT INTO financial_closing_settings (closing_day, timezone, is_active, created_by_user_id, created_by_name)
      VALUES (?, ?, 1, ?, ?)
    `, [closingDay, timezone, user.id, user.name]);
    await connection.commit();
    return { id: result.insertId, closing_day: closingDay, timezone, is_active: 1 };
  } catch (err) {
    await connection.rollback(); throw err;
  } finally { connection.release(); }
}

async function saveModuleAccessRule(user, ruleId, payload = {}) {
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
    const departmentId = payload.department_id === null || payload.department_id === '' || payload.department_id === undefined ? null : Number(payload.department_id);
    const companyId = optionalText(payload.company_id, 100);
    const minLevel = payload.min_job_level_value === null || payload.min_job_level_value === '' || payload.min_job_level_value === undefined ? null : Number(payload.min_job_level_value);
    const maxLevel = payload.max_job_level_value === null || payload.max_job_level_value === '' || payload.max_job_level_value === undefined ? null : Number(payload.max_job_level_value);
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
    await connection.rollback(); throw err;
  } finally { connection.release(); }
}

async function saveRequestPurpose(user, purposeId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    if (!code || !name) throw createError('code and name are required', 422, 'VALIDATION_ERROR');
    const description = optionalText(payload.description, 500);
    const returnType = String(payload.return_type || 'NON_RETURNABLE').trim().toUpperCase();
    if (!['RETURNABLE', 'NON_RETURNABLE'].includes(returnType)) throw createError('return_type must be RETURNABLE or NON_RETURNABLE', 422, 'RETURN_TYPE_INVALID');
    const sortOrder = Number.isFinite(Number(payload.sort_order)) ? Number(payload.sort_order) : 0;
    const isActive = payload.is_active === undefined ? 1 : (Number(payload.is_active) ? 1 : 0);
    if (purposeId) {
      const [exists] = await connection.query('SELECT id FROM master_request_purposes WHERE id = ? LIMIT 1', [Number(purposeId)]);
      if (!exists[0]) throw createError('Request purpose not found', 404, 'REQUEST_PURPOSE_NOT_FOUND');
      await connection.query(`
        UPDATE master_request_purposes
        SET code=?, name=?, description=?, return_type=?, sort_order=?, is_active=?
        WHERE id=?
      `, [code, name, description, returnType, sortOrder, isActive, Number(purposeId)]);
      await connection.commit();
      return { id: Number(purposeId) };
    }
    const [result] = await connection.query(`
      INSERT INTO master_request_purposes (code, name, description, return_type, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [code, name, description, returnType, sortOrder, isActive]);
    await connection.commit();
    return { id: result.insertId };
  } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
}

async function deleteRequestPurpose(user, purposeId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const [exists] = await connection.query('SELECT id FROM master_request_purposes WHERE id = ? LIMIT 1', [Number(purposeId)]);
    if (!exists[0]) throw createError('Request purpose not found', 404, 'REQUEST_PURPOSE_NOT_FOUND');
    await connection.query('UPDATE master_request_purposes SET is_active = 0 WHERE id = ?', [Number(purposeId)]);
    await connection.commit();
    return { id: Number(purposeId) };
  } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
}

async function saveWarehouseLocation(user, locationId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const code = String(payload.code || '').trim().toUpperCase();
    const name = String(payload.name || '').trim();
    if (!code || !name) throw createError('code and name are required', 422, 'VALIDATION_ERROR');
    const internalId = payload.internal_id === null || payload.internal_id === '' || payload.internal_id === undefined ? null : Number(payload.internal_id);
    if (internalId !== null && (!Number.isInteger(internalId) || internalId <= 0)) throw createError('internal_id must be a positive integer or null', 422, 'VALIDATION_ERROR');
    const isActive = payload.is_active === undefined ? 1 : (Number(payload.is_active) ? 1 : 0);
    if (locationId) {
      const [exists] = await connection.query('SELECT id FROM warehouse_locations WHERE id = ? LIMIT 1', [Number(locationId)]);
      if (!exists[0]) throw createError('Warehouse location not found', 404, 'WAREHOUSE_LOCATION_NOT_FOUND');
      await connection.query('UPDATE warehouse_locations SET internal_id=?, code=?, name=?, is_active=? WHERE id=?', [internalId, code, name, isActive, Number(locationId)]);
      await connection.commit();
      return { id: Number(locationId) };
    }
    const [result] = await connection.query('INSERT INTO warehouse_locations (internal_id, code, name, is_active) VALUES (?, ?, ?, ?)', [internalId, code, name, isActive]);
    await connection.commit();
    return { id: result.insertId };
  } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
}

async function saveValidationOverrideUser(user, rowId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'ADMIN', connection);
    const userId = String(payload.user_id || '').trim();
    if (!userId) throw createError('user_id is required', 422, 'VALIDATION_ERROR');
    const userName = optionalText(payload.user_name_snapshot, 255);
    const isActive = payload.is_active === undefined ? 1 : (Number(payload.is_active) ? 1 : 0);
    if (rowId) {
      const [exists] = await connection.query('SELECT id FROM validation_override_users WHERE id = ? LIMIT 1', [Number(rowId)]);
      if (!exists[0]) throw createError('Validation Override user not found', 404, 'VALIDATION_OVERRIDE_USER_NOT_FOUND');
      await connection.query(`
        UPDATE validation_override_users
        SET user_id=?, user_name_snapshot=?, is_active=?, created_by_user_id=?, created_by_name=?
        WHERE id=?
      `, [userId, userName, isActive, user.id, user.name, Number(rowId)]);
      await connection.commit();
      return { id: Number(rowId) };
    }
    const [result] = await connection.query(`
      INSERT INTO validation_override_users (user_id, user_name_snapshot, is_active, created_by_user_id, created_by_name)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, userName, isActive, user.id, user.name]);
    await connection.commit();
    return { id: result.insertId };
  } catch (err) { await connection.rollback(); throw err; } finally { connection.release(); }
}

module.exports = {
  getRequestPurposes,
  getApprovalRules,
  getWarehouseLocations,
  getFinancialClosingSetting,
  getBootstrap,
  getModuleAccessRules,
  getValidationOverrideUsers,
  saveApprovalRule,
  updateFinancialClosing,
  saveModuleAccessRule,
  saveRequestPurpose,
  deleteRequestPurpose,
  saveWarehouseLocation,
  saveValidationOverrideUser,
};
