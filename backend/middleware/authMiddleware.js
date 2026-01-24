import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import { getCookieConfig } from "../config/cookies.js";

// 🔐 Protect middleware
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Server auth is not configured (JWT_SECRET missing)" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find in Admin, User, or Student (keep type so we can normalize role safely)
    // CUTOVER: Students are User accounts now.
    const admin = await Admin.findById(decoded.id).select("-password");
    const user = admin ? null : await User.findById(decoded.id).select("-password");

    const principal = admin || user;

    if (!principal) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔒 Session invalidation (global logout): reject stale tokens.
    try {
      const currentVersion = Number(principal.tokenVersion || 0);
      const tokenV = Number(decoded?.v || 0);
      if (tokenV !== currentVersion) {
        res.clearCookie('auth_token', { httpOnly: true, ...getCookieConfig() });
        return res.status(401).json({ message: 'Not authorized' });
      }
    } catch {
      // ignore
    }

    // If the account is security-locked (24h), force logout.
    // We treat loginCooldownLevel>=4 as the security lock level.
    try {
      const lockUntilMs = principal.lockUntil?.getTime ? principal.lockUntil.getTime() : 0;
      const level = Number(principal.loginCooldownLevel || 0);
      if (lockUntilMs && lockUntilMs > Date.now() && level >= 4) {
        res.clearCookie('auth_token', { httpOnly: true, ...getCookieConfig() });
        return res.status(401).json({ message: 'Not authorized' });
      }
    } catch {
      // ignore
    }

    // Store user & role
    req.user = principal;
    const rawRole = decoded.role || principal.role || 'staff';
    req.user.role = typeof rawRole === "string" ? rawRole.toLowerCase() : "staff";

    next();
  } catch (err) {
    console.error("❌ Protect middleware error:", err);
    return res.status(401).json({ message: "Not authorized" });
  }
};

// 🎓 Role-based authorization middleware
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });
    const allowed = roles.map((r) => String(r).toLowerCase());
    const actual = String(req.user.role || "").toLowerCase();
    if (!allowed.includes(actual)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
