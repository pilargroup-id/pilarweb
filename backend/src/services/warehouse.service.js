const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const RequestService = require('./request.service');
const UserUtil = require('../utils/user.util');
const {
  createError,
  optionalText,
  nonNegativeNumber,
  parsePositiveInt,
} = require('../utils/business.util');

async function createFromFinance(connection, requestId, actor) {
  const [existingRows] = await connection.query(
    'SELECT id FROM warehouse_fulfillments WHERE request_id = ? LIMIT 1',
    [requestId]
  );
  if (existingRows[0]) throw createError('Fulfillment already exists for this request', 409, 'FULFILLMENT_ALREADY_EXISTS');

  const [items] = await connection.query(`
    SELECT
      ri.id AS request_item_id,
      ri.item_code,
      ri.item_name,
      ri.requested_qty,
      fri.approved_qty,
      fri.rejected_qty
    FROM finance_reviews fr
    INNER JOIN finance_review_items fri ON fri.finance_review_id = fr.id
    INNER JOIN request_items ri ON ri.id = fri.request_item_id
    WHERE fr.request_id = ?
      AND fr.status = 'APPROVED'
      AND fri.decision = 'APPROVED'
      AND fri.approved_qty > 0
    ORDER BY ri.id ASC
  `, [requestId]);
  if (!items.length) throw createError('No Finance-approved items are available for fulfillment', 409, 'FULFILLMENT_ITEMS_MISSING');

  const now = new Date();
  const periodKey = String(now.getFullYear()).slice(-2);
  const fulfillmentNumber = await RequestService.nextNumber(connection, 'FULFILLMENT', periodKey, 'FUL', 5);
  const [result] = await connection.query(`
    INSERT INTO warehouse_fulfillments (
      request_id, fulfillment_number, status, created_by_user_id, created_by_name
    ) VALUES (?, ?, 'PICKING', ?, ?)
  `, [requestId, fulfillmentNumber, actor.user_id, actor.name]);

  for (const item of items) {
    await connection.query(`
      INSERT INTO warehouse_fulfillment_items (
        fulfillment_id, request_item_id, item_code, item_name,
        requested_qty_snapshot, finance_approved_qty_snapshot,
        finance_rejected_qty_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      result.insertId,
      item.request_item_id,
      item.item_code,
      item.item_name,
      item.requested_qty,
      item.approved_qty,
      item.rejected_qty,
    ]);
  }

  await connection.query("UPDATE requests SET status = 'PICKING' WHERE id = ?", [requestId]);
  await ActivityService.log(connection, {
    request_id: requestId,
    entity_type: 'FULFILLMENT',
    entity_id: result.insertId,
    action_code: 'FULFILLMENT_AUTO_CREATED',
    actor_user_id: actor.user_id,
    actor_name: actor.name,
    after: { fulfillment_number: fulfillmentNumber, status: 'PICKING', item_count: items.length },
  });
  return result.insertId;
}

async function listFulfillments(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'WAREHOUSE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (query.status) {
    const statuses = String(query.status)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    if (!statuses.length || statuses.some((s) => !['PICKING', 'READY_FOR_DELIVERY', 'HANDED_OVER'].includes(s))) {
      throw createError('Invalid fulfillment status', 422, 'FULFILLMENT_STATUS_INVALID');
    }
    where += ` AND wf.status IN (${statuses.map(() => '?').join(',')})`;
    params.push(...statuses);
  }
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ' AND (wf.fulfillment_number LIKE ? OR r.request_number LIKE ? OR r.requester_name LIKE ? OR r.request_purpose_name LIKE ?)';
    params.push(search, search, search, search);
  }

  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total
    FROM warehouse_fulfillments wf
    INNER JOIN requests r ON r.id = wf.request_id
    ${where}
  `, params);
  const [rows] = await db.query(`
    SELECT
      wf.*,
      r.request_number,
      r.request_purpose_name,
      r.requester_user_id,
      r.requester_name,
      r.department_id,
      r.department_name,
      r.reason,
      r.submitted_at,
      r.status AS request_status,
      (SELECT COUNT(*) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id = wf.id) AS item_count,
      (SELECT COALESCE(SUM(wfi.finance_approved_qty_snapshot),0) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id = wf.id) AS total_approved_qty,
      (SELECT COALESCE(SUM(wfi.finance_rejected_qty_snapshot),0) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id = wf.id) AS total_rejected_qty,
      (SELECT COALESCE(SUM(wfi.actual_qty),0) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id = wf.id) AS total_actual_qty
    FROM warehouse_fulfillments wf
    INNER JOIN requests r ON r.id = wf.request_id
    ${where}
    ORDER BY wf.updated_at DESC, wf.id DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function showFulfillment(user, fulfillmentId) {
  await AccessService.requireModuleAccess(user, 'WAREHOUSE');
  const db = requireDatabase();
  const [rows] = await db.query(`
    SELECT wf.*, r.request_number, r.requester_name, r.department_name,
           r.request_purpose_name, r.reason, r.status AS request_status
    FROM warehouse_fulfillments wf
    INNER JOIN requests r ON r.id = wf.request_id
    WHERE wf.id = ? LIMIT 1
  `, [Number(fulfillmentId)]);
  const fulfillment = rows[0];
  if (!fulfillment) throw createError('Fulfillment not found', 404, 'FULFILLMENT_NOT_FOUND');
  const [items] = await db.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id = ? ORDER BY id ASC', [fulfillment.id]);
  const [handoverRows] = await db.query('SELECT * FROM warehouse_handovers WHERE fulfillment_id = ? LIMIT 1', [fulfillment.id]);
  return { ...fulfillment, items, handover: handoverRows[0] || null };
}

async function recordPickingPrint(user, fulfillmentId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (fulfillment.status !== 'PICKING') {
      throw createError('Picking form can only be printed while fulfillment is in PICKING', 409, 'PICKING_PRINT_NOT_ALLOWED');
    }
    const actor = UserUtil.snapshot(user);
    await connection.query(`
      UPDATE warehouse_fulfillments
      SET picking_print_count = picking_print_count + 1,
          last_picking_printed_by_user_id = ?, last_picking_printed_by_name = ?,
          last_picking_printed_at = NOW()
      WHERE id = ?
    `, [actor.user_id, actor.name, fulfillment.id]);
    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'FULFILLMENT',
      entity_id: fulfillment.id,
      action_code: 'PICKING_FORM_PRINTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
    });
    await connection.commit();
    return showFulfillment(user, fulfillment.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function getSourceWarehouse(connection, code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return null;
  const [rows] = await connection.query(`
    SELECT id, code, name
    FROM warehouse_locations
    WHERE code = ? AND is_active = 1
    LIMIT 1
  `, [normalized]);
  if (!rows[0]) throw createError(`Source warehouse ${normalized} is not configured`, 422, 'SOURCE_WAREHOUSE_NOT_FOUND');
  return rows[0];
}

async function applyProgressItems(connection, fulfillment, inputs) {
  for (const input of inputs) {
    const itemId = Number(input.fulfillment_item_id);
    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw createError('fulfillment_item_id is invalid', 422, 'VALIDATION_ERROR');
    }
    const [rows] = await connection.query(
      'SELECT * FROM warehouse_fulfillment_items WHERE id = ? AND fulfillment_id = ? LIMIT 1 FOR UPDATE',
      [itemId, fulfillment.id]
    );
    const item = rows[0];
    if (!item) throw createError(`Fulfillment item ${itemId} not found`, 404, 'FULFILLMENT_ITEM_NOT_FOUND');

    let actualQty = item.actual_qty;
    if (Object.prototype.hasOwnProperty.call(input, 'actual_qty')) {
      if (input.actual_qty === null || input.actual_qty === '') actualQty = null;
      else {
        actualQty = nonNegativeNumber(input.actual_qty, 'actual_qty');
        if (actualQty > Number(item.finance_approved_qty_snapshot) + 0.0001) {
          throw createError('actual_qty cannot exceed Finance approved quantity', 422, 'ACTUAL_QTY_EXCEEDS_APPROVED');
        }
      }
    }

    let sourceWarehouseId = item.source_warehouse_id;
    let sourceWarehouseCode = item.source_warehouse_code;
    let sourceWarehouseName = item.source_warehouse_name;
    if (Object.prototype.hasOwnProperty.call(input, 'source_warehouse_code')) {
      if (input.source_warehouse_code === null || input.source_warehouse_code === '') {
        sourceWarehouseId = null;
        sourceWarehouseCode = null;
        sourceWarehouseName = null;
      } else {
        const source = await getSourceWarehouse(connection, input.source_warehouse_code);
        sourceWarehouseId = source.id;
        sourceWarehouseCode = source.code;
        sourceWarehouseName = source.name;
      }
    }

    let iwt = item.inventory_transfer_number;
    let recordedAt = item.inventory_transfer_recorded_at;
    if (Object.prototype.hasOwnProperty.call(input, 'inventory_transfer_number')) {
      const nextIwt = optionalText(input.inventory_transfer_number, 100);
      if (nextIwt) {
        iwt = nextIwt.toUpperCase();
        if (!sourceWarehouseCode) {
          throw createError('source_warehouse_code is required when inventory_transfer_number is filled', 422, 'SOURCE_WAREHOUSE_REQUIRED');
        }
        if (String(item.inventory_transfer_number || '') !== iwt) recordedAt = new Date();
      } else {
        iwt = null;
        recordedAt = null;
      }
    }

    const note = Object.prototype.hasOwnProperty.call(input, 'note')
      ? optionalText(input.note, 500)
      : item.note;

    await connection.query(`
      UPDATE warehouse_fulfillment_items
      SET actual_qty = ?,
          source_warehouse_id = ?, source_warehouse_code = ?, source_warehouse_name = ?,
          inventory_transfer_number = ?, inventory_transfer_recorded_at = ?, note = ?
      WHERE id = ?
    `, [
      actualQty,
      sourceWarehouseId, sourceWarehouseCode, sourceWarehouseName,
      iwt, recordedAt, note,
      item.id,
    ]);
  }
}

async function saveProgress(user, fulfillmentId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (fulfillment.status !== 'PICKING') {
      throw createError('Picking progress can only be saved while status is PICKING', 409, 'PICKING_PROGRESS_NOT_ALLOWED');
    }

    const inputs = Array.isArray(payload.items) ? payload.items : [];
    if (!inputs.length) throw createError('items is required', 422, 'VALIDATION_ERROR');
    await applyProgressItems(connection, fulfillment, inputs);

    const actor = UserUtil.snapshot(user);
    await connection.query(`
      UPDATE warehouse_fulfillments
      SET progress_saved_by_user_id = ?, progress_saved_by_name = ?, progress_saved_at = NOW()
      WHERE id = ?
    `, [actor.user_id, actor.name, fulfillment.id]);
    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'FULFILLMENT',
      entity_id: fulfillment.id,
      action_code: 'PICKING_PROGRESS_SAVED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { saved_item_count: inputs.length },
    });
    await connection.commit();
    return showFulfillment(user, fulfillment.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function completePicking(user, fulfillmentId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (fulfillment.status !== 'PICKING') {
      throw createError('Fulfillment is not in PICKING', 409, 'PICKING_COMPLETE_NOT_ALLOWED');
    }

    const inputs = Array.isArray(payload.items) ? payload.items : [];
    if (inputs.length) await applyProgressItems(connection, fulfillment, inputs);

    const [items] = await connection.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id = ? ORDER BY id ASC FOR UPDATE', [fulfillment.id]);
    if (!items.length) throw createError('Fulfillment has no items', 409, 'FULFILLMENT_ITEMS_MISSING');

    for (const item of items) {
      if (item.actual_qty === null || item.actual_qty === undefined) {
        throw createError(`Actual quantity is required for ${item.item_code}`, 422, 'ACTUAL_QTY_REQUIRED');
      }
      if (Number(item.actual_qty) > Number(item.finance_approved_qty_snapshot) + 0.0001) {
        throw createError(`Actual quantity exceeds Finance approval for ${item.item_code}`, 422, 'ACTUAL_QTY_EXCEEDS_APPROVED');
      }
      if (!item.source_warehouse_code) {
        throw createError(`Source warehouse is required for ${item.item_code}`, 422, 'SOURCE_WAREHOUSE_REQUIRED');
      }
      if (!item.inventory_transfer_number || !item.inventory_transfer_recorded_at) {
        throw createError(`Inventory Transfer number is required for ${item.item_code}`, 422, 'INVENTORY_TRANSFER_REQUIRED');
      }
    }

    const actor = UserUtil.snapshot(user);
    await connection.query(`
      UPDATE warehouse_fulfillments
      SET status = 'READY_FOR_DELIVERY',
          progress_saved_by_user_id = ?, progress_saved_by_name = ?, progress_saved_at = NOW(),
          picking_completed_by_user_id = ?, picking_completed_by_name = ?, picking_completed_at = NOW()
      WHERE id = ?
    `, [actor.user_id, actor.name, actor.user_id, actor.name, fulfillment.id]);
    await connection.query("UPDATE requests SET status = 'READY_FOR_DELIVERY' WHERE id = ?", [fulfillment.request_id]);
    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'FULFILLMENT',
      entity_id: fulfillment.id,
      action_code: 'PICKING_COMPLETED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { status: 'READY_FOR_DELIVERY', submitted_item_count: inputs.length || null },
    });
    await connection.commit();
    return showFulfillment(user, fulfillment.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function printDeliveryOrder(user, fulfillmentId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (!['READY_FOR_DELIVERY', 'HANDED_OVER'].includes(fulfillment.status)) {
      throw createError('Delivery Order can only be printed after picking is completed', 409, 'DO_PRINT_NOT_ALLOWED');
    }
    const actor = UserUtil.snapshot(user);
    const note = optionalText(payload.note, 500);
    const firstPrint = fulfillment.status === 'READY_FOR_DELIVERY';

    await connection.query(`
      UPDATE warehouse_fulfillments
      SET do_print_count = do_print_count + 1,
          last_do_printed_by_user_id = ?, last_do_printed_by_name = ?, last_do_printed_at = NOW()
      WHERE id = ?
    `, [actor.user_id, actor.name, fulfillment.id]);

    let handoverId = null;
    if (firstPrint) {
      const [handoverResult] = await connection.query(`
        INSERT INTO warehouse_handovers (
          request_id, fulfillment_id, status,
          handed_over_by_user_id, handed_over_by_name, handed_over_at, note
        ) VALUES (?, ?, 'HANDED_OVER', ?, ?, NOW(), ?)
      `, [fulfillment.request_id, fulfillment.id, actor.user_id, actor.name, note]);
      handoverId = handoverResult.insertId;
      await connection.query("UPDATE warehouse_fulfillments SET status = 'HANDED_OVER', completed_at = NOW() WHERE id = ?", [fulfillment.id]);
      await connection.query("UPDATE requests SET status = 'HANDED_OVER', completed_at = NOW() WHERE id = ?", [fulfillment.request_id]);
    } else {
      const [handoverRows] = await connection.query('SELECT id FROM warehouse_handovers WHERE fulfillment_id = ? LIMIT 1', [fulfillment.id]);
      handoverId = handoverRows[0]?.id || null;
    }

    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'FULFILLMENT',
      entity_id: fulfillment.id,
      action_code: firstPrint ? 'DELIVERY_ORDER_PRINTED_AND_HANDED_OVER' : 'DELIVERY_ORDER_REPRINTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { first_print: firstPrint, handover_id: handoverId, status: firstPrint ? 'HANDED_OVER' : fulfillment.status },
    });
    await connection.commit();
    return showFulfillment(user, fulfillment.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function listHandovers(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'WAREHOUSE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [];
  let where = "WHERE wh.status = 'HANDED_OVER'";
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.department_name LIKE ? OR wf.fulfillment_number LIKE ?)';
    params.push(search, search, search, search);
  }
  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total
    FROM warehouse_handovers wh
    INNER JOIN warehouse_fulfillments wf ON wf.id = wh.fulfillment_id
    INNER JOIN requests r ON r.id = wh.request_id
    ${where}
  `, params);
  const [rows] = await db.query(`
    SELECT
      wh.id AS handover_id,
      wh.status AS handover_status,
      wh.handed_over_by_user_id,
      wh.handed_over_by_name,
      wh.handed_over_at,
      wh.note,
      r.id AS request_id,
      r.request_number,
      r.request_purpose_name,
      r.requester_user_id,
      r.requester_name,
      r.department_id,
      r.department_name,
      r.status AS request_status,
      wf.id AS fulfillment_id,
      wf.fulfillment_number,
      wf.do_print_count,
      wf.last_do_printed_at,
      (SELECT COUNT(*) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id = wf.id) AS item_count,
      (SELECT COALESCE(SUM(wfi.actual_qty),0) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id = wf.id) AS total_actual_qty
    FROM warehouse_handovers wh
    INNER JOIN warehouse_fulfillments wf ON wf.id = wh.fulfillment_id
    INNER JOIN requests r ON r.id = wh.request_id
    ${where}
    ORDER BY wh.handed_over_at DESC, wh.id DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function lockFulfillment(connection, fulfillmentId) {
  const [rows] = await connection.query('SELECT * FROM warehouse_fulfillments WHERE id = ? LIMIT 1 FOR UPDATE', [Number(fulfillmentId)]);
  if (!rows[0]) throw createError('Fulfillment not found', 404, 'FULFILLMENT_NOT_FOUND');
  return rows[0];
}

module.exports = {
  createFromFinance,
  listFulfillments,
  showFulfillment,
  recordPickingPrint,
  saveProgress,
  completePicking,
  printDeliveryOrder,
  listHandovers,
};
