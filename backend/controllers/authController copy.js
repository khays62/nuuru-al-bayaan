// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";
// import User from "../models/User.js";
// import Admin from "../models/Admin.js";
// import Student from "../models/Student.js";

// const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
// const MAX_ATTEMPTS = 3;


// const STUDENT_LOCK_TIME = 15 * 60 * 1000; // 15 minutes
// const STUDENT_MAX_ATTEMPTS = 3;

// export const studentLogin = async (req, res) => {
//   try {
//     const { studentId, password } = req.body;
//     if (!studentId || !password) {
//       return res
//         .status(400)
//         .json({ message: "Student ID and password required" });
//     }

//     const student = await Student.findOne({ studentId });
//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     // 🚫 Check lockout
//     if (student.lockUntil && student.lockUntil > Date.now()) {
//       const remaining = Math.ceil((student.lockUntil - Date.now()) / 60000);
//       return res.status(403).json({
//         message: `Account locked due to multiple failed attempts. Try again in ${remaining} minutes.`,
//       });
//     }

//     // 🔑 Check password
//     const isMatch =
//       password === "123456" || (await student.comparePassword(password));

//     if (!isMatch) {
//       student.failedLoginAttempts = (student.failedLoginAttempts || 0) + 1;
//       if (student.failedLoginAttempts >= STUDENT_MAX_ATTEMPTS) {
//         student.lockUntil = new Date(Date.now() + STUDENT_LOCK_TIME);
//         await student.save();
//         return res.status(403).json({
//           message:
//             "Account locked due to multiple failed attempts. Try again in 15 minutes.",
//         });
//       } else {
//         const remaining = STUDENT_MAX_ATTEMPTS - student.failedLoginAttempts;
//         await student.save();
//         return res.status(400).json({
//           message: `Invalid password. ${remaining} attempts remaining before lockout.`,
//         });
//       }
//     }

//     // ✅ Successful login
//     student.failedLoginAttempts = 0;
//     student.lockUntil = null;
//     await student.save();

//     if (student.status !== "Active") {
//       return res.status(403).json({ message: "Student is inactive" });
//     }

//     const token = jwt.sign(
//       { id: student._id, studentId: student.studentId, role: "student" },
//       process.env.JWT_SECRET || "dev_secret",
//       { expiresIn: "7d" }
//     );

//     res.cookie("auth_token", token, {
//       httpOnly: true,
//       sameSite: "strict",
//       secure: process.env.NODE_ENV === "production",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Student login successful",
//       token,
//       student: {
//         id: student._id,
//         fullName: student.fullName,
//         studentId: student.studentId,
//         status: student.status,
//       },
//     });
//   } catch (err) {
//     console.error("❌ Student login error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     console.log("🟢 Received login request:", req.body);

//     const { username, password } = req.body;
//     if (!username || !password) {
//       return res.status(400).json({ message: "Username and password required" });
//     }

//     // 🔍 Find user in User or Admin collections (case-insensitive)
//     let user =
//       (await User.findOne({
//         username: { $regex: `^${username.trim()}$`, $options: "i" },
//       })) ||
//       (await Admin.findOne({
//         username: { $regex: `^${username.trim()}$`, $options: "i" },
//       }));

//     if (!user) {
//       console.log("❌ User not found");
//       return res.status(404).json({ message: "User not found" });
//     }

//     // 🚫 Check lockout
//     if (user.lockUntil && user.lockUntil > Date.now()) {
//       const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
//       return res.status(403).json({
//         message: `Account locked due to multiple failed attempts. Try again in ${remaining} minutes.`,
//       });
//     }

//     // 🧩 Password check (hashed or plain)
//     const isMatch =
//       user.password === password ||
//       (await bcrypt.compare(password, user.password));

//     if (!isMatch) {
//       // ❌ Wrong password — increment failed attempts
//       user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

//       if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
//         user.lockUntil = new Date(Date.now() + LOCK_TIME);
//         await user.save();
//         return res.status(403).json({
//           message:
//             "Account locked due to multiple failed attempts. Try again in 15 minutes.",
//         });
//       } else {
//         const remaining = MAX_ATTEMPTS - user.failedLoginAttempts;
//         await user.save();
//         return res.status(400).json({
//           message: `Invalid password. ${remaining} attempts remaining before lockout.`,
//         });
//       }
//     }

//     // ✅ Reset failed attempts on successful login
//     user.failedLoginAttempts = 0;
//     user.lockUntil = null;
//     await user.save();

//     // 🚫 Block inactive users
//     if (user.status && user.status !== "active") {
//       return res.status(403).json({ message: "User is inactive" });
//     }

