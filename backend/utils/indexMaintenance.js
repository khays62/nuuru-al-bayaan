import GradeSection from '../models/GradeSection.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';

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

export async function ensureIndexes() {
  await ensureClassIndexes();
  await ensureEnrollmentIndexes();
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
}
