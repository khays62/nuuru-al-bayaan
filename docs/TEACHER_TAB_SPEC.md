# Qeexidda Teacher Tab (Nuuru Al-Bayaan)

Qoraalkan wuxuu sharxayaa qaabka, xogta (models), API-yada, UI/flow, iyo xuquuqda (roles/permissions) ee Teacher tab si uu ugu shaqeeyo si nadiif ah isla markaana u xirmo qaybaha kale ee nidaamka.

## Ujeeddooyinka
- Macallinka ama maamulka:
  - Arko fasallada iyo maadooyinka uu hayo (xiriir GS + Subject).
  - Arko roostarka ardayda ee fasalka (liiska ardayda ee GS ee AY-ga).
  - Samee xaadirin degdeg ah (Present/Absent/Late/Excused) per date/period.
  - Arko jadwalkiisa (Timetable) iyo samee Qorshe Cashar (Lesson Plan).
  - (Phase 2) Geliyo qiimeyn/marks/assignments.

## Eray-bixin
- **Roster:** Liiska ardayda ee fasal (GradeSection) xilligan AY-ga. Wuxuu ka yimaadaa `Enrollment` (student ↔ AY+GS). Default: arday **active**.
- **Teacher Assignment:** Xiriirka macallin ↔ GS+Subject, qeexaya fasalka iyo maaddada uu hayo (main/assistant).
- **Timetable:** Jadwal usbuucle: maalinta, waqtiga, room, subject, teacher, GS.
- **Lesson Plan:** Qorshe cashar taariikhaysan: mawduuc, ujeeddo, agab, qoraal.
- **Attendance Record:** Diiwaan xaadirin (date, period, student, status, markedBy).

## Models (Backend)
- **Teacher**
  - `fullName`, `employeeId`, `email`, `phone`, `status` (active/inactive), `specializations` (subjects), `shifts`.
- **TeacherAssignment**
  - `teacher`, `gradeSection`, `subject`, `role` (main/assistant), `createdAt`.
  - Index: `(teacher, gradeSection, subject)`.
- **Timetable**
  - `gradeSection`, `subject`, `teacher`, `isBreak`, `dayOfWeek` (0-6), `startTime`, `endTime`, `room`.
  - Index: `(teacher, dayOfWeek, startTime)`.
- **LessonPlan**
  - `teacher`, `academicYear`, `gradeSection`, `subject`, `date`, `topic`, `objectives`, `materials`, `notes`, `attachments?`.
  - Index: `(teacher, academicYear, gradeSection, subject, date)`.
- **AttendanceRecord**
  - `date`, `gradeSection`, `periodCode?`, `student`, `status` (present/absent/late/excused/...), `markedBy` (Teacher optional).
  - Metadata: `markedByUser`, `markedByRole`, `updatedByUser`, `updatedByRole`, `remarks`.
  - Index: `(gradeSection, date, periodCode, student)`.

Ku tiirsanaanta jira: `Enrollment`, `GradeSection` (leh `subjects`), `Subject`, `AcademicYear`, `Student`.

## API (Spec Kooban)
- **Teachers**
  - `GET /api/teachers?status&subject&shift`
  - `POST /api/teachers`, `PATCH /api/teachers/:id`, `DELETE (soft)`
- **Assignments**
  - `GET /api/teachers/:id/assignments`
  - `POST /api/teachers/:id/assignments` ({ gsId, subjectId, role? })
  - `DELETE /api/teachers/:id/assignments/:assignmentId`
- **Timetable**
  - `GET /api/timetable/slots?gs&day&from&to&mine=1`
    - Teacher scope: haddii `mine=1` → slots-ka teacher-ka; haddii kale → timetable-ka fasallada uu assigned u yahay.
- **Roster**
  - `GET /api/teachers/:id/roster?ay&gs` (default active students)
- **Attendance**
  - `POST /api/attendance/mark` → `{ date, gradeSectionId, periodCode, markedBy?, items:[{studentId,status,remarks?}] }`
  - `GET /api/attendance?gradeSectionId&date&periodCode&rosterScope`
- **Lesson Plans**
  - `GET /api/lesson-plans?teacher&ay&gs&subject&dateRange`
  - `POST /api/lesson-plans`, `PATCH /api/lesson-plans/:id`, `DELETE`

## Security & Permissions
- Roles: `admin`, `headteacher`, `teacher`.
- **Teacher**: Arkaa oo wax ka geliyaa kaliya assignments-kiisa (scope check via `TeacherAssignment`).
- **Admin/HeadTeacher**: Arkaa dhammaan, maareeyaa assignments/timetable.
- Middleware: role-based + scope checks; audit logs for attendance changes; rate limits bulk marking.

## Sidebar & Routes (Frontend)
- **Sidebar (Teacher role):** Teacher Dashboard, Roster, Timetable, Lesson Plans, Attendance.
- **Sidebar (Admin/HeadTeacher):** Ku dar maamulka: Teachers list, Assignments, Timetable setup.
- **Routes:**
  - `/teacher` → TeacherDashboardPage
  - `/teacher/roster?ay&gs&subject` → TeacherRosterPage
  - `/teacher/timetable?ay` → TeacherTimetablePage
  - `/teacher/lesson-plans?ay&gs&subject&dateRange` → TeacherLessonPlansPage
  - `/teacher/attendance?ay&gs&dateRange` → TeacherAttendanceHistoryPage
  - Admin: `/admin/teachers`, `/admin/teachers/:id/assignments`, `/admin/timetables`

## UI/Flow (MVP)
- **Teacher Dashboard:**
  - Cards: “Fasalada aan hayo”, “Jadwalka Maanta”, “Qorshe Cashar”.
  - Quick actions: “Xaadirin Degdeg”, “Samee Qorshe Cashar”.
- **Roster View:**
  - Filters: AY, GS, Subject; table arday; toggles status; bulk ops; Save → AttendanceRecord.
- **Timetable View:**
  - Usbuucle; click period → attendance/lesson plan modal.
- **Lesson Plans View:**
  - List + Add/Edit; topic/objectives/materials.
- **Attendance History:**
  - Date range, summary counts, export (optional).

## Empty States & Errors
- Assignments la’aan: “La xiriir koordinator si laguugu xiro fasal/maado.”
- Timetable la’aan: “Jadwal lama dejin.”
- Permission denied: Teacher wuxuu isku dayaa fasal aanu haysan.
- Network errors: retry banners; optional optimistic updates attendance.

## Waxyaabaha Lagama Maarmaanka ah ka hor Teacher
- `Teacher` model + mapping `User ↔ Teacher`.
- `TeacherAssignment` si loo oggolaado scope.
- `AttendanceRecord` si xaadirin u shaqeyso.
- `Timetable` si view jadwal u buuxsamo.
- Indexes sax ah; middleware permissions; audit logs.

## Tallaabooyinka Horumarinta (MVP → Attendance)
1. Models: Teacher, TeacherAssignment, Timetable, AttendanceRecord, LessonPlan.
2. Endpoints: Teachers CRUD, Assignments CRUD, Timetable read, Roster read, Attendance mark/get, Lesson Plans CRUD.
3. Frontend: routes + skeleton pages (Dashboard, Roster, Timetable, Lesson Plans, Attendance History).
4. Security: role + scope checks; audit attendance.
5. Reports (optional): attendance summary by class/teacher/date.
