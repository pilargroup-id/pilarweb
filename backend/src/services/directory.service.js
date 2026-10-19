const config = require('../config');

function createUpstreamError(message, statusCode, code) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function extractList(body) {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

async function fetchListFromPilargroup(path, token, extraHeaders = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.auth.meTimeoutMs);

  try {
    const response = await fetch(`${config.auth.pilargroupUrl}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...extraHeaders,
      },
      signal: controller.signal,
    });

    let body = null;

    try {
      body = await response.json();
    } catch (_) {
      body = null;
    }

    if (!response.ok) {
      throw createUpstreamError(
        body?.message || `Failed to load data from PilarGroup (${path})`,
        response.status >= 400 && response.status < 500 ? response.status : 502,
        body?.errors?.code || body?.code || 'PILARGROUP_UPSTREAM_ERROR'
      );
    }

    return extractList(body);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createUpstreamError('PilarGroup service timeout', 504, 'PILARGROUP_UPSTREAM_TIMEOUT');
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function getJobLevels(token) {
  return fetchListFromPilargroup('/api/master/job-levels', token);
}

async function getDepartments(token) {
  return fetchListFromPilargroup('/api/internal/directory/departments', token, {
    'X-Internal-Secret': config.auth.internalSyncSecret,
  });
}

module.exports = {
  getJobLevels,
  getDepartments,
};
