const R = require('../utils/response.util');

const DB_CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ER_DBACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'POOL_CLOSED',
]);

function notFound(req, res) {
  return R.notFound(res, `Route ${req.method} ${req.originalUrl} not found`);
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
    return R.error(res, 'Data already exists', 409, {
      code: 'DUPLICATE_ENTRY',
    });
  }

  if (DB_CONNECTION_ERROR_CODES.has(err?.code)) {
    console.error('[db] connection error:', err);
    return R.error(res, 'Database is currently unreachable', 503, {
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  if (err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR') {
    console.error('[db] schema error:', err);
    return R.error(res, 'Database schema is out of date', 500, {
      code: 'DATABASE_SCHEMA_ERROR',
    });
  }

  if (err?.statusCode && err.statusCode >= 400 && err.statusCode < 600) {
    return R.error(res, err.message || 'Request failed', err.statusCode, {
      code: err.code || 'REQUEST_FAILED',
    });
  }

  console.error(err);
  return R.error(res, 'Internal Server Error', 500, {
    code: 'INTERNAL_SERVER_ERROR',
  });
}

module.exports = {
  notFound,
  errorHandler,
};
