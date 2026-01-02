import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Student from "../models/Student.js";

// 🔐 Protect middleware
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

    // Find in Admin, User, or Student (keep type so we can normalize role safely)
    const admin = await Admin.findById(decoded.id).select("-password");
    const staff = admin ? null : await User.findById(decoded.id).select("-password");
    const student = admin || staff ? null : await Student.findById(decoded.id).select("-password");

    const user = admin || staff || student;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Store user & role
    req.user = user;
    // If the principal is a Student document, always treat it as role=student.
    const rawRole = student ? "student" : (decoded.role || user.role || "student");
    req.user.role = typeof rawRole === "string" ? rawRole.toLowerCase() : "student";

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
