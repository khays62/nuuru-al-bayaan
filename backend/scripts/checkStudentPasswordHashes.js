import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import bcrypt from 'bcryptjs';

async function main() {
  dotenv.config();
  const uri = process.env.MONG_URL;
  if (!uri) throw new Error('MONG_URL is missing in backend/.env');

  try {
    console.log('[checkStudentPasswordHashes] Connecting...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    console.log(
      `[checkStudentPasswordHashes] Connected (host=${mongoose.connection.host} db=${mongoose.connection.name}).`
    );

    const total = await Student.countDocuments({});
    const hashed = await Student.countDocuments({ password: /^\$2/ });
    const notHashed = await Student.countDocuments({
      $or: [
        { password: { $exists: false } },
        { password: null },
        { password: { $not: /^\$2/ } },
      ],
    });

    console.log('[checkStudentPasswordHashes] Counts:', {
      total,
      hashed,
      notHashed,
    });

    if (hashed > 0) {
      const anyStudent = await Student.findOne({ password: /^\$2/ })
        .select('studentId password')
        .lean();
      if (anyStudent) {
        const ok = await bcrypt.compare('123456', String(anyStudent.password));
        console.log('[checkStudentPasswordHashes] Default password check:', {
          studentId: anyStudent.studentId,
          matches123456: ok,
        });
      }
    }

    const sample = await Student.find({ password: { $not: /^\$2/ } })
      .select('studentId password')
      .limit(5)
      .lean();

    if (sample.length) {
      console.log('[checkStudentPasswordHashes] Sample non-hashed:', sample);
    }
  } finally {
    await mongoose.disconnect().catch(() => {});
    console.log('[checkStudentPasswordHashes] Done.');
  }
}

main().catch((err) => {
  const message = err && err.stack ? err.stack : String(err);
  console.error('[checkStudentPasswordHashes] Failed:', message);
  process.exitCode = 1;
});
