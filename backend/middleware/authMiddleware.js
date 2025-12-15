// import jwt from "jsonwebtoken";

// // export const protect = (req, res, next) => {
// //   const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>
// //   if (!token) return res.status(401).json({ message: "No token provided" });

// //   try {
// //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
// //     req.user = decoded;
// //     next();
// //   } catch (err) {
// //     res.status(401).json({ message: "Invalid token" });
// //   }
// // };


// export const protect = async (req, res, next) => {
//   try {
//     const header = req.headers.authorization;
//     if (!header) return res.status(401).json({ message: "No token provided" });

//     const token = header.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
//     req.user = await Admin.findById(decoded.id).select("-password");
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Not authorized" });
//   }
// };


// import jwt from "jsonwebtoken";
// import User from "../models/User.js";
// import Admin from "../models/Admin.js";

// export const protect = async (req, res, next) => {
//   try {
//     // 🔹 Try to get the token from cookies
//     const token = req.cookies?.auth_token;

//     if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     // 🔍 Verify the token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

//     // 🔎 Try to find the user in Admin or User collections
//     let user = await Admin.findById(decoded.id).select("-password");
//     if (!user) {
//       user = await User.findById(decoded.id).select("-password");
//     }

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     req.user = user; // store the user in the request
//     next();
//   } catch (err) {
//     console.error("❌ Protect middleware error:", err);
//     return res.status(401).json({ message: "Not authorized" });
//   }
// };


// import jwt from "jsonwebtoken";
// import Admin from "../models/Admin.js";
// import User from "../models/User.js";
// import Student from "../models/Student.js";

// // 🔐 Protect middleware
// export const protect = async (req, res, next) => {
//   try {
//     const token = req.cookies?.auth_token;

//     if (!token) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     // ✅ Verify the JWT
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");

//     // 🔍 Try to find user in Admin, User, or Student
//     let user =
//       (await Admin.findById(decoded.id).select("-password")) ||
//       (await User.findById(decoded.id).select("-password")) ||
//       (await Student.findById(decoded.id).select("-password"));

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Store user & role for next handlers
//     req.user = user;
//     req.user.role = decoded.role || user.role || "student";

//     next();
//   } catch (err) {
//     console.error("❌ Protect middleware error:", err);
//     return res.status(401).json({ message: "Not authorized" });
//   }
// };

// // 🎓 Role-based authorization middleware
// export const authorizeRoles = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user) return res.status(401).json({ message: "Not authorized" });
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({ message: "Access denied" });
//     }
//     next();
//   };
// };


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
