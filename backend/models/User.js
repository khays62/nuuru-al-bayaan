

import mongoose from "mongoose";

const modulePermissionSchema = new mongoose.Schema({
  view: { type: Boolean, default: false },
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  // Teacher-specific action: manage teacher assignments
  assign: { type: Boolean, default: false },
  // Extra actions used by some pages
  input: { type: Boolean, default: false },
  export: { type: Boolean, default: false },
  preview: { type: Boolean, default: false },
  promote: { type: Boolean, default: false },
  deactivate: { type: Boolean, default: false },
  reactivate: { type: Boolean, default: false }, 
  transfer: { type: Boolean, default: false },
  archive: { type: Boolean, default: false },
  activate: { type: Boolean, default: false },
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
    teachers: { type: modulePermissionSchema, default: () => ({}) },
    transfers: { type: modulePermissionSchema, default: () => ({}) },
    subjects: { type: modulePermissionSchema, default: () => ({}) },
    grades: { type: modulePermissionSchema, default: () => ({}) },
    exams: { type: modulePermissionSchema, default: () => ({}) },
    cohorts: { type: modulePermissionSchema, default: () => ({}) },
    results: { type: modulePermissionSchema, default: () => ({}) },
    transcript: { type: modulePermissionSchema, default: () => ({}) }, 
    promotions: { type: modulePermissionSchema, default: () => ({}) }, // ✅ add this

    timetable: { type: modulePermissionSchema, default: () => ({}) },
    attendance: { type: modulePermissionSchema, default: () => ({}) },
    attendanceReports: { type: modulePermissionSchema, default: () => ({}) },
    announcements: { type: modulePermissionSchema, default: () => ({}) },

  },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
