const crypto = require('crypto');
const { requireDatabase } = require('../config/database.config');
const ItembaseService = require('./itembase.service');

function createServiceError(message, statusCode, code, errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (errors) err.errors = errors;
  return err;
}

// The authenticated user comes from PilarGroup's /api/auth/me response,
// which is not a Pilarweb-owned contract. These getters reach across the
// field-name variants instead of assuming one exact shape.
function getUserInternalId(user) {
  const value = user?.internal_id ?? user?.employee_id ?? user?.nik ?? null;
  return value === null || value === undefined || value === '' ? null : Number(value) || null;
}
function getUserName(user) {
  return user?.name ?? user?.full_name ?? user?.display_name ?? user?.username ?? null;
}
function getUserJobLevelValue(user) {
  const value = Number(user?.job_level_value);
  return Number.isFinite(value) ? value : null;
}
function getUserJobLevelName(user) {
  // PilarGroup's /api/auth/me returns the level name as `job_level`
  // (a plain string, e.g. "Staff"), not `job_level_name`.
  return user?.job_level_name ?? user?.job_level ?? null;
}
function getUserDepartmentId(user) {
  const value = user?.department_id ?? user?.department?.id ?? user?.departments?.[0]?.id;
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
function getUserDepartmentName(user) {
  // `department` is a plain string ("IT"), not an object, in the PilarGroup payload.
  if (typeof user?.department === 'string' && user.department) return user.department;
  return (
    user?.department_name ??
    user?.department?.name ??
    user?.context_department_name ??
    user?.departments?.[0]?.department_name ??
    null
  );
}
function getUserCompanyId(user) {
  const value = user?.company_id ?? user?.company?.id ?? user?.companies?.[0]?.id;
  return value === undefined || value === null || value === '' ? null : String(value);
}
function getUserCompanyName(user) {
  // `company` is a plain string, not an object, in the PilarGroup payload.
  if (typeof user?.company === 'string' && user.company) return user.company;
  return user?.company_name ?? user?.company?.name ?? user?.companies?.[0]?.name ?? null;
}

// The Itembase item payload is passed through as-is (docs section 4), so
// its exact field names are not controlled by Pilarweb either.
function getItemPayload(body) {
  return body?.data && typeof body.data === 'object' ? body.data : body;
}
function getItemField(item, ...keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item[key] !== null && item[key] !== '') return item[key];
  }
  return null;
}

async function snapshotItem(itembaseItemId, index) {
  let body;
  try {
    body = await ItembaseService.getItemById(itembaseItemId);
  } catch (err) {
    throw createServiceError(
      `items[${index}]: item ${itembaseItemId} could not be loaded from Itembase (${err.message}).`,
      422,
      'ITEM_LOOKUP_FAILED'
    );
  }

  const item = getItemPayload(body);
  if (!item || typeof item !== 'object') {
    throw createServiceError(`items[${index}]: item ${itembaseItemId} was not found in Itembase.`, 422, 'ITEM_NOT_FOUND');
  }

  const itemKind = getItemField(item, 'item_kind') || 'regular';
  if (itemKind !== 'regular') {
    throw createServiceError(
      `items[${index}]: item ${itembaseItemId} is a "${itemKind}" item and cannot be requested; only regular items are allowed.`,
      422,
      'ITEM_NOT_REGULAR'
    );
  }

  // Confirmed against the live Itembase response: code/name are top-level
  // `item_code`/`item_name`, while `parent` and `uom` are nested objects
  // (not flat `parent_id`/`uom_code` fields), and there is no single
  // `variant_name` — `variant_summary` is the closest display equivalent.
  const uomCode = item?.uom && typeof item.uom === 'object' ? item.uom.code ?? null : getItemField(item, 'uom_code', 'uom', 'unit');
  const parentId = item?.parent && typeof item.parent === 'object' ? item.parent.id ?? null : getItemField(item, 'parent_id');
  const parentName =
    item?.parent && typeof item.parent === 'object'
      ? item.parent.parent_name ?? item.parent.name ?? null
      : getItemField(item, 'parent_name');

  return {
    itembase_item_id: String(itembaseItemId),
    item_code: getItemField(item, 'item_code', 'code', 'sku') || String(itembaseItemId),
    item_name: getItemField(item, 'item_name', 'name') || 'Unnamed item',
    selling_name: getItemField(item, 'selling_name'),
    parent_id: parentId,
    parent_name: parentName,
    variant_name: getItemField(item, 'variant_summary', 'variant_name'),
    uom_code: uomCode ?? null,
    item_kind: itemKind,
  };
}

