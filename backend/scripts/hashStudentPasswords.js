import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';

// One-time migration:
// Hash any student.password values that are still plaintext.
// Safe to re-run: it skips passwords that already look bcrypt-hashed.

const looksHashed = (value) => typeof value === 'string' && value.startsWith('$2');

function safeMongoTarget(uri) {
  try {
    const u = new URL(uri);
    return `${u.protocol}//${u.host}${u.pathname || ''}`;
  } catch {
    return '(unparseable uri)';
  }
}

async function main() {
  dotenv.config();
  const uri = process.env.MONG_URL;
  if (!uri) throw new Error('MONG_URL is missing. Set it in backend/.env');

  try {
    console.log(
      `[hashStudentPasswords] Connecting to MongoDB (${safeMongoTarget(uri)})...`
    );
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    console.log(
      `[hashStudentPasswords] Connected (host=${mongoose.connection.host} db=${mongoose.connection.name}).`
    );

    const query = {
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: { $not: /^\$2/ } },
      ],
    };

    const candidates = await Student.find(query)
      .select('_id studentId password')
      .lean();
    if (!candidates.length) {
      console.log('[hashStudentPasswords] No students need hashing.');
      return;
    }

    console.log(`[hashStudentPasswords] Found ${candidates.length} students to check...`);

    const salt = await bcrypt.genSalt(10);
    const ops = [];
    let skipped = 0;

    for (const s of candidates) {
      const raw = typeof s.password === 'string' && s.password.length > 0 ? s.password : '123456';
      if (looksHashed(raw)) {
        skipped += 1;
        continue;
      }
      const hashed = await bcrypt.hash(String(raw), salt);
      ops.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { password: hashed } },
        },
      });
    }

    if (!ops.length) {
      console.log(`[hashStudentPasswords] Nothing to update (skipped=${skipped}).`);
      return;
    }

    const result = await Student.bulkWrite(ops, { ordered: false });
    console.log(
      `[hashStudentPasswords] Updated=${result.modifiedCount} matched=${result.matchedCount} skipped=${skipped}`
    );
  } finally {
    await mongoose.disconnect().catch(() => {});
    console.log('[hashStudentPasswords] Done.');
  }
}

main().catch((err) => {
  console.error('[hashStudentPasswords] Failed:', err);
  process.exitCode = 1;
});
