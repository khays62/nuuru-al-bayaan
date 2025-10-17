# Qaab Dhismeedka Nidaamka (Full Architecture)

Dukumentigan wuxuu daboolayaa Frontend + Backend, qaabka xogta, socodka xogta, iyo go’aannada naqshadeynta ee hadda jira.

## 1) Stack iyo Qawaaniinta Guud
- Frontend: React 19 + Vite 7, React Router 7, Tailwind CSS v4 (plugin), lucide-react, react-hot-toast
- Backend: Node.js (Express 5), MongoDB (Mongoose 8), ESM imports
- Qaab FE: Hooks iyo components reusable; API layer modular (http.js + modules + barrel)
- Luqad: UI English; Docs Somali

## 2) Frontend
- Pages: Dashboard, Students, Student Profile, Grades (Grade Sections), Subjects, Results, Exams, Transcript, User Management (sii diyaarsan)
- Components: DataToolbar (Search/Filters/Sort), PaginationControls, Modal, Loading/Empty/Spinner, 404 page (standalone, no app chrome)
- Hooks: useEntityList (search/sort/pagination/filters/debounce + resetAndReload), useCascadingFilters, useDebounce
- API Layer: `src/api/http.js` (apiUrl + fetchJson), `src/api/modules/*` (lookups, students, gradeSections, subjects, exams), `src/api/index.js` (barrel). Import pattern: `import { listStudents } from '../api'`.
- Env: `VITE_API_BASE_URL` (frontend). `.env.example` la socda; `.env.development`/`.env.production` optional. Vite dev proxy: `/api` → `http://localhost:7000`.
- Routing: createBrowserRouter; `/404` top-level, child wildcard → Navigate to `/404` si 404 u ahaato standalone.

## 3) Backend
- Routes:
  - `/api/lookups` — grades, academicYears, shifts
  - `/api/students` — list/create/profile/history/reassign/deactivate/reactivate/transfer
  - `/api/subjects` — CRUD + filter by grade
  - `/api/grades` — grade sections CRUD/list + fetch by id
  - `/api/exams` — exam types, grid, scores, summary, transcripts
- Server entry: `backend/server.js` → `.env` load → connect Mongo → ensureIndexes() → create express app → JSON + CORS → mount routes → listen on `PORT || 7000`.
- Env: `MONG_URL` (Mongo URI), `PORT` (7000 default in code if unset). See `docs/SETUP.md` for exact steps.

## 4) Data Models (Kooban)
- Student: { studentId, fullName, gender, dob, guardianName, contactNumber, address?, admissionDate, status }, text index: (fullName, studentId)
- Enrollment: { student, gradeSection, academicYear, grade, shift, status, joinedAt, leftAt? }, unique (student, academicYear)
- GradeSection: { section, capacity?, grade, academicYear, shift, subjects[] }, unique (grade+year+shift+section)
- Subject: { subjectName, subjectCode, grades[] }, indexes: subjectCode (unique), subjectName (1)
- Grade, AcademicYear, Shift: { name } unique
- ExamType, Exam, ExamScore: types, exam instance per (type+year+section), score per (student+exam+subject)
- TransferLog: reassign/transfer audit trail (with optional revert links)

Faahfaahinta dhamaystiran: `docs/DATA_MODELS.md`.

## 5) Socodka Xogta (Flow)
- Students List → useEntityList → `listStudents(params)` → backend aggregation → `{ data, meta }` → UI table
- Reassign/Transfer → modal (cascading filters) → backend validates (AY same, active only) → success → refresh + toast
- Exams → `getExamGrid` → `saveExamScore` → `getExamSummary`/`getStudentTranscript`

## 6) Go'aamo Muhiim ah
- “Class” → “GradeSection” beddelid dhammaystiran (frontend + backend). Collection: `gradesections`.
- API layer modularization: dhammaan calls ka soo mara `../api` barrel, legacy `apiService.js` la saaray.
- 404 UX gooni ah (outside app chrome) si uusan u qabsan Sidebar/Navbar.
- Env: Vite vars (public) vs Backend secrets (private) kala saarid cad.

## 7) Amniga & Tayada
- Search sanitization (text index + regex handling FE)
- Pagination limits (max 100) iyo status guards
- 409 Conflicts (duplicates: studentId, enrollment per year; examScore per triplet)
- ESLint 9 hooks rules; modular components/hooks; ensureIndexes on boot

## 8) Mustaqbal
- Promotions endpoints (preview/execute) — `docs/PROMOTION.md`
- Audit log UI for `TransferLog`
- Reports/Exports (CSV/PDF) iyo print polish
