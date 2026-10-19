const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, parsePositiveInt } = require('../utils/business.util');

const VALIDATION_CODES = new Set(['RETURN_OVERDUE', 'RETURN_QTY_INCOMPLETE', 'ALL_RETURN_RESTRICTIONS']);

function toMysqlDateTime(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw createError(`${field} is invalid`, 422, 'VALIDATION_ERROR');
  return date;
}

function overrideMatches(restriction, override) {
  if (Number(override.department_id) !== Number(restriction.department_id)) return false;
  if (override.request_id && String(override.request_id) !== String(restriction.request_id)) return false;
  return override.validation_code === 'ALL_RETURN_RESTRICTIONS' || override.validation_code === restriction.code;
}

async function getDepartmentRestrictions(departmentId, connection = null) {
  const db = connection || requireDatabase();
  const [obligations] = await db.query(`
    SELECT
      rt.id AS return_id,
      rt.return_number,
      rt.status AS return_status,
      rt.due_date,
      r.id AS request_id,
      r.request_number,
      r.department_id,
      r.department_name,
      r.requester_user_id,
      r.requester_name,
      COALESCE(SUM(ri.expected_qty), 0) AS expected_qty,
      COALESCE(SUM(ri.warehouse_received_qty), 0) AS received_qty,
      COALESCE(SUM(ri.expected_qty - ri.warehouse_received_qty), 0) AS outstanding_qty,
      EXISTS(
        SELECT 1
        FROM return_receipts rr
        WHERE rr.return_id = rt.id
        LIMIT 1
      ) AS has_receipt,
      CASE WHEN rt.due_date < CURDATE() THEN 1 ELSE 0 END AS is_overdue
    FROM returns rt
    INNER JOIN requests r ON r.id = rt.request_id
    INNER JOIN return_items ri ON ri.return_id = rt.id
    WHERE r.department_id = ?
      AND rt.status <> 'COMPLETED'
    GROUP BY rt.id, rt.return_number, rt.status, rt.due_date,
             r.id, r.request_number, r.department_id, r.department_name,
             r.requester_user_id, r.requester_name
    HAVING outstanding_qty > 0
    ORDER BY rt.due_date ASC, r.request_number ASC
  `, [Number(departmentId)]);

  const restrictions = [];
  for (const row of obligations) {
    const base = {
      department_id: Number(row.department_id),
      department_name: row.department_name,
      request_id: row.request_id,
      request_number: row.request_number,
      return_id: row.return_id,
      return_number: row.return_number,
      return_status: row.return_status,
      due_date: row.due_date,
      expected_qty: Number(row.expected_qty || 0),
      received_qty: Number(row.received_qty || 0),
      outstanding_qty: Number(row.outstanding_qty || 0),
    };
    if (Number(row.is_overdue) === 1) restrictions.push({ ...base, code: 'RETURN_OVERDUE' });
    if (Number(row.has_receipt) === 1 && Number(row.outstanding_qty || 0) > 0) {
      restrictions.push({ ...base, code: 'RETURN_QTY_INCOMPLETE' });
    }
  }

  if (!restrictions.length) return [];

  const [overrides] = await db.query(`
    SELECT *
    FROM validation_overrides
    WHERE department_id = ?
      AND is_active = 1
      AND revoked_at IS NULL
      AND valid_from <= NOW()
      AND (valid_until IS NULL OR valid_until >= NOW())
    ORDER BY created_at DESC
  `, [Number(departmentId)]);

  return restrictions.map((restriction) => {
    const matched = overrides.find((override) => overrideMatches(restriction, override));
    return {
      ...restriction,
      is_overridden: Boolean(matched),
      override_id: matched?.id ?? null,
      override_reason: matched?.reason ?? null,
      override_valid_until: matched?.valid_until ?? null,
    };
  });
}

async function assertDepartmentCanRequest(departmentId, connection = null) {
  const restrictions = await getDepartmentRestrictions(departmentId, connection);
  const blocking = restrictions.filter((row) => !row.is_overridden);
  if (blocking.length) {
    throw createError(
      'Requester department is blocked by outstanding return validation',
      409,
      'DEPARTMENT_REQUEST_RESTRICTED',
      { restrictions: blocking }
    );
  }
  return restrictions;
}

async function getEligibility(user) {
  const snapshot = UserUtil.snapshot(user);
  if (!snapshot.department_id) {
    return { can_create_request: false, reason: 'REQUESTER_CONTEXT_MISSING', restrictions: [] };
  }
  const rule = await AccessService.findApprovalRuleForDepartment(snapshot.department_id);
  const jobAllowed = Boolean(rule && AccessService.canCreateRequestWithRule(user, rule));
  const restrictions = await getDepartmentRestrictions(snapshot.department_id);
  const blocking = restrictions.filter((row) => !row.is_overridden);
  return {
    can_create_request: jobAllowed && blocking.length === 0,
    job_level_allowed: jobAllowed,
    approval_rule_configured: Boolean(rule),
    department_id: snapshot.department_id,
    department_name: snapshot.department_name,
    restrictions,
    blocking_restrictions: blocking,
  };
}

