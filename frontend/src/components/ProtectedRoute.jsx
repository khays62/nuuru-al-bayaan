// import React from "react";
// import { Navigate, Outlet } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext";

// /**
//  * ProtectedRoute handles:
//  * 1. Redirecting unauthenticated users to /login
//  * 2. Role-based access control (RBAC)
//  * 3. Rendering children if provided, otherwise <Outlet /> for nested routes
//  */
// export default function ProtectedRoute({ allowedRoles, children }) {
//   const { auth } = useAuth();

//   // Not logged in
//   if (!auth?.user || !auth?.token) {
//     return <Navigate to="/login" replace />;
//   }

//   // Role-based restriction
//   if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
//     return <Navigate to="/" replace />;
//   }

//   // Render children if passed, otherwise render nested <Outlet />
//   return children ? children : <Outlet />;
// }


// import React from "react";
// import { Navigate, Outlet } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext";

// /**
//  * ProtectedRoute:
//  * - allowedRoles: array of roles allowed (e.g., ["admin", "exam_office"])
//  * - allowedPermissions: array of permissions allowed (e.g., ["add", "edit"])
//  */
// export default function ProtectedRoute({ allowedRoles, allowedPermissions, children }) {
//   const { auth } = useAuth();

//   // Not logged in
//   if (!auth?.user || !auth?.token) {
//     return <Navigate to="/login" replace />;
//   }

//   const { role, permission } = auth.user;

//   // Role-based restriction
//   if (allowedRoles && !allowedRoles.includes(role)) {
//     return <Navigate to="/" replace />;
//   }

//   // Permission-based restriction
//   if (allowedPermissions && (!permission || !allowedPermissions.includes(permission))) {
//     return <Navigate to="/" replace />;
//   }

//   // Render children if passed, otherwise nested <Outlet />
//   return children ? children : <Outlet />;
// }


import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import NotFoundPage from "../pages/NotFoundPage";

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

  // Show nothing or loader while checking cookie
  // if (loading) return <div>Loading...</div>;


// if (loading)
//   return (
//     <Center style={{ height: '100vh' }}>
//       <Loader size="lg" color="blue" />
//     </Center>
//   );

if (loading)
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
    </div>
  );

  // Not logged in
  if (!auth?.user) return <Navigate to="/login" replace />;

  const { role } = auth.user;

  // Role-based restriction
  if (allowedRoles && !allowedRoles.includes(role)) return <NotFoundPage />;

  // Permission-based restriction
  // allowedPermissions supports:
  // - [{ module: 'students', action: 'view' }, ...]
  // - ['students.view', ...]
  // Route passes if user has ANY of the provided requirements.
  if (Array.isArray(allowedPermissions) && allowedPermissions.length) {
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
