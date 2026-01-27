const isAuthenticated = (req) => Boolean(req?.user);

const hasPermission = (user, module, action) => {
  if (!user) return false;
  if (user.role === "admin") return true;

  const modulePerm = user.permissions?.[module];
  if (!modulePerm) return false;

  if (modulePerm.full === true) return true;
  return modulePerm?.[action] === true;
};

export const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    if (!hasPermission(req.user, module, action)) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${action} ${module}`
      });
    }

    // Attach audit context for downstream middleware/logging.
    req.audit = { module, action };

    return next();
  };
};

// Allows access if the user has *any one* of the provided (module, action) permissions.
// Example: checkAnyPermission([{ module: 'grades', action: 'view' }, { module: 'students', action: 'add' }])
export const checkAnyPermission = (requirements = []) => {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // ADMIN ALWAYS ALLOWED
    if (req.user.role === "admin") return next();

    let matched = null;
    const ok = Array.isArray(requirements)
      && requirements.some((r) => {
        if (!r?.module || !r?.action) return false;
        const allowed = hasPermission(req.user, r.module, r.action);
        if (allowed && !matched) matched = r;
        return allowed;
      });

    if (!ok) {
      const expected = (Array.isArray(requirements) ? requirements : [])
        .filter((r) => r?.module && r?.action)
        .map((r) => `${r.module}.${r.action}`)
        .join(" OR ");

      return res.status(403).json({
        success: false,
        message: expected
          ? `Missing required permission: ${expected}`
          : "Missing required permission"
      });
    }

    if (matched) {
      req.audit = { module: matched.module, action: matched.action };
    }

    return next();
  };
};

// Allows access if the user has *any* enabled permission within a module.
// Useful for read/list endpoints where "edit-only" or "deactivate-only" staff
// still need to load data without requiring a separate "view" flag.
//
// Example: checkModuleAnyPermission('students')
// Optional: provide a limited set of actions to consider.
export const checkModuleAnyPermission = (module, actions = []) => {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    // ADMIN ALWAYS ALLOWED
    if (req.user.role === "admin") return next();

    const modulePerm = req.user?.permissions?.[module];
    if (!modulePerm) {
      return res.status(403).json({ success: false, message: `No permissions found for module: ${module}` });
    }

    // Mongoose subdocs can have non-enumerable fields; normalize to a plain object
    // before iterating over keys/values.
    const permObj = typeof modulePerm?.toObject === 'function' ? modulePerm.toObject() : modulePerm;

    if (permObj?.full === true) {
      req.audit = { module, action: 'full' };
      return next();
    }

    const allow = Array.isArray(actions) && actions.length
      ? actions.some((a) => permObj?.[a] === true)
      : Object.entries(permObj || {}).some(([k, v]) => k !== 'full' && v === true);

    if (!allow) {
      return res.status(403).json({ success: false, message: `You do not have permission to access ${module}` });
    }

    // We don't know which specific action was intended; mark as module access.
    req.audit = { module, action: 'access' };

    return next();
  };
};
