const R = require('../utils/response.util');

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
