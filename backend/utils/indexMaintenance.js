import GradeSection from '../models/GradeSection.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import Timetable from '../models/Timetable.js';
import ExamType from '../models/ExamType.js';
import Exam from '../models/Exam.js';
import ExamScore from '../models/ExamScore.js';
import User from '../models/User.js';
import AiChatThread from '../models/AiChatThread.js';

function inferDefaultsForExamType(typeName, idx, total) {
  const name = String(typeName || '').toLowerCase();
  // Common defaults: Mid-term=40, Final=60
  if (total === 2) {
    if (name.includes('mid')) return { order: 1, maxScore: 40 };
    if (name.includes('final')) return { order: 2, maxScore: 60 };
  }
  // Fallback: even split to 100
  const base = Math.floor(100 / Math.max(total, 1));
  const remainder = 100 - base * Math.max(total, 1);
  const maxScore = base + (idx < remainder ? 1 : 0);
  return { order: idx + 1, maxScore };
}

async function ensureExamIndexesAndDefaults() {
  // Index maintenance + data defaults for the new versioned exam template fields.
  try {
    // Drop legacy unique index on ExamType.typeName (used to prevent multiple versions).
    try {
      const indexes = await ExamType.collection.indexes();
      const legacy = indexes.find(ix => ix.name === 'typeName_1' && ix.unique);
      if (legacy) {
        await ExamType.collection.dropIndex('typeName_1');
        console.log('[indexes] Dropped legacy ExamType index typeName_1 (unique)');
      }
    } catch (e) {
      console.warn('[indexes] Could not inspect/drop legacy ExamType indexes:', e.message);
    }

    // Drop legacy unique index on Exam(examType, academicYear, gradeSection) without templateVersion.
    try {
      const exIndexes = await Exam.collection.indexes();
      const legacy = exIndexes.find(ix => ix.name === 'examType_1_academicYear_1_gradeSection_1' && ix.unique);
      if (legacy) {
        await Exam.collection.dropIndex('examType_1_academicYear_1_gradeSection_1');
        console.log('[indexes] Dropped legacy Exam index examType_1_academicYear_1_gradeSection_1 (unique)');
      }
    } catch (e) {
      console.warn('[indexes] Could not inspect/drop legacy Exam indexes:', e.message);
    }

    await ExamType.syncIndexes();
    await Exam.syncIndexes();
    await ExamScore.syncIndexes();
    console.log('[indexes] Exam/ExamType/ExamScore indexes synchronized');

    // Data defaults/migration
    await ExamType.updateMany(
      { templateVersion: { $exists: false } },
      { $set: { templateVersion: 1 } }
    );
    await ExamType.updateMany(
      { templateTotal: { $exists: false } },
      { $set: { templateTotal: 100 } }
    );
    await ExamType.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );

    const activeCount = await ExamType.countDocuments({ isActive: true });
    if (!activeCount) {
      await ExamType.updateMany({ templateVersion: 1 }, { $set: { isActive: true } });
    }

    // Fill maxScore/order for v1 if missing (safe defaults)
    const v1 = await ExamType.find({ templateVersion: 1 }).sort({ createdAt: 1, typeName: 1 }).lean();
    if (v1.length) {
      const ops = [];
      for (let i = 0; i < v1.length; i++) {
        const t = v1[i];
        const needsMax = !(Number.isFinite(Number(t.maxScore)) && Number(t.maxScore) > 0);
        const needsOrder = !(Number.isFinite(Number(t.order)) && Number(t.order) > 0);
        if (!needsMax && !needsOrder) continue;
        const inferred = inferDefaultsForExamType(t.typeName, i, v1.length);
        const set = {};
        if (needsMax) set.maxScore = inferred.maxScore;
        if (needsOrder) set.order = inferred.order;
        ops.push({ updateOne: { filter: { _id: t._id }, update: { $set: set } } });
      }
      if (ops.length) await ExamType.bulkWrite(ops);
    }

    await Exam.updateMany(
      { templateVersion: { $exists: false } },
      { $set: { templateVersion: 1 } }
    );
  } catch (e) {
    console.warn('[indexes] Could not sync/migrate exam indexes/defaults:', e.message);
  }
}

