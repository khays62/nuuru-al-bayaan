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

    // Find in Admin, User, or Student
    let user =
      (await Admin.findById(decoded.id).select("-password")) ||
      (await User.findById(decoded.id).select("-password")) ||
      (await Student.findById(decoded.id).select("-password"));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Store user & role
    req.user = user;
    req.user.role = decoded.role || user.role || "student";

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
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
