

import mongoose from "mongoose";

import { PERMISSION_CONTRACT, getPermissionStorageKey, normalizePermissionsForApi } from "../utils/permissions.js";

const buildModulePermissionSchema = (actions = []) => {
  const fields = {};

  // Define only actions allowed for this module.
  for (const actionName of actions) {
    if (!actionName || actionName === 'full') continue;
    fields[getPermissionStorageKey(actionName)] = { type: Boolean, default: false };
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
  // Secondary phone (not unique)
  phone2: { type: String, trim: true, default: '' },

  // Address fields (same shape as Teacher/Student for UI reuse)
  nationality: { type: String, trim: true, default: 'Somalia' },
  isSomali: { type: Boolean, default: true },
  residenceRegionId: { type: String, trim: true, default: '' },
  residenceDistrictId: { type: String, trim: true, default: '' },
  residenceNeighborhood: { type: String, trim: true, default: '' },

  // Used by finance/payroll flows for staff/teacher salaries.
  salary: { type: Number, default: 0, min: 0 },

  // Internal staff code for staff/admin accounts (auto-generated).
  // Format: ST-000001
  staffCode: { type: String, unique: true, sparse: true, index: true, trim: true },

  // Derived from permissions (server source-of-truth).
  unit: { type: String, trim: true, default: '' },
  jobTitle: { type: String, trim: true, default: '' },

  photo: {
    url: { type: String, trim: true, default: '' },
    path: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
  },

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

const applyPermissionsTransform = (ret) => {
  try {
    if (ret && typeof ret === 'object') {
      ret.permissions = normalizePermissionsForApi(ret.permissions);
    }
  } catch {
    // ignore
  }
  return ret;
};

userSchema.set('toObject', {
  transform(_doc, ret) {
    return applyPermissionsTransform(ret);
  },
});

userSchema.set('toJSON', {
  transform(_doc, ret) {
    return applyPermissionsTransform(ret);
  },
});

export default mongoose.model("User", userSchema);
