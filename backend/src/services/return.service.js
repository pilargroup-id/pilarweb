const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const RequestService = require('./request.service');
const WarehouseService = require('./warehouse.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, positiveNumber, parsePositiveInt } = require('../utils/business.util');

const CONDITION_CODES = new Set(['GOOD', 'DAMAGED', 'MISSING', 'OTHER']);

async function issuedByRequestItem(connection, requestId) {
  const [rows] = await connection.query(`
    SELECT wfi.request_item_id, SUM(wfi.actual_qty) AS issued_qty
    FROM warehouse_fulfillment_items wfi
    INNER JOIN warehouse_fulfillments wf ON wf.id = wfi.fulfillment_id
    INNER JOIN warehouse_handovers wh ON wh.fulfillment_id = wf.id
    WHERE wf.request_id = ? AND wh.status = 'RECEIVED'
    GROUP BY wfi.request_item_id
  `, [requestId]);
  return new Map(rows.map((row) => [Number(row.request_item_id), Number(row.issued_qty || 0)]));
}

async function returnedOrPendingByRequestItem(connection, requestId) {
  const [rows] = await connection.query(`
    SELECT ri.request_item_id, SUM(ri.returned_qty) AS returned_qty
    FROM returns r
    INNER JOIN return_items ri ON ri.return_id = r.id
    WHERE r.request_id = ? AND r.status IN ('SUBMITTED', 'RECEIVED', 'COMPLETED')
    GROUP BY ri.request_item_id
  `, [requestId]);
  return new Map(rows.map((row) => [Number(row.request_item_id), Number(row.returned_qty || 0)]));
}

async function create(user, payload = {}) {
  const requestId = String(payload.request_id || '').trim();
  if (!requestId) throw createError('request_id is required', 422, 'VALIDATION_ERROR');
  const itemsInput = Array.isArray(payload.items) ? payload.items : [];
  if (!itemsInput.length) throw createError('Return items are required', 422, 'RETURN_ITEMS_REQUIRED');

  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const request = await RequestService.lockRequest(connection, requestId);
    if (String(request.requester_user_id) !== String(user.id)) {
      throw createError('Only the requester can submit a return', 403, 'RETURN_REQUESTER_REQUIRED');
    }
    if (Number(request.requires_return) !== 1) {
      throw createError('This request is not returnable', 409, 'REQUEST_NOT_RETURNABLE');
    }
    if (['DRAFT', 'PENDING_DEPARTMENT_APPROVAL', 'PENDING_FINANCE_REVIEW', 'READY_FOR_WAREHOUSE', 'PICKING', 'PENDING_INVENTORY_TRANSFER', 'READY_FOR_HANDOVER', 'REJECTED', 'CANCELED'].includes(request.status)) {
      throw createError('Goods have not been received yet', 409, 'RETURN_NOT_READY');
    }

    const issued = await issuedByRequestItem(connection, requestId);
    const used = await returnedOrPendingByRequestItem(connection, requestId);
    const [requestItems] = await connection.query('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
    const byItemId = new Map(requestItems.map((row) => [Number(row.id), row]));
    const normalized = [];
    const seen = new Set();
    for (const input of itemsInput) {
      const requestItemId = Number(input.request_item_id);
      if (seen.has(requestItemId)) throw createError('Duplicate request item in return', 422, 'RETURN_ITEM_DUPLICATE');
      seen.add(requestItemId);
      const requestItem = byItemId.get(requestItemId);
      if (!requestItem) throw createError(`Request item ${requestItemId} not found`, 422, 'REQUEST_ITEM_NOT_FOUND');
      const qty = positiveNumber(input.returned_qty, 'returned_qty');
      const remaining = (issued.get(requestItemId) || 0) - (used.get(requestItemId) || 0);
      if (qty > remaining + 0.0001) {
        throw createError(`Return quantity for request item ${requestItemId} exceeds return balance`, 422, 'RETURN_QTY_EXCEEDS_BALANCE');
      }
      normalized.push({ requestItem, qty });
    }

    const now = new Date();
    const periodKey = String(now.getFullYear()).slice(-2);
    const returnNumber = await RequestService.nextNumber(connection, 'RETURN', periodKey, 'RET', 5);
    const actor = UserUtil.snapshot(user);
    const note = optionalText(payload.note, 5000);
    const [result] = await connection.query(`
      INSERT INTO returns (
        request_id, return_number, status,
        returned_by_user_id, returned_by_name, returned_at, note
      ) VALUES (?, ?, 'SUBMITTED', ?, ?, NOW(), ?)
    `, [requestId, returnNumber, actor.user_id, actor.name, note]);
    const returnId = result.insertId;
    for (const row of normalized) {
      await connection.query(`
        INSERT INTO return_items (
          return_id, request_item_id, item_code, item_name, returned_qty, condition_code
        ) VALUES (?, ?, ?, ?, ?, 'PENDING')
      `, [returnId, row.requestItem.id, row.requestItem.item_code, row.requestItem.item_name, row.qty]);
    }
    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'RETURN',
      entity_id: returnId,
      action_code: 'RETURN_SUBMITTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { return_number: returnNumber },
    });
    await connection.commit();
    return getById(user, returnId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function list(user, query = {}) {
  const db = requireDatabase();
  const warehouseAccess = await AccessService.hasModuleAccess(user, 'WAREHOUSE');
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';
  if (!warehouseAccess) {
    where += ' AND r.returned_by_user_id = ?';
    params.push(String(user.id));
  }
  if (query.status) {
    where += ' AND r.status = ?';
    params.push(String(query.status).trim().toUpperCase());
  }
  if (query.request_id) {
    where += ' AND r.request_id = ?';
    params.push(String(query.request_id));
  }
  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM returns r ${where}`, params);
  const [rows] = await db.query(`
    SELECT r.*, req.request_number, req.requester_name, req.department_name
    FROM returns r
    INNER JOIN requests req ON req.id = r.request_id
    ${where}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function getById(user, returnId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT r.*, req.requester_user_id, req.request_number
      FROM returns r
      INNER JOIN requests req ON req.id = r.request_id
      WHERE r.id = ? LIMIT 1
    `, [Number(returnId)]);
    const row = rows[0];
    if (!row) throw createError('Return not found', 404, 'RETURN_NOT_FOUND');
    const warehouseAccess = await AccessService.hasModuleAccess(user, 'WAREHOUSE', connection);
    if (String(row.requester_user_id) !== String(user.id) && !warehouseAccess) {
      throw createError('Return is not accessible', 403, 'RETURN_ACCESS_FORBIDDEN');
    }
    const [items] = await connection.query('SELECT * FROM return_items WHERE return_id = ? ORDER BY id ASC', [Number(returnId)]);
    return { ...row, items };
  } finally { connection.release(); }
}

async function receive(user, returnId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const row = await lockReturn(connection, returnId);
    if (row.status !== 'SUBMITTED') throw createError('Return is not awaiting receipt', 409, 'RETURN_NOT_SUBMITTED');
    const actor = UserUtil.snapshot(user);
    const note = optionalText(payload.note, 5000) || row.note;
    await connection.query(`
      UPDATE returns
      SET status = 'RECEIVED', received_by_user_id = ?, received_by_name = ?, note = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, note, Number(returnId)]);
    await ActivityService.log(connection, {
      request_id: row.request_id,
      entity_type: 'RETURN',
      entity_id: row.id,
      action_code: 'RETURN_RECEIVED_BY_WAREHOUSE',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
    });
    await connection.commit();
    return getById(user, returnId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function inspect(user, returnId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const row = await lockReturn(connection, returnId);
    if (row.status !== 'RECEIVED') throw createError('Return must be received before inspection', 409, 'RETURN_NOT_RECEIVED');
    const decisions = Array.isArray(payload.items) ? payload.items : [];
    const [items] = await connection.query('SELECT * FROM return_items WHERE return_id = ? FOR UPDATE', [Number(returnId)]);
    const inputMap = new Map(decisions.map((input) => [Number(input.return_item_id), input]));
    for (const item of items) {
      const input = inputMap.get(Number(item.id));
      if (!input) throw createError(`Inspection result is required for return item ${item.id}`, 422, 'RETURN_INSPECTION_REQUIRED');
      const condition = String(input.condition_code || '').trim().toUpperCase();
      if (!CONDITION_CODES.has(condition)) {
        throw createError(`condition_code must be one of: ${[...CONDITION_CODES].join(', ')}`, 422, 'RETURN_CONDITION_INVALID');
      }
      const note = optionalText(input.condition_note, 500);
      const stockReturnedQty = input.stock_returned_qty === undefined
        ? Number(item.returned_qty)
        : Number(input.stock_returned_qty);
      if (!Number.isFinite(stockReturnedQty) || stockReturnedQty < 0 || stockReturnedQty > Number(item.returned_qty)) {
        throw createError('stock_returned_qty must be between 0 and returned_qty', 422, 'STOCK_RETURNED_QTY_INVALID');
      }
      await connection.query(
        'UPDATE return_items SET condition_code = ?, condition_note = ?, stock_returned_qty = ? WHERE id = ?',
        [condition, note, stockReturnedQty, item.id]
      );
    }
    const actor = UserUtil.snapshot(user);
    const note = optionalText(payload.note, 5000) || row.note;
    await connection.query("UPDATE returns SET status = 'COMPLETED', inspected_at = NOW(), note = ? WHERE id = ?", [note, Number(returnId)]);
    await WarehouseService.refreshRequestAfterFulfillment(connection, row.request_id);
    await ActivityService.log(connection, {
      request_id: row.request_id,
      entity_type: 'RETURN',
      entity_id: row.id,
      action_code: 'RETURN_INSPECTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { status: 'COMPLETED' },
    });
    await connection.commit();
    return getById(user, returnId);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function lockReturn(connection, returnId) {
  const [rows] = await connection.query('SELECT * FROM returns WHERE id = ? LIMIT 1 FOR UPDATE', [Number(returnId)]);
  if (!rows[0]) throw createError('Return not found', 404, 'RETURN_NOT_FOUND');
  return rows[0];
}

module.exports = { create, list, getById, receive, inspect };
