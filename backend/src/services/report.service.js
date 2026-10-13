const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const { createError, parsePositiveInt, normalizeDate } = require('../utils/business.util');

async function requireReportAccess(user) {
  const allowed = (
    await AccessService.hasModuleAccess(user, 'ADMIN')
    || await AccessService.hasModuleAccess(user, 'FINANCE')
    || await AccessService.hasModuleAccess(user, 'WAREHOUSE')
  );
  if (!allowed) throw createError('User does not have report access', 403, 'REPORT_ACCESS_FORBIDDEN');
}

async function listRequests(user, query = {}) {
  await requireReportAccess(user);
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 50, 200);
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (query.date_from) {
    const value = normalizeDate(query.date_from, 'date_from', true);
    where += ' AND DATE(r.submitted_at) >= ?';
    params.push(value);
  }
  if (query.date_to) {
    const value = normalizeDate(query.date_to, 'date_to', true);
    where += ' AND DATE(r.submitted_at) <= ?';
    params.push(value);
  }
  if (query.department_id) {
    where += ' AND r.department_id = ?';
    params.push(Number(query.department_id));
  }
  if (query.purpose_id) {
    where += ' AND r.request_purpose_id = ?';
    params.push(Number(query.purpose_id));
  }
  if (query.status) {
    where += ' AND r.status = ?';
    params.push(String(query.status).trim().toUpperCase());
  }
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ` AND (
      r.request_number LIKE ? OR r.requester_name LIKE ? OR r.department_name LIKE ?
      OR ri.item_code LIKE ? OR ri.item_name LIKE ? OR wfi.inventory_transfer_number LIKE ?
    )`;
    params.push(search, search, search, search, search, search);
  }

  const from = `
    FROM requests r
    INNER JOIN request_items ri ON ri.request_id = r.id
    LEFT JOIN request_approvals ra ON ra.request_id = r.id AND ra.approval_order = 1
    LEFT JOIN finance_reviews fr ON fr.request_id = r.id
    LEFT JOIN finance_review_items fri ON fri.finance_review_id = fr.id AND fri.request_item_id = ri.id
    LEFT JOIN warehouse_fulfillments wf ON wf.request_id = r.id
    LEFT JOIN warehouse_fulfillment_items wfi ON wfi.fulfillment_id = wf.id AND wfi.request_item_id = ri.id
    LEFT JOIN warehouse_handovers wh ON wh.fulfillment_id = wf.id
    ${where}
  `;

  const [countRows] = await db.query(`SELECT COUNT(*) AS total ${from}`, params);
  const [rows] = await db.query(`
    SELECT
      r.id AS request_id,
      r.request_number,
      r.submitted_at AS request_date,
      r.status AS request_status,
      r.request_purpose_id,
      r.request_purpose_code,
      r.request_purpose_name,
      r.reason,
      r.requester_user_id,
      r.requester_name,
      r.requester_job_level_name,
      r.department_id,
      r.department_name,
      r.company_id,
      r.company_name,
      ra.status AS manager_status,
      ra.approver_name AS manager_name,
      ra.decided_at AS manager_decided_at,
      ra.revert_reason AS manager_revert_reason,
      fr.status AS finance_status,
      fr.reviewer_name AS finance_reviewer_name,
      fr.reviewed_at AS finance_reviewed_at,
      ri.id AS request_item_id,
      ri.itembase_item_id,
      ri.item_code,
      ri.item_name,
      ri.selling_name,
      ri.variant_name,
      ri.uom_code,
      ri.requested_qty,
      fri.decision AS finance_item_decision,
      COALESCE(fri.approved_qty, 0) AS finance_approved_qty,
      COALESCE(fri.rejected_qty, 0) AS finance_rejected_qty,
      wf.id AS fulfillment_id,
      wf.fulfillment_number,
      wf.status AS fulfillment_status,
      wf.last_picking_printed_at,
      wf.progress_saved_at,
      wf.picking_completed_at,
      wf.last_do_printed_at,
      wfi.actual_qty,
      CASE
        WHEN wfi.actual_qty IS NULL THEN NULL
        ELSE COALESCE(fri.approved_qty, 0) - wfi.actual_qty
      END AS difference_qty,
      wfi.source_warehouse_code,
      wfi.source_warehouse_name,
      wfi.inventory_transfer_number,
      wfi.inventory_transfer_recorded_at,
      wh.handed_over_by_name,
      wh.handed_over_at
    ${from}
    ORDER BY r.submitted_at DESC, r.request_number DESC, ri.id ASC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const total = Number(countRows[0]?.total || 0);
  return { data: rows, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

module.exports = { listRequests };
