const crypto = require('crypto');
const { requireDatabase } = require('../config/database.config');
const ItembaseService = require('./itembase.service');
const ActivityService = require('./activity.service');
const AccessService = require('./access.service');
const UserUtil = require('../utils/user.util');
const {
  createError,
  optionalText,
  positiveNumber,
  parsePositiveInt,
} = require('../utils/business.util');

const EDITABLE_STATUSES = new Set(['PENDING_DEPARTMENT_APPROVAL', 'REVERTED_TO_REQUESTER']);
const SUBMITTABLE_STATUSES = new Set(['REVERTED_TO_REQUESTER']);

async function nextNumber(connection, sequenceKey, periodKey, prefix, digits = 5) {
  await connection.query(`
    INSERT INTO number_sequences (sequence_key, period_key, last_number)
    VALUES (?, ?, 0)
    ON DUPLICATE KEY UPDATE sequence_key = VALUES(sequence_key)
  `, [sequenceKey, periodKey]);

  const [rows] = await connection.query(`
    SELECT id, last_number
    FROM number_sequences
    WHERE sequence_key = ? AND period_key = ?
    FOR UPDATE
  `, [sequenceKey, periodKey]);

  const next = Number(rows[0]?.last_number || 0) + 1;
  await connection.query('UPDATE number_sequences SET last_number = ? WHERE id = ?', [next, rows[0].id]);
  return `${prefix}-${periodKey}-${String(next).padStart(digits, '0')}`;
}

function itemFromItembase(body) {
  const item = body?.data && typeof body.data === 'object' ? body.data : body;
  if (!item?.id) throw createError('Invalid Itembase item response', 502, 'ITEMBASE_INVALID_RESPONSE');
  if (String(item.item_kind || '').toLowerCase() !== 'regular') {
    throw createError('Only regular items can be requested', 422, 'ITEM_KIND_NOT_ALLOWED');
  }
  return item;
}

function itemSnapshot(item) {
  return {
    itembase_item_id: String(item.id),
    item_code: String(item.item_code || '').trim(),
    item_name: String(item.item_name || '').trim(),
    selling_name: item.selling_name ? String(item.selling_name).trim() : null,
    parent_id: item.parent?.id ? String(item.parent.id) : null,
    parent_name: item.parent?.parent_name ? String(item.parent.parent_name) : null,
    variant_name: item.variant_summary ? String(item.variant_summary) : null,
    uom_code: item.uom?.code ? String(item.uom.code) : null,
    item_kind: 'regular',
  };
}

async function resolveItemSnapshot(itembaseItemId) {
  const body = await ItembaseService.getItemById(itembaseItemId);
  const item = itemFromItembase(body);
  const snapshot = itemSnapshot(item);
  if (!snapshot.item_code || !snapshot.item_name) {
    throw createError('Itembase item is missing item code or name', 502, 'ITEMBASE_INVALID_RESPONSE');
  }
  return snapshot;
}

async function getPurpose(connection, purposeId) {
  const [rows] = await connection.query(`
    SELECT id, code, name, description, is_active
    FROM master_request_purposes
    WHERE id = ? AND is_active = 1
    LIMIT 1
  `, [Number(purposeId)]);
  if (!rows[0]) throw createError('Request purpose not found', 422, 'REQUEST_PURPOSE_NOT_FOUND');
  return rows[0];
}

async function assertRequesterCanCreate(connection, user) {
  const snapshot = UserUtil.snapshot(user);
  if (!snapshot.user_id || !snapshot.department_id) {
    throw createError('User department is required to create a request', 422, 'REQUESTER_CONTEXT_MISSING');
  }
  const rule = await AccessService.findApprovalRuleForDepartment(snapshot.department_id, connection);
  if (!rule) {
    throw createError('Approval rule is not configured for this department', 422, 'APPROVAL_RULE_MISSING');
  }
  if (!AccessService.canCreateRequestWithRule(user, rule)) {
    throw createError('Current job level is not allowed to create requests', 403, 'REQUEST_CREATE_FORBIDDEN');
  }
  return { snapshot, rule };
}

