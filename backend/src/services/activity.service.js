const { json, parsePositiveInt } = require('../utils/business.util');
const { requireDatabase } = require('../config/database.config');

async function log(connection, payload = {}) {
  await connection.query(`
    INSERT INTO activity_logs (
      request_id,
      entity_type,
      entity_id,
      action_code,
      actor_user_id,
      actor_name,
      before_json,
      after_json,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    payload.request_id || null,
    payload.entity_type || 'REQUEST',
    payload.entity_id !== undefined && payload.entity_id !== null ? String(payload.entity_id) : null,
    payload.action_code,
    payload.actor_user_id || null,
    payload.actor_name || null,
    json(payload.before),
    json(payload.after),
    json(payload.metadata),
  ]);
}

async function listByRequest(connection, requestId) {
  const [rows] = await connection.query(`
    SELECT
      id,
      request_id,
      entity_type,
      entity_id,
      action_code,
      actor_user_id,
      actor_name,
      before_json,
      after_json,
      metadata_json,
      created_at
    FROM activity_logs
    WHERE request_id = ?
    ORDER BY created_at ASC, id ASC
  `, [requestId]);

  return rows.map((row) => ({
    ...row,
    before: safeParse(row.before_json),
    after: safeParse(row.after_json),
    metadata: safeParse(row.metadata_json),
  }));
}

async function listRecent(user, query = {}) {
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, 8, 100);
  const offset = (page - 1) * limit;
  const params = [String(user.id), String(user.id)];
  const where = 'WHERE r.requester_user_id = ? OR al.actor_user_id = ?';

  const [countRows] = await db.query(`
    SELECT COUNT(*) AS total
    FROM activity_logs al
    LEFT JOIN requests r ON r.id = al.request_id
    ${where}
  `, params);

  const [rows] = await db.query(`
    SELECT
      al.id,
      al.entity_type,
      al.entity_id,
      al.action_code,
      al.actor_name,
      al.created_at,
      r.request_number
    FROM activity_logs al
    LEFT JOIN requests r ON r.id = al.request_id
    ${where}
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const total = Number(countRows[0]?.total || 0);
  return {
    data: rows.map(mapRecentRow),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function mapRecentRow(row) {
  return {
    id: row.id,
    module: row.entity_type,
    action: row.action_code,
    status: 'SUCCESS',
    user_name_snapshot: row.actor_name,
    entity_type: row.entity_type,
    entity_reference: row.request_number || row.entity_id,
    entity_name_snapshot: row.request_number || null,
    created_at: row.created_at,
  };
}

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}

module.exports = {
  log,
  listByRequest,
  listRecent,
};
