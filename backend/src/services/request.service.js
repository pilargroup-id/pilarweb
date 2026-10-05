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
  normalizeDate,
} = require('../utils/business.util');

const EDITABLE_STATUSES = new Set(['DRAFT', 'PENDING_DEPARTMENT_APPROVAL', 'REVERTED_TO_REQUESTER']);
const SUBMITTABLE_STATUSES = new Set(['DRAFT', 'REVERTED_TO_REQUESTER']);
const REQUESTER_CANCELLABLE_ITEM_STATUSES = new Set(['DRAFT', 'PENDING_DEPARTMENT_APPROVAL', 'REVERTED_TO_REQUESTER']);
const TERMINAL_STATUSES = new Set(['COMPLETED', 'REJECTED', 'CANCELED']);

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
  await connection.query(
    'UPDATE number_sequences SET last_number = ? WHERE id = ?',
    [next, rows[0].id]
  );

  return `${prefix}-${periodKey}-${String(next).padStart(digits, '0')}`;
}

function itemFromItembase(body) {
  const item = body?.data && typeof body.data === 'object' ? body.data : body;
  if (!item?.id) {
    throw createError('Invalid Itembase item response', 502, 'ITEMBASE_INVALID_RESPONSE');
  }
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

async function getActiveWorkflowAssignment(connection, purposeId) {
  const [rows] = await connection.query(`
    SELECT
      rpw.id AS assignment_id,
      wd.id AS workflow_definition_id,
      wd.code AS workflow_code,
      wd.name AS workflow_name,
      wd.version AS workflow_version,
      wd.requires_return
    FROM request_purpose_workflows rpw
    INNER JOIN workflow_definitions wd
      ON wd.id = rpw.workflow_definition_id
    WHERE rpw.request_purpose_id = ?
      AND rpw.is_active = 1
      AND wd.is_active = 1
      AND rpw.effective_from <= NOW()
      AND (rpw.effective_to IS NULL OR rpw.effective_to > NOW())
    ORDER BY rpw.effective_from DESC, rpw.id DESC
    LIMIT 1
  `, [purposeId]);
  if (!rows[0]) {
    throw createError(
      'No active workflow is assigned to this request purpose',
      422,
      'WORKFLOW_ASSIGNMENT_MISSING'
    );
  }
  return rows[0];
}

async function assertRequesterCanCreate(connection, user) {
  const snapshot = UserUtil.snapshot(user);
  if (!snapshot.user_id || !snapshot.department_id) {
    throw createError('User department is required to create a request', 422, 'REQUESTER_CONTEXT_MISSING');
  }

  const rule = await AccessService.findApprovalRuleForDepartment(snapshot.department_id, connection);
  if (!rule) {
    throw createError(
      'Approval rule is not configured for this department',
      422,
      'APPROVAL_RULE_MISSING'
    );
  }

  if (!AccessService.canCreateRequestWithRule(user, rule)) {
    throw createError(
      'Current job level is not allowed to create requests',
      403,
      'REQUEST_CREATE_FORBIDDEN'
    );
  }

  return { snapshot, rule };
}

async function insertItem(connection, requestId, payload) {
  const itemId = String(payload?.itembase_item_id || '').trim();
  if (!itemId) {
    throw createError('itembase_item_id is required', 422, 'VALIDATION_ERROR');
  }
  const qty = positiveNumber(payload?.requested_qty, 'requested_qty');
  const notes = optionalText(payload?.notes, 500);
  const snapshot = await resolveItemSnapshot(itemId);

  const [duplicateRows] = await connection.query(`
    SELECT id FROM request_items
    WHERE request_id = ? AND itembase_item_id = ? AND status = 'ACTIVE'
    LIMIT 1
  `, [requestId, snapshot.itembase_item_id]);
  if (duplicateRows[0]) {
    throw createError('Item already exists in this request', 409, 'REQUEST_ITEM_DUPLICATE');
  }

  const [result] = await connection.query(`
    INSERT INTO request_items (
      request_id,
      itembase_item_id,
      item_code,
      item_name,
      selling_name,
      parent_id,
      parent_name,
      variant_name,
      uom_code,
      item_kind,
      requested_qty,
      notes
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

  return {
    id: result.insertId,
    ...snapshot,
    requested_qty: qty,
    notes,
  };
}

async function create(user, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();
    const { snapshot } = await assertRequesterCanCreate(connection, user);
    const purpose = await getPurpose(connection, payload.request_purpose_id);
    const reason = optionalText(payload.reason, 5000);
    const returnDueDate = normalizeDate(payload.return_due_date, 'return_due_date', false);
    const now = new Date();
    const periodKey = String(now.getFullYear()).slice(-2);
    const requestNumber = await nextNumber(connection, 'REQUEST', periodKey, 'PWR', 5);
    const id = crypto.randomUUID();

    await connection.query(`
      INSERT INTO requests (
        id,
        request_number,
        request_purpose_id,
        request_purpose_code,
        request_purpose_name,
        workflow_definition_id,
        workflow_code,
        workflow_name,
        workflow_version,
        requires_return,
        return_due_date,
        status,
        requester_user_id,
        requester_internal_id,
        requester_name,
        requester_job_level_value,
        requester_job_level_name,
        department_id,
        department_name,
        company_id,
        company_name,
        reason
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      requestNumber,
      purpose.id,
      purpose.code,
      purpose.name,
      returnDueDate,
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

    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const item of items) {
      await insertItem(connection, id, item);
    }

    await ActivityService.log(connection, {
      request_id: id,
      entity_type: 'REQUEST',
      entity_id: id,
      action_code: 'REQUEST_CREATED',
      actor_user_id: snapshot.user_id,
      actor_name: snapshot.name,
      after: { request_number: requestNumber, status: 'DRAFT' },
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
    const returnDueDate = payload.return_due_date !== undefined
      ? normalizeDate(payload.return_due_date, 'return_due_date', false)
      : request.return_due_date;

    let workflowPatch = null;
    const targetPurposeId = purpose?.id ?? request.request_purpose_id;
    if (request.status !== 'DRAFT' && purpose) {
      workflowPatch = await getActiveWorkflowAssignment(connection, targetPurposeId);
    }

    const effectiveRequiresReturn = workflowPatch
      ? Number(workflowPatch.requires_return)
      : Number(request.requires_return || 0);
    if (request.status !== 'DRAFT' && effectiveRequiresReturn === 1 && !returnDueDate) {
      throw createError('Return due date is required for returnable requests', 422, 'RETURN_DUE_DATE_REQUIRED');
    }
    const effectiveReturnDueDate = request.status === 'DRAFT'
      ? returnDueDate
      : (effectiveRequiresReturn === 1 ? returnDueDate : null);

    await connection.query(`
      UPDATE requests
      SET
        request_purpose_id = ?,
        request_purpose_code = ?,
        request_purpose_name = ?,
        workflow_definition_id = COALESCE(?, workflow_definition_id),
        workflow_code = COALESCE(?, workflow_code),
        workflow_name = COALESCE(?, workflow_name),
        workflow_version = COALESCE(?, workflow_version),
        requires_return = COALESCE(?, requires_return),
        return_due_date = ?,
        reason = ?
      WHERE id = ?
    `, [
      targetPurposeId,
      purpose?.code ?? request.request_purpose_code,
      purpose?.name ?? request.request_purpose_name,
      workflowPatch?.workflow_definition_id ?? null,
      workflowPatch?.workflow_code ?? null,
      workflowPatch?.workflow_name ?? null,
      workflowPatch?.workflow_version ?? null,
      workflowPatch?.requires_return ?? null,
      effectiveReturnDueDate,
      reason,
      requestId,
    ]);

    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'REQUEST',
      entity_id: requestId,
      action_code: 'REQUEST_UPDATED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: request,
      after: {
        request_purpose_id: purpose?.id ?? request.request_purpose_id,
        return_due_date: effectiveReturnDueDate,
        reason,
      },
    });

    await connection.commit();
    return getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function addItem(user, requestId, payload) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    assertEditable(request);
    const item = await insertItem(connection, requestId, payload);
    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'REQUEST_ITEM',
      entity_id: item.id,
      action_code: 'REQUEST_ITEM_ADDED',
      actor_user_id: user.id,
      actor_name: user.name,
      after: item,
    });
    await connection.commit();
    return getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function updateItem(user, requestId, itemId, payload) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    assertEditable(request);
    const [rows] = await connection.query(
      'SELECT * FROM request_items WHERE id = ? AND request_id = ? LIMIT 1 FOR UPDATE',
      [Number(itemId), requestId]
    );
    if (!rows[0]) throw createError('Request item not found', 404, 'REQUEST_ITEM_NOT_FOUND');
    if (rows[0].status !== 'ACTIVE') {
      throw createError('Canceled request items cannot be edited', 409, 'REQUEST_ITEM_NOT_ACTIVE');
    }

    const qty = payload.requested_qty !== undefined
      ? positiveNumber(payload.requested_qty, 'requested_qty')
      : Number(rows[0].requested_qty);
    const notes = payload.notes !== undefined ? optionalText(payload.notes, 500) : rows[0].notes;

    await connection.query(
      'UPDATE request_items SET requested_qty = ?, notes = ? WHERE id = ?',
      [qty, notes, Number(itemId)]
    );
    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'REQUEST_ITEM',
      entity_id: itemId,
      action_code: 'REQUEST_ITEM_UPDATED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: rows[0],
      after: { requested_qty: qty, notes },
    });
    await connection.commit();
    return getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function removeItem(user, requestId, itemId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    if (request.status !== 'DRAFT') {
      throw createError('Submitted items must be canceled instead of deleted', 409, 'REQUEST_ITEM_DELETE_NOT_ALLOWED');
    }
    const [rows] = await connection.query(
      'SELECT * FROM request_items WHERE id = ? AND request_id = ? LIMIT 1 FOR UPDATE',
      [Number(itemId), requestId]
    );
    if (!rows[0]) throw createError('Request item not found', 404, 'REQUEST_ITEM_NOT_FOUND');
    if (rows[0].status !== 'ACTIVE') {
      throw createError('Canceled request items cannot be deleted', 409, 'REQUEST_ITEM_NOT_ACTIVE');
    }
    await connection.query('DELETE FROM request_items WHERE id = ?', [Number(itemId)]);
    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'REQUEST_ITEM',
      entity_id: itemId,
      action_code: 'REQUEST_ITEM_REMOVED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: rows[0],
    });
    await connection.commit();
    return getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function submit(user, requestId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    assertSubmittable(request);

    const { rule } = await assertRequesterCanCreate(connection, user);
    const [itemRows] = await connection.query(
      "SELECT id FROM request_items WHERE request_id = ? AND status = 'ACTIVE' LIMIT 1",
      [requestId]
    );
    if (!itemRows.length) throw createError('At least one request item is required', 422, 'REQUEST_ITEMS_REQUIRED');
    if (!request.reason || !String(request.reason).trim()) {
      throw createError('Reason is required before submit', 422, 'REQUEST_REASON_REQUIRED');
    }

    const workflow = await getActiveWorkflowAssignment(connection, request.request_purpose_id);
    if (Number(workflow.requires_return) === 1 && !request.return_due_date) {
      throw createError('Return due date is required for returnable requests', 422, 'RETURN_DUE_DATE_REQUIRED');
    }

    await connection.query(`
      UPDATE requests
      SET
        workflow_definition_id = ?,
        workflow_code = ?,
        workflow_name = ?,
        workflow_version = ?,
        requires_return = ?,
        return_due_date = CASE WHEN ? = 1 THEN return_due_date ELSE NULL END,
        status = 'PENDING_DEPARTMENT_APPROVAL',
        submitted_at = NOW()
      WHERE id = ?
    `, [
      workflow.workflow_definition_id,
      workflow.workflow_code,
      workflow.workflow_name,
      workflow.workflow_version,
      workflow.requires_return,
      workflow.requires_return,
      requestId,
    ]);

    await connection.query(`
      INSERT INTO request_approvals (
        request_id,
        approval_rule_id,
        approval_order,
        status,
        department_id,
        department_name,
        required_job_level_value,
        required_job_level_name,
        allow_higher_job_level
      ) VALUES (?, ?, 1, 'PENDING', ?, ?, ?, ?, ?)
    `, [
      requestId,
      rule.id,
      request.department_id,
      request.department_name,
      rule.approver_min_job_level_value,
      rule.approver_job_level_name,
      rule.allow_higher_job_level,
    ]);

    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'REQUEST',
      entity_id: requestId,
      action_code: 'REQUEST_SUBMITTED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: { status: request.status },
      after: {
        status: 'PENDING_DEPARTMENT_APPROVAL',
        workflow_code: workflow.workflow_code,
        workflow_version: workflow.workflow_version,
      },
    });

    await connection.commit();
    return getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function cancelItemWithConnection(connection, request, itemId, user, stage, reason) {
  const cancelReason = optionalText(reason, 5000);
  if (!cancelReason) {
    throw createError('Cancel reason is required', 422, 'CANCEL_REASON_REQUIRED');
  }

  const [rows] = await connection.query(
    'SELECT * FROM request_items WHERE id = ? AND request_id = ? LIMIT 1 FOR UPDATE',
    [Number(itemId), request.id]
  );
  const item = rows[0];
  if (!item) throw createError('Request item not found', 404, 'REQUEST_ITEM_NOT_FOUND');
  if (item.status !== 'ACTIVE') {
    throw createError('Request item is already canceled', 409, 'REQUEST_ITEM_ALREADY_CANCELED');
  }

  const actor = UserUtil.snapshot(user);
  await connection.query(`
    UPDATE request_items
    SET
      status = 'CANCELED',
      canceled_at = NOW(),
      canceled_by_user_id = ?,
      canceled_by_name = ?,
      canceled_by_stage = ?,
      cancel_reason = ?
    WHERE id = ?
  `, [actor.user_id, actor.name, stage, cancelReason, Number(itemId)]);

  const [financeRows] = await connection.query(
    'SELECT id, status FROM finance_reviews WHERE request_id = ? LIMIT 1',
    [request.id]
  );
  const financeReview = financeRows[0];
  if (financeReview && financeReview.status === 'PENDING') {
    await connection.query(`
      UPDATE finance_review_items
      SET decision = 'CANCELED', approved_qty = 0, note = ?
      WHERE finance_review_id = ? AND request_item_id = ?
    `, [cancelReason, financeReview.id, Number(itemId)]);
  }

  const [countRows] = await connection.query(
    "SELECT COUNT(*) AS total FROM request_items WHERE request_id = ? AND status = 'ACTIVE'",
    [request.id]
  );
  const activeItemCount = Number(countRows[0]?.total || 0);

  if (activeItemCount === 0) {
    await connection.query(
      "UPDATE requests SET status = 'CANCELED', canceled_at = NOW(), completed_at = NOW() WHERE id = ?",
      [request.id]
    );
    await connection.query(
      "UPDATE request_approvals SET status = 'CANCELED', decided_at = COALESCE(decided_at, NOW()) WHERE request_id = ? AND status = 'PENDING'",
      [request.id]
    );
    await connection.query(
      "UPDATE finance_reviews SET status = 'CANCELED' WHERE request_id = ? AND status IN ('PENDING', 'REVERTED')",
      [request.id]
    );
  }

  await ActivityService.log(connection, {
    request_id: request.id,
    entity_type: 'REQUEST_ITEM',
    entity_id: item.id,
    action_code: 'REQUEST_ITEM_CANCELED',
    actor_user_id: actor.user_id,
    actor_name: actor.name,
    before: { status: item.status },
    after: {
      status: 'CANCELED',
      canceled_by_stage: stage,
      cancel_reason: cancelReason,
      request_status: activeItemCount === 0 ? 'CANCELED' : request.status,
    },
  });

  return { item_id: Number(item.id), active_item_count: activeItemCount };
}

