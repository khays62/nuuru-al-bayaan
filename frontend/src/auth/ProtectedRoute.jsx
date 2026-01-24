import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import NotFoundPage from '../pages/NotFoundPage';

function normalizePermissionRequirement(req) {
  if (!req) return null;
  if (typeof req === 'string') {
    const [module, action] = req.split('.');
    if (!module || !action) return null;
    return { module, action };
  }
  if (typeof req === 'object' && req.module && req.action) {
    return { module: req.module, action: req.action };
  }
  return null;
}

export default function ProtectedRoute({ allowedRoles, allowedPermissions, children }) {
  const { auth, loading, hasPermission } = useAuth();

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
      </div>
    );

  // Not logged in
  if (!auth?.user) return <Navigate to="/login" replace />;

  const role = String(auth.user?.role || '').toLowerCase();

  const allowedRolesNormalized = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r || '').toLowerCase()).filter(Boolean)
    : null;

  // Role-based restriction
  if (allowedRolesNormalized && allowedRolesNormalized.length && !allowedRolesNormalized.includes(role)) return <NotFoundPage />;

  // Permission-based restriction
  // allowedPermissions supports:
  // - [{ module: 'students', action: 'view' }, ...]
  // - ['students.view', ...]
  // Route passes if user has ANY of the provided requirements.
  if (Array.isArray(allowedPermissions) && allowedPermissions.length) {
    // Teachers are scoped by backend TeacherAssignment rules (not permissions object).
    if (role === 'teacher') return children ? children : <Outlet />;

    const reqs = allowedPermissions
      .map(normalizePermissionRequirement)
      .filter(Boolean);

    if (reqs.length) {
      const ok = typeof hasPermission === 'function'
        && reqs.some((r) => hasPermission(r.module, r.action));

      if (!ok) return <NotFoundPage />;
    }
  }

  return children ? children : <Outlet />;
}
