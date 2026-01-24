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
        return originalJson(normalizeJsonBody(body, res.statusCode));
      } catch {
        return originalJson(body);
      }
    };

    next();
  };
}
