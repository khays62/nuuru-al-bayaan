import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer backend/.env regardless of working directory
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config();

const MONGO_URI = process.env.MONG_URL;

async function createAdmin() {
  try {
    if (!MONGO_URI) throw new Error("MongoDB URI is missing in .env");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Remove old admin if exists
    await User.deleteOne({ username, role: "admin" });

    // Create new admin
    const adminUser = new User({
      fullName: "Super Admin",
      username,
      email: "admin@example.com",
      phone: "1234567890",
      password: hashedPassword,
      role: "admin",
      permissions: {
        students: { full: true },
        teachers: { full: true },
        transfers: { full: true },
        subjects: { full: true },
        grades: { full: true },
        exams: { full: true },
        cohorts: { full: true },
        results: { full: true },
        transcript: { full: true },
        promotions: { full: true },
        timetable: { full: true },
        attendance: { full: true },
        attendanceReports: { full: true },
        security: { full: true },
        announcements: { full: true }
      },
      status: "active"
    });

    await adminUser.save();
    console.log("🎉 Admin user created successfully!");
    console.log("Username:", username);
    console.log("Password:", password);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  }
}

createAdmin();