async function cancelItem(user, requestId, itemId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await lockRequest(connection, requestId);
    assertOwner(user, request);
    if (!REQUESTER_CANCELLABLE_ITEM_STATUSES.has(request.status)) {
      throw createError('Requester can no longer cancel items in this request', 409, 'REQUEST_ITEM_CANCEL_NOT_ALLOWED');
    }
    await cancelItemWithConnection(
      connection,
      request,
      itemId,
      user,
      'REQUESTER',
      payload.reason ?? payload.note
    );
    await connection.commit();
    return getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

async function cancel(user, requestId) {
  throw createError(
    'Whole-request cancellation is disabled. Cancel request items individually.',
    409,
    'REQUEST_CANCEL_PER_ITEM_REQUIRED'
  );
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

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: Number(countRows[0]?.total || 0),
      totalPages: Math.max(1, Math.ceil(Number(countRows[0]?.total || 0) / limit)),
    },
  };
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

    const [items] = await connection.query(
      'SELECT * FROM request_items WHERE request_id = ? ORDER BY id ASC',
      [requestId]
    );
    const [approvals] = await connection.query(
      'SELECT * FROM request_approvals WHERE request_id = ? ORDER BY approval_order ASC, id ASC',
      [requestId]
    );
    const [financeRows] = await connection.query(
      'SELECT * FROM finance_reviews WHERE request_id = ? LIMIT 1',
      [requestId]
    );
    let finance = financeRows[0] || null;
    if (finance) {
      const [financeItems] = await connection.query(
        'SELECT * FROM finance_review_items WHERE finance_review_id = ? ORDER BY id ASC',
        [finance.id]
      );
      finance = { ...finance, items: financeItems };
    }
    const [fulfillments] = await connection.query(
      'SELECT * FROM warehouse_fulfillments WHERE request_id = ? ORDER BY id ASC',
      [requestId]
    );
    for (const fulfillment of fulfillments) {
      const [fulfillmentItems] = await connection.query(
        'SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id = ? ORDER BY id ASC',
        [fulfillment.id]
      );
      const [transfers] = await connection.query(
        'SELECT * FROM warehouse_inventory_transfers WHERE fulfillment_id = ? ORDER BY id ASC',
        [fulfillment.id]
      );
      for (const transfer of transfers) {
        const [transferItems] = await connection.query(
          'SELECT * FROM warehouse_inventory_transfer_items WHERE inventory_transfer_id = ? ORDER BY id ASC',
          [transfer.id]
        );
        transfer.items = transferItems;
      }
      const [handoverRows] = await connection.query(
        'SELECT * FROM warehouse_handovers WHERE fulfillment_id = ? ORDER BY id DESC LIMIT 1',
        [fulfillment.id]
      );
      fulfillment.items = fulfillmentItems;
      fulfillment.inventory_transfers = transfers;
      fulfillment.handover = handoverRows[0] || null;
    }
    const [returns] = await connection.query(
      'SELECT * FROM returns WHERE request_id = ? ORDER BY id ASC',
      [requestId]
    );
    for (const returnRow of returns) {
      const [returnItems] = await connection.query(
        'SELECT * FROM return_items WHERE return_id = ? ORDER BY id ASC',
        [returnRow.id]
      );
      returnRow.items = returnItems;
    }

    return {
      ...request,
      items,
      approvals,
      finance_review: finance,
      fulfillments,
      returns,
    };
  } finally {
    connection.release();
  }
}

async function lockRequest(connection, requestId) {
  const [rows] = await connection.query(
    'SELECT * FROM requests WHERE id = ? LIMIT 1 FOR UPDATE',
    [requestId]
  );
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
    throw createError(
      'Request can only be edited before department approval or after it is reverted to the requester',
      409,
      'REQUEST_NOT_EDITABLE'
    );
  }
}

function assertSubmittable(request) {
  if (!SUBMITTABLE_STATUSES.has(request.status)) {
    throw createError('Request is not waiting for submission', 409, 'REQUEST_NOT_SUBMITTABLE');
  }
}

module.exports = {
  create,
  update,
  addItem,
  updateItem,
  removeItem,
  cancelItem,
  cancelItemWithConnection,
  submit,
  cancel,
  listMine,
  getById,
  lockRequest,
  canViewRequest,
  nextNumber,
};
