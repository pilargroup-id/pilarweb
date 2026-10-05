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
    WHERE ra.status = 'PENDING'
      AND ra.department_id = ?
      AND (
        (ra.allow_higher_job_level = 1 AND ? >= ra.required_job_level_value)
        OR
        (ra.allow_higher_job_level = 0 AND ? = ra.required_job_level_value)
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

async function decide(user, approvalId, decision, payload = {}) {
  const normalizedDecision = String(decision).toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(normalizedDecision)) {
    throw createError('Invalid approval decision', 422, 'APPROVAL_DECISION_INVALID');
  }
  const note = optionalText(payload.note ?? payload.reason, 5000);
  if (normalizedDecision === 'REJECTED' && !note) {
    throw createError('Rejection reason is required', 422, 'REJECTION_REASON_REQUIRED');
  }

  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
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
      throw createError('Approval has already been decided or request status changed', 409, 'APPROVAL_NOT_PENDING');
    }
    if (String(approval.requester_user_id) === String(user.id)) {
      throw createError('Requester cannot approve their own request', 403, 'SELF_APPROVAL_FORBIDDEN');
    }
    if (!AccessService.canApproveWithSnapshot(user, approval)) {
      throw createError('User does not meet this approval rule', 403, 'APPROVAL_ACCESS_FORBIDDEN');
    }

    const actor = UserUtil.snapshot(user);
    await connection.query(`
      UPDATE request_approvals
      SET
        status = ?,
        approver_user_id = ?,
        approver_internal_id = ?,
        approver_name = ?,
        approver_job_level_value = ?,
        approver_job_level_name = ?,
        note = ?,
        decided_at = NOW()
      WHERE id = ?
    `, [
      normalizedDecision,
      actor.user_id,
      actor.internal_id,
      actor.name,
      actor.job_level_value,
      actor.job_level_name,
      note,
      Number(approvalId),
    ]);

    if (normalizedDecision === 'REJECTED') {
      await connection.query("UPDATE requests SET status = 'REJECTED', completed_at = NOW() WHERE id = ?", [approval.request_id]);
    } else {
      const [activeRows] = await connection.query(
        "SELECT COUNT(*) AS total FROM request_items WHERE request_id = ? AND status = 'ACTIVE'",
        [approval.request_id]
      );
      if (Number(activeRows[0]?.total || 0) === 0) {
        throw createError('No active request items remain for approval', 409, 'NO_ACTIVE_REQUEST_ITEMS');
      }

      const [existingReviews] = await connection.query(
        'SELECT id, status FROM finance_reviews WHERE request_id = ? LIMIT 1 FOR UPDATE',
        [approval.request_id]
      );
      let reviewId;
      if (existingReviews[0]) {
        reviewId = existingReviews[0].id;
        await connection.query(`
          UPDATE finance_reviews
          SET status = 'PENDING', reviewer_user_id = NULL, reviewer_internal_id = NULL,
              reviewer_name = NULL, note = NULL, reviewed_at = NULL
          WHERE id = ?
        `, [reviewId]);
        await connection.query('DELETE FROM finance_review_items WHERE finance_review_id = ?', [reviewId]);
      } else {
        const [reviewResult] = await connection.query(`
          INSERT INTO finance_reviews (request_id, status)
          VALUES (?, 'PENDING')
        `, [approval.request_id]);
        reviewId = reviewResult.insertId;
      }

      await connection.query(`
        INSERT INTO finance_review_items (finance_review_id, request_item_id, decision)
        SELECT ?, id, 'PENDING'
        FROM request_items
        WHERE request_id = ? AND status = 'ACTIVE'
      `, [reviewId, approval.request_id]);
      await connection.query("UPDATE requests SET status = 'PENDING_FINANCE_REVIEW' WHERE id = ?", [approval.request_id]);
    }

    await ActivityService.log(connection, {
      request_id: approval.request_id,
      entity_type: 'APPROVAL',
      entity_id: approval.id,
      action_code: normalizedDecision === 'APPROVED' ? 'DEPARTMENT_APPROVED' : 'DEPARTMENT_REJECTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      before: { approval_status: 'PENDING', request_status: approval.request_status },
      after: {
        approval_status: normalizedDecision,
        request_status: normalizedDecision === 'APPROVED' ? 'PENDING_FINANCE_REVIEW' : 'REJECTED',
        note,
      },
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
    if (approval.status !== 'APPROVED' || approval.request_status !== 'PENDING_FINANCE_REVIEW') {
      throw createError('Only an approved request waiting for Finance can be reverted', 409, 'APPROVAL_REVERT_NOT_ALLOWED');
    }
    if (!AccessService.canApproveWithSnapshot(user, approval)) {
      throw createError('User does not meet this approval rule', 403, 'APPROVAL_ACCESS_FORBIDDEN');
    }

    const [financeRows] = await connection.query(
      'SELECT id, status FROM finance_reviews WHERE request_id = ? LIMIT 1 FOR UPDATE',
      [approval.request_id]
    );
    const finance = financeRows[0];
    if (!finance || finance.status !== 'PENDING') {
      throw createError('Finance has already processed this request; it can no longer be reverted', 409, 'FINANCE_ALREADY_PROCESSED');
    }

    const actor = UserUtil.snapshot(user);
    await connection.query(`
      UPDATE request_approvals
      SET status = 'REVERTED', reverted_at = NOW(), reverted_by_user_id = ?,
          reverted_by_name = ?, revert_reason = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, reason, Number(approvalId)]);
    await connection.query(
      "UPDATE finance_reviews SET status = 'REVERTED' WHERE id = ?",
      [finance.id]
    );
    await connection.query(
      "UPDATE finance_review_items SET decision = 'REVERTED', approved_qty = NULL WHERE finance_review_id = ?",
      [finance.id]
    );
    await connection.query(`
      UPDATE requests
      SET status = 'REVERTED_TO_REQUESTER', reverted_at = NOW(), reverted_by_user_id = ?,
          reverted_by_name = ?, revert_reason = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, reason, approval.request_id]);

    await ActivityService.log(connection, {
      request_id: approval.request_id,
      entity_type: 'APPROVAL',
      entity_id: approval.id,
      action_code: 'DEPARTMENT_APPROVAL_REVERTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      before: { approval_status: 'APPROVED', request_status: approval.request_status },
      after: { approval_status: 'REVERTED', request_status: 'REVERTED_TO_REQUESTER', reason },
    });

    await connection.commit();
    return RequestService.getById(approval.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function cancelItem(user, approvalId, itemId, payload = {}) {
  const reason = optionalText(payload.reason ?? payload.note, 5000);
  if (!reason) throw createError('Cancel reason is required', 422, 'CANCEL_REASON_REQUIRED');

  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
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
    if (!['PENDING', 'APPROVED'].includes(approval.status)) {
      throw createError('Approval can no longer cancel request items', 409, 'APPROVAL_ITEM_CANCEL_NOT_ALLOWED');
    }
    if (!AccessService.canApproveWithSnapshot(user, approval)) {
      throw createError('User does not meet this approval rule', 403, 'APPROVAL_ACCESS_FORBIDDEN');
    }
    if (approval.status === 'PENDING' && approval.request_status !== 'PENDING_DEPARTMENT_APPROVAL') {
      throw createError('Request is not waiting for department approval', 409, 'APPROVAL_ITEM_CANCEL_NOT_ALLOWED');
    }
    if (approval.status === 'APPROVED') {
      if (approval.request_status !== 'PENDING_FINANCE_REVIEW') {
        throw createError('Approved request is no longer waiting for Finance', 409, 'APPROVAL_ITEM_CANCEL_NOT_ALLOWED');
      }
      const [financeRows] = await connection.query(
        'SELECT id, status FROM finance_reviews WHERE request_id = ? LIMIT 1 FOR UPDATE',
        [approval.request_id]
      );
      if (!financeRows[0] || financeRows[0].status !== 'PENDING') {
        throw createError('Finance has already processed this request item', 409, 'FINANCE_ALREADY_PROCESSED');
      }
    }

    const [requestRows] = await connection.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [approval.request_id]);
    await RequestService.cancelItemWithConnection(
      connection,
      requestRows[0],
      itemId,
      user,
      'DEPARTMENT_APPROVAL',
      reason
    );

    await connection.commit();
    return RequestService.getById(approval.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

module.exports = {
  listQueue,
  getById,
  decide,
  revert,
  cancelItem,
};
