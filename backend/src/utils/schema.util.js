const { requireDatabase } = require('../config/database.config');

// Company snapshot + invoice grouping (migration 013) is optional: the backend must keep
// working on databases where that migration has not been applied yet. This checks once
// whether the columns/tables exist and caches the answer. A positive result is cached for
// the process lifetime; a negative one is re-checked periodically so running the migration
// takes effect without a restart.
const RECHECK_MS = 60 * 1000;

let cached = null;
let checkedAt = 0;
let pending = null;

async function detectInvoiceSchema() {
  const db = requireDatabase();
  const [columns] = await db.query(
    `SELECT COUNT(*) AS total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests'
       AND COLUMN_NAME IN ('item_company_code','item_company_name','invoice_status')`
  );
  const [tables] = await db.query(
    `SELECT COUNT(*) AS total FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('finance_invoice_groups','finance_invoice_group_requests')`
  );
  return Number(columns[0]?.total) === 3 && Number(tables[0]?.total) === 2;
}

async function hasInvoiceSchema() {
  if (cached === true) return true;
  if (cached === false && Date.now() - checkedAt < RECHECK_MS) return false;
  if (!pending) {
    pending = detectInvoiceSchema()
      .then((value) => {
        cached = value;
        checkedAt = Date.now();
        if (!value) {
          console.warn('[db] migration 013 not applied: item company & invoice grouping features are disabled');
        }
        return value;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

// SELECT fragment for the company/invoice columns of `requests`; returns NULLs under the
// same aliases when the columns do not exist, so response shapes stay identical.
function companySelect(enabled, alias = 'r') {
  return enabled
    ? `${alias}.item_company_code,${alias}.item_company_name,${alias}.invoice_status`
    : 'NULL AS item_company_code,NULL AS item_company_name,NULL AS invoice_status';
}

// SET fragment to mark a completed PB ready to invoice (empty when unsupported).
function readyToInvoiceSet(enabled) {
  return enabled ? ",invoice_status='READY_TO_INVOICE'" : '';
}

async function setRequestCompany(connection, requestId, code, name) {
  if (!(await hasInvoiceSchema())) return;
  await connection.query('UPDATE requests SET item_company_code=?,item_company_name=? WHERE id=?', [
    code ?? null,
    name ?? null,
    requestId,
  ]);
}

module.exports = {
  hasInvoiceSchema,
  companySelect,
  readyToInvoiceSet,
  setRequestCompany,
};