export async function ensureClassIndexes() {
  try {
    // Work on the shared 'classes' collection via the GradeSection model
    const indexes = await GradeSection.collection.indexes();
    // Drop any legacy index that includes academicYear on GradeSection
    const legacyWithAY = indexes.filter(ix => Object.keys(ix.key || {}).includes('academicYear'));
    for (const ix of legacyWithAY) {
      try {
        await GradeSection.collection.dropIndex(ix.name);
        console.log(`[indexes] Dropped legacy GradeSection index ${ix.name} (contained academicYear)`);
      } catch (e) {
        console.warn('[indexes] Failed to drop legacy GradeSection index:', ix.name, e.message);
      }
    }
    // Ensure new indexes from schema (including unique on section)
    await GradeSection.syncIndexes();
    console.log('[indexes] GradeSection indexes synchronized');
  } catch (e) {
    console.warn('[indexes] Could not verify/sync GradeSection indexes:', e.message);
  }
}

export async function ensureEnrollmentIndexes() {
  try {
    await Enrollment.syncIndexes();
    console.log('[indexes] Enrollment indexes synchronized');
  } catch (e) {
    console.warn('[indexes] Could not sync Enrollment indexes:', e.message);
  }
}

export async function ensureTimetableIndexes() {
  try {
    const indexes = await Timetable.collection.indexes();
    // Drop any legacy index that includes academicYear on Timetable
    const legacyWithAY = indexes.filter(ix => Object.keys(ix.key || {}).includes('academicYear'));
    for (const ix of legacyWithAY) {
      try {
        await Timetable.collection.dropIndex(ix.name);
        console.log(`[indexes] Dropped legacy Timetable index ${ix.name} (contained academicYear)`);
      } catch (e) {
        console.warn('[indexes] Failed to drop legacy Timetable index:', ix.name, e.message);
      }
    }
    await Timetable.syncIndexes();
    console.log('[indexes] Timetable indexes synchronized');
  } catch (e) {
    console.warn('[indexes] Could not sync Timetable indexes:', e.message);
  }
}

export async function ensureIndexes() {
  // Ensure User indexes (avoid unique email blocking multiple null/missing values)
  try {
    const indexes = await User.collection.indexes();
    const emailIx = indexes.find(ix => ix.name === 'email_1' && ix.unique);
    // If the legacy unique email index is not sparse, it treats missing email as null and blocks inserts.
    if (emailIx && !emailIx.sparse) {
      try {
        await User.collection.dropIndex('email_1');
        console.log('[indexes] Dropped legacy User index email_1 (non-sparse unique)');
      } catch (e) {
        console.warn('[indexes] Failed to drop legacy User index email_1:', e.message);
      }
    }
    await User.syncIndexes();
    console.log('[indexes] User indexes synchronized');
  } catch (e) {
    console.warn('[indexes] Could not sync User indexes:', e.message);
  }

  await ensureClassIndexes();
  await ensureEnrollmentIndexes();
  await ensureTimetableIndexes();
  await ensureExamIndexesAndDefaults();
  // Ensure Student indexes and fix legacy unique studentId index without partial filter
  try {
    const indexes = await Student.collection.indexes();
    const stuIdIx = indexes.find(ix => ix.name === 'studentId_1');
    // Drop if it exists without partialFilterExpression so we can recreate with the new partial unique
    if (stuIdIx && !stuIdIx.partialFilterExpression) {
      try {
        await Student.collection.dropIndex('studentId_1');
        console.log('[indexes] Dropped legacy studentId_1 index (no partial filter)');
      } catch (e) {
        console.warn('[indexes] Failed to drop legacy studentId_1 index:', e.message);
      }
    }
    await Student.syncIndexes();
    console.log('[indexes] Student indexes synchronized');
  } catch (e) {
    console.warn('[indexes] Could not sync Student indexes:', e.message);
  }

  // AI chat: per-user thread uniqueness
  try {
    await AiChatThread.syncIndexes();
    console.log('[indexes] AiChatThread indexes synchronized');
  } catch (e) {
    console.warn('[indexes] Could not sync AiChatThread indexes:', e.message);
  }
}
