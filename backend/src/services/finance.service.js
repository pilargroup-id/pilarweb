const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const RequestService = require('./request.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, nonNegativeNumber, parsePositiveInt } = require('../utils/business.util');

async function listQueue(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [];
  let where = "WHERE fr.status = 'PENDING' AND r.status = 'PENDING_FINANCE_REVIEW'";
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.request_purpose_name LIKE ?)';
    params.push(search, search, search);
  }
  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total
    FROM finance_reviews fr
    INNER JOIN requests r ON r.id = fr.request_id
    ${where}
  `, params);
  const [rows] = await db.query(`
    SELECT
      fr.id AS finance_review_id,
      fr.status AS finance_review_status,
      r.id AS request_id,
      r.request_number,
      r.request_purpose_name,
      r.requester_name,
      r.department_name,
      r.reason,
      r.submitted_at,
      r.status AS request_status
    FROM finance_reviews fr
    INNER JOIN requests r ON r.id = fr.request_id
    ${where}
    ORDER BY r.submitted_at ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function show(user, requestId) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  return RequestService.getById(requestId, user);
}

async function review(user, requestId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'FINANCE', connection);
    const [reviewRows] = await connection.query(`
      SELECT fr.*, r.status AS request_status
      FROM finance_reviews fr
      INNER JOIN requests r ON r.id = fr.request_id
      WHERE fr.request_id = ?
      LIMIT 1
      FOR UPDATE
    `, [requestId]);
    const reviewRow = reviewRows[0];
    if (!reviewRow) throw createError('Finance review not found', 404, 'FINANCE_REVIEW_NOT_FOUND');
    if (reviewRow.status !== 'PENDING' || reviewRow.request_status !== 'PENDING_FINANCE_REVIEW') {
      throw createError('Finance review is not pending', 409, 'FINANCE_REVIEW_NOT_PENDING');
    }

    const decisions = Array.isArray(payload.items) ? payload.items : [];
    const [itemRows] = await connection.query(`
      SELECT fri.id AS finance_review_item_id, fri.request_item_id, fri.decision AS current_decision, ri.requested_qty, ri.status AS request_item_status
      FROM finance_review_items fri
      INNER JOIN request_items ri ON ri.id = fri.request_item_id
      WHERE fri.finance_review_id = ?
      ORDER BY fri.id ASC
    `, [reviewRow.id]);
    if (!itemRows.length) throw createError('Finance review has no items', 409, 'FINANCE_REVIEW_ITEMS_MISSING');

    const byRequestItemId = new Map(decisions.map((row) => [Number(row.request_item_id), row]));
    let totalApproved = 0;
    let canceledCount = 0;
    let rejectedCount = 0;
    const actor = UserUtil.snapshot(user);

    for (const row of itemRows) {
      if (row.request_item_status === 'CANCELED' || row.current_decision === 'CANCELED') {
        canceledCount += 1;
        await connection.query(`
          UPDATE finance_review_items
          SET decision = 'CANCELED', approved_qty = 0
          WHERE id = ?
        `, [row.finance_review_item_id]);
        continue;
      }

      const input = byRequestItemId.get(Number(row.request_item_id));
      if (!input) {
        throw createError(`Decision is required for request item ${row.request_item_id}`, 422, 'FINANCE_DECISION_REQUIRED');
      }
      const decision = String(input.decision || '').trim().toUpperCase();
      if (!['APPROVED', 'REJECTED', 'CANCELED'].includes(decision)) {
        throw createError('Finance item decision must be APPROVED, REJECTED, or CANCELED', 422, 'FINANCE_DECISION_INVALID');
      }

      let approvedQty = 0;
      const note = optionalText(input.note ?? input.reason, 500);
      if (decision === 'APPROVED') {
        approvedQty = nonNegativeNumber(input.approved_qty, 'approved_qty');
        if (approvedQty <= 0 || approvedQty > Number(row.requested_qty)) {
          throw createError('approved_qty must be greater than 0 and not exceed requested_qty', 422, 'FINANCE_APPROVED_QTY_INVALID');
        }
        totalApproved += approvedQty;
      } else if (decision === 'CANCELED') {
        if (!note) throw createError('Cancel reason is required', 422, 'CANCEL_REASON_REQUIRED');
        canceledCount += 1;
        await connection.query(`
          UPDATE request_items
          SET status = 'CANCELED', canceled_at = NOW(), canceled_by_user_id = ?,
              canceled_by_name = ?, canceled_by_stage = 'FINANCE', cancel_reason = ?
          WHERE id = ? AND status = 'ACTIVE'
        `, [actor.user_id, actor.name, note, row.request_item_id]);
      } else {
        rejectedCount += 1;
      }

      await connection.query(`
        UPDATE finance_review_items
        SET decision = ?, approved_qty = ?, note = ?
        WHERE id = ?
      `, [decision, decision === 'APPROVED' ? approvedQty : 0, note, row.finance_review_item_id]);
    }

    let overall;
    if (totalApproved > 0) overall = 'APPROVED';
    else if (rejectedCount > 0) overall = 'REJECTED';
    else overall = 'CANCELED';
    const note = optionalText(payload.note, 5000);
    await connection.query(`
      UPDATE finance_reviews
      SET status = ?, reviewer_user_id = ?, reviewer_internal_id = ?, reviewer_name = ?, note = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [overall, actor.user_id, actor.internal_id, actor.name, note, reviewRow.id]);

    const requestStatus = overall === 'APPROVED' ? 'READY_FOR_WAREHOUSE' : overall;
    await connection.query(`
      UPDATE requests
      SET
        status = ?,
        completed_at = CASE WHEN ? IN ('REJECTED', 'CANCELED') THEN NOW() ELSE completed_at END,
        canceled_at = CASE WHEN ? = 'CANCELED' THEN NOW() ELSE canceled_at END
      WHERE id = ?
    `, [requestStatus, requestStatus, requestStatus, requestId]);

    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'FINANCE_REVIEW',
      entity_id: reviewRow.id,
      action_code: overall === 'APPROVED' ? 'FINANCE_REVIEW_APPROVED' : (overall === 'CANCELED' ? 'FINANCE_REVIEW_CANCELED' : 'FINANCE_REVIEW_REJECTED'),
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { status: overall, request_status: requestStatus, total_approved_qty: totalApproved, canceled_items: canceledCount, rejected_items: rejectedCount, note },
    });

    await connection.commit();
    return RequestService.getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

module.exports = { listQueue, show, review };
