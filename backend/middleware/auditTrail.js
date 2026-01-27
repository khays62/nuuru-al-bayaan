import { writeAuditLog } from '../services/auditService.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'token',
  'refreshToken',
]);

function summarizeBodyKeys(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return '';
  const keys = Object.keys(body)
    .filter((k) => !SENSITIVE_KEYS.has(k))
    .slice(0, 12);
  return keys.length ? ` bodyKeys=${keys.join(',')}` : '';
}

export const auditTrail = (options = {}) => {
  const {
    skipPrefixes = ['/api/auth', '/api/users'],
    skipRoles = ['student'],
  } = options;

  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      try {
        const url = String(req.originalUrl || '');
        if (!url.startsWith('/api/')) return;

        if (!MUTATING_METHODS.has(String(req.method || '').toUpperCase())) return;

        const roleLower = String(req.user?.role || '').toLowerCase();
        if (!req.user?._id || skipRoles.includes(roleLower)) return;

        if (res.statusCode >= 400) return;

        if (Array.isArray(skipPrefixes) && skipPrefixes.some((p) => url.startsWith(p))) return;

        const ctx = req.audit || req.auditContext || null;
        const module = ctx?.module ? String(ctx.module) : null;
        const permAction = ctx?.action ? String(ctx.action) : null;

        const action = module && permAction
          ? `${module}.${permAction}`
          : `http.${String(req.method || '').toLowerCase()}`;

        const idPart = req.params?.id ? ` id=${String(req.params.id)}` : '';
        const bodyPart = summarizeBodyKeys(req.body);
        const ms = Math.max(0, Date.now() - start);
        const desc = `${String(req.method || '')} ${url}${idPart}${bodyPart} (${ms}ms)`;

        writeAuditLog({
          userId: req.user._id,
          action,
          description: desc,
          req,
        });
      } catch {
        // Never break the request flow.
      }
    });

    return next();
  };
};
