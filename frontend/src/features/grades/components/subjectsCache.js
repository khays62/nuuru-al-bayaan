// Simple in-memory cache for subjects per grade to reduce redundant requests
// Key: gradeId -> subjects array
const subjectsCache = {};

export function getCachedSubjects(gradeId) {
  return subjectsCache[gradeId];
}

export function setCachedSubjects(gradeId, list) {
  subjectsCache[gradeId] = list;
}

export function invalidateSubjectsCache(gradeId) {
  if (gradeId) delete subjectsCache[gradeId];
  else {
    for (const k of Object.keys(subjectsCache)) delete subjectsCache[k];
  }
}
