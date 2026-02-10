import { translateMessage } from '../i18n/index.js';

function isPlainObject(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isLikelyMongooseDocument(value) {
  if (!value || typeof value !== 'object') return false;
  // Common internal flags/fields on mongoose documents.
  if (value.$__ || value._doc || value.$isMongooseDocument) return true;
  // Heuristic: docs typically expose both toObject and populate.
  if (typeof value.toObject === 'function' && typeof value.populate === 'function') return true;
  return false;
}

function translateString(req, value) {
  if (typeof value !== 'string') return value;
  const translated = translateMessage(req, value);
  return typeof translated === 'string' ? translated : value;
}

function isTransferLogLike(row) {
  if (!isPlainObject(row)) return false;
  if (typeof row.reason !== 'string') return false;
  // Reduce false positives: transfer logs usually have from/to/student/date metadata.
  return Boolean(
    row.fromGradeSection ||
    row.toGradeSection ||
    row.from ||
    row.to ||
    row.student ||
    row.byUser ||
    row.reverted !== undefined ||
    row.revertOf ||
    row.date
  );
}

function translateTransferLogReason(req, row) {
  if (!isTransferLogLike(row)) return row;
  const nextReason = translateString(req, row.reason);
  if (nextReason === row.reason) return row;
  return { ...row, reason: nextReason };
}

function translateTransferLogReasonsInArray(req, arr) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  let changed = false;
  const mapped = arr.map((row) => {
    if (!isPlainObject(row)) return row;
    const nextRow = translateTransferLogReason(req, row);
    if (nextRow !== row) changed = true;
    return nextRow;
  });
  return changed ? mapped : arr;
}

function translateErrorFieldInArray(req, arr) {
  if (!Array.isArray(arr) || arr.length === 0) return arr;
  let changed = false;
  const mapped = arr.map((row) => {
    if (!isPlainObject(row)) return row;
    if (typeof row.error !== 'string') return row;
    const nextError = translateString(req, row.error);
    if (nextError === row.error) return row;
    changed = true;
    return { ...row, error: nextError };
  });
  return changed ? mapped : arr;
}

export function normalizeJsonBody(body, statusCode) {
  const status = Number(statusCode) || 200;

  // Do not change non-objects (string/number/null/etc) or arrays.
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;

  // Avoid changing Mongoose documents (spreading them can change serialization).
  if (isLikelyMongooseDocument(body)) return body;

  // Only normalize common JSON object payloads.
  // If it's not a plain object, still allow adding success if it is safely cloneable.
  const hasSuccess = Object.prototype.hasOwnProperty.call(body, 'success');
  if (hasSuccess) return body;

  // Backward compatible: keep existing fields as-is, only add success.
  // For non-plain objects (e.g., Date), leave unchanged.
  if (!isPlainObject(body)) return body;

  return { ...body, success: status < 400 };
}

export function responseNormalize() {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      try {
        let out = body;

        // Translate common user-facing `message` strings while preserving
        // status codes, response shape, and non-plain-object serialization.
        if (isPlainObject(out)) {
          if (typeof out.message === 'string') {
            const translated = translateMessage(req, out.message);
            if (typeof translated === 'string' && translated !== out.message) {
              out = { ...out, message: translated };
            }
          }
          if (typeof out.error === 'string') {
            const translated = translateMessage(req, out.error);
            if (typeof translated === 'string' && translated !== out.error) {
              out = { ...out, error: translated };
            }
          }

          // Some endpoints return `details` as a string (e.g., short error summaries).
          if (typeof out.details === 'string') {
            const translated = translateMessage(req, out.details);
            if (typeof translated === 'string' && translated !== out.details) {
              out = { ...out, details: translated };
            }
          }

          // Some endpoints return `details` as an array of objects with per-item `error` strings.
          // UI may render these directly (e.g., promotions duplicate list).
          if (Array.isArray(out.details)) {
            const nextDetails = translateErrorFieldInArray(req, out.details);
            if (nextDetails !== out.details) {
              out = { ...out, details: nextDetails };
            }
          }

          // Transfer logs: UI renders `reason` directly.
          if (Array.isArray(out.data)) {
            const nextData = translateTransferLogReasonsInArray(req, out.data);
            if (nextData !== out.data) {
              out = { ...out, data: nextData };
            }
          }
          if (isPlainObject(out.latest)) {
            const nextLatest = translateTransferLogReason(req, out.latest);
            if (nextLatest !== out.latest) {
              out = { ...out, latest: nextLatest };
            }
          }
          if (isPlainObject(out.transferLog)) {
            const nextLog = translateTransferLogReason(req, out.transferLog);
            if (nextLog !== out.transferLog) {
              out = { ...out, transferLog: nextLog };
            }
          }
        }

        return originalJson(normalizeJsonBody(out, res.statusCode));
      } catch {
        return originalJson(body);
      }
    };

    next();
  };
}
