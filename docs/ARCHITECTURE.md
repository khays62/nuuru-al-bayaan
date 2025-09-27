# Qaab Dhismeedka Nidaamka (Full Architecture)

Dukumentigan waxa uu ka kooban yahay labada dhinac (Frontend + Backend) iyo xogta (Models), socodka xogta, iyo go'aannada naqshadeynta.

## 1) Stack iyo Qawaaniinta Guud
- Frontend: React + Vite, React Router, Tailwind CSS, lucide-react, react-hot-toast
- Backend: Node.js (Express), MongoDB (Mongoose), ESM imports
- Qaab: Hooks iyo components reusable; API modules kala soocan
- Luqad: UI English; Docs Somali

## 2) Frontend
- Pages: Students, Student Profile, Grades (Grade Sections), Subjects, Dashboard
- Components: DataToolbar (Search + Filters + Sort), PaginationControls, Modal, Loading/Empty states
- Hook: useEntityList → wax ka qabta search, sort, pagination, filters, refresh; sort state Waxaa lagu kaydin karaa localStorage (filters lama kaydiyo)
- Filters Students: Academic Year → Grade → Shift → Section (Section waa natiijo shaandhayn, disabled ilaa parents buuxaan)
- Reassign: Students table action → modal leh cascading filters; server call → refresh list

## 3) Backend
- Routes: /api/students, /api/grades/sections, /api/subjects, lookups (grades/years/shifts)
- Controllers:
  - Students:
    - GET /students → taageera search, status, gradeSectionId, academicYear, grade, shift; Active enrollment uun
    - POST /students → Student create + Enrollment; guards (duplicate person; unique enrollment per year)
    - GET /students/:id → profile + latest enrollment
    - GET /students/:id/history → taariikhda enrollments
    - PATCH /students/:id/enrollment/reassign → u wareeji active enrollment section kale (isla sanad)
  - Grades (Grade Sections): CRUD iyo listing leh filters
  - Subjects: CRUD iyo listing leh filter grade

## 4) Data Models (Kooban)
- Student: xogta guud + status; unique studentId; indexes
- Enrollment: { student, gradeSection, academicYear, grade, shift, status, joinedAt, leftAt }, unique (student, academicYear)
- GradeSection: { grade, academicYear, shift, section }
- Grade, AcademicYear, Shift, Subject — lookups/relations

## 5) Socodka Xogta (Flow)
- Students List → useEntityList → listStudents(params) → server (aggregation) → meta + data → UI table
- Reassign → modal → reassignEnrollmentApi → server validates (same AY, active only) → success → refresh → toast
- StudentForm → createStudent(payload) → server checks uniqueness + creates enrollment

## 6) Go'aamo Muhiim ah
- “Class” → “GradeSection” beddelid dhammaystiran (frontend + backend)
- Filters Students: year/grade/shift la gudbi karo server-ka xataa haddii Section aan la dooran
- UI English; Xogta server errors iyo toasts English, docs Somali

## 7) Amniga & Tayada
- Regex sanitization search
- Xadka pagination (limit max 100)
- 409 conflicts for duplicates (student, enrollment unique per year)
- Static checks + component modularity

## 8) Mustaqbal
- Promotions endpoints (preview/execute)
- Audit log (reassign/actions)
- Reports
