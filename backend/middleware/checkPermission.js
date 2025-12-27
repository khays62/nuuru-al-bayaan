export const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "User not authenticated" });

    // ADMIN ALWAYS ALLOWED
    if (req.user.role === "admin") return next();

    const perm = req.user.permissions?.[module];

    if (!perm)
      return res.status(403).json({ message: `No permissions for ${module}` });

    if (perm.full === true) return next();

    if (perm[action] !== true) {
      return res.status(403).json({
        message: `You do not have permission to ${action} ${module}`
      });
    }

    return next();
  };
};
