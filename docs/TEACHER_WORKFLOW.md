# Teacher Workflow (Lifecycle)

Last updated: 25 Jan 2026

Qoraankan wuxuu sharxayaa socodka Teacher (abuuris → login → assignments → roster/timetable/attendance) iyo APIs-ka la xiriira.

---

## 1) Abuuris Teacher + Login

**Backend:**
- `POST /api/teachers`
  - Body: `{ fullName, teacherId?, email?, phone?, status? }`

**Waxa server-ku sameeyo:**
- Haddii `teacherId` la waayo → auto-generate (tusaale `ID01`, `ID02`).
- Abuuraa `Teacher`.
- Si otomaatig ah u abuuraa `User` (role=`teacher`) oo ku xiran `teacherRef`.
  - Username: `teacherId`
  - Password: `DEFAULT_INITIAL_PASSWORD` (backend/.env)
  - `mustChangePassword=true`

Haddii login creation uu fashilmo (duplicate username/email), server-ku wuxuu sameeyaa rollback si aan Teacher “orphan” u noqon.

---

## 2) Assignments (Teacher ↔ GradeSection+Subject)

**Model:** `TeacherAssignment` (ma laha academicYear)
- Unique: `(teacher, gradeSection, subject)`

**Backend:**
- `GET /api/teachers/:id/assignments`
- `POST /api/teachers/:id/assignments` body: `{ gsId, subjectId, role? }`
- `DELETE /api/teachers/:id/assignments/:assignmentId`

**Rules:**
- Subject-ka GS-kaas (subjectId) hal teacher oo keliya ayaa lagu assign-gareyn karaa (conflict guard).

---

## 3) Roster (AY + GS)

Roster-ka ardayda waa Enrollment-based.

**Backend:**
- `GET /api/teachers/:id/roster?ay=<academicYearId>&gs=<gradeSectionId>`

**Scope:**
- Teacher-koodu wuxuu arki karaa kaliya GS uu assigned u yahay (assignment exists guard).

---

## 4) Timetable (Slots)

**Backend:**
- `GET /api/timetable/slots?gs=<gradeSectionId>&day=<0..6>&from=HH:mm&to=HH:mm&mine=1`

**Scope:**
- Teacher role: waxaa loo xadidayaa fasallada uu assigned u yahay.
- `mine=1`: soo celi slots-ka teacher-ka.

---

## 5) Attendance (Mark + Reports)

**Backend:**
- `POST /api/attendance/mark`
  - Body: `{ date:'YYYY-MM-DD', gradeSectionId, periodCode, markedBy?, items:[{ studentId, status, remarks? }] }`
- `GET /api/attendance?gradeSectionId&date&periodCode&rosterScope`
- Reports:
  - `GET /api/attendance/reports/summary`
  - `GET /api/attendance/reports/details`
  - `GET /api/attendance/reports/student-range`

**Rules muhiim ah:**
- `periodCode='DAY'` (Daily) vs lesson periods: lama isku dari karo isla GS+date.
- Teacher scope waxaa lagu xadidayaa gradeSection assignments.

---

## 6) Permissions (Kooban)
- Teacher: read/write gudaha fasallada uu assigned u yahay.
- Admin/HeadTeacher/Staff: maamulka teachers/assignments/timetable/attendance (permission-based).

Faahfaahin dheeraad ah: eeg `TEACHER_TAB_SPEC.md`.
