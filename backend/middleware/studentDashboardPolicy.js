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