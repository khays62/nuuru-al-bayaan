const isAuthenticated = (req) => Boolean(req?.user);

// Backward-compatible permission aliases.
// If a new module is checked, we can fall back to one or more legacy modules.
// This prevents breaking existing staff accounts that still have the old keys.
const PERMISSION_ALIASES = Object.freeze({
  // Student Finance tab split (legacy was financeStudent.*)
  financeStudentReceipt: Object.freeze(['financeStudent']),
  financeStudentPreviousBalance: Object.freeze(['financeStudent']),

  // Student Finance config tabs (legacy was financeConfig.*)
  financeStudentAmountType: Object.freeze(['financeConfig']),
  financeStudentFeeType: Object.freeze(['financeConfig']),

  // Accounts tab split (legacy was financeAccounts.*)
  financeAccountsInstitution: Object.freeze(['financeAccounts']),
  financeAccountsOverview: Object.freeze(['financeAccounts']),
  // Ledger used to be protected by financeAudit; keep both for backward compatibility.
  financeAccountsLedger: Object.freeze(['financeAccounts', 'financeAudit']),

  // Expenses tab split (legacy was financeExpenses.*, and categories used financeConfig.*)
  financeExpensesLedger: Object.freeze(['financeExpenses']),
  financeExpensesCategories: Object.freeze(['financeConfig']),
});

const getAliasModules = (moduleName) => {
  const m = String(moduleName || '');
  const list = PERMISSION_ALIASES[m];
  return Array.isArray(list) ? list : [];
};

export const hasPermission = (user, module, action) => {
  if (!user) return false;
  if (user.role === "admin") return true;

  const mod = String(module || '');
  const act = String(action || '');

  const modulePerm = user.permissions?.[mod];
  if (modulePerm) {
    if (modulePerm.full === true) return true;
    return modulePerm?.[act] === true;
  }

  // Alias fallback (legacy module grants new module).
  for (const alias of getAliasModules(mod)) {
    const aliasPerm = user.permissions?.[alias];
    if (!aliasPerm) continue;
    if (aliasPerm.full === true) return true;
    if (aliasPerm?.[act] === true) return true;
  }

  return false;
};

export const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      return res.status(401).json({
        success: false,
        message: req.t('permissions.userNotAuthenticated', null, 'User not authenticated'),
      });
    }

    if (!hasPermission(req.user, module, action)) {
      return res.status(403).json({
        success: false,
        message: req.t(
          'permissions.noPermissionActionModule',
          { action, module },
          `You do not have permission to ${action} ${module}`
        ),
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
      return res.status(401).json({
        success: false,
        message: req.t('permissions.userNotAuthenticated', null, 'User not authenticated'),
      });
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
          ? req.t(
              'permissions.missingRequiredPermissionWithExpected',
              { expected },
              `Missing required permission: ${expected}`
            )
          : req.t('permissions.missingRequiredPermission', null, 'Missing required permission'),
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
      return res.status(401).json({
        success: false,
        message: req.t('permissions.userNotAuthenticated', null, 'User not authenticated'),
      });
    }

    // ADMIN ALWAYS ALLOWED
    if (req.user.role === "admin") return next();

    const mod = String(module || '');
    const direct = req.user?.permissions?.[mod];
    const aliasModules = getAliasModules(mod);
    const aliasPerms = aliasModules.map((m) => ({ module: m, perm: req.user?.permissions?.[m] }))
      .filter((x) => Boolean(x.perm));

    const modulePerm = direct || aliasPerms?.[0]?.perm;
    if (!modulePerm) {
      return res.status(403).json({
        success: false,
        message: req.t(
          'permissions.noPermissionsForModule',
          { module: mod },
          `No permissions found for module: ${mod}`
        ),
      });
    }

    // Mongoose subdocs can have non-enumerable fields; normalize to a plain object
    // before iterating over keys/values.
    const permObj = typeof modulePerm?.toObject === 'function' ? modulePerm.toObject() : modulePerm;

    if (permObj?.full === true) {
      // Prefer the direct module name for audit even if alias is used.
      req.audit = { module: mod, action: 'full' };
      return next();
    }

    const allowForPerm = (obj) => {
      if (!obj) return false;
      const o = typeof obj?.toObject === 'function' ? obj.toObject() : obj;
      if (o?.full === true) return true;
      return Array.isArray(actions) && actions.length
        ? actions.some((a) => o?.[a] === true)
        : Object.entries(o || {}).some(([k, v]) => k !== 'full' && v === true);
    };

    let allow = allowForPerm(modulePerm);

    // If direct module didn't match (or wasn't present), try aliases.
    if (!allow && aliasPerms.length) {
      allow = aliasPerms.some((x) => allowForPerm(x.perm));
    }

    if (!allow) {
      return res.status(403).json({
        success: false,
        message: req.t(
          'permissions.noPermissionAccessModule',
          { module: mod },
          `You do not have permission to access ${mod}`
        ),
      });
    }

    // We don't know which specific action was intended; mark as module access.
    req.audit = { module: mod, action: 'access' };

    return next();
  };
};