async function insertItem(connection, requestId, payload) {
  const itemId = String(payload?.itembase_item_id || '').trim();
  if (!itemId) throw createError('itembase_item_id is required', 422, 'VALIDATION_ERROR');
  const qty = positiveNumber(payload?.requested_qty, 'requested_qty');
  const notes = optionalText(payload?.notes, 500);
  const snapshot = await resolveItemSnapshot(itemId);

  const [duplicateRows] = await connection.query(`
    SELECT id FROM request_items
    WHERE request_id = ? AND itembase_item_id = ?
    LIMIT 1
  `, [requestId, snapshot.itembase_item_id]);
  if (duplicateRows[0]) throw createError('Item already exists in this request', 409, 'REQUEST_ITEM_DUPLICATE');

  const [result] = await connection.query(`
    INSERT INTO request_items (
      request_id, itembase_item_id, item_code, item_name, selling_name,
      parent_id, parent_name, variant_name, uom_code, item_kind,
      requested_qty, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'regular', ?, ?)
  `, [
    requestId,
    snapshot.itembase_item_id,
    snapshot.item_code,
    snapshot.item_name,
    snapshot.selling_name,
    snapshot.parent_id,
    snapshot.parent_name,
    snapshot.variant_name,
    snapshot.uom_code,
    qty,
    notes,
  ]);

  return { id: result.insertId, ...snapshot, requested_qty: qty, notes };
}

