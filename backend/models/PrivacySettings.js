import mongoose from 'mongoose';

const { Schema } = mongoose;

const loginProtectionSchema = new Schema({
  enabled: { type: Boolean, default: true },
  stageOneAttempts: { type: Number, default: 10, min: 1, max: 100 },
  stageOneCooldownSeconds: { type: Number, default: 15, min: 1, max: 3600 },
  stageTwoAttempts: { type: Number, default: 5, min: 1, max: 100 },
  stageTwoCooldownSeconds: { type: Number, default: 30, min: 1, max: 7200 },
  stageThreeAttempts: { type: Number, default: 3, min: 1, max: 100 },
  stageThreeCooldownSeconds: { type: Number, default: 60, min: 1, max: 86_400 },
  lockoutSeconds: { type: Number, default: 86_400, min: 60, max: 2_592_000 },
  maxIdentifierLength: { type: Number, default: 128, min: 16, max: 512 },
  maxPasswordLength: { type: Number, default: 256, min: 8, max: 512 },
}, { _id: false });

const passwordPolicySchema = new Schema({
  minLength: { type: Number, default: 6, min: 6, max: 128 },
  maxLength: { type: Number, default: 256, min: 8, max: 512 },
  requireUppercase: { type: Boolean, default: false },
  requireLowercase: { type: Boolean, default: false },
  requireNumber: { type: Boolean, default: false },
  requireSymbol: { type: Boolean, default: false },
}, { _id: false });

const sessionPolicySchema = new Schema({
  idleTimeoutMinutes: { type: Number, default: 30, min: 5, max: 1_440 },
}, { _id: false });

const studentDashboardSchema = new Schema({
  profile: { type: Boolean, default: true },
  enrollments: { type: Boolean, default: true },
  transcript: { type: Boolean, default: true },
  attendance: { type: Boolean, default: true },
  timetable: { type: Boolean, default: true },
  finance: { type: Boolean, default: true },
  library: { type: Boolean, default: true },
  transfers: { type: Boolean, default: true },
}, { _id: false });

const privacySettingsSchema = new Schema({
  singletonKey: { type: String, required: true, default: 'privacy-policy', unique: true, index: true },
  loginProtection: { type: loginProtectionSchema, default: () => ({}) },
  passwordPolicy: { type: passwordPolicySchema, default: () => ({}) },
  sessionPolicy: { type: sessionPolicySchema, default: () => ({}) },
  studentDashboard: { type: studentDashboardSchema, default: () => ({}) },
}, {
  timestamps: true,
  minimize: false,
});

export default mongoose.models.PrivacySettings || mongoose.model('PrivacySettings', privacySettingsSchema);