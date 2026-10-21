const { requireDatabase } = require('../config/database.config');
const { createError } = require('../utils/business.util');

const DEFAULTS = {
  receipt_confirmation_days: 2,
  discrepancy_resolution_days: 2,
  discrepancy_escalation_days: 3,
  discrepancy_supervisor_lock_days: 5,
  return_due_days: 14,
  timezone: 'Asia/Jakarta',
};

async function getActive(connection = null) {
  const db = connection || requireDatabase();
  const [rows] = await db.query(`SELECT * FROM request_policy_settings WHERE is_active=1 ORDER BY id DESC LIMIT 1`);
  return rows[0] || DEFAULTS;
}

function validate(payload = {}) {
  const fields = ['receipt_confirmation_days','discrepancy_resolution_days','discrepancy_escalation_days','discrepancy_supervisor_lock_days','return_due_days'];
  const out = {};
  for (const field of fields) {
    const value = Number(payload[field]);
    if (!Number.isInteger(value) || value < 0 || value > 3650) throw createError(`${field} must be an integer between 0 and 3650`,422,'VALIDATION_ERROR');
    out[field] = value;
  }
  if (out.discrepancy_escalation_days < out.discrepancy_resolution_days) throw createError('discrepancy_escalation_days cannot be lower than discrepancy_resolution_days',422,'VALIDATION_ERROR');
  if (out.discrepancy_supervisor_lock_days < out.discrepancy_escalation_days) throw createError('discrepancy_supervisor_lock_days cannot be lower than discrepancy_escalation_days',422,'VALIDATION_ERROR');
  out.timezone = String(payload.timezone || 'Asia/Jakarta').trim();
  return out;
}

module.exports = { DEFAULTS, getActive, validate };
