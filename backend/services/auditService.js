import AuditLog from '../models/AuditLog.js';

export const writeAuditLog = async ({ userId, action, description = '', req } = {}) => {
  try {
    if (!userId) return;
    const ip = req?.ip ? String(req.ip) : '';
    const device = req?.headers?.['user-agent'] ? String(req.headers['user-agent']).slice(0, 200) : '';

    await AuditLog.create({
      user: userId,
      action: String(action || 'unknown'),
      description: String(description || '').slice(0, 500),
      ip,
      device,
    });
  } catch {
    // Avoid breaking the main request flow on audit failures.
  }
};