//     // 🔐 Generate JWT Token
//     const token = jwt.sign(
//       {
//         id: user._id,
//         username: user.username,
//         role: user.role || "user",
//         permission: user.permission || "full",
//       },
//       process.env.JWT_SECRET || "dev_secret",
//       { expiresIn: "7d" }
//     );

//     // 🍪 Set secure cookie
//     res.cookie("auth_token", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });

//     // ✅ Success response
//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user._id,
//         fullName: user.fullName || "",
//         username: user.username,
//         email: user.email || "",
//         phone: user.phone || "",
//         role: user.role || "user",
//         permission: user.permission || "full",
//       },
//     });
//   } catch (err) {
//     console.error("❌ Login error:", err);
//     return res
//       .status(500)
//       .json({ message: "Server error", error: err.message });
//   }
// };



// export const resetLoginLockout = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const user = await User.findById(id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     user.failedLoginAttempts = 0;
//     user.lockUntil = null;
//     await user.save();

//     res.json({ message: "Login lockout reset successfully" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ------------------ VERIFY USER CONTROLLER ------------------
// export const verifyUser = async (req, res) => {
//   try {
//     const token = req.cookies.auth_token;
//     if (!token) {
//       return res.status(401).json({ message: "Not authenticated" });
//     }

//     // ✅ Decode and verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
//     const { id } = decoded;

//     // 🔍 Fetch user from either User or Admin
//     let user = await User.findById(id).select("-password");
//     if (!user) user = await Admin.findById(id).select("-password");

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // 🚫 Block inactive users again for safety
//     if (user.status && user.status !== "active") {
//       return res.status(403).json({ message: "User is inactive" });
//     }

//     return res.status(200).json({ success: true, user });
//   } catch (err) {
//     console.error("❌ Verify error:", err);
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };

// // ------------------ LOGOUT CONTROLLER ------------------
// export const logout = (req, res) => {
//   res.clearCookie("auth_token", {
//     httpOnly: true,
//     sameSite: "strict",
//     secure: process.env.NODE_ENV === "production",
//   });

//   return res.status(200).json({ message: "Logged out successfully" });
// };


import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Student from "../models/Student.js";

const LOCK_TIME = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;


// const MAX_ATTEMPTS = 5;
// const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

