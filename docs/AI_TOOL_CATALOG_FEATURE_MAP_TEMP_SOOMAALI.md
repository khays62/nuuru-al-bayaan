# AI DB Tools — Feature Map (TEMP) — Nuuru Al-Bayaan

Taariikh: 2026-03-01

Ujeeddo: In la muujiyo dhammaan features/modules-ka mashruuca, iyo tools-ka AI ee u dhigma (tool calling) iyadoo la ilaalinayo role/permission/scope.

> Qodob muhiim ah: Tool-ku waa wrapper. Backend enforcement (allowlist + schema + permission + scope + redaction + limits) waa source of truth.

---

## 1) Modules-ka la helay (Backend)

Routes (backend/routes):
- Students, Teachers, GradeSections, Subjects, Cohorts
- Attendance + Attendance Reports
- Timetable
- Exams + Results + Transcript
- Transfers + Promotions
- Announcements
- Finance (accounts/expenses/student finance/payroll/config/audit/print/maintenance)
- Security (locks/reset/unlock/deactivate/activate)
- Setup + Dashboard + Realtime
- AI routes (chat + tool calling)

Models (backend/models) (muhiim):
- Student, Teacher, User, Enrollment, TeacherAssignment
- AttendanceRecord, AttendanceAuditLog, AuditLog
- TransferLog
- Timetable
- Exam, ExamType, ExamScore
- Fee*, Expense, Account, Payroll, StudentFee, PaymentLog, FeeInvoice, FeePayment, FeeTransaction
- Announcement

Permissions contract (backend/utils/permissions.js):
- Modules: students/teachers/transfers/subjects/grades/exams/cohorts/results/transcript/promotions/timetable/attendance/attendanceReports/announcements/security + finance* (granular tabs).

---

## 2) Data Safety Defaults (Project Policy)

- Teacher PII access: **NO** (teacher ma arko phone/email/DOB/address arday).
- Finance outputs: A & B (magac+class; magac+class+amount) — **permission-gated**.
- Date-range: teacher 31 days; staff 90 days; admin 365 days.
- Output: summary-first; lists paged/limited.

Recommended: tools kasta ha soo celiyo `returned`, `total`, `note` (truncated?)

---

## 3) Tool Categories (General)

### 3.1 Summary Tools (Recommended)
- Waxa ay soo celiyaan counts/totals/trends; khatar yar; UX fiican.

### 3.2 Lookup/List Tools
- Waxay soo celiyaan liisas magacyo/IDs (limited + pagination).

### 3.3 Drill-down Tools
- Ka yimaada summary (tusaale “i sii details page 2”).

---

## 4) Tool Catalog Plan (by Module)

### Students module
Admin/Staff:
- `students_list` (exists)
- `student_profile_basic` (planned): basic student profile + current class (redacted PII unless permission)
- `student_enrollment_history` (planned)

Teacher:
- `teacher_class_roster` (exists)

Student:
- `student_self_summary` (exists)

Recommended: student “details” tools ha noqdaan 2-level: basic summary → optional drill-down.


### Teachers module
Admin/Staff:
- `teacher_profile` (exists)
- `teacher_assignments_lookup` (planned): teacher → assigned classes/subjects

Teacher:
- `teacher_assignments` (exists)


### Attendance module
Admin/Staff:
- `attendance_class_summary` (exists)
- `attendance_reports_summary` (planned): report endpoints (summary/details) by date range

Teacher:
- `teacher_attendance_class_summary` (exists)
- `teacher_attendance_range_summary` (planned): trend gudaha 31 days

Student:
- `student_attendance_self_range` (planned) (self-only)

Recommended: attendance tools ha isticmaalaan date-only + strict range limits.


### Timetable module
Admin/Staff:
- `timetable_class_slots` (planned): GS → list slots
- `timetable_teacher_slots` (planned): teacher → list slots

Teacher:
- `teacher_timetable_self` (planned)

Student:
- `student_timetable_self` (planned)

Recommended: timetable read tools waa safe; writes ha ahaadaan UI-only (not AI).


### Exams + Scores module
Admin/Staff:
- `exam_grid_summary` (planned): AY+GS+subject → students + columns + partial scores (limited)
- `exam_class_summary` (planned): averages, missing scores count

Teacher:
- `teacher_exam_class_summary` (planned) (assignment-scoped)

Student:
- `student_results_self` (planned)

Recommended: AI ha u oggolaan “score editing” tools (mutation) ilaa aad si gaar ah u rabtaan; bilow read-only analysis.


### Results module
Admin/Staff:
- `results_rankings_summary` (planned): top/bottom/trend/difficulty (aggregates)

Teacher:
- `teacher_results_summary` (planned) (assigned only)

Student:
- `student_results_self` (planned)


### Transcript module
Admin/Staff:
- `transcript_student_lookup` (planned): q (studentId/name) + AY → transcript summary (limited)

Student:
- `transcript_self` (planned)


### Transfers module
Admin/Staff:
- `transfers_summary` (exists)
- `student_transfer_history` (exists)

Teacher/Student:
- generally not allowed unless policy changes.


### Promotions module
Admin/Staff:
- `promotions_summary` (exists)
- `promotions_preview_summary` (planned): preview counts by class (no mutation)


### Announcements module
Admin/Staff:
- `announcements_summary` (exists)
- `announcements_recent` (planned): last N announcements (safe)

All roles:
- could have read-only recent announcements tool if needed.


### Security/Audit module
Admin/Staff:
- `activity_summary` (exists)
- `logins_today` (exists)
- `security_lockouts_summary` (planned): locked accounts counts

Recommended: security tools = summary only; never return secrets.


### Finance module (granular)
Admin/Staff (only with finance permissions):
- `finance_unpaid_students_summary` (planned): month + optional class → count + total amount + limited list
- `finance_student_balance_lookup` (planned): per-student balance summary
- `finance_expenses_summary` (planned): date range totals by category
- `finance_payroll_summary` (planned): month totals

Teacher/Student:
- forbidden by default.

Recommended: Finance tools should default to summary; amounts only if permission allows.

---

## 5) Recommended Priority Roadmap (practical)

1) Timetable self tools (teacher/student): very low risk, high value.
2) Attendance range summary (teacher) + student self attendance range.
3) Results/transcript read-only summaries.
4) Finance unpaid summary (careful permission + redaction).
5) Drill-down pagination tools.

---

## 6) Notes (Why this works)

- Tools map 1:1 to modules; permission contract already exists.
- Scope enforcement uses Enrollment/TeacherAssignment/studentRef.
- Output limits prevent data dumps.
- Planner step only chooses from allowlist; backend is final gate.

---

TEMP: Document-kan waa roadmap/spec. Marka aad doorataan 10 su’aalood ee ugu badan ee user-yadu weydiiyaan, tools-ka “planned” waa la finalize-gareyn karaa (args + outputs + permissions).
