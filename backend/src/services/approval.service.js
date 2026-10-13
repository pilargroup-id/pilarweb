const { requireDatabase } = require('../config/database.config');
const ActivityService = require('./activity.service');
const AccessService = require('./access.service');
const RequestService = require('./request.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, parsePositiveInt } = require('../utils/business.util');

async function listQueue(user, query = {}) {
  const db = requireDatabase();
  const department = UserUtil.primaryDepartment(user);
  const level = UserUtil.jobLevelValue(user);
  if (!department || level === null) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };

  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [department.id, level, level];
  let where = `
    WHERE ra.department_id = ?
      AND ra.status = 'PENDING'
      AND r.status = 'PENDING_DEPARTMENT_APPROVAL'
      AND (
        (ra.allow_higher_job_level = 1 AND ? >= ra.required_job_level_value)
        OR (ra.allow_higher_job_level = 0 AND ? = ra.required_job_level_value)
      )
  `;
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.request_purpose_name LIKE ?)';
    params.push(search, search, search);
  }

  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total
    FROM request_approvals ra
    INNER JOIN requests r ON r.id = ra.request_id
    ${where}
  `, params);
  const [rows] = await db.query(`
    SELECT
      ra.*,
      r.request_number,
      r.request_purpose_name,
      r.requester_user_id,
      r.requester_name,
      r.requester_job_level_name,
      r.department_name,
      r.reason,
      r.submitted_at,
      r.status AS request_status
    FROM request_approvals ra
    INNER JOIN requests r ON r.id = ra.request_id
    ${where}
    ORDER BY r.submitted_at ASC, ra.id ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getById(user, approvalId) {
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT ra.*, r.requester_user_id, r.status AS request_status
    FROM request_approvals ra
    INNER JOIN requests r ON r.id = ra.request_id
    WHERE ra.id = ?
    LIMIT 1
  `, [Number(approvalId)]);
  const approval = rows[0];
  if (!approval) throw createError('Approval not found', 404, 'APPROVAL_NOT_FOUND');
  if (!AccessService.canApproveWithSnapshot(user, approval) && !(await AccessService.hasModuleAccess(user, 'ADMIN'))) {
    throw createError('Approval is not accessible', 403, 'APPROVAL_ACCESS_FORBIDDEN');
  }
  return RequestService.getById(approval.request_id, user);
}

async function lockPendingApproval(connection, user, approvalId) {
  const [rows] = await connection.query(`
    SELECT ra.*, r.status AS request_status, r.requester_user_id
    FROM request_approvals ra
    INNER JOIN requests r ON r.id = ra.request_id
    WHERE ra.id = ?
    LIMIT 1
    FOR UPDATE
  `, [Number(approvalId)]);
  const approval = rows[0];
  if (!approval) throw createError('Approval not found', 404, 'APPROVAL_NOT_FOUND');
  if (approval.status !== 'PENDING' || approval.request_status !== 'PENDING_DEPARTMENT_APPROVAL') {
    throw createError('Manager approval is no longer pending', 409, 'APPROVAL_NOT_PENDING');
  }
  if (String(approval.requester_user_id) === String(user.id)) {
    throw createError('Requester cannot approve their own request', 403, 'SELF_APPROVAL_FORBIDDEN');
  }
  if (!AccessService.canApproveWithSnapshot(user, approval)) {
    throw createError('User does not meet this approval rule', 403, 'APPROVAL_ACCESS_FORBIDDEN');
  }
  return approval;
}

async function approve(user, approvalId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const approval = await lockPendingApproval(connection, user, approvalId);
    const actor = UserUtil.snapshot(user);
    const note = optionalText(payload.note, 5000);

    const [itemRows] = await connection.query('SELECT id, requested_qty FROM request_items WHERE request_id = ? ORDER BY id ASC', [approval.request_id]);
    if (!itemRows.length) throw createError('No request items remain for approval', 409, 'REQUEST_ITEMS_REQUIRED');

    await connection.query(`
      UPDATE request_approvals
      SET status = 'APPROVED', approver_user_id = ?, approver_internal_id = ?,
          approver_name = ?, approver_job_level_value = ?, approver_job_level_name = ?,
          note = ?, decided_at = NOW()
      WHERE id = ?
    `, [
      actor.user_id, actor.internal_id, actor.name,
      actor.job_level_value, actor.job_level_name,
      note, approval.id,
    ]);

    const [reviewResult] = await connection.query(`
      INSERT INTO finance_reviews (request_id, status)
      VALUES (?, 'PENDING')
    `, [approval.request_id]);
    for (const item of itemRows) {
      await connection.query(`
        INSERT INTO finance_review_items (
          finance_review_id, request_item_id, requested_qty_snapshot,
          decision, approved_qty, rejected_qty
        ) VALUES (?, ?, ?, 'PENDING', 0, 0)
      `, [reviewResult.insertId, item.id, item.requested_qty]);
    }
    await connection.query("UPDATE requests SET status = 'PENDING_FINANCE_REVIEW' WHERE id = ?", [approval.request_id]);

    await ActivityService.log(connection, {
      request_id: approval.request_id,
      entity_type: 'APPROVAL',
      entity_id: approval.id,
      action_code: 'MANAGER_APPROVED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      before: { status: 'PENDING_DEPARTMENT_APPROVAL' },
      after: { status: 'PENDING_FINANCE_REVIEW', note },
    });
    await connection.commit();
    return RequestService.getById(approval.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function revert(user, approvalId, payload = {}) {
  const reason = optionalText(payload.reason ?? payload.note, 5000);
  if (!reason) throw createError('Revert reason is required', 422, 'REVERT_REASON_REQUIRED');

  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const approval = await lockPendingApproval(connection, user, approvalId);
    const actor = UserUtil.snapshot(user);

    await connection.query(`
      UPDATE request_approvals
      SET status = 'REVERTED', reverted_at = NOW(), reverted_by_user_id = ?,
          reverted_by_name = ?, revert_reason = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, reason, approval.id]);
    await connection.query(`
      UPDATE requests
      SET status = 'REVERTED_TO_REQUESTER', reverted_at = NOW(),
          reverted_by_user_id = ?, reverted_by_name = ?, revert_reason = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, reason, approval.request_id]);

    await ActivityService.log(connection, {
      request_id: approval.request_id,
      entity_type: 'APPROVAL',
      entity_id: approval.id,
      action_code: 'MANAGER_REVERTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      before: { approval_status: 'PENDING', request_status: 'PENDING_DEPARTMENT_APPROVAL' },
      after: { approval_status: 'REVERTED', request_status: 'REVERTED_TO_REQUESTER', reason },
    });
    await connection.commit();
    return RequestService.getById(approval.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function cancel(user, approvalId, payload = {}) {
  const reason = optionalText(payload.reason ?? payload.note, 5000);
  if (!reason) throw createError('Cancel reason is required', 422, 'CANCEL_REASON_REQUIRED');

  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const approval = await lockPendingApproval(connection, user, approvalId);
    const actor = UserUtil.snapshot(user);

    await connection.query(`
      UPDATE request_approvals
      SET status = 'CANCELED', approver_user_id = ?, approver_internal_id = ?,
          approver_name = ?, approver_job_level_value = ?, approver_job_level_name = ?,
          note = ?, decided_at = NOW()
      WHERE id = ?
    `, [
      actor.user_id, actor.internal_id, actor.name,
      actor.job_level_value, actor.job_level_name,
      reason, approval.id,
    ]);
    await connection.query("UPDATE requests SET status = 'CANCELED', canceled_at = NOW(), completed_at = NOW() WHERE id = ?", [approval.request_id]);

    await ActivityService.log(connection, {
      request_id: approval.request_id,
      entity_type: 'APPROVAL',
      entity_id: approval.id,
      action_code: 'MANAGER_CANCELED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      before: { status: 'PENDING_DEPARTMENT_APPROVAL' },
      after: { status: 'CANCELED', reason },
    });
    await connection.commit();
    return RequestService.getById(approval.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

module.exports = { listQueue, getById, approve, revert, cancel };
