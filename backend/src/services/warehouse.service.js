const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const RequestService = require('./request.service');
const UserUtil = require('../utils/user.util');
const {
  createError,
  optionalText,
  nonNegativeNumber,
  positiveNumber,
  parsePositiveInt,
  normalizeDate,
} = require('../utils/business.util');

const SHORTAGE_REASONS = new Set(['STOCK_SHORTAGE', 'DAMAGED', 'NOT_FOUND', 'OTHER']);
const REMAINDER_DISPOSITIONS = new Set(['NONE', 'BACKORDER_REMAINDER', 'CLOSE_SHORT']);

async function listQueue(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'WAREHOUSE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const statuses = ['READY_FOR_WAREHOUSE', 'PICKING', 'PENDING_INVENTORY_TRANSFER', 'READY_FOR_HANDOVER', 'HANDED_OVER', 'PARTIALLY_FULFILLED'];
  const placeholders = statuses.map(() => '?').join(',');
  const params = [...statuses];
  let where = `WHERE r.status IN (${placeholders})`;
  if (query.status) {
    where += ' AND r.status = ?';
    params.push(String(query.status).trim().toUpperCase());
  }
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.request_purpose_name LIKE ?)';
    params.push(search, search, search);
  }
  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM requests r ${where}`, params);
  const [rows] = await db.query(`
    SELECT r.*,
      (
        SELECT COALESCE(SUM(fri.rejected_qty), 0)
        FROM finance_reviews fr
        INNER JOIN finance_review_items fri ON fri.finance_review_id = fr.id
        WHERE fr.request_id = r.id
      ) AS total_rejected_qty
    FROM requests r
    ${where}
    ORDER BY r.updated_at ASC, r.created_at ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function listHandovers(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'WAREHOUSE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1 = 1';

  if (query.status) {
    const status = String(query.status).trim().toUpperCase();
    if (!['PENDING', 'HANDED_OVER', 'RECEIVED'].includes(status)) {
      throw createError('Invalid handover status', 422, 'HANDOVER_STATUS_INVALID');
    }
    where += ' AND wh.status = ?';
    params.push(status);
  }

  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ` AND (
      r.request_number LIKE ?
      OR r.requester_name LIKE ?
      OR r.department_name LIKE ?
      OR wf.fulfillment_number LIKE ?
      OR wh.handed_over_by_name LIKE ?
      OR wh.received_by_name LIKE ?
    )`;
    params.push(search, search, search, search, search, search);
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
      wh.received_by_user_id,
      wh.received_by_name,
      wh.received_at,
      wh.note,
      wh.created_at,
      wh.updated_at,
      r.id AS request_id,
      r.request_number,
      r.request_purpose_id,
      r.request_purpose_code,
      r.request_purpose_name,
      r.requester_user_id,
      r.requester_name,
      r.department_id,
      r.department_name,
      r.requires_return,
      r.return_due_date,
      r.status AS request_status,
      wf.id AS fulfillment_id,
      wf.fulfillment_number,
      wf.status AS fulfillment_status,
      (
        SELECT COUNT(*)
        FROM warehouse_fulfillment_items wfi
        WHERE wfi.fulfillment_id = wf.id
      ) AS item_count,
      (
        SELECT COALESCE(SUM(wfi.actual_qty), 0)
        FROM warehouse_fulfillment_items wfi
        WHERE wfi.fulfillment_id = wf.id
      ) AS total_actual_qty,
      (
        SELECT COALESCE(SUM(fri.rejected_qty), 0)
        FROM finance_reviews fr
        INNER JOIN finance_review_items fri ON fri.finance_review_id = fr.id
        WHERE fr.request_id = r.id
      ) AS total_rejected_qty
    FROM warehouse_handovers wh
    INNER JOIN warehouse_fulfillments wf ON wf.id = wh.fulfillment_id
    INNER JOIN requests r ON r.id = wh.request_id
    ${where}
    ORDER BY COALESCE(wh.handed_over_at, wh.created_at) DESC, wh.id DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const total = Number(countRows[0]?.total || 0);
  return {
    data: rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function show(user, requestId) {
  await AccessService.requireModuleAccess(user, 'WAREHOUSE');
  return RequestService.getById(requestId, user);
}

async function approvedQtyByRequestItem(connection, requestId) {
  const [rows] = await connection.query(`
    SELECT fri.request_item_id, COALESCE(fri.approved_qty, 0) AS approved_qty
    FROM finance_reviews fr
    INNER JOIN finance_review_items fri ON fri.finance_review_id = fr.id
    WHERE fr.request_id = ? AND fr.status = 'APPROVED' AND fri.decision = 'APPROVED'
  `, [requestId]);
  return new Map(rows.map((row) => [Number(row.request_item_id), Number(row.approved_qty || 0)]));
}

async function resolvedQtyByRequestItem(connection, requestId) {
  const [rows] = await connection.query(`
    SELECT
      wfi.request_item_id,
      SUM(
        COALESCE(wfi.actual_qty, 0)
        + CASE WHEN wfi.remainder_disposition = 'CLOSE_SHORT' THEN COALESCE(wfi.shortage_qty, 0) ELSE 0 END
      ) AS resolved_qty,
      SUM(COALESCE(wfi.actual_qty, 0)) AS actual_qty
    FROM warehouse_fulfillment_items wfi
    INNER JOIN warehouse_fulfillments wf ON wf.id = wfi.fulfillment_id
    WHERE wf.request_id = ?
      AND wf.status <> 'CANCELED'
    GROUP BY wfi.request_item_id
  `, [requestId]);
  return new Map(rows.map((row) => [Number(row.request_item_id), {
    resolved_qty: Number(row.resolved_qty || 0),
    actual_qty: Number(row.actual_qty || 0),
  }]));
}

async function accept(user, requestId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const request = await RequestService.lockRequest(connection, requestId);
    if (!['READY_FOR_WAREHOUSE', 'PARTIALLY_FULFILLED'].includes(request.status)) {
      throw createError('Request is not ready for Warehouse acceptance', 409, 'WAREHOUSE_ACCEPT_NOT_ALLOWED');
    }

    const approved = await approvedQtyByRequestItem(connection, requestId);
    const resolved = await resolvedQtyByRequestItem(connection, requestId);
    const [requestItems] = await connection.query("SELECT * FROM request_items WHERE request_id = ? AND status = 'ACTIVE' ORDER BY id ASC", [requestId]);
    const remainingItems = requestItems
      .map((item) => {
        const approvedQty = approved.get(Number(item.id)) || 0;
        const resolvedQty = resolved.get(Number(item.id))?.resolved_qty || 0;
        return { item, approvedQty, remainingQty: Math.max(0, approvedQty - resolvedQty) };
      })
      .filter((row) => row.remainingQty > 0);

    if (!remainingItems.length) {
      throw createError('No remaining approved quantity is available for fulfillment', 409, 'WAREHOUSE_NOTHING_TO_FULFILL');
    }

    const now = new Date();
    const periodKey = String(now.getFullYear()).slice(-2);
    const fulfillmentNumber = await RequestService.nextNumber(connection, 'FULFILLMENT', periodKey, 'FUL', 5);
    const actor = UserUtil.snapshot(user);
    const [result] = await connection.query(`
      INSERT INTO warehouse_fulfillments (
        request_id, fulfillment_number, status,
        accepted_by_user_id, accepted_by_name, accepted_at
      ) VALUES (?, ?, 'PICKING', ?, ?, NOW())
    `, [requestId, fulfillmentNumber, actor.user_id, actor.name]);
    const fulfillmentId = result.insertId;

    for (const row of remainingItems) {
      await connection.query(`
        INSERT INTO warehouse_fulfillment_items (
          fulfillment_id, request_item_id, item_code, item_name,
          requested_qty_snapshot, finance_approved_qty_snapshot,
          actual_qty, shortage_qty, remainder_disposition
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'NONE')
      `, [
        fulfillmentId,
        row.item.id,
        row.item.item_code,
        row.item.item_name,
        row.item.requested_qty,
        row.remainingQty,
      ]);
    }

    await connection.query("UPDATE requests SET status = 'PICKING' WHERE id = ?", [requestId]);
    await ActivityService.log(connection, {
      request_id: requestId,
      entity_type: 'FULFILLMENT',
      entity_id: fulfillmentId,
      action_code: 'WAREHOUSE_ACCEPTED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { fulfillment_number: fulfillmentNumber, status: 'PICKING' },
    });
    await connection.commit();
    return RequestService.getById(requestId, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function recordPrint(user, fulfillmentId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (!['PICKING', 'PENDING_INVENTORY_TRANSFER', 'READY_FOR_HANDOVER'].includes(fulfillment.status)) {
      throw createError('Fulfillment cannot be printed in current status', 409, 'FULFILLMENT_PRINT_NOT_ALLOWED');
    }
    await connection.query(`
      UPDATE warehouse_fulfillments
      SET print_count = print_count + 1,
          last_printed_by_user_id = ?,
          last_printed_by_name = ?,
          last_printed_at = NOW()
      WHERE id = ?
    `, [user.id, user.name, Number(fulfillmentId)]);
    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'FULFILLMENT',
      entity_id: fulfillment.id,
      action_code: 'PICKING_DOCUMENT_PRINTED',
      actor_user_id: user.id,
      actor_name: user.name,
    });
    await connection.commit();
    return { fulfillment_id: Number(fulfillmentId), printed: true };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function updateItem(user, fulfillmentId, fulfillmentItemId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (fulfillment.status !== 'PICKING') {
      throw createError('Actual quantity can only be changed while picking', 409, 'FULFILLMENT_NOT_PICKING');
    }
    const [rows] = await connection.query(`
      SELECT * FROM warehouse_fulfillment_items
      WHERE id = ? AND fulfillment_id = ?
      LIMIT 1 FOR UPDATE
    `, [Number(fulfillmentItemId), Number(fulfillmentId)]);
    const item = rows[0];
    if (!item) throw createError('Fulfillment item not found', 404, 'FULFILLMENT_ITEM_NOT_FOUND');

    const actualQty = nonNegativeNumber(payload.actual_qty, 'actual_qty');
    const maxQty = Number(item.finance_approved_qty_snapshot || 0);
    if (actualQty > maxQty) {
      throw createError('actual_qty cannot exceed remaining Finance approved quantity', 422, 'ACTUAL_QTY_EXCEEDS_APPROVED');
    }
    const shortageQty = Math.max(0, maxQty - actualQty);
    let reason = payload.shortage_reason_code ? String(payload.shortage_reason_code).trim().toUpperCase() : null;
    let disposition = payload.remainder_disposition ? String(payload.remainder_disposition).trim().toUpperCase() : 'NONE';
    const shortageNote = optionalText(payload.shortage_note, 500);

    if (shortageQty > 0) {
      if (!SHORTAGE_REASONS.has(reason)) {
        throw createError(`shortage_reason_code must be one of: ${[...SHORTAGE_REASONS].join(', ')}`, 422, 'SHORTAGE_REASON_REQUIRED');
      }
      if (!['BACKORDER_REMAINDER', 'CLOSE_SHORT'].includes(disposition)) {
        throw createError('remainder_disposition must be BACKORDER_REMAINDER or CLOSE_SHORT when shortage exists', 422, 'SHORTAGE_DISPOSITION_REQUIRED');
      }
    } else {
      reason = null;
      disposition = 'NONE';
    }
    if (!REMAINDER_DISPOSITIONS.has(disposition)) {
      throw createError('Invalid remainder_disposition', 422, 'SHORTAGE_DISPOSITION_INVALID');
    }

    await connection.query(`
      UPDATE warehouse_fulfillment_items
      SET actual_qty = ?, shortage_qty = ?, shortage_reason_code = ?, shortage_note = ?, remainder_disposition = ?
      WHERE id = ?
    `, [actualQty, shortageQty, reason, shortageNote, disposition, Number(fulfillmentItemId)]);

    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'FULFILLMENT_ITEM',
      entity_id: fulfillmentItemId,
      action_code: 'ACTUAL_QTY_UPDATED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: item,
      after: { actual_qty: actualQty, shortage_qty: shortageQty, shortage_reason_code: reason, remainder_disposition: disposition },
    });
    await connection.commit();
    return RequestService.getById(fulfillment.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function confirmPicking(user, fulfillmentId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (fulfillment.status !== 'PICKING') {
      throw createError('Fulfillment is not in PICKING status', 409, 'FULFILLMENT_NOT_PICKING');
    }
    const [items] = await connection.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id = ? ORDER BY id ASC FOR UPDATE', [Number(fulfillmentId)]);
    if (!items.length) throw createError('Fulfillment has no items', 409, 'FULFILLMENT_ITEMS_MISSING');

    for (const item of items) {
      const maxQty = Number(item.finance_approved_qty_snapshot || 0);
      const actual = Number(item.actual_qty || 0);
      const shortage = Number(item.shortage_qty || 0);
      if (Math.abs((actual + shortage) - maxQty) > 0.0001) {
        throw createError(`Fulfillment item ${item.id} quantity is incomplete`, 422, 'FULFILLMENT_QTY_INCOMPLETE');
      }
      if (shortage > 0 && !['BACKORDER_REMAINDER', 'CLOSE_SHORT'].includes(item.remainder_disposition)) {
        throw createError(`Fulfillment item ${item.id} shortage disposition is required`, 422, 'SHORTAGE_DISPOSITION_REQUIRED');
      }
    }

    const totalActual = items.reduce((sum, row) => sum + Number(row.actual_qty || 0), 0);
    const actor = UserUtil.snapshot(user);
    if (totalActual > 0) {
      await connection.query(`
        UPDATE warehouse_fulfillments
        SET status = 'PENDING_INVENTORY_TRANSFER', picked_by_user_id = ?, picked_by_name = ?, picked_at = NOW()
        WHERE id = ?
      `, [actor.user_id, actor.name, Number(fulfillmentId)]);
      await connection.query("UPDATE requests SET status = 'PENDING_INVENTORY_TRANSFER' WHERE id = ?", [fulfillment.request_id]);
    } else {
      await connection.query(`
        UPDATE warehouse_fulfillments
        SET status = 'COMPLETED', picked_by_user_id = ?, picked_by_name = ?, picked_at = NOW(), completed_at = NOW()
        WHERE id = ?
      `, [actor.user_id, actor.name, Number(fulfillmentId)]);
      await refreshRequestAfterFulfillment(connection, fulfillment.request_id);
    }

    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'FULFILLMENT',
      entity_id: fulfillment.id,
      action_code: 'PICKING_CONFIRMED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { total_actual_qty: totalActual, status: totalActual > 0 ? 'PENDING_INVENTORY_TRANSFER' : 'COMPLETED' },
    });
    await connection.commit();
    return RequestService.getById(fulfillment.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function addInventoryTransfer(user, fulfillmentId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (!['PENDING_INVENTORY_TRANSFER', 'READY_FOR_HANDOVER'].includes(fulfillment.status)) {
      throw createError('Inventory Transfer cannot be added in current fulfillment status', 409, 'INVENTORY_TRANSFER_NOT_ALLOWED');
    }

    const itNumber = String(payload.inventory_transfer_number || '').trim().toUpperCase();
    if (!itNumber) throw createError('inventory_transfer_number is required', 422, 'INVENTORY_TRANSFER_NUMBER_REQUIRED');
    if (itNumber.length > 100) throw createError('inventory_transfer_number cannot exceed 100 characters', 422, 'VALIDATION_ERROR');
    const sourceCode = String(payload.source_warehouse_code || '').trim().toUpperCase();
    if (!sourceCode) throw createError('source_warehouse_code is required', 422, 'SOURCE_WAREHOUSE_REQUIRED');
    const transferDate = normalizeDate(payload.transfer_date, 'transfer_date', false);
    const note = optionalText(payload.note, 500);

    const [sourceRows] = await connection.query('SELECT * FROM warehouse_locations WHERE code = ? AND is_active = 1 LIMIT 1', [sourceCode]);
    const source = sourceRows[0];
    if (!source || Number(source.is_loan_warehouse) === 1) {
      throw createError('Source warehouse is invalid', 422, 'SOURCE_WAREHOUSE_INVALID');
    }
    const [loanRows] = await connection.query('SELECT * FROM warehouse_locations WHERE is_loan_warehouse = 1 AND is_active = 1 ORDER BY id ASC LIMIT 1');
    const loan = loanRows[0];
    if (!loan) throw createError('Loan warehouse is not configured', 422, 'LOAN_WAREHOUSE_MISSING');

    const transferItems = Array.isArray(payload.items) ? payload.items : [];
    if (!transferItems.length) throw createError('Inventory Transfer items are required', 422, 'INVENTORY_TRANSFER_ITEMS_REQUIRED');

    const [fulfillmentItems] = await connection.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id = ? FOR UPDATE', [Number(fulfillmentId)]);
    const byId = new Map(fulfillmentItems.map((row) => [Number(row.id), row]));
    const [coverageRows] = await connection.query(`
      SELECT witi.fulfillment_item_id, SUM(witi.transferred_qty) AS transferred_qty
      FROM warehouse_inventory_transfer_items witi
      INNER JOIN warehouse_inventory_transfers wit ON wit.id = witi.inventory_transfer_id
      WHERE wit.fulfillment_id = ?
      GROUP BY witi.fulfillment_item_id
    `, [Number(fulfillmentId)]);
    const existingCoverage = new Map(coverageRows.map((row) => [Number(row.fulfillment_item_id), Number(row.transferred_qty || 0)]));

    const normalizedItems = [];
    const seen = new Set();
    for (const input of transferItems) {
      const itemId = Number(input.fulfillment_item_id);
      if (seen.has(itemId)) throw createError('Duplicate fulfillment item in Inventory Transfer', 422, 'INVENTORY_TRANSFER_ITEM_DUPLICATE');
      seen.add(itemId);
      const fulfillmentItem = byId.get(itemId);
      if (!fulfillmentItem) throw createError(`Fulfillment item ${itemId} not found`, 422, 'FULFILLMENT_ITEM_NOT_FOUND');
      const qty = positiveNumber(input.transferred_qty, 'transferred_qty');
      const remainingCoverage = Number(fulfillmentItem.actual_qty || 0) - (existingCoverage.get(itemId) || 0);
      if (qty > remainingCoverage + 0.0001) {
        throw createError(`Transferred quantity for fulfillment item ${itemId} exceeds uncovered actual quantity`, 422, 'TRANSFER_QTY_EXCEEDS_ACTUAL');
      }
      normalizedItems.push({ fulfillmentItem, qty });
    }

    const actor = UserUtil.snapshot(user);
    const [result] = await connection.query(`
      INSERT INTO warehouse_inventory_transfers (
        fulfillment_id, inventory_transfer_number,
        source_warehouse_id, source_warehouse_code, source_warehouse_name,
        destination_warehouse_id, destination_warehouse_code, destination_warehouse_name,
        transfer_date, recorded_by_user_id, recorded_by_name, recorded_at, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `, [
      Number(fulfillmentId), itNumber,
      source.id, source.code, source.name,
      loan.id, loan.code, loan.name,
      transferDate, actor.user_id, actor.name, note,
    ]);
    const transferId = result.insertId;
    for (const row of normalizedItems) {
      await connection.query(`
        INSERT INTO warehouse_inventory_transfer_items (
          inventory_transfer_id, fulfillment_item_id, item_code, transferred_qty
        ) VALUES (?, ?, ?, ?)
      `, [transferId, row.fulfillmentItem.id, row.fulfillmentItem.item_code, row.qty]);
    }

    const fullyCovered = await isFulfillmentTransferCovered(connection, fulfillmentId);
    if (fullyCovered) {
      await connection.query("UPDATE warehouse_fulfillments SET status = 'READY_FOR_HANDOVER' WHERE id = ?", [Number(fulfillmentId)]);
      await connection.query("UPDATE requests SET status = 'READY_FOR_HANDOVER' WHERE id = ?", [fulfillment.request_id]);
    }

    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'INVENTORY_TRANSFER',
      entity_id: transferId,
      action_code: 'INVENTORY_TRANSFER_RECORDED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { inventory_transfer_number: itNumber, source_warehouse_code: source.code, destination_warehouse_code: loan.code, fully_covered: fullyCovered },
    });
    await connection.commit();
    return RequestService.getById(fulfillment.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function updateInventoryTransfer(user, transferId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const [rows] = await connection.query(`
      SELECT wit.*, wf.request_id, wf.status AS fulfillment_status
      FROM warehouse_inventory_transfers wit
      INNER JOIN warehouse_fulfillments wf ON wf.id = wit.fulfillment_id
      WHERE wit.id = ? LIMIT 1 FOR UPDATE
    `, [Number(transferId)]);
    const transfer = rows[0];
    if (!transfer) throw createError('Inventory Transfer not found', 404, 'INVENTORY_TRANSFER_NOT_FOUND');
    if (!['PENDING_INVENTORY_TRANSFER', 'READY_FOR_HANDOVER'].includes(transfer.fulfillment_status)) {
      throw createError('Inventory Transfer can no longer be edited', 409, 'INVENTORY_TRANSFER_EDIT_NOT_ALLOWED');
    }

    const itNumber = payload.inventory_transfer_number !== undefined
      ? String(payload.inventory_transfer_number || '').trim().toUpperCase()
      : transfer.inventory_transfer_number;
    if (!itNumber) throw createError('inventory_transfer_number is required', 422, 'INVENTORY_TRANSFER_NUMBER_REQUIRED');
    const sourceCode = payload.source_warehouse_code !== undefined
      ? String(payload.source_warehouse_code || '').trim().toUpperCase()
      : transfer.source_warehouse_code;
    const [sourceRows] = await connection.query('SELECT * FROM warehouse_locations WHERE code = ? AND is_active = 1 LIMIT 1', [sourceCode]);
    const source = sourceRows[0];
    if (!source || Number(source.is_loan_warehouse) === 1) throw createError('Source warehouse is invalid', 422, 'SOURCE_WAREHOUSE_INVALID');
    const transferDate = payload.transfer_date !== undefined
      ? normalizeDate(payload.transfer_date, 'transfer_date', false)
      : transfer.transfer_date;
    const note = payload.note !== undefined ? optionalText(payload.note, 500) : transfer.note;

    await connection.query(`
      UPDATE warehouse_inventory_transfers
      SET inventory_transfer_number = ?, source_warehouse_id = ?, source_warehouse_code = ?,
          source_warehouse_name = ?, transfer_date = ?, note = ?
      WHERE id = ?
    `, [itNumber, source.id, source.code, source.name, transferDate, note, Number(transferId)]);

    await ActivityService.log(connection, {
      request_id: transfer.request_id,
      entity_type: 'INVENTORY_TRANSFER',
      entity_id: transfer.id,
      action_code: 'INVENTORY_TRANSFER_UPDATED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: { inventory_transfer_number: transfer.inventory_transfer_number, source_warehouse_code: transfer.source_warehouse_code },
      after: { inventory_transfer_number: itNumber, source_warehouse_code: source.code },
    });
    await connection.commit();
    return RequestService.getById(transfer.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function deleteInventoryTransfer(user, transferId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const [rows] = await connection.query(`
      SELECT wit.*, wf.request_id, wf.status AS fulfillment_status
      FROM warehouse_inventory_transfers wit
      INNER JOIN warehouse_fulfillments wf ON wf.id = wit.fulfillment_id
      WHERE wit.id = ? LIMIT 1 FOR UPDATE
    `, [Number(transferId)]);
    const transfer = rows[0];
    if (!transfer) throw createError('Inventory Transfer not found', 404, 'INVENTORY_TRANSFER_NOT_FOUND');
    if (!['PENDING_INVENTORY_TRANSFER', 'READY_FOR_HANDOVER'].includes(transfer.fulfillment_status)) {
      throw createError('Inventory Transfer can no longer be deleted', 409, 'INVENTORY_TRANSFER_DELETE_NOT_ALLOWED');
    }
    await connection.query('DELETE FROM warehouse_inventory_transfer_items WHERE inventory_transfer_id = ?', [transfer.id]);
    await connection.query('DELETE FROM warehouse_inventory_transfers WHERE id = ?', [transfer.id]);
    const covered = await isFulfillmentTransferCovered(connection, transfer.fulfillment_id);
    const fulfillmentStatus = covered ? 'READY_FOR_HANDOVER' : 'PENDING_INVENTORY_TRANSFER';
    await connection.query('UPDATE warehouse_fulfillments SET status = ? WHERE id = ?', [fulfillmentStatus, transfer.fulfillment_id]);
    await connection.query('UPDATE requests SET status = ? WHERE id = ?', [fulfillmentStatus, transfer.request_id]);
    await ActivityService.log(connection, {
      request_id: transfer.request_id,
      entity_type: 'INVENTORY_TRANSFER',
      entity_id: transfer.id,
      action_code: 'INVENTORY_TRANSFER_DELETED',
      actor_user_id: user.id,
      actor_name: user.name,
      before: { inventory_transfer_number: transfer.inventory_transfer_number },
    });
    await connection.commit();
    return RequestService.getById(transfer.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function handover(user, fulfillmentId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'WAREHOUSE', connection);
    const fulfillment = await lockFulfillment(connection, fulfillmentId);
    if (fulfillment.status !== 'READY_FOR_HANDOVER') {
      throw createError('Fulfillment is not ready for handover', 409, 'HANDOVER_NOT_READY');
    }
    if (!(await isFulfillmentTransferCovered(connection, fulfillmentId))) {
      throw createError('All actual quantities must be covered by Inventory Transfer records before handover', 409, 'INVENTORY_TRANSFER_COVERAGE_INCOMPLETE');
    }
    const [existing] = await connection.query('SELECT id FROM warehouse_handovers WHERE fulfillment_id = ? LIMIT 1', [Number(fulfillmentId)]);
    if (existing[0]) throw createError('Handover already exists for this fulfillment', 409, 'HANDOVER_ALREADY_EXISTS');

    const actor = UserUtil.snapshot(user);
    const note = optionalText(payload.note, 500);
    const [result] = await connection.query(`
      INSERT INTO warehouse_handovers (
        request_id, fulfillment_id, status,
        handed_over_by_user_id, handed_over_by_name, handed_over_at, note
      ) VALUES (?, ?, 'HANDED_OVER', ?, ?, NOW(), ?)
    `, [fulfillment.request_id, Number(fulfillmentId), actor.user_id, actor.name, note]);
    await connection.query("UPDATE warehouse_fulfillments SET status = 'HANDED_OVER' WHERE id = ?", [Number(fulfillmentId)]);
    await connection.query("UPDATE requests SET status = 'HANDED_OVER' WHERE id = ?", [fulfillment.request_id]);
    await ActivityService.log(connection, {
      request_id: fulfillment.request_id,
      entity_type: 'HANDOVER',
      entity_id: result.insertId,
      action_code: 'GOODS_HANDED_OVER',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
    });
    await connection.commit();
    return RequestService.getById(fulfillment.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function receiveHandover(user, handoverId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(`
      SELECT wh.*, r.requester_user_id
      FROM warehouse_handovers wh
      INNER JOIN requests r ON r.id = wh.request_id
      WHERE wh.id = ? LIMIT 1 FOR UPDATE
    `, [Number(handoverId)]);
    const handover = rows[0];
    if (!handover) throw createError('Handover not found', 404, 'HANDOVER_NOT_FOUND');
    const isRequester = String(handover.requester_user_id) === String(user.id);
    const isWarehouse = await AccessService.hasModuleAccess(user, 'WAREHOUSE', connection);
    if (!isRequester && !isWarehouse) {
      throw createError('Only the requester or Warehouse can confirm receipt', 403, 'HANDOVER_RECEIVE_FORBIDDEN');
    }
    if (handover.status !== 'HANDED_OVER') {
      throw createError('Handover has already been confirmed', 409, 'HANDOVER_ALREADY_RECEIVED');
    }
    const actor = UserUtil.snapshot(user);
    const note = optionalText(payload.note, 500) || handover.note;
    await connection.query(`
      UPDATE warehouse_handovers
      SET status = 'RECEIVED', received_by_user_id = ?, received_by_name = ?, received_at = NOW(), note = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, note, Number(handoverId)]);
    await connection.query("UPDATE warehouse_fulfillments SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?", [handover.fulfillment_id]);
    await refreshRequestAfterFulfillment(connection, handover.request_id);
    await ActivityService.log(connection, {
      request_id: handover.request_id,
      entity_type: 'HANDOVER',
      entity_id: handover.id,
      action_code: 'GOODS_RECEIVED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
    });
    await connection.commit();
    return RequestService.getById(handover.request_id, user);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function refreshRequestAfterFulfillment(connection, requestId) {
  const [requestRows] = await connection.query('SELECT * FROM requests WHERE id = ? LIMIT 1 FOR UPDATE', [requestId]);
  const request = requestRows[0];
  if (!request) return;
  const approved = await approvedQtyByRequestItem(connection, requestId);
  const resolved = await resolvedQtyByRequestItem(connection, requestId);
  let unresolved = 0;
  let issued = 0;
  for (const [itemId, approvedQty] of approved.entries()) {
    const row = resolved.get(itemId) || { resolved_qty: 0, actual_qty: 0 };
    unresolved += Math.max(0, approvedQty - row.resolved_qty);
    issued += row.actual_qty;
  }

  if (unresolved > 0.0001) {
    await connection.query("UPDATE requests SET status = 'PARTIALLY_FULFILLED' WHERE id = ?", [requestId]);
    return;
  }

  if (Number(request.requires_return) === 1 && issued > 0) {
    const returnStats = await returnStatsForRequest(connection, requestId);
    const status = returnStats.returned_qty <= 0
      ? 'RETURN_PENDING'
      : returnStats.returned_qty + 0.0001 >= issued
        ? 'COMPLETED'
        : 'PARTIALLY_RETURNED';
    await connection.query(
      `UPDATE requests SET status = ?, completed_at = CASE WHEN ? = 'COMPLETED' THEN NOW() ELSE NULL END WHERE id = ?`,
      [status, status, requestId]
    );
  } else {
    await connection.query("UPDATE requests SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?", [requestId]);
  }
}

async function returnStatsForRequest(connection, requestId) {
  const [rows] = await connection.query(`
    SELECT COALESCE(SUM(ri.returned_qty), 0) AS returned_qty
    FROM returns r
    INNER JOIN return_items ri ON ri.return_id = r.id
    WHERE r.request_id = ? AND r.status = 'COMPLETED'
  `, [requestId]);
  return { returned_qty: Number(rows[0]?.returned_qty || 0) };
}

async function isFulfillmentTransferCovered(connection, fulfillmentId) {
  const [rows] = await connection.query(`
    SELECT
      wfi.id,
      wfi.actual_qty,
      COALESCE(SUM(witi.transferred_qty), 0) AS transferred_qty
    FROM warehouse_fulfillment_items wfi
    LEFT JOIN warehouse_inventory_transfer_items witi ON witi.fulfillment_item_id = wfi.id
    WHERE wfi.fulfillment_id = ?
    GROUP BY wfi.id, wfi.actual_qty
  `, [Number(fulfillmentId)]);
  return rows.every((row) => Math.abs(Number(row.actual_qty || 0) - Number(row.transferred_qty || 0)) <= 0.0001);
}

async function lockFulfillment(connection, fulfillmentId) {
  const [rows] = await connection.query('SELECT * FROM warehouse_fulfillments WHERE id = ? LIMIT 1 FOR UPDATE', [Number(fulfillmentId)]);
  if (!rows[0]) throw createError('Fulfillment not found', 404, 'FULFILLMENT_NOT_FOUND');
  return rows[0];
}

module.exports = {
  listQueue,
  listHandovers,
  show,
  accept,
  recordPrint,
  updateItem,
  confirmPicking,
  addInventoryTransfer,
  updateInventoryTransfer,
  deleteInventoryTransfer,
  handover,
  receiveHandover,
  refreshRequestAfterFulfillment,
  returnStatsForRequest,
};
