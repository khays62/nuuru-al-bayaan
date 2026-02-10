// Allows student accounts to access only their own resources,
// while keeping existing permission checks for staff/admin.

export const allowStudentSelfOr = (permissionMiddleware, opts = {}) => {
  const { param = 'id', query = null } = opts;

  return (req, res, next) => {
    const role = req.user?.role;

    // Student: must match own id
    if (role === 'student') {
      const provided = query ? req.query?.[query] : req.params?.[param];

      // New model: students authenticate via User account with a studentRef.
      // Legacy model: students authenticate directly as a Student document.
      const ownStudentId = req.user?.studentRef || req.user?._id;

      if (!provided || String(provided) !== String(ownStudentId)) {
        return res.status(403).json({ message: req.t('common.accessDenied', null, 'Access denied') });
      }

      return next();
    }

    // Non-student: defer to existing permission middleware
    return permissionMiddleware(req, res, next);
  };
};
