import GradeSection from '../models/GradeSection.js';
import Enrollment from '../models/Enrollment.js';

export async function ensureClassIndexes() {
  try {
    // Work on the shared 'classes' collection via the GradeSection model
    const indexes = await GradeSection.collection.indexes();
    const legacy = indexes.find(ix => {
      const keys = Object.keys(ix.key || {});
      return keys.includes('grade') && keys.includes('academicYear') && keys.includes('shift') && keys.includes('className');
    });
    if (legacy) {
      try {
        await GradeSection.collection.dropIndex(legacy.name);
        console.log(`[indexes] Dropped legacy index ${legacy.name} on classes (legacy className)`);
      } catch (e) {
        console.warn('[indexes] Failed to drop legacy index (might already be dropped):', e.message);
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
}
