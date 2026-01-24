

import mongoose from "mongoose";

const modulePermissionSchema = new mongoose.Schema({
  view: { type: Boolean, default: false },
  add: { type: Boolean, default: false },
  edit: { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
  // Students-specific action: reset a student's password to the default
  resetPassword: { type: Boolean, default: false },
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
  email: { type: String, unique: true, sparse: true },
  phone: { type: String, unique: true, sparse: true },

  password: String,

  // Session invalidation: increment to invalidate all existing JWTs for this account.
  tokenVersion: { type: Number, default: 0 },

  // For teacher accounts: link User -> Teacher profile
  teacherRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },

  // For student accounts: link User -> Student profile
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },

  // Used for forcing initial password change (staff/teacher)
  mustChangePassword: { type: Boolean, default: false },

  role: {
    type: String,
    enum: ["admin", "staff", "teacher", "student"],
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

    // Security / auth lock notifications (admin always allowed; staff needs explicit perms)
    security: { type: modulePermissionSchema, default: () => ({}) },

  },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  // Progressive backoff level. Increments each time the account hits the max failed attempts threshold.
  // Resets on successful login.
  loginCooldownLevel: { type: Number, default: 0 },

  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
