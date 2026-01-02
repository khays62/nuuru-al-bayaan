import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js"; // adjust path if needed

dotenv.config(); // <-- load variables from .env

const MONGO_URI = process.env.MONG_URL;

async function createAdmin() {
  try {
    if (!MONGO_URI) throw new Error("MongoDB URI is missing in .env");

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const username = "admin";
    const password = "admin123"; // choose your password
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
        announcements: { full: true },
      },
      status: "active",
    });

    await adminUser.save();
    console.log("🎉 Admin user created successfully!");
    console.log("Username:", username);
    console.log("Password:", password);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (err) {
    console.error("❌ Error creating admin:", err);
    await mongoose.disconnect();
  }
}

createAdmin();