async function getPurposeById(db, purposeId) {
  const [rows] = await db.query(
    'SELECT id, code, name, is_active FROM master_request_purposes WHERE id = ? LIMIT 1',
    [purposeId]
  );
  return rows[0] || null;
}

// Request Purpose is not permanently tied to one workflow (docs section 7):
// only the currently-active request_purpose_workflows row decides the
// workflow, and that snapshot is frozen onto the request at creation time.
async function getActiveAssignment(db, purposeId) {
  const [rows] = await db.query(
    `SELECT
      rpw.id,
      rpw.workflow_definition_id,
      wd.code AS workflow_code,
      wd.name AS workflow_name,
      wd.version AS workflow_version,
      wd.requires_return
    FROM request_purpose_workflows rpw
    INNER JOIN workflow_definitions wd ON wd.id = rpw.workflow_definition_id
    WHERE rpw.request_purpose_id = ?
      AND rpw.is_active = 1
      AND rpw.effective_from <= NOW()
      AND (rpw.effective_to IS NULL OR rpw.effective_to > NOW())
    ORDER BY rpw.effective_from DESC
    LIMIT 1`,
    [purposeId]
  );
  return rows[0] || null;
}

function formatPeriodKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

async function nextRequestNumber(connection) {
  const periodKey = formatPeriodKey(new Date());
  const sequenceKey = 'REQUEST';

  await connection.query(
    `INSERT INTO number_sequences (sequence_key, period_key, last_number)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`,
    [sequenceKey, periodKey]
  );
  const [rows] = await connection.query('SELECT LAST_INSERT_ID() AS seq');
  const seq = rows[0].seq;

  return `REQ-${periodKey}-${String(seq).padStart(5, '0')}`;
}

function validateCreatePayload(payload) {
  const errors = [];
  const requestPurposeId = Number(payload?.request_purpose_id);
  const reason = String(payload?.reason || '').trim();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (!Number.isFinite(requestPurposeId) || requestPurposeId <= 0) {
    errors.push('request_purpose_id is required.');
  }
  if (!reason) errors.push('reason is required.');
  if (!items.length) errors.push('At least one item is required.');

  items.forEach((item, index) => {
    if (!item?.itembase_item_id) errors.push(`items[${index}].itembase_item_id is required.`);
    const qty = Number(item?.requested_qty);
    if (!Number.isFinite(qty) || qty <= 0) errors.push(`items[${index}].requested_qty must be greater than 0.`);
  });

  return { errors, requestPurposeId, reason, items };
}

