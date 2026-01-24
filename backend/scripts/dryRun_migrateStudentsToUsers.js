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
  if (s === 'active') return 'active';
  if (s === 'inactive') return 'inactive';
  // fallback: keep system safe (inactive blocks login)
  return 'inactive';
}

async function main() {
  const startedAt = new Date();
  await connectDB();

  const report = {
    startedAt: startedAt.toISOString(),
    mode: 'DRY_RUN',
    scanned: 0,
    eligibleWithStudentId: 0,
    skippedNoStudentId: 0,
    alreadyLinkedByStudentRef: 0,
    alreadyHasUsernameUser: 0,
    wouldCreate: 0,
    conflicts: 0,
    warnings: 0,
    conflictDetails: [],
    warningsDetails: [],
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
      // Detect mismatched usernames (should usually be studentId)
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

    // Username conflicts: studentId must be unique across ALL Users.
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

    // Determine if password is hashed and whether it equals default.
    const storedPassword = String(student.password || '');
    const looksHashed = storedPassword.startsWith('$2');

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
      // Unexpected: student passwords should be hashed by hooks.
      report.warnings += 1;
      report.warningsDetails.push({
        type: 'STUDENT_PASSWORD_NOT_HASHED',
        studentId,
        studentObjectId: String(student._id),
      });
      mustChangePassword = String(storedPassword) === DEFAULT_STUDENT_PASSWORD;
    }

    const wouldUser = {
      fullName: student.fullName,
      username: studentId,
      role: 'student',
      studentRef: String(student._id),
      status: normalizeStudentStatusToUserStatus(student.status),
      mustChangePassword,
      passwordStrategy: looksHashed ? 'COPY_HASH_FROM_STUDENT' : 'HASH_STUDENT_PASSWORD',
    };

    report.wouldCreate += 1;
    if (report.samplesWouldCreate.length < 10) {
      report.samplesWouldCreate.push(wouldUser);
    }
  }

  report.finishedAt = new Date().toISOString();

  // Print summary
  console.log('--- DRY RUN: migrate Students -> Users (student accounts) ---');
  console.log(JSON.stringify({
    scanned: report.scanned,
    eligibleWithStudentId: report.eligibleWithStudentId,
    skippedNoStudentId: report.skippedNoStudentId,
    alreadyLinkedByStudentRef: report.alreadyLinkedByStudentRef,
    conflicts: report.conflicts,
    warnings: report.warnings,
    wouldCreate: report.wouldCreate,
  }, null, 2));

  // Write report file
  const safeStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = new URL(`./dry_run_migrate_students_to_users_report_${safeStamp}.json`, import.meta.url);
  await (await import('fs/promises')).writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Report written: ${outPath.pathname}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Dry-run migration failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
