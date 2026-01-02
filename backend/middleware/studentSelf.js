// Allows student accounts to access only their own resources,
// while keeping existing permission checks for staff/admin.

export const allowStudentSelfOr = (permissionMiddleware, opts = {}) => {
  const { param = 'id', query = null } = opts;

  return (req, res, next) => {
    const role = req.user?.role;

    // Student: must match own id
    if (role === 'student') {
      const provided = query ? req.query?.[query] : req.params?.[param];

      if (!provided || String(provided) !== String(req.user?._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      return next();
    }

    // Non-student: defer to existing permission middleware
    return permissionMiddleware(req, res, next);
  };
};
