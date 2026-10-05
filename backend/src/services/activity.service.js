const { json } = require('../utils/business.util');

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
};
