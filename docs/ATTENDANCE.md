# Attendance

Last updated: 25 Jan 2026

Attendance module-ku wuxuu maamulaa xaadirinta (daily ama per-lesson) iyadoo lagu xiro Timetable periods iyo Enrollment roster.

---

## 1) Concepts
- **Roster source:** `Enrollment` (AY + GradeSection) → active students.
- **Record:** `AttendanceRecord` (date + gradeSection + periodCode + student).
- **Daily vs Lesson:**
  - Daily: `periodCode = 'DAY'`
  - Lesson: `periodCode` = code/label period (e.g. `P1`, `P2`)
  - Rule: lama isku dari karo Daily iyo Lesson isla GS+date.

---

## 2) Models
### AttendanceRecord
- `date` (YYYY-MM-DD as UTC date-only gudaha server)
- `gradeSection`
- `periodCode` (required)
- `student`
- `status` ∈ `present|absent|late|excused|sick|medical|family|other`
- `markedBy` (Teacher ref; optional)
- Actor metadata: `markedByUser`, `markedByRole`, `updatedByUser`, `updatedByRole`
- `remarks`

### AttendanceAuditLog
- Stores status changes (oldStatus → newStatus) per student per period.

---

## 3) API
Base: `/api/attendance`

- `POST /api/attendance/mark`
  - Body: `{ date:'YYYY-MM-DD', gradeSectionId, periodCode, markedBy?, items:[{ studentId, status, remarks? }] }`
  - Behavior: bulk upsert; writes audit logs for changes (best-effort)

- `GET /api/attendance`
  - Query (muhiim): `gradeSectionId`, `date`, `periodCode`, `rosterScope`

### Reports
- `GET /api/attendance/reports/summary`
- `GET /api/attendance/reports/details`
- `GET /api/attendance/reports/student-range`

### Student self
- `GET /api/attendance/student/self`
- `GET /api/attendance/student/:id/self` (staff/admin view)

---

## 4) Timetable Integration
- Attendance UI wuxuu isticmaalaa `GET /api/timetable/slots` si uu u helo periods.
- Slot conflicts (teacher/class/room) waxaa lagu xallinayaa controller-ka timetable.

---

## 5) Permissions & Scope
- Teacher: allowed gudaha gradeSections uu assigned u yahay (middleware `requireTeacherAssignment`).
- Student: self attendance only.
- Admin/Staff: permission-based (`attendance` iyo `attendanceReports` modules).
