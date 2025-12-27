// // models/User.js

// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   fullName: String,
//   username: String,
//   email: String,
//   phone: String,
//   password: String,
//   role: {
//     type: String,
//     enum: ["admin", "exam_office", "registration_office" ],
//     default: "registration_office",
//   },
  
//   status: { type: String, enum: ["active", "inactive"], default: "active" },
  
// }, { timestamps: true });

// const User = mongoose.model("User", userSchema);
// export default User;


// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema(
//   {
//     fullName: { type: String, required: true },
//     username: { type: String, required: true, unique: true },
//     email: { type: String, required: true, unique: true },
//     phone: { type: String },
//     password: { type: String, required: true },
//     role: {
//       type: String,
//       enum: ["admin", "exam_office", "registration_office"],
//       default: "registration_office",
//     },
//     permission: {
//       type: String,
//       enum: ["add", "edit", "delete", "full", ""], // "" for admin or empty
//       default: "",
//     },
//     status: { type: String, enum: ["active", "inactive"], default: "active" },
//   },
//   { timestamps: true }
// );

// const User = mongoose.model("User", userSchema);
// export default User;


// import mongoose from "mongoose";

// const userSchema = new mongoose.Schema({
//   fullName: String,
//   username: String,
//   email: String,
//   phone: String,
//   password: String,
//   role: {
//     type: String,
//     enum: ["admin", "exam_office", "registration_office"],
//     default: "registration_office",
//   },
//   permission: {
//     type: String,
//     enum: ["add", "edit", "delete", "full"],
//     default: "",
//   },
//   status: { type: String, enum: ["active", "inactive"], default: "active" },

//   failedLoginAttempts: { type: Number, default: 0 },
//   lockUntil: { type: Date, default: null },
  
// }, { timestamps: true });


// import mongoose from "mongoose";

// const modulePermissionSchema = {
//   add: { type: Boolean, default: false },
//   edit: { type: Boolean, default: false },
//   delete: { type: Boolean, default: false },
//   view: { type: Boolean, default: true },
//   full: { type: Boolean, default: false },
// };

// const userSchema = new mongoose.Schema(
//   {
//     fullName: String,
//     username: String,
//     email: String,
//     phone: String,
//     password: String,

//     role: {
//       type: String,
//       enum: ["admin", "exam_office", "registration_office"],
//       default: "registration_office",
//     },

//     // NEW permission structure
//     permissions: {
//       students: { type: modulePermissionSchema, default: () => ({}) },
//       subjects: { type: modulePermissionSchema, default: () => ({}) },
//       grades: { type: modulePermissionSchema, default: () => ({}) },
//       exams: { type: modulePermissionSchema, default: () => ({}) },
//       cohorts: { type: modulePermissionSchema, default: () => ({}) },
//       results: { type: modulePermissionSchema, default: () => ({}) },
//     },

//     status: { type: String, enum: ["active", "inactive"], default: "active" },

//     failedLoginAttempts: { type: Number, default: 0 },
//     lockUntil: { type: Date, default: null },
//   },
//   { timestamps: true }
// );

// // const User = mongoose.model("User", userSchema);
// // export default User;

// const User = mongoose.model("User", userSchema);
// export default User;


import mongoose from "mongoose";

const modulePermissionSchema = new mongoose.Schema({
  view: { type: Boolean, default: false },
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  deactivate: { type: Boolean, default: false },
  reactivate: { type: Boolean, default: false }, 
  transfer: { type: Boolean, default: false },
  download: { type: Boolean, default: false },
  print: { type: Boolean, default: false },   // ✅ ADD THIS

  full: { type: Boolean, default: false }, // enables ALL
}, { _id: false });

const userSchema = new mongoose.Schema({
  fullName: String,
  // username: String,
  // email: String,
  // phone: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  phone: { type: String, unique: true, sparse: true },

  password: String,

  role: {
    type: String,
    enum: ["admin", "staff"],
    default: "staff",
  },

  permissions: {
    students: { type: modulePermissionSchema, default: () => ({}) },
    subjects: { type: modulePermissionSchema, default: () => ({}) },
    grades: { type: modulePermissionSchema, default: () => ({}) },
    exams: { type: modulePermissionSchema, default: () => ({}) },
    cohorts: { type: modulePermissionSchema, default: () => ({}) },
    results: { type: modulePermissionSchema, default: () => ({}) },
    transcript: { type: modulePermissionSchema, default: () => ({}) }, 
    promotions: { type: modulePermissionSchema, default: () => ({}) }, // ✅ add this

  },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
