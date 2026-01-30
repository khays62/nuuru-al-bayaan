

import mongoose from "mongoose";

import { PERMISSION_CONTRACT } from "../utils/permissions.js";

const buildModulePermissionSchema = (actions = []) => {
  const fields = {};

  // Define only actions allowed for this module.
  for (const actionName of actions) {
    if (!actionName || actionName === 'full') continue;
    fields[actionName] = { type: Boolean, default: false };
  }

  // 'full' enables ALL within a module.
  fields.full = { type: Boolean, default: false };

  return new mongoose.Schema(fields, { _id: false });
};

const modulePermissionSchemas = Object.keys(PERMISSION_CONTRACT).reduce((acc, moduleName) => {
  acc[moduleName] = buildModulePermissionSchema(PERMISSION_CONTRACT[moduleName]);
  return acc;
}, {});

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

  permissions: Object.keys(PERMISSION_CONTRACT).reduce((acc, moduleName) => {
    acc[moduleName] = { type: modulePermissionSchemas[moduleName], default: () => ({}) };
    return acc;
  }, {}),

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  // Progressive backoff level. Increments each time the account hits the max failed attempts threshold.
  // Resets on successful login.
  loginCooldownLevel: { type: Number, default: 0 },

  // Announcements notifications: track the last time this user viewed announcements.
  // Used to compute unread count across sessions/devices.
  announcementsLastSeenAt: { type: Date, default: null },

  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
