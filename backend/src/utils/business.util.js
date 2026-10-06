function createError(message, statusCode = 400, code = 'REQUEST_FAILED', errors = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.errors = errors;
  return err;
}

function requireText(value, field, maxLength = null) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw createError(`${field} is required`, 422, 'VALIDATION_ERROR', {
      [field]: `${field} is required`,
    });
  }
  if (maxLength && normalized.length > maxLength) {
    throw createError(`${field} is too long`, 422, 'VALIDATION_ERROR', {
      [field]: `${field} cannot be longer than ${maxLength} characters`,
    });
  }
  return normalized;
}

function optionalText(value, maxLength = null) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (maxLength && normalized.length > maxLength) {
    throw createError('Text is too long', 422, 'VALIDATION_ERROR');
  }
  return normalized;
}

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createError(`${field} must be greater than 0`, 422, 'VALIDATION_ERROR', {
      [field]: `${field} must be greater than 0`,
    });
  }
  return number;
}

function nonNegativeNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw createError(`${field} must be 0 or greater`, 422, 'VALIDATION_ERROR', {
      [field]: `${field} must be 0 or greater`,
    });
  }
  return number;
}

function parsePositiveInt(value, fallback, max = 100) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) return fallback;
  return Math.min(number, max);
}

function normalizeDate(value, field, required = false) {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw createError(`${field} is required`, 422, 'VALIDATION_ERROR', {
        [field]: `${field} is required`,
      });
    }
    return null;
  }

  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw createError(`${field} must use YYYY-MM-DD format`, 422, 'VALIDATION_ERROR', {
      [field]: `${field} must use YYYY-MM-DD format`,
    });
  }

  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw createError(`${field} is invalid`, 422, 'VALIDATION_ERROR', {
      [field]: `${field} is invalid`,
    });
  }

  return text;
}

function json(value) {
  if (value === undefined) return null;
  return JSON.stringify(value);
}

module.exports = {
  createError,
  requireText,
  optionalText,
  positiveNumber,
  nonNegativeNumber,
  parsePositiveInt,
  normalizeDate,
  json,
};
