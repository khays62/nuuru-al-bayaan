// events.js
// Helper yar oo mideeya dhacdooyinka gudaha FE.
// Isticmaal: on(EVENTS.STUDENTS_CHANGED, cb); emitStudentsChanged({ ... }); off(...)

export const EVENTS = {
  SUBJECTS_CHANGED: 'subjects:changed',
  TIMETABLE_CHANGED: 'timetable:changed',
  STUDENTS_CHANGED: 'students:changed',
  TEACHERS_CHANGED: 'teachers:changed',
  USERS_CHANGED: 'users:changed',
  GRADE_SECTIONS_CHANGED: 'gradeSections:changed',
  COHORTS_CHANGED: 'cohorts:changed',
  TRANSFERS_CHANGED: 'transfers:changed',
  PROMOTIONS_CHANGED: 'promotions:changed',
  EXAMS_CHANGED: 'exams:changed',
  RESULTS_CHANGED: 'results:changed',
  ATTENDANCE_CHANGED: 'attendance:changed',
  TRANSCRIPT_CHANGED: 'transcript:changed',
  ANNOUNCEMENTS_CHANGED: 'announcements:changed',
};

export function emit(name, detail) {
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // SSR ama environments aan lahayn window: iska dhaaf si nabad ah
  }
}

export function on(name, cb) {
  try {
    window.addEventListener(name, cb);
  } catch {
    // SSR ama environments aan lahayn window
  }
}

export function off(name, cb) {
  try {
    window.removeEventListener(name, cb);
  } catch {
    // SSR ama environments aan lahayn window
  }
}

export function emitSubjectsChanged(detail) { emit(EVENTS.SUBJECTS_CHANGED, detail); }
export function emitTimetableChanged(detail) { emit(EVENTS.TIMETABLE_CHANGED, detail); }
export function emitStudentsChanged(detail) { emit(EVENTS.STUDENTS_CHANGED, detail); }
export function emitTeachersChanged(detail) { emit(EVENTS.TEACHERS_CHANGED, detail); }
export function emitUsersChanged(detail) { emit(EVENTS.USERS_CHANGED, detail); }
export function emitGradeSectionsChanged(detail) { emit(EVENTS.GRADE_SECTIONS_CHANGED, detail); }
export function emitCohortsChanged(detail) { emit(EVENTS.COHORTS_CHANGED, detail); }
export function emitTransfersChanged(detail) { emit(EVENTS.TRANSFERS_CHANGED, detail); }
export function emitPromotionsChanged(detail) { emit(EVENTS.PROMOTIONS_CHANGED, detail); }
export function emitExamsChanged(detail) { emit(EVENTS.EXAMS_CHANGED, detail); }
export function emitResultsChanged(detail) { emit(EVENTS.RESULTS_CHANGED, detail); }
export function emitAttendanceChanged(detail) { emit(EVENTS.ATTENDANCE_CHANGED, detail); }
export function emitTranscriptChanged(detail) { emit(EVENTS.TRANSCRIPT_CHANGED, detail); }
export function emitAnnouncementsChanged(detail) { emit(EVENTS.ANNOUNCEMENTS_CHANGED, detail); }
