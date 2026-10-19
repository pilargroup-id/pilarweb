const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const { createError, parsePositiveInt, normalizeDate } = require('../utils/business.util');
const { createWorkbookBuffer } = require('../utils/xlsx.util');

async function requireReportAccess(user) {
  const allowed = (await AccessService.hasModuleAccess(user, 'ADMIN'))
    || (await AccessService.hasModuleAccess(user, 'FINANCE'))
    || (await AccessService.hasModuleAccess(user, 'WAREHOUSE'));
  if (!allowed) throw createError('User does not have report access', 403, 'REPORT_ACCESS_FORBIDDEN');
}

function buildFilters(query = {}) {
  const params = [];
  let where = 'WHERE 1=1';
  if (query.date_from) { where += ' AND DATE(r.submitted_at) >= ?'; params.push(normalizeDate(query.date_from, 'date_from', true)); }
  if (query.date_to) { where += ' AND DATE(r.submitted_at) <= ?'; params.push(normalizeDate(query.date_to, 'date_to', true)); }
  if (query.department_id) { where += ' AND r.department_id = ?'; params.push(Number(query.department_id)); }
  if (query.target_department_id) { where += ' AND r.target_department_id = ?'; params.push(Number(query.target_department_id)); }
  if (query.purpose_id) { where += ' AND r.request_purpose_id = ?'; params.push(Number(query.purpose_id)); }
  if (query.return_type) { where += ' AND r.purpose_return_type = ?'; params.push(String(query.return_type).trim().toUpperCase()); }
  if (query.status) { where += ' AND r.status = ?'; params.push(String(query.status).trim().toUpperCase()); }
  if (query.sku) { where += ' AND ri.item_code = ?'; params.push(String(query.sku).trim()); }
  if (query.search) {
    const search = `%${String(query.search).trim()}%`;
    where += ` AND (
      r.request_number LIKE ? OR r.requester_name LIKE ? OR r.department_name LIKE ?
      OR r.target_department_name LIKE ? OR ri.item_code LIKE ? OR ri.item_name LIKE ?
      OR wf.inventory_transfer_number LIKE ?
    )`;
    params.push(search, search, search, search, search, search, search);
  }
  return { where, params };
}

function reportFrom(where) {
  return `
    FROM requests r
    INNER JOIN request_items ri ON ri.request_id = r.id
    LEFT JOIN request_approvals ra ON ra.request_id = r.id AND ra.approval_order = 1
    LEFT JOIN finance_reviews fr ON fr.request_id = r.id
    LEFT JOIN finance_review_items fri ON fri.finance_review_id = fr.id AND fri.request_item_id = ri.id
    LEFT JOIN warehouse_fulfillments wf ON wf.request_id = r.id
    LEFT JOIN warehouse_fulfillment_items wfi ON wfi.fulfillment_id = wf.id AND wfi.request_item_id = ri.id
    LEFT JOIN warehouse_handovers wh ON wh.fulfillment_id = wf.id
    LEFT JOIN returns rt ON rt.request_id = r.id
    LEFT JOIN return_items rti ON rti.return_id = rt.id AND rti.request_item_id = ri.id
    ${where}
  `;
}

function selectColumns() {
  return `
    SELECT
      r.id AS request_id,
      r.request_number,
      r.submitted_at AS request_date,
      r.status AS request_status,
      r.request_purpose_id,
      r.request_purpose_code,
      r.request_purpose_name,
      r.purpose_return_type,
      r.return_due_date,
      r.reason,
      r.requester_user_id,
      r.requester_name,
      r.requester_job_level_name,
      r.department_id,
      r.department_name,
      r.target_department_id,
      r.target_department_name,
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
      COALESCE(fri.approved_qty,0) AS finance_approved_qty,
      COALESCE(fri.rejected_qty,0) AS finance_rejected_qty,
      wf.id AS fulfillment_id,
      wf.fulfillment_number,
      wf.status AS fulfillment_status,
      wf.source_warehouse_id,
      wf.source_warehouse_internal_id,
      wf.source_warehouse_code,
      wf.source_warehouse_name,
      wf.inventory_transfer_number,
      wf.inventory_transfer_recorded_at,
      wf.last_picking_printed_at,
      wf.progress_saved_at,
      wf.picking_completed_at,
      wf.last_do_printed_at,
      wfi.actual_qty,
      CASE WHEN wfi.actual_qty IS NULL THEN NULL ELSE COALESCE(fri.approved_qty,0)-wfi.actual_qty END AS difference_qty,
      wh.handed_over_by_name,
      wh.handed_over_at,
      rt.id AS return_id,
      rt.return_number,
      rt.status AS return_status,
      rt.requester_submitted_at AS return_submitted_at,
      rt.completed_at AS return_completed_at,
      COALESCE(rti.expected_qty,0) AS return_expected_qty,
      COALESCE(rti.requester_return_qty,0) AS requester_return_qty,
      COALESCE(rti.warehouse_received_qty,0) AS warehouse_return_received_qty,
      GREATEST(COALESCE(rti.expected_qty,0)-COALESCE(rti.warehouse_received_qty,0),0) AS return_outstanding_qty,
      CASE
        WHEN r.purpose_return_type='RETURNABLE'
         AND r.return_due_date IS NOT NULL
         AND r.return_due_date < CURDATE()
         AND GREATEST(COALESCE(rti.expected_qty,0)-COALESCE(rti.warehouse_received_qty,0),0) > 0
        THEN 1 ELSE 0
      END AS is_return_overdue,
      CASE WHEN EXISTS(
        SELECT 1 FROM validation_overrides vo
        WHERE vo.department_id=r.department_id
          AND vo.is_active=1 AND vo.revoked_at IS NULL
          AND vo.valid_from<=NOW() AND (vo.valid_until IS NULL OR vo.valid_until>=NOW())
          AND (vo.request_id IS NULL OR vo.request_id=r.id)
          AND vo.validation_code IN ('RETURN_OVERDUE','RETURN_QTY_INCOMPLETE','ALL_RETURN_RESTRICTIONS')
      ) THEN 1 ELSE 0 END AS has_active_validation_override
  `;
}