async function listOverrides(user, query = {}) {
  await AccessService.requireValidationOverrideAccess(user);
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 50, 200);
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';
  if (query.department_id) { where += ' AND department_id = ?'; params.push(Number(query.department_id)); }
  if (query.request_id) { where += ' AND request_id = ?'; params.push(String(query.request_id)); }
  if (query.active !== undefined && query.active !== '') { where += ' AND is_active = ?'; params.push(Number(query.active) ? 1 : 0); }
  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM validation_overrides ${where}`, params);
  const [rows] = await db.query(`SELECT * FROM validation_overrides ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function listRestrictions(user, query = {}) {
  await AccessService.requireValidationOverrideAccess(user);
  const departmentId = Number(query.department_id);
  if (!Number.isInteger(departmentId) || departmentId <= 0) {
    throw createError('department_id is required', 422, 'VALIDATION_ERROR');
  }
  return getDepartmentRestrictions(departmentId);
}

async function createOverride(user, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireValidationOverrideAccess(user, connection);
    const code = String(payload.validation_code || '').trim().toUpperCase();
    if (!VALIDATION_CODES.has(code)) throw createError('validation_code is invalid', 422, 'VALIDATION_CODE_INVALID');
    const departmentId = Number(payload.department_id);
    if (!Number.isInteger(departmentId) || departmentId <= 0) throw createError('department_id is required', 422, 'VALIDATION_ERROR');
    const reason = optionalText(payload.reason, 5000);
    if (!reason) throw createError('reason is required', 422, 'VALIDATION_ERROR');
    const requestId = optionalText(payload.request_id, 36);
    const departmentName = optionalText(payload.department_name, 255);
    const validFrom = toMysqlDateTime(payload.valid_from, 'valid_from');
    const validUntil = toMysqlDateTime(payload.valid_until, 'valid_until');
    if (validUntil && validUntil.getTime() <= Date.now()) throw createError('valid_until must be in the future', 422, 'VALIDATION_ERROR');

    if (requestId) {
      const [requestRows] = await connection.query('SELECT id, department_id FROM requests WHERE id = ? LIMIT 1', [requestId]);
      if (!requestRows[0]) throw createError('Request not found', 404, 'REQUEST_NOT_FOUND');
      if (Number(requestRows[0].department_id) !== departmentId) {
        throw createError('request_id does not belong to department_id', 422, 'VALIDATION_SCOPE_MISMATCH');
      }
    }

    const actor = UserUtil.snapshot(user);
    const [result] = await connection.query(`
      INSERT INTO validation_overrides (
        validation_code, scope_type, department_id, department_name, request_id,
        reason, valid_from, valid_until, is_active,
        created_by_user_id, created_by_name
      ) VALUES (?, 'DEPARTMENT', ?, ?, ?, ?, COALESCE(?, NOW()), ?, 1, ?, ?)
    `, [code, departmentId, departmentName, requestId, reason, validFrom, validUntil, actor.user_id, actor.name]);
    await connection.commit();
    const [rows] = await db.query('SELECT * FROM validation_overrides WHERE id = ?', [result.insertId]);
    return rows[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function revokeOverride(user, overrideId, payload = {}) {
  const reason = optionalText(payload.reason, 5000);
  if (!reason) throw createError('revoke reason is required', 422, 'VALIDATION_ERROR');
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireValidationOverrideAccess(user, connection);
    const [rows] = await connection.query('SELECT * FROM validation_overrides WHERE id = ? LIMIT 1 FOR UPDATE', [Number(overrideId)]);
    if (!rows[0]) throw createError('Validation override not found', 404, 'VALIDATION_OVERRIDE_NOT_FOUND');
    if (!Number(rows[0].is_active) || rows[0].revoked_at) throw createError('Validation override is already inactive', 409, 'VALIDATION_OVERRIDE_INACTIVE');
    const actor = UserUtil.snapshot(user);
    await connection.query(`
      UPDATE validation_overrides
      SET is_active = 0, revoked_by_user_id = ?, revoked_by_name = ?, revoked_at = NOW(), revoke_reason = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, reason, Number(overrideId)]);
    await connection.commit();
    const [updated] = await db.query('SELECT * FROM validation_overrides WHERE id = ?', [Number(overrideId)]);
    return updated[0];
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

module.exports = {
  VALIDATION_CODES,
  getDepartmentRestrictions,
  assertDepartmentCanRequest,
  getEligibility,
  listOverrides,
  listRestrictions,
  createOverride,
  revokeOverride,
};
