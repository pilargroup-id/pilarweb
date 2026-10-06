const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const RequestService = require('./request.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, parsePositiveInt } = require('../utils/business.util');

function parsePeriodKey(value) {
  const key = String(value || '').trim();
  if (!/^\d{4}-\d{2}$/.test(key)) {
    throw createError('period_key must use YYYY-MM format', 422, 'PERIOD_KEY_INVALID');
  }
  const [yearText, monthText] = key.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (month < 1 || month > 12) throw createError('period_key month is invalid', 422, 'PERIOD_KEY_INVALID');
  return { key, year, month };
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function periodDates(year, month, closingDay) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const closingMonthStart = new Date(Date.UTC(year, month, 1));
  const closingMonthEnd = new Date(Date.UTC(year, month + 1, 0));
  const day = Math.min(Math.max(1, Number(closingDay)), closingMonthEnd.getUTCDate());
  const closing = new Date(Date.UTC(closingMonthStart.getUTCFullYear(), closingMonthStart.getUTCMonth(), day));
  return { start: ymd(start), end: ymd(end), closing: ymd(closing) };
}

async function listPeriods(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 20, 100);
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';
  if (query.status) {
    where += ' AND status = ?';
    params.push(String(query.status).trim().toUpperCase());
  }
  const [countRows] = await db.query(`SELECT COUNT(*) AS total FROM financial_periods ${where}`, params);
  const [rows] = await db.query(`SELECT * FROM financial_periods ${where} ORDER BY period_start DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function createPeriod(user, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'FINANCE', connection);
    const parsed = parsePeriodKey(payload.period_key);
    const [settings] = await connection.query(`
      SELECT closing_day FROM financial_closing_settings
      WHERE is_active = 1 ORDER BY id DESC LIMIT 1
    `);
    if (!settings[0]) throw createError('Financial closing settings are not configured', 422, 'CLOSING_SETTINGS_MISSING');
    const dates = periodDates(parsed.year, parsed.month, settings[0].closing_day);
    await connection.query(`
      INSERT INTO financial_periods (period_key, period_start, period_end, closing_date, status)
      VALUES (?, ?, ?, ?, 'OPEN')
    `, [parsed.key, dates.start, dates.end, dates.closing]);
    await connection.commit();
    return getPeriod(user, parsed.key);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function getPeriod(user, periodKeyOrId) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  const db = requireDatabase();
  const isId = /^\d+$/.test(String(periodKeyOrId));
  const [rows] = await db.query(`SELECT * FROM financial_periods WHERE ${isId ? 'id' : 'period_key'} = ? LIMIT 1`, [periodKeyOrId]);
  if (!rows[0]) throw createError('Financial period not found', 404, 'FINANCIAL_PERIOD_NOT_FOUND');
  const period = rows[0];
  const [batches] = await db.query('SELECT * FROM inventory_adjustment_batches WHERE financial_period_id = ? ORDER BY id DESC', [period.id]);
  for (const batch of batches) {
    const [items] = await db.query('SELECT * FROM inventory_adjustment_batch_items WHERE batch_id = ? ORDER BY request_number, item_code, id', [batch.id]);
    batch.items = items;
  }
  return { ...period, batches };
}

async function startClosing(user, periodId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'FINANCE', connection);
    const period = await lockPeriod(connection, periodId);
    if (period.status !== 'OPEN') throw createError('Only OPEN period can start closing', 409, 'PERIOD_NOT_OPEN');
    await connection.query("UPDATE financial_periods SET status = 'CLOSING', closing_started_at = NOW() WHERE id = ?", [period.id]);
    await connection.commit();
    return getPeriod(user, period.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function generateBatch(user, periodId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'FINANCE', connection);
    const period = await lockPeriod(connection, periodId);
    if (period.status !== 'CLOSING') throw createError('Period must be in CLOSING status', 409, 'PERIOD_NOT_CLOSING');

    const [existingRows] = await connection.query(`
      SELECT * FROM inventory_adjustment_batches
      WHERE financial_period_id = ?
      ORDER BY id DESC LIMIT 1 FOR UPDATE
    `, [period.id]);
    let batch = existingRows[0] || null;
    if (batch && batch.status === 'POSTED') {
      throw createError('Posted batch cannot be regenerated', 409, 'BATCH_ALREADY_POSTED');
    }

    const actor = UserUtil.snapshot(user);
    if (!batch) {
      const periodNumber = String(period.period_key).replace('-', '');
      const batchNumber = await RequestService.nextNumber(connection, 'INVENTORY_ADJUSTMENT', periodNumber, 'IA', 3);
      const [result] = await connection.query(`
        INSERT INTO inventory_adjustment_batches (
          financial_period_id, batch_number, status,
          generated_by_user_id, generated_by_name, generated_at, note
        ) VALUES (?, ?, 'DRAFT', ?, ?, NOW(), ?)
      `, [period.id, batchNumber, actor.user_id, actor.name, optionalText(payload.note, 5000)]);
      batch = { id: result.insertId, batch_number: batchNumber, status: 'DRAFT' };
    } else {
      await connection.query('DELETE FROM inventory_adjustment_batch_items WHERE batch_id = ?', [batch.id]);
      await connection.query(`
        UPDATE inventory_adjustment_batches
        SET generated_by_user_id = ?, generated_by_name = ?, generated_at = NOW(), note = ?
        WHERE id = ?
      `, [actor.user_id, actor.name, optionalText(payload.note, 5000) ?? batch.note, batch.id]);
    }

    const movementMap = new Map();
    const [issueRows] = await connection.query(`
      SELECT
        r.id AS request_id,
        r.request_number,
        ri.id AS request_item_id,
        ri.item_code,
        ri.item_name,
        wfi.actual_qty AS issued_qty,
        (
          SELECT GROUP_CONCAT(DISTINCT wit2.source_warehouse_code ORDER BY wit2.source_warehouse_code SEPARATOR ',')
          FROM warehouse_inventory_transfer_items witi2
          INNER JOIN warehouse_inventory_transfers wit2 ON wit2.id = witi2.inventory_transfer_id
          WHERE witi2.fulfillment_item_id = wfi.id
        ) AS source_warehouse_code,
        (
          SELECT GROUP_CONCAT(DISTINCT wit3.inventory_transfer_number ORDER BY wit3.inventory_transfer_number SEPARATOR ',')
          FROM warehouse_inventory_transfer_items witi3
          INNER JOIN warehouse_inventory_transfers wit3 ON wit3.id = witi3.inventory_transfer_id
          WHERE witi3.fulfillment_item_id = wfi.id
        ) AS inventory_transfer_number
      FROM warehouse_handovers wh
      INNER JOIN warehouse_fulfillments wf ON wf.id = wh.fulfillment_id
      INNER JOIN warehouse_fulfillment_items wfi ON wfi.fulfillment_id = wf.id
      INNER JOIN request_items ri ON ri.id = wfi.request_item_id
      INNER JOIN requests r ON r.id = wf.request_id
      WHERE wh.status = 'RECEIVED'
        AND DATE(wh.received_at) BETWEEN ? AND ?
    `, [period.period_start, period.period_end]);

    for (const row of issueRows) {
      const key = Number(row.request_item_id);
      const existing = movementMap.get(key) || {
        request_id: row.request_id,
        request_number: row.request_number,
        request_item_id: key,
        item_code: row.item_code,
        item_name: row.item_name,
        actual_issued_qty: 0,
        returned_qty: 0,
        source_warehouse_code: null,
        inventory_transfer_number: null,
      };
      existing.actual_issued_qty += Number(row.issued_qty || 0);
      existing.source_warehouse_code = mergeCsv(existing.source_warehouse_code, row.source_warehouse_code);
      existing.inventory_transfer_number = mergeCsv(existing.inventory_transfer_number, row.inventory_transfer_number);
      movementMap.set(key, existing);
    }


    const [returnRows] = await connection.query(`
      SELECT
        req.id AS request_id,
        req.request_number,
        ri.request_item_id,
        request_item.item_code,
        request_item.item_name,
        SUM(ri.stock_returned_qty) AS returned_qty
      FROM returns ret
      INNER JOIN return_items ri ON ri.return_id = ret.id
      INNER JOIN requests req ON req.id = ret.request_id
      INNER JOIN request_items request_item ON request_item.id = ri.request_item_id
      WHERE ret.status = 'COMPLETED'
        AND DATE(ret.inspected_at) BETWEEN ? AND ?
      GROUP BY req.id, req.request_number, ri.request_item_id, request_item.item_code, request_item.item_name
    `, [period.period_start, period.period_end]);

    for (const row of returnRows) {
      const key = Number(row.request_item_id);
      const existing = movementMap.get(key) || {
        request_id: row.request_id,
        request_number: row.request_number,
        request_item_id: key,
        item_code: row.item_code,
        item_name: row.item_name,
        actual_issued_qty: 0,
        returned_qty: 0,
        source_warehouse_code: null,
        inventory_transfer_number: null,
      };
      existing.returned_qty += Number(row.returned_qty || 0);
      movementMap.set(key, existing);
    }

    for (const movement of movementMap.values()) {
      const adjustment = movement.actual_issued_qty - movement.returned_qty;
      if (Math.abs(adjustment) < 0.0001) continue;
      await connection.query(`
        INSERT INTO inventory_adjustment_batch_items (
          batch_id, request_id, request_number, request_item_id,
          item_code, item_name,
          actual_issued_qty, returned_qty,
          source_warehouse_code, loan_warehouse_code,
          inventory_transfer_number, adjustment_qty
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'LOAN', ?, ?)
      `, [
        batch.id,
        movement.request_id,
        movement.request_number,
        movement.request_item_id,
        movement.item_code,
        movement.item_name,
        movement.actual_issued_qty,
        movement.returned_qty,
        movement.source_warehouse_code,
        movement.inventory_transfer_number,
        adjustment,
      ]);
    }

    await ActivityService.log(connection, {
      request_id: null,
      entity_type: 'INVENTORY_ADJUSTMENT_BATCH',
      entity_id: batch.id,
      action_code: 'INVENTORY_ADJUSTMENT_BATCH_GENERATED',
      actor_user_id: actor.user_id,
      actor_name: actor.name,
      after: { batch_number: batch.batch_number, period_key: period.period_key, item_count: movementMap.size },
    });
    await connection.commit();
    return getBatch(user, batch.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function getBatch(user, batchId) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  const db = requireDatabase();
  const [rows] = await db.query('SELECT * FROM inventory_adjustment_batches WHERE id = ? LIMIT 1', [Number(batchId)]);
  if (!rows[0]) throw createError('Inventory Adjustment batch not found', 404, 'BATCH_NOT_FOUND');
  const [items] = await db.query('SELECT * FROM inventory_adjustment_batch_items WHERE batch_id = ? ORDER BY request_number, item_code, id', [Number(batchId)]);
  return { ...rows[0], items };
}

async function postBatch(user, batchId, payload = {}) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'FINANCE', connection);
    const [rows] = await connection.query('SELECT * FROM inventory_adjustment_batches WHERE id = ? LIMIT 1 FOR UPDATE', [Number(batchId)]);
    const batch = rows[0];
    if (!batch) throw createError('Inventory Adjustment batch not found', 404, 'BATCH_NOT_FOUND');
    if (batch.status !== 'DRAFT') throw createError('Only DRAFT batch can be posted', 409, 'BATCH_NOT_DRAFT');
    const reference = String(payload.netsuite_reference || '').trim();
    if (!reference) throw createError('netsuite_reference is required', 422, 'NETSUITE_REFERENCE_REQUIRED');
    await connection.query(`
      UPDATE inventory_adjustment_batches
      SET status = 'POSTED', netsuite_reference = ?, posted_at = NOW()
      WHERE id = ?
    `, [reference, batch.id]);
    await connection.commit();
    return getBatch(user, batch.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function closePeriod(user, periodId) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await AccessService.requireModuleAccess(user, 'FINANCE', connection);
    const period = await lockPeriod(connection, periodId);
    if (period.status !== 'CLOSING') throw createError('Period must be CLOSING before it can be closed', 409, 'PERIOD_NOT_CLOSING');
    const [draftRows] = await connection.query(`
      SELECT COUNT(*) AS total FROM inventory_adjustment_batches
      WHERE financial_period_id = ? AND status = 'DRAFT'
    `, [period.id]);
    if (Number(draftRows[0]?.total || 0) > 0) {
      throw createError('All Inventory Adjustment batches must be posted before closing the period', 409, 'BATCH_NOT_POSTED');
    }
    const actor = UserUtil.snapshot(user);
    await connection.query(`
      UPDATE financial_periods
      SET status = 'CLOSED', closed_at = NOW(), closed_by_user_id = ?, closed_by_name = ?
      WHERE id = ?
    `, [actor.user_id, actor.name, period.id]);
    await connection.commit();
    return getPeriod(user, period.id);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally { connection.release(); }
}

async function lockPeriod(connection, periodId) {
  const [rows] = await connection.query('SELECT * FROM financial_periods WHERE id = ? LIMIT 1 FOR UPDATE', [Number(periodId)]);
  if (!rows[0]) throw createError('Financial period not found', 404, 'FINANCIAL_PERIOD_NOT_FOUND');
  if (rows[0].status === 'CLOSED') throw createError('Closed financial period is immutable', 409, 'PERIOD_ALREADY_CLOSED');
  return rows[0];
}

function mergeCsv(existing, incoming) {
  const values = new Set();
  for (const source of [existing, incoming]) {
    if (!source) continue;
    for (const value of String(source).split(',')) {
      const trimmed = value.trim();
      if (trimmed) values.add(trimmed);
    }
  }
  return values.size ? [...values].sort().join(',') : null;
}

module.exports = {
  listPeriods,
  createPeriod,
  getPeriod,
  startClosing,
  generateBatch,
  getBatch,
  postBatch,
  closePeriod,
};