async function queryRows(query = {}, pagination = null) {
  const db = requireDatabase();
  const { where, params } = buildFilters(query);
  const from = reportFrom(where);
  const sql = `${selectColumns()} ${from} ORDER BY r.submitted_at DESC, r.request_number DESC, ri.id ASC`;
  if (!pagination) {
    const [rows] = await db.query(sql, params);
    return rows;
  }
  const [countRows] = await db.query(`SELECT COUNT(*) AS total ${from}`, params);
  const [rows] = await db.query(`${sql} LIMIT ? OFFSET ?`, [...params, pagination.limit, pagination.offset]);
  return { rows, total: Number(countRows[0]?.total || 0) };
}

async function listRequests(user, query = {}) {
  await requireReportAccess(user);
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 50, 200);
  const result = await queryRows(query, { limit, offset: (page - 1) * limit });
  return { data: result.rows, meta: { page, limit, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / limit)) } };
}

function formatDateTime(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).format(value).replace('T', ' ');
  }
  return String(value).replace('T', ' ').slice(0, 19);
}
function formatDate(value) {
  if (!value) return '';
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
  }
  return String(value).slice(0, 10);
}

async function exportFinanceRequests(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  const rows = await queryRows(query, null);
  const exportRows = rows.map((r) => ({
    request_number: r.request_number,
    request_date: formatDateTime(r.request_date),
    requester_name: r.requester_name,
    requester_department: r.department_name,
    target_department: r.target_department_name,
    company: r.company_name,
    purpose: r.request_purpose_name,
    return_type: r.purpose_return_type,
    return_due_date: formatDate(r.return_due_date),
    manager_status: r.manager_status,
    manager_name: r.manager_name,
    manager_action_at: formatDateTime(r.manager_decided_at),
    sku: r.item_code,
    item_name: r.item_name,
    uom: r.uom_code,
    requested_qty: Number(r.requested_qty || 0),
    finance_decision: r.finance_item_decision,
    finance_approved_qty: Number(r.finance_approved_qty || 0),
    finance_rejected_qty: Number(r.finance_rejected_qty || 0),
    source_warehouse_internal_id: r.source_warehouse_internal_id ?? '',
    source_warehouse: r.source_warehouse_name,
    actual_picked_qty: r.actual_qty === null ? '' : Number(r.actual_qty),
    qty_difference: r.difference_qty === null ? '' : Number(r.difference_qty),
    iwt_number: r.inventory_transfer_number,
    iwt_recorded_at: formatDateTime(r.inventory_transfer_recorded_at),
    picking_printed_at: formatDateTime(r.last_picking_printed_at),
    do_printed_at: formatDateTime(r.last_do_printed_at),
    handed_over_at: formatDateTime(r.handed_over_at),
    requester_return_qty: Number(r.requester_return_qty || 0),
    warehouse_actual_return_qty: Number(r.warehouse_return_received_qty || 0),
    outstanding_return_qty: Number(r.return_outstanding_qty || 0),
    return_status: r.return_status,
    return_completed_at: formatDateTime(r.return_completed_at),
    is_return_overdue: Number(r.is_return_overdue) === 1 ? 'YES' : 'NO',
    has_active_validation_override: Number(r.has_active_validation_override) === 1 ? 'YES' : 'NO',
    request_status: r.request_status,
  }));

  const columns = [
    ['Request Number','request_number',18],['Request Date','request_date',20],['Requester Name','requester_name',22],
    ['Requester Department','requester_department',22],['Target Department','target_department',22],['Company','company',26],
    ['Purpose','purpose',20],['Return Type','return_type',18],['Return Due Date','return_due_date',16],
    ['Manager Status','manager_status',16],['Manager Name','manager_name',20],['Manager Action At','manager_action_at',20],
    ['SKU','sku',20],['Item Name','item_name',34],['UOM','uom',10],['Requested Qty','requested_qty',14],
    ['Finance Decision','finance_decision',16],['Finance Approved Qty','finance_approved_qty',20],['Finance Rejected Qty','finance_rejected_qty',20],
    ['Source Warehouse Internal ID','source_warehouse_internal_id',24],['Source Warehouse','source_warehouse',24],
    ['Actual Picked Qty','actual_picked_qty',18],['Qty Difference','qty_difference',16],['IWT Number','iwt_number',18],['IWT Recorded At','iwt_recorded_at',20],
    ['Picking Printed At','picking_printed_at',20],['DO Printed At','do_printed_at',20],['Handed Over At','handed_over_at',20],
    ['Requester Return Qty','requester_return_qty',20],['Warehouse Actual Return Qty','warehouse_actual_return_qty',26],['Outstanding Return Qty','outstanding_return_qty',22],
    ['Return Status','return_status',18],['Return Completed At','return_completed_at',20],['Is Return Overdue','is_return_overdue',18],
    ['Has Active Validation Override','has_active_validation_override',28],['Request Status','request_status',22],
  ].map(([header,key,width])=>({header,key,width}));

  const buffer = createWorkbookBuffer({ sheetName: 'Request by SKU', columns, rows: exportRows });
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
  return { buffer, filename: `pilarweb-finance-request-report-${stamp}.xlsx`, row_count: exportRows.length };
}

module.exports = { listRequests, exportFinanceRequests, queryRows };