async function createRequest(user, payload) {
  const db = requireDatabase();
  const { errors, requestPurposeId, reason, items } = validateCreatePayload(payload);
  if (errors.length) {
    throw createServiceError(errors.join(' '), 422, 'VALIDATION_ERROR', errors);
  }

  const purpose = await getPurposeById(db, requestPurposeId);
  if (!purpose || !purpose.is_active) {
    throw createServiceError('Request purpose was not found or is inactive.', 422, 'PURPOSE_NOT_FOUND');
  }

  const assignment = await getActiveAssignment(db, requestPurposeId);
  if (!assignment) {
    throw createServiceError(
      'No active workflow is configured for this request purpose yet. Ask an admin to configure request_purpose_workflows before requests can be created for this purpose.',
      422,
      'WORKFLOW_NOT_CONFIGURED'
    );
  }

  const requiresReturn = Number(assignment.requires_return) === 1;
  const returnDueDate = requiresReturn ? String(payload?.return_due_date || '').trim() : null;
  if (requiresReturn && !returnDueDate) {
    throw createServiceError('return_due_date is required for this workflow.', 422, 'RETURN_DUE_DATE_REQUIRED');
  }

  const departmentId = getUserDepartmentId(user);
  if (!departmentId) {
    throw createServiceError(
      'The authenticated user profile is missing a department_id required to create a request.',
      422,
      'USER_DEPARTMENT_MISSING'
    );
  }

  // Server-side snapshot: the stored item code/name/uom come from Itembase,
  // not from the client payload, so they cannot be spoofed (docs section 10).
  const itemSnapshots = await Promise.all(
    items.map((item, index) => snapshotItem(item.itembase_item_id, index))
  );

  const connection = await db.getConnection();
  const requestId = crypto.randomUUID();
  try {
    await connection.beginTransaction();

    const requestNumber = await nextRequestNumber(connection);

    // No separate draft/submit step exists yet (docs section 2 only lists
    // create/edit/submit together as not-yet-implemented), so creating a
    // request submits it directly into department approval.
    await connection.query(
      `INSERT INTO requests (
        id, request_number, request_purpose_id, request_purpose_code, request_purpose_name,
        workflow_definition_id, workflow_code, workflow_name, workflow_version, requires_return,
        return_due_date, status, requester_user_id, requester_internal_id, requester_name,
        requester_job_level_value, requester_job_level_name, department_id, department_name,
        company_id, company_name, reason, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_DEPARTMENT_APPROVAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        requestId,
        requestNumber,
        purpose.id,
        purpose.code,
        purpose.name,
        assignment.workflow_definition_id,
        assignment.workflow_code,
        assignment.workflow_name,
        assignment.workflow_version,
        requiresReturn ? 1 : 0,
        returnDueDate,
        String(user.id),
        getUserInternalId(user),
        getUserName(user),
        getUserJobLevelValue(user),
        getUserJobLevelName(user),
        departmentId,
        getUserDepartmentName(user),
        getUserCompanyId(user),
        getUserCompanyName(user),
        reason,
      ]
    );

    for (let i = 0; i < items.length; i += 1) {
      const snap = itemSnapshots[i];
      const qty = Number(items[i].requested_qty);
      const notes = items[i].notes ? String(items[i].notes).trim().slice(0, 500) : null;

      await connection.query(
        `INSERT INTO request_items (
          request_id, itembase_item_id, item_code, item_name, selling_name,
          parent_id, parent_name, variant_name, uom_code, item_kind, requested_qty, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requestId,
          snap.itembase_item_id,
          snap.item_code,
          snap.item_name,
          snap.selling_name,
          snap.parent_id,
          snap.parent_name,
          snap.variant_name,
          snap.uom_code,
          snap.item_kind,
          qty,
          notes,
        ]
      );
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  return getRequestById(requestId);
}

async function listMyRequests(user, { page = 1, limit = 20 } = {}) {
  const db = requireDatabase();
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const [totalRows] = await db.query('SELECT COUNT(*) AS total FROM requests WHERE requester_user_id = ?', [
    String(user.id),
  ]);
  const total = totalRows[0].total;

  const [rows] = await db.query(
    `SELECT
      id, request_number, request_purpose_code, request_purpose_name,
      workflow_code, workflow_name, requires_return, return_due_date,
      status, submitted_at, created_at
    FROM requests
    WHERE requester_user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`,
    [String(user.id), limitNum, offset]
  );

  return {
    rows,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    },
  };
}

async function getRequestById(id, user = null) {
  const db = requireDatabase();
  const [rows] = await db.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [id]);
  const requestRow = rows[0];
  if (!requestRow) return null;

  if (user && String(requestRow.requester_user_id) !== String(user.id)) {
    throw createServiceError('Request not found.', 404, 'REQUEST_NOT_FOUND');
  }

  const [items] = await db.query(
    `SELECT
      id, itembase_item_id, item_code, item_name, selling_name, parent_id, parent_name,
      variant_name, uom_code, item_kind, requested_qty, notes
    FROM request_items WHERE request_id = ? ORDER BY id ASC`,
    [id]
  );

  return { ...requestRow, items };
}

module.exports = {
  createRequest,
  listMyRequests,
  getRequestById,
};
