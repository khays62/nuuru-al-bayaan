import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import ExamType from "../models/ExamType.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer backend/.env regardless of working directory
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
dotenv.config();

const MONGO_URI = process.env.MONG_URL;

async function seedExamTemplates() {
  try {
    if (!MONGO_URI) throw new Error("MongoDB URI is missing in backend/.env (MONG_URL)");

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const existingCount = await ExamType.countDocuments({});
    const force = String(process.env.EXAM_TEMPLATE_FORCE || "").trim() === "1";

    if (existingCount > 0 && !force) {
      const versions = await ExamType.distinct("templateVersion");
      console.log("ℹ️ Exam templates already exist; skipping seed.");
      console.log("Existing templateVersion(s):", versions);
      console.log("If you really want to overwrite version 1, re-run with EXAM_TEMPLATE_FORCE=1");
      return;
    }

    // For empty DB (or forced re-seed) we seed templateVersion=1
    const templateVersion = 1;
    const templateTotal = 100;

    if (force) {
      await ExamType.deleteMany({ templateVersion });
    }

    // Mark this as the active/default template version.
    await ExamType.updateMany({ isActive: true }, { $set: { isActive: false } });

    const docs = [
      {
        typeName: "Mid-term",
        templateVersion,
        maxScore: 40,
        templateTotal,
        order: 1,
        isActive: true,
      },
      {
        typeName: "Final",
        templateVersion,
        maxScore: 60,
        templateTotal,
        order: 2,
        isActive: true,
      },
    ];

    await ExamType.insertMany(docs, { ordered: true });

    console.log("🎉 Seeded exam template successfully!");
    console.log("templateVersion:", templateVersion);
    console.log("Components: Mid-term=40, Final=60; total=100");
  } catch (err) {
    console.error("❌ Failed to seed exam templates:", err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.disconnect();
      console.log("✅ Disconnected from MongoDB");
    } catch {
      // ignore
    }
  }
}

seedExamTemplates();
