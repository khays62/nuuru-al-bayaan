// export const checkPermission = (module, action) => {
//   return (req, res, next) => {
//     const user = req.user;

//     if (!user) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const modulePerm = user.permissions?.[module];

//     if (!modulePerm) {
//       return res
//         .status(403)
//         .json({ message: `No permissions found for module: ${module}` });
//     }

//     // full = allow all actions
//     if (modulePerm.full) return next();

//     if (!modulePerm[action]) {
//       return res.status(403).json({
//         message: `You do not have permission to ${action} ${module}`,
//       });
//     }

//     next();
//   };
// };


// export const checkPermission = (module, action) => {
//   return (req, res, next) => {
//     const perm = req.user?.permissions?.[module];
//     if (!perm) return res.status(403).json({ message: "No permission module found" });

//     if (perm.full) return next(); // FULL ACCESS OVERRIDES

//     if (!perm[action]) {
//       return res.status(403).json({
//         message: `You do not have permission to ${action} ${module}`
//       });
//     }

//     next();
//   };
// };


// export const checkPermission = (module, action) => {
//   return (req, res, next) => {
//     // ADMIN ALWAYS ALLOWED
//     if (req.user?.role === "admin") return next();

//     const perm = req.user?.permissions?.[module];
//     if (!perm)
//       return res.status(403).json({ message: "No permission module found" });

//     if (perm.full) return next();

//     if (!perm[action]) {
//       return res.status(403).json({
//         message: `You do not have permission to ${action} ${module}`
//       });
//     }

//     next();
//   };
// };

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
