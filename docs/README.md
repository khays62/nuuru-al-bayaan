# Design and Implementation of a Web-Based Academic Management System for Nuuru Al-Bayaan Islamic Institute

Kani waa index‑ka dukumentiyada mashruuca. Dhammaan faylasha hoos ku xusan waxay sharxayaan ujeeddo, qaab‑dhismeed, API‑yo, xogta, iyo sida loo isticmaalo/loo rakibo nidaamka.

- OVERVIEW.md — Dulmar guud (Af‑Soomaali): ujeeddo, baahi la xallinayo, astaamo waaweyn, iyo waxa hadda shaqeeya.
- DASHBOARD.md — Dashboard (hadda placeholder) + qorshe stats/quick links.
- ARCHITECTURE.md — Qaab‑dhismeedka dhammeystiran (frontend + backend + data) iyo go’aannadii muhiimka ahaa.
- API.md — Tilmaamaha API‑yada backend: endpoints, query/body, iyo jawaab celin.
- DATA_MODELS.md — Qaababka xogta (schemas), xiriirada, iyo indexes.
- SETUP.md — Sida deegaanka Windows loogu rakibo oo loo ordo (frontend/backend), .env, iyo talooyin.
- DIAGRAMS.md — Diagrams: DFD, ERD, iyo Sequence (Mermaid) si loo fahmo socodka xogta.
- SECURITY.md — Amniga: waxa hadda jira iyo qorshaha mustaqbalka.
- USER_GUIDE.md — Sida loo isticmaalo: flows‑ka muhiimka ah (filters‑ka Students, enrollment, reassign, iwm.).
- USER_MANAGEMENT.md — Naqshadda Users/Auth/RBAC (Admin, Teacher, Student View, Staff) iyo qorshaha hirgelinta.
- STUDENT_WORKFLOW.md — Student lifecycle: registration/enrollment, transfer/promotion, deactivate/reactivate, transcript.
- TEACHER_WORKFLOW.md — Lifecycle‑ka Teacher: abuuris, assignment, privileges, UI/Backend, iyo API‑yada la xiriira.
- TEACHER_TAB_SPEC.md — Qeexidda Teacher tab (models, API, UI flow, permissions).
- TEACHERS.md — Teachers module: CRUD + assignments + roster.
- ATTENDANCE.md — Attendance module: mark/get/reports + timetable integration.
- TIMETABLE_SOOMAALI.md — Jadwalka casharrada (timetable slots): xeerar, API, conflicts, UI.
- RESULTS.md — Hagaha tab‑ka “Results”: filters, modes, darajooyin, CSV, print, Transcript, iyo talooyin.
- EXAMS_DESIGN.md — Naqshadda Imtixaannada (grid/scores/summary/transcript) iyo qaabeynta UI/API.
- EXAM_SETTINGS_VERSIONING.md — Versioning-ka exam templates (templateVersion) iyo backward compatibility.
- TRANSFER.md — Wareejinta ardayga (transfer): data model, APIs, UI flow, xeerar, edge cases, audit, testing.
- PROMOTION.md — Dalacsiinta ardayda: xeerar, shuruudo, iyo socodka (workflow).
- COHORTS.md — Cohorts: maamulka dufcadaha iyo sida ay ugu xirmaan Enrollment/filters.
- GRADES.md — Grades & GradeSections: maamulka fasallada (GS) iyo subjects.
- SUBJECTS.md — Subjects module (CRUD + linkage).
- TRANSCRIPT.md — Transcript (multi-year) + endpoints + UI/printing notes.
- ANNOUNCEMENTS.md — Announcements module (read + permission-gated write).
- FRONTEND_LOOKUPS.md — Isticmaalka components‑ka filters‑ka (AcademicYearSelect, GradeSelect, ShiftSelect, GradeSectionSelect) iyo hook‑ga useCascadingFilters.
- FRONTEND_API_RESTRUCTURE.md — Qaabka cusub ee API‑ga frontend (http.js + modules + barrel), sida loo isticmaalo, iyo sida loo daro endpoints cusub.
- DIB_U_HABAYN_QORSHE.md — Qorshe taariikhi ah oo dib‑u‑habeyn (historical plan); hadda waxaa beddelay dukumentiyada kor ku xusan, gaar ahaan FRONTEND_API_RESTRUCTURE.md.

Fiiro: UI‑ga waxa uu ku socda English, balse sharaxaadaha iyo dukumentiyada waa Af‑Soomaali sida aad codsatay.

