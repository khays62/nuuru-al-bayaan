import { getResolvedPrivacyPolicy } from '../utils/privacyPolicy.js';

export function requireStudentDashboardAccess(policyKey) {
  return async (req, res, next) => {
    try {
      if (String(req.user?.role || '').toLowerCase() !== 'student') {
        return next();
      }

      const key = String(policyKey || '').trim();
      if (!key) return next();

      const policy = await getResolvedPrivacyPolicy();
      if (policy?.studentDashboard?.[key] === false) {
        return res.status(403).json({
          success: false,
          code: 'STUDENT_DASHBOARD_TAB_DISABLED',
          message: 'This student dashboard section is disabled.',
          policyKey: key,
        });
      }

      return next();
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Failed to validate student dashboard access.',
      });
    }
  };
}

export function requireStudentDashboardAccessAny(policyKeys) {
  const keys = Array.isArray(policyKeys) ? policyKeys : [policyKeys];
  const normalizedKeys = keys
    .map((k) => String(k || '').trim())
    .filter(Boolean);

  return async (req, res, next) => {
    try {
      if (String(req.user?.role || '').toLowerCase() !== 'student') {
        return next();
      }

      if (!normalizedKeys.length) return next();

      const policy = await getResolvedPrivacyPolicy();
      const dashboard = policy?.studentDashboard || {};

      const anyEnabled = normalizedKeys.some((k) => dashboard?.[k] !== false);
      if (!anyEnabled) {
        // Keep response shape consistent with requireStudentDashboardAccess.
        return res.status(403).json({
          success: false,
          code: 'STUDENT_DASHBOARD_TAB_DISABLED',
          message: 'This student dashboard section is disabled.',
          policyKey: normalizedKeys[0],
        });
      }

      return next();
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Failed to validate student dashboard access.',
      });
    }
  };
}