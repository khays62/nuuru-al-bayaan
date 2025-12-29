import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Student from "../models/Student.js";
import { logAction } from "../utils/logAction.js";


const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;



export const login = async (req, res) => {
  try {
    const { username, studentId, password } = req.body;
    const loginId = username || studentId;

    
    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: "Username / Student ID and password required",
      });
    }

    let user = null;
    let role = "unknown";

    // 🔍 1. Try Admin/User
    user = (await Admin.findOne({ username: loginId })) || (await User.findOne({ username: loginId }));
    if (user) role = user.role;

    // 🔍 2. Try Student
    if (!user) {
      user = await Student.findOne({ studentId: loginId });
      if (user) role = "student";
    }

    // ❌ Not found
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 🚫 Account lock applies ONLY to User accounts
    if (role === "staff") {
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(403).json({
          success: false,
          message: `Account locked. Try again in ${remaining} minutes.`,
        });
      }
    }

    // ✅ Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      if (role === "staff") {
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME);
        }
        await user.save();
      }
      return res.status(400).json({ success: false, message: "Invalid password" });
    }

    // ✅ Reset failed attempts for User accounts
    if (role === "staff") {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    // 🚫 Inactive check applies only to User accounts
    // if ((role === "registration_office" || role === "exam_office") && user.status?.toLowerCase() !== "active") {
    //   return res.status(403).json({ success: false, message: "User is inactive" });
    // }

    // 🚫 Inactive accounts — Users and Students
if (role !== "admin" && user.status?.toLowerCase() !== "active") {
  return res.status(403).json({ 
    success: false, 
    message: `${role === "student" ? "Student" : "User"} is inactive` 
  });
}


    // 🔐 JWT Token
    const token = jwt.sign(
      { id: user._id, username: user.username || user.studentId, role },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "24h" }
    );

    // 🍪 Cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // ✅ Success response
    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username || user.studentId,
        fullName: user.fullName,
        role,
      },
    });

  
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const resetLoginLockout = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({ message: "Login lockout reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const verifyUser = async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // ✅ Decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    const { id } = decoded;

    // 🔍 Try to find user in Admin, User, or Student collections
    let user =
      (await Admin.findById(id).select("-password")) ||
      (await User.findById(id).select("-password")) ||
      (await Student.findById(id).select("-password"));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🚫 Block inactive accounts
    if (user.status && user.status.toLowerCase() !== "active") {
      return res.status(403).json({ message: "User is inactive" });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("❌ Verify error:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ------------------ LOGOUT CONTROLLER ------------------
export const logout = (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({ message: "Logged out successfully" });
};