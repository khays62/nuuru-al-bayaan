import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import { getDefaultInitialPassword } from '../utils/defaultPasswords.js';

dotenv.config();

const DEFAULT_STUDENT_PASSWORD = getDefaultInitialPassword();

function normalizeStudentStatusToUserStatus(studentStatus) {
  const s = String(studentStatus || '').trim().toLowerCase();
  return s === 'active' ? 'active' : 'inactive';
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const startedAt = new Date();
  const apply = hasFlag('--apply');

  await connectDB();

  const report = {
    startedAt: startedAt.toISOString(),
    mode: apply ? 'APPLY' : 'DRY_RUN',
    scanned: 0,
    eligibleWithStudentId: 0,
    skippedNoStudentId: 0,
    alreadyLinkedByStudentRef: 0,
    created: 0,
    wouldCreate: 0,
    conflicts: 0,
    warnings: 0,
    conflictDetails: [],
    warningsDetails: [],
    samplesCreated: [],
    samplesWouldCreate: [],
  };

  const cursor = Student.find({}).select('_id studentId fullName password status').cursor();

  for await (const student of cursor) {
    report.scanned += 1;

    const studentId = String(student.studentId || '').trim();
    if (!studentId) {
      report.skippedNoStudentId += 1;
      continue;
    }
    report.eligibleWithStudentId += 1;

    const existingLinked = await User.findOne({ studentRef: student._id })
      .select('_id username role studentRef')
      .lean();

    if (existingLinked) {
      report.alreadyLinkedByStudentRef += 1;
      if (String(existingLinked.username || '') !== studentId) {
        report.warnings += 1;
        report.warningsDetails.push({
          type: 'LINKED_USERNAME_MISMATCH',
          studentId,
          studentObjectId: String(student._id),
          userObjectId: String(existingLinked._id),
          userUsername: existingLinked.username,
        });
      }
      continue;
    }

    const usernameOwner = await User.findOne({ username: studentId })
      .select('_id username role studentRef teacherRef email')
      .lean();

    if (usernameOwner) {
      report.conflicts += 1;
      report.conflictDetails.push({
        type: 'USERNAME_CONFLICT',
        studentId,
        studentObjectId: String(student._id),
        existingUserObjectId: String(usernameOwner._id),
        existingUserRole: usernameOwner.role,
        existingUserStudentRef: usernameOwner.studentRef ? String(usernameOwner.studentRef) : null,
        existingUserTeacherRef: usernameOwner.teacherRef ? String(usernameOwner.teacherRef) : null,
        existingUserEmail: usernameOwner.email || null,
      });
      continue;
    }

    const storedPassword = String(student.password || '');
    const looksHashed = storedPassword.startsWith('$2');

    if (!looksHashed) {
      report.warnings += 1;
      report.warningsDetails.push({
        type: 'STUDENT_PASSWORD_NOT_HASHED',
        studentId,
        studentObjectId: String(student._id),
      });
    }

    let mustChangePassword = true;
    if (looksHashed) {
      try {
        mustChangePassword = await bcrypt.compare(DEFAULT_STUDENT_PASSWORD, storedPassword);
      } catch {
        report.warnings += 1;
        report.warningsDetails.push({
          type: 'BCRYPT_COMPARE_FAILED',
          studentId,
          studentObjectId: String(student._id),
        });
      }
    } else {
      mustChangePassword = storedPassword === DEFAULT_STUDENT_PASSWORD;
    }

    const userDoc = {
      fullName: student.fullName,
      username: studentId,
      role: 'student',
      studentRef: student._id,
      status: normalizeStudentStatusToUserStatus(student.status),
      mustChangePassword,
      password: looksHashed ? storedPassword : await bcrypt.hash(storedPassword || DEFAULT_STUDENT_PASSWORD, 10),
    };

    if (!apply) {
      report.wouldCreate += 1;
      if (report.samplesWouldCreate.length < 10) {
        report.samplesWouldCreate.push({
          fullName: userDoc.fullName,
          username: userDoc.username,
          role: userDoc.role,
          studentRef: String(userDoc.studentRef),
          status: userDoc.status,
          mustChangePassword: userDoc.mustChangePassword,
          passwordStrategy: looksHashed ? 'COPY_HASH_FROM_STUDENT' : 'HASH_STUDENT_PASSWORD',
        });
      }
      continue;
    }

    try {
      const created = await User.create([userDoc]);
      report.created += 1;
      if (report.samplesCreated.length < 10) {
        report.samplesCreated.push({
          userObjectId: String(created?.[0]?._id),
          username: userDoc.username,
          studentRef: String(student._id),
        });
      }
    } catch (e) {
      report.warnings += 1;
      report.warningsDetails.push({
        type: 'CREATE_USER_FAILED',
        studentId,
        studentObjectId: String(student._id),
        message: e?.message || String(e),
      });
    }
  }

  report.finishedAt = new Date().toISOString();

  console.log('--- migrate Students -> Users (student accounts) ---');
  console.log(JSON.stringify({
    mode: report.mode,
    scanned: report.scanned,
    eligibleWithStudentId: report.eligibleWithStudentId,
    skippedNoStudentId: report.skippedNoStudentId,
    alreadyLinkedByStudentRef: report.alreadyLinkedByStudentRef,
    conflicts: report.conflicts,
    warnings: report.warnings,
    wouldCreate: report.wouldCreate,
    created: report.created,
  }, null, 2));

  const safeStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = new URL(`./migrate_students_to_users_report_${safeStamp}.json`, import.meta.url);
  await (await import('fs/promises')).writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report written: ${outPath.pathname}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Migration failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
