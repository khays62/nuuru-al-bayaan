import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import { PERMISSION_CONTRACT } from "../utils/permissions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load backend/.env (regardless of working directory)
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const MONGO_URI = process.env.MONG_URL || process.env.MONGO_URI || process.env.MONGODB_URI;

const parseArgValue = (key) => {
  const index = process.argv.findIndex((a) => a === key || a.startsWith(`${key}=`));
  if (index === -1) return undefined;
  const arg = process.argv[index];
  if (arg.includes("=")) return arg.split("=").slice(1).join("=");
  return process.argv[index + 1];
};

const hasFlag = (flag) => process.argv.includes(flag);

const buildFullPermissions = () => {
  const permissions = {};
  for (const moduleName of Object.keys(PERMISSION_CONTRACT)) {
    permissions[moduleName] = { full: true };
  }
  return permissions;
};

const pickDefined = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
};

async function createOrUpdateAdmin() {
  let connected = false;
  try {
    if (!MONGO_URI) throw new Error("MongoDB URI is missing (expected MONG_URL in backend/.env)");

    await mongoose.connect(MONGO_URI);
    connected = true;
    console.log("✅ Connected to MongoDB");

    const username = parseArgValue("--username") || process.env.ADMIN_USERNAME || "admin";
    const fullName = parseArgValue("--fullName") || process.env.ADMIN_FULL_NAME || "Super Admin";
    const emailRaw = parseArgValue("--email") || process.env.ADMIN_EMAIL;
    const email = emailRaw ? String(emailRaw).trim().toLowerCase() : undefined;

    // IMPORTANT: Don't set a default phone because phone has a unique index.
    const phoneRaw = parseArgValue("--phone") || process.env.ADMIN_PHONE;
    const phone = phoneRaw ? String(phoneRaw).trim() : undefined;

    const wantResetPassword = hasFlag("--reset-password") || process.env.ADMIN_RESET_PASSWORD === "true";
    const mustChangePasswordFlag = parseArgValue("--must-change-password") ?? process.env.ADMIN_MUST_CHANGE_PASSWORD;
    const mustChangePassword = mustChangePasswordFlag === undefined ? undefined : mustChangePasswordFlag === "true";

    // Password sources (in priority order): CLI --password, ADMIN_PASSWORD env, and optional DEFAULT_INITIAL_PASSWORD.
    const cliPassword = parseArgValue("--password");
    const envPassword = process.env.ADMIN_PASSWORD;
    const allowDefaultInitial = hasFlag("--use-default-initial-password") || process.env.ALLOW_DEFAULT_ADMIN_PASSWORD === "true";
    const defaultInitial = allowDefaultInitial ? process.env.DEFAULT_INITIAL_PASSWORD : undefined;

    const password = cliPassword || envPassword || defaultInitial;
    if (!password) {
      throw new Error(
        "Admin password not provided. Set ADMIN_PASSWORD in backend/.env OR run with --password. " +
          "(Optional for dev) add --use-default-initial-password to reuse DEFAULT_INITIAL_PASSWORD."
      );
    }

    const or = [];
    if (username) or.push({ username });
    if (email) or.push({ email });
    if (or.length === 0) {
      throw new Error("Missing identity fields: provide --username and/or --email (or set ADMIN_USERNAME/ADMIN_EMAIL)");
    }

    const existing = await User.findOne({ $or: or });

    const permissions = buildFullPermissions();
    const updateBase = pickDefined({
      fullName,
      username,
      email,
      phone,
      role: "admin",
      status: "active",
      permissions,
    });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const doc = new User({
        ...updateBase,
        password: hashedPassword,
        mustChangePassword: mustChangePassword ?? true,
      });
      await doc.save();
      console.log("🎉 Admin user created successfully!");
      console.log("Username:", username);
      console.log("Password: (provided via env/CLI)");
    } else {
      const next = existing;
      Object.assign(next, updateBase);

      if (wantResetPassword) {
        next.password = await bcrypt.hash(password, 10);
        next.mustChangePassword = mustChangePassword ?? true;
      } else if (mustChangePassword !== undefined) {
        next.mustChangePassword = mustChangePassword;
      }

      await next.save();
      console.log("✅ Admin user already existed; updated successfully!");
      console.log("Username:", next.username);
      console.log("Password:", wantResetPassword ? "(reset via env/CLI)" : "(unchanged)");
    }
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    process.exitCode = 1;
  } finally {
    if (connected) {
      try {
        await mongoose.disconnect();
        console.log("✅ Disconnected from MongoDB");
      } catch {
        // ignore
      }
    }
  }
}

createOrUpdateAdmin();
