const config = require('../config');

function createUpstreamError(message, statusCode, code, details = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  return err;
}

function appendQueryParams(searchParams, query = {}) {
  for (const [key, rawValue] of Object.entries(query)) {
    if (
      key === 'item_kind' ||
      rawValue === undefined ||
      rawValue === null ||
      rawValue === ''
    ) {
      continue;
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      searchParams.append(key, String(value));
    }
  }
}

async function requestItembase(url) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.itembase.timeoutMs
  );

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Internal-Secret': config.itembase.internalSecret,
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
        body?.message || 'Itembase request failed',
        response.status >= 400 && response.status < 500 ? response.status : 502,
        body?.errors?.code || body?.code || 'ITEMBASE_UPSTREAM_ERROR',
        body?.errors || null
      );
    }

    return body;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createUpstreamError(
        'Itembase service timeout',
        504,
        'ITEMBASE_UPSTREAM_TIMEOUT'
      );
    }

    if (err.statusCode) {
      throw err;
    }

    throw createUpstreamError(
      'Unable to connect to Itembase',
      502,
      'ITEMBASE_UPSTREAM_UNAVAILABLE'
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function getRegularItems(query = {}) {
  const url = new URL(`${config.itembase.url}/api/item/items`);

  appendQueryParams(url.searchParams, query);

  // Pilarweb only exposes regular items from Itembase.
  // Any client-supplied item_kind is intentionally ignored.
  url.searchParams.set('item_kind', 'regular');

  return requestItembase(url);
}

async function getItemById(id) {
  const normalizedId = String(id || '').trim();

  if (!normalizedId) {
    throw createUpstreamError(
      'Item ID is required',
      400,
      'ITEM_ID_REQUIRED'
    );
  }

  const url = new URL(
    `${config.itembase.url}/api/item/items/${encodeURIComponent(normalizedId)}`
  );

  return requestItembase(url);
}

module.exports = {
  getRegularItems,
  getItemById,
};
