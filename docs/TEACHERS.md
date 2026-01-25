# Teachers

Last updated: 25 Jan 2026

Teachers module-ku wuxuu maamulaa macallimiinta, logins-kooda, iyo assignments (teacher ↔ GS+Subject).

---

## 1) API
Base: `/api/teachers`

### Teachers CRUD
- `GET /api/teachers?status&search`
- `POST /api/teachers`
- `PATCH /api/teachers/:id` (also supports `PUT`)
- `DELETE /api/teachers/:id`

### Login helper
- `POST /api/teachers/:id/create-login`
  - Creates login haddii teacher hore u jiray oo user uusan jirin.

### Assignments
- `GET /api/teachers/:id/assignments`
- `POST /api/teachers/:id/assignments` body: `{ gsId, subjectId, role? }`
- `DELETE /api/teachers/:id/assignments/:assignmentId`

### Roster
- `GET /api/teachers/:id/roster?ay&gs`

---

## 2) Rules
- Assignment conflict guard: subject-ka GS-kaas hal teacher oo keliya.
- Teacher role scope: roster/timetable/attendance gudaha GS uu assigned u yahay.

---

## 3) Frontend
- Feature: `frontend/src/features/teachers/*`
- Teacher pages (admin-side): list, add/edit, assignments.
- Teacher side: my classes / roster / timetable / attendance (scope-based).

Faahfaahin: eeg `TEACHER_WORKFLOW.md` iyo `TEACHER_TAB_SPEC.md`.
