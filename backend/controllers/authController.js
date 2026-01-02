import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Student from "../models/Student.js";

const DEFAULT_STUDENT_PASSWORD = "123456";


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

    const storedPassword = user.password || '';
    const looksHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');

    // ✅ Password check (support legacy plaintext)
    const isMatch = looksHashed
      ? await bcrypt.compare(password, storedPassword)
      : String(password) === String(storedPassword);
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

    const mustChangePassword = role === 'student'
      ? (looksHashed
        ? await bcrypt.compare(DEFAULT_STUDENT_PASSWORD, storedPassword)
        : String(storedPassword) === DEFAULT_STUDENT_PASSWORD)
      : false;

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
        mustChangePassword,
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
      // Not logged in (no cookie): this is a normal state on first load.
      // Return 200 to avoid noisy console errors in the frontend.
      return res.status(200).json({ success: false, user: null });
    }

    // ✅ Decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    } catch (err) {
      // Invalid/expired token: clear cookie and treat as logged out.
      res.clearCookie("auth_token", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      return res.status(200).json({ success: false, user: null });
    }
    const { id, role: tokenRole } = decoded;

    // 🔍 Try to find user in Admin, User, or Student collections
    let user =
      (await Admin.findById(id).select("-password")) ||
      (await User.findById(id).select("-password")) ||
      (await Student.findById(id).select("-password"));

    if (!user) {
      // Stale token: clear cookie and treat as logged out.
      res.clearCookie("auth_token", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      return res.status(200).json({ success: false, user: null });
    }

    // 🚫 Block inactive accounts
    if (user.status && user.status.toLowerCase() !== "active") {
      // Optional: clear cookie so the client doesn't keep retrying.
      res.clearCookie("auth_token", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
      return res.status(403).json({ message: "User is inactive" });
    }

    // Normalize payload for frontend: ensure role exists (Student docs don't store role)
    const userObj = typeof user.toObject === 'function' ? user.toObject() : user;
    if (!userObj.role && tokenRole) userObj.role = tokenRole;

    let mustChangePassword = false;
    if (tokenRole === 'student') {
      try {
        const studentPwd = await Student.findById(id).select('password').lean();
        if (studentPwd?.password) {
          const pwd = studentPwd.password;
          const hashed = typeof pwd === 'string' && pwd.startsWith('$2');
          mustChangePassword = hashed
            ? await bcrypt.compare(DEFAULT_STUDENT_PASSWORD, pwd)
            : String(pwd) === DEFAULT_STUDENT_PASSWORD;
        }
      } catch {
        // non-blocking
      }
    }

    userObj.mustChangePassword = mustChangePassword;

    return res.status(200).json({
      success: true,
      user: userObj,
    });
  } catch (err) {
    console.error("❌ Verify error:", err);
    // Fallback: treat unexpected errors as logged out.
    return res.status(200).json({ success: false, user: null });
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