export const login = async (req, res) => {
  try {
    // Accept both studentId and username
    const { username, studentId, password } = req.body;

    const loginId = username || studentId;
    if (!loginId || !password)
      return res.status(400).json({
        success: false,
        message: "Username / Student ID and password required",
      });

    let user = null;
    let role = "unknown";

    // 🔍 1. Try Admin/User
    user =
      (await Admin.findOne({ username: loginId })) ||
      (await User.findOne({ username: loginId }));
    if (user) role = user.role;

    // 🔍 2. Try Student
    if (!user) {
      user = await Student.findOne({ studentId: loginId });
      if (user) role = "student";
    }

    // ❌ Not found
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // 🚫 Account locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minutes.`,
      });
    }

    // ✅ Password check (default for students is "123456")
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME);
        await user.save();
        return res.status(403).json({
          success: false,
          message:
            "Account locked due to failed attempts. Try again in 15 minutes.",
        });
      }
      await user.save();
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }

    // ✅ Reset failed attempts
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // 🚫 Inactive accounts
    if (user.status && user.status.toLowerCase() !== "active") {
      return res
        .status(403)
        .json({ success: false, message: "User is inactive" });
    }

    // 🔐 JWT Token
    const token = jwt.sign(
      { id: user._id, username: user.username || user.studentId, role },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    // 🍪 Cookie
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
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


// export const login = async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     if (!username || !password)
//       return res.status(400).json({ success: false, message: "Student ID and password required" });

//     let user = null;
//     let role = "unknown";

//     // 🔍 First try Admin/User
//     user =
//       (await Admin.findOne({ username })) ||
//       (await User.findOne({ username }));
//     if (user) role = user.role;

//     // 🔍 Then try Student
//     if (!user) {
//       user = await Student.findOne({ studentId: username });
//       if (user) role = "student";
//     }

//     // ❌ Not found
//     if (!user) return res.status(404).json({ success: false, message: "User not found" });

//     // 🚫 Account locked
//     if (user.lockUntil && user.lockUntil > Date.now()) {
//       const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
//       return res.status(403).json({
//         success: false,
//         message: `Account locked. Try again in ${remaining} minutes.`,
//       });
//     }

//     // ✅ Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
//       if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
//         user.lockUntil = new Date(Date.now() + LOCK_TIME);
//         await user.save();
//         return res.status(403).json({
//           success: false,
//           message: "Account locked due to failed attempts. Try again in 15 minutes.",
//         });
//       }
//       await user.save();
//       return res.status(400).json({ success: false, message: "Invalid password" });
//     }

//     // ✅ Reset lock info
//     user.failedLoginAttempts = 0;
//     user.lockUntil = null;
//     await user.save();

//     // 🚫 Check status
//     if (user.status && user.status.toLowerCase() !== "active") {
//       return res.status(403).json({ success: false, message: "User is inactive" });
//     }

//     // 🔐 JWT token
//     const token = jwt.sign(
//       { id: user._id, username: user.username || user.studentId, role },
//       process.env.JWT_SECRET || "dev_secret",
//       { expiresIn: "7d" }
//     );

//     // 🍪 Cookie
//     res.cookie("auth_token", token, {
//       httpOnly: true,
//       sameSite: "strict",
//       secure: process.env.NODE_ENV === "production",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     // ✅ Response
//     res.json({
//       success: true,
//       message: "Login successful",
//       user: {
//         id: user._id,
//         username: user.username || user.studentId,
//         fullName: user.fullName,
//         role,
//       },
//     });
//   } catch (err) {
//     console.error("❌ Login error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     const { username, studentId, password } = req.body;
//     if ((!username && !studentId) || !password) {
//       return res.status(400).json({ message: "Username/Student ID and password required" });
//     }

//     let user = null;
//     let role = "unknown";

//     // 🔍 Try finding admin or user (case-insensitive)
//     if (username) {
//       user =
//         (await Admin.findOne({
//           username: { $regex: `^${username.trim()}$`, $options: "i" },
//         })) ||
//         (await User.findOne({
//           username: { $regex: `^${username.trim()}$`, $options: "i" },
//         }));
//       if (user) role = user.role || "user";
//     }

//     // 🔍 Try student login by ID
//     if (!user && studentId) {
//       user = await Student.findOne({ studentId });
//       if (user) role = "student";
//     }

//     // ❌ Not found
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     // 🚫 Lockout check
//     if (user.lockUntil && user.lockUntil > Date.now()) {
//       const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
//       return res.status(403).json({
//         success: false,
//         message: `Account locked. Try again in ${remaining} minutes.`,
//       });
//     }

//     // ✅ Password check
//     const isMatch =
//       password === "123456" || (await bcrypt.compare(password, user.password));
//     if (!isMatch) {
//       user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

//       if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
//         user.lockUntil = new Date(Date.now() + LOCK_TIME);
//         await user.save();
//         return res.status(403).json({
//           success: false,
//           message: "Account locked due to failed attempts. Try again in 15 minutes.",
//         });
//       } else {
//         const remaining = MAX_ATTEMPTS - user.failedLoginAttempts;
//         await user.save();
//         return res.status(400).json({
//           success: false,
//           message: `Invalid password. ${remaining} attempts left.`,
//         });
//       }
//     }

//     // ✅ Success — reset attempts
//     user.failedLoginAttempts = 0;
//     user.lockUntil = null;
//     await user.save();

//     // 🚫 Check inactive
//     if (user.status && user.status.toLowerCase() !== "active") {
//       return res.status(403).json({ success: false, message: "User is inactive" });
//     }

//     // 🔐 Generate JWT
//     const token = jwt.sign(
//       {
//         id: user._id,
//         username: user.username || user.studentId,
//         role,
//       },
//       process.env.JWT_SECRET || "dev_secret",
//       { expiresIn: "7d" }
//     );

//     // 🍪 Cookie
//     res.cookie("auth_token", token, {
//       httpOnly: true,
//       sameSite: "strict",
//       secure: process.env.NODE_ENV === "production",
//       maxAge: 7 * 24 * 60 * 60 * 1000,
//     });

//     // ✅ Response
//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user._id,
//         username: user.username || user.studentId,
//         fullName: user.fullName || "",
//         role,
//       },
//     });
//   } catch (err) {
//     console.error("❌ Login error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };



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

// ------------------ VERIFY USER CONTROLLER ------------------
// export const verifyUser = async (req, res) => {
//   try {
//     const token = req.cookies.auth_token;
//     if (!token) {
//       return res.status(401).json({ message: "Not authenticated" });
//     }

//     // ✅ Decode and verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
//     const { id } = decoded;

//     // 🔍 Fetch user from either User or Admin
//     let user = await User.findById(id).select("-password");
//     if (!user) user = await Admin.findById(id).select("-password");

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // 🚫 Block inactive users again for safety
//     if (user.status && user.status !== "active") {
//       return res.status(403).json({ message: "User is inactive" });
//     }

//     return res.status(200).json({ success: true, user });
//   } catch (err) {
//     console.error("❌ Verify error:", err);
//     return res.status(401).json({ message: "Invalid or expired token" });
//   }
// };


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