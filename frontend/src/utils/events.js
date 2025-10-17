// events.js
// Helper yar oo mideeya dhacdooyinka gudaha FE.
// Isticmaal: on(EVENTS.STUDENTS_CHANGED, cb); emitStudentsChanged({ ... }); off(...)

export const EVENTS = {
  SUBJECTS_CHANGED: 'subjects:changed',
  STUDENTS_CHANGED: 'students:changed',
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
export function emitStudentsChanged(detail) { emit(EVENTS.STUDENTS_CHANGED, detail); }