async function create(user, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { snapshot, rule } = await assertRequesterCanCreate(connection, user);
    const purpose = await getPurpose(connection, payload.request_purpose_id);
    const reason = optionalText(payload.reason, 5000);
    if (!reason) throw createError('Reason is required', 422, 'REQUEST_REASON_REQUIRED');

    const items = Array.isArray(payload.items) ? payload.items : [];
    if (!items.length) throw createError('At least one request item is required', 422, 'REQUEST_ITEMS_REQUIRED');

    const now = new Date();
    const periodKey = String(now.getFullYear()).slice(-2);
    const requestNumber = await nextNumber(connection, 'REQUEST', periodKey, 'PWR', 5);
    const id = crypto.randomUUID();

    await connection.query(`
      INSERT INTO requests (
        id, request_number,
        request_purpose_id, request_purpose_code, request_purpose_name,
        status,
        requester_user_id, requester_internal_id, requester_name,
        requester_job_level_value, requester_job_level_name,
        department_id, department_name,
        company_id, company_name,
        reason, submitted_at
      ) VALUES (?, ?, ?, ?, ?, 'PENDING_DEPARTMENT_APPROVAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      id,
      requestNumber,
      purpose.id,
      purpose.code,
      purpose.name,
      snapshot.user_id,
      snapshot.internal_id,
      snapshot.name,
      snapshot.job_level_value,
      snapshot.job_level_name,
      snapshot.department_id,
      snapshot.department_name,
      snapshot.company_id,
      snapshot.company_name,
      reason,
    ]);

    for (const item of items) await insertItem(connection, id, item);

    await connection.query(`
      INSERT INTO request_approvals (
        request_id, approval_rule_id, approval_order,
        department_id, department_name,
        required_job_level_value, required_job_level_name,
        allow_higher_job_level, status
      ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'PENDING')
    `, [
      id,
      rule.id,
      snapshot.department_id,
      snapshot.department_name,
      rule.approver_min_job_level_value,
      rule.approver_job_level_name,
      rule.allow_higher_job_level,
    ]);

    await ActivityService.log(connection, {
      request_id: id,
      entity_type: 'REQUEST',
      entity_id: id,
      action_code: 'REQUEST_CREATED',
      actor_user_id: snapshot.user_id,
      actor_name: snapshot.name,
      after: { request_number: requestNumber, status: 'PENDING_DEPARTMENT_APPROVAL' },
    });

    await connection.commit();
    return getById(id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function update(user, requestId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    assertEditable(request);

    let purpose = null;
    if (payload.request_purpose_id !== undefined) {
      purpose = await getPurpose(connection, payload.request_purpose_id);
    }
    const reason = payload.reason !== undefined ? optionalText(payload.reason, 5000) : request.reason;
    if (!reason) throw createError('Reason is required', 422, 'REQUEST_REASON_REQUIRED');

    await connection.query(`
      UPDATE requests
      SET request_purpose_id = ?, request_purpose_code = ?, request_purpose_name = ?, reason = ?
      WHERE id = ?
    `, [
      purpose?.id ?? request.request_purpose_id,
      purpose?.code ?? request.request_purpose_code,
      purpose?.name ?? request.request_purpose_name,
      reason,
      request.id,
    ]);

    await ActivityService.log(connection, {
      request_id: request.id,
      entity_type: 'REQUEST',
      entity_id: request.id,
      action_code: 'REQUEST_UPDATED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: { request_purpose_id: request.request_purpose_id, reason: request.reason },
      after: { request_purpose_id: purpose?.id ?? request.request_purpose_id, reason },
    });

    await connection.commit();
    return getById(request.id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function addItem(user, requestId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    assertEditable(request);
    const item = await insertItem(connection, request.id, payload);
    await ActivityService.log(connection, {
      request_id: request.id,
      entity_type: 'REQUEST_ITEM',
      entity_id: item.id,
      action_code: 'REQUEST_ITEM_ADDED',
      actor_user_id: user.id,
      actor_name: user.name,
      after: item,
    });
    await connection.commit();
    return getById(request.id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function updateItem(user, requestId, itemId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    assertEditable(request);
    const [rows] = await connection.query(
      'SELECT * FROM request_items WHERE id = ? AND request_id = ? LIMIT 1 FOR UPDATE',
      [Number(itemId), request.id]
    );
    const item = rows[0];
    if (!item) throw createError('Request item not found', 404, 'REQUEST_ITEM_NOT_FOUND');

    const qty = payload.requested_qty !== undefined
      ? positiveNumber(payload.requested_qty, 'requested_qty')
      : Number(item.requested_qty);
    const notes = payload.notes !== undefined ? optionalText(payload.notes, 500) : item.notes;
    await connection.query('UPDATE request_items SET requested_qty = ?, notes = ? WHERE id = ?', [qty, notes, item.id]);

    await ActivityService.log(connection, {
      request_id: request.id,
      entity_type: 'REQUEST_ITEM',
      entity_id: item.id,
      action_code: 'REQUEST_ITEM_UPDATED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: { requested_qty: item.requested_qty, notes: item.notes },
      after: { requested_qty: qty, notes },
    });
    await connection.commit();
    return getById(request.id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function removeItem(user, requestId, itemId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    assertEditable(request);
    const [rows] = await connection.query(
      'SELECT * FROM request_items WHERE id = ? AND request_id = ? LIMIT 1 FOR UPDATE',
      [Number(itemId), request.id]
    );
    const item = rows[0];
    if (!item) throw createError('Request item not found', 404, 'REQUEST_ITEM_NOT_FOUND');

    const [countRows] = await connection.query('SELECT COUNT(*) AS total FROM request_items WHERE request_id = ?', [request.id]);
    if (Number(countRows[0]?.total || 0) <= 1) {
      throw createError('A request must keep at least one item', 409, 'REQUEST_ITEMS_REQUIRED');
    }

    await ActivityService.log(connection, {
      request_id: request.id,
      entity_type: 'REQUEST_ITEM',
      entity_id: item.id,
      action_code: 'REQUEST_ITEM_REMOVED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: item,
    });
    await connection.query('DELETE FROM request_items WHERE id = ?', [item.id]);
    await connection.commit();
    return getById(request.id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function submit(user, requestId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    if (!SUBMITTABLE_STATUSES.has(request.status)) {
      throw createError('Only a reverted request needs to be submitted again', 409, 'REQUEST_NOT_SUBMITTABLE');
    }
    const [items] = await connection.query('SELECT id FROM request_items WHERE request_id = ? LIMIT 1', [request.id]);
    if (!items[0]) throw createError('At least one request item is required', 422, 'REQUEST_ITEMS_REQUIRED');
    if (!String(request.reason || '').trim()) throw createError('Reason is required', 422, 'REQUEST_REASON_REQUIRED');

    await connection.query(`
      UPDATE request_approvals
      SET status = 'PENDING', approver_user_id = NULL, approver_internal_id = NULL,
          approver_name = NULL, approver_job_level_value = NULL, approver_job_level_name = NULL,
          note = NULL, decided_at = NULL
      WHERE request_id = ?
    `, [request.id]);
    await connection.query(`
      UPDATE requests
      SET status = 'PENDING_DEPARTMENT_APPROVAL', submitted_at = NOW()
      WHERE id = ?
    `, [request.id]);

    await ActivityService.log(connection, {
      request_id: request.id,
      entity_type: 'REQUEST',
      entity_id: request.id,
      action_code: 'REQUEST_RESUBMITTED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: { status: request.status },
      after: { status: 'PENDING_DEPARTMENT_APPROVAL' },
    });
    await connection.commit();
    return getById(request.id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function listMine(user, query = {}) {
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [String(user.id)];
  let where = 'WHERE requester_user_id = ?';
  if (query.status) {
    where += ' AND status = ?';
    params.push(String(query.status).trim().toUpperCase());
  }
  if (query.search) {
    where += ' AND (request_number LIKE ? OR request_purpose_name LIKE ? OR reason LIKE ?)';
    const search = `%${String(query.search).trim()}%`;
    params.push(search, search, search);
  }
  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM requests ${where}`, params);
  const [rows] = await db.query(`
    SELECT * FROM requests
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function canViewRequest(connection, user, request) {
  if (String(request.requester_user_id) === String(user.id)) return true;
  if (await AccessService.hasModuleAccess(user, 'ADMIN', connection)) return true;
  if (await AccessService.hasModuleAccess(user, 'FINANCE', connection)) return true;
  if (await AccessService.hasModuleAccess(user, 'WAREHOUSE', connection)) return true;

  const [historicalApproval] = await connection.query(`
    SELECT id FROM request_approvals
    WHERE request_id = ? AND approver_user_id = ?
    LIMIT 1
  `, [request.id, user.id]);
  if (historicalApproval[0]) return true;

  const [approvals] = await connection.query(`
    SELECT department_id, required_job_level_value, allow_higher_job_level
    FROM request_approvals
    WHERE request_id = ? AND status = 'PENDING'
    ORDER BY approval_order ASC
    LIMIT 1
  `, [request.id]);
  return approvals[0] ? AccessService.canApproveWithSnapshot(user, approvals[0]) : false;
}

async function getById(requestId, user) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [requestId]);
    const request = rows[0];
    if (!request) throw createError('Request not found', 404, 'REQUEST_NOT_FOUND');
    if (!(await canViewRequest(connection, user, request))) {
      throw createError('Request is not accessible', 403, 'REQUEST_ACCESS_FORBIDDEN');
    }

    const [items] = await connection.query('SELECT * FROM request_items WHERE request_id = ? ORDER BY id ASC', [requestId]);
    const [approvals] = await connection.query('SELECT * FROM request_approvals WHERE request_id = ? ORDER BY approval_order ASC, id ASC', [requestId]);
    const [financeRows] = await connection.query('SELECT * FROM finance_reviews WHERE request_id = ? LIMIT 1', [requestId]);
    let finance = financeRows[0] || null;
    if (finance) {
      const [financeItems] = await connection.query('SELECT * FROM finance_review_items WHERE finance_review_id = ? ORDER BY id ASC', [finance.id]);
      finance = { ...finance, items: financeItems };
    }

    const [fulfillmentRows] = await connection.query('SELECT * FROM warehouse_fulfillments WHERE request_id = ? LIMIT 1', [requestId]);
    let fulfillment = fulfillmentRows[0] || null;
    if (fulfillment) {
      const [fulfillmentItems] = await connection.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id = ? ORDER BY id ASC', [fulfillment.id]);
      const [handoverRows] = await connection.query('SELECT * FROM warehouse_handovers WHERE fulfillment_id = ? LIMIT 1', [fulfillment.id]);
      fulfillment = { ...fulfillment, items: fulfillmentItems, handover: handoverRows[0] || null };
    }

    return { ...request, items, approvals, finance_review: finance, fulfillment };
  } finally { connection.release(); }
}

async function lockRequest(connection, requestId) {
  const [rows] = await connection.query('SELECT * FROM requests WHERE id = ? LIMIT 1 FOR UPDATE', [requestId]);
  if (!rows[0]) throw createError('Request not found', 404, 'REQUEST_NOT_FOUND');
  return rows[0];
}

function assertOwner(user, request) {
  if (String(request.requester_user_id) !== String(user.id)) {
    throw createError('Only the requester can change this request', 403, 'REQUEST_OWNER_REQUIRED');
  }
}

function assertEditable(request) {
  if (!EDITABLE_STATUSES.has(request.status)) {
    throw createError('Request can only be edited before Manager approval or after Manager revert', 409, 'REQUEST_NOT_EDITABLE');
  }
}

module.exports = {
  create,
  update,
  addItem,
  updateItem,
  removeItem,
  submit,
  listMine,
  getById,
  canViewRequest,
  lockRequest,
  nextNumber,
};
