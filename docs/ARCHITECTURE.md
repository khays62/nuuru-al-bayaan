# Qaab Dhismeedka Nidaamka (Full Architecture)

Dukumentigan wuxuu daboolayaa Frontend + Backend, qaabka xogta, socodka xogta, iyo go’aannada naqshadeynta ee hadda jira.

## 1) Stack iyo Qawaaniinta Guud
- Frontend: React + Vite + Tailwind (feature-based folders)
- Backend: Node.js (Express, ESM) + MongoDB (Mongoose)
- Auth: cookie-based JWT (`auth_token`) + CSRF protection (double-submit)
- UI: Design System (tokens + UI primitives) + shared table pattern
- Luqad: UI English; Docs Somali

## 2) Frontend

### 2.1 Folder structure (current)
- `frontend/src/features/*` — pages + feature APIs + feature-only components
- `frontend/src/shared/*` — reusable UI/components/utils
  - `shared/api/http.js` — `fetchJson` + `apiUrl`, defaults to same-origin `/api`
  - `shared/components/ui/*` — Design System primitives (Button/Input/Select/Checkbox/...)
  - `shared/components/table/*` — table stack (StandardTable/DataTable/TableState/Pagination)

### 2.2 Env + networking
- Default dev strategy: frontend calls `/api/*` and Vite proxies to backend (so cookies work).
- Optional override: `VITE_API_BASE_URL` (see `frontend/.env.example`).

### 2.3 Table UX
- Instant sorting is client-side (where applicable) via shared hooks/utilities.
- Column visibility can be persisted via `storageKey` on shared table components.

## 3) Backend
- Routes:
  - `/api/lookups` — academic-years, grades, shifts, exam-types
  - `/api/students` — list/create/profile/history/password reset/deactivate/reactivate
  - `/api/transfers` — candidates, perform transfer, logs
  - `/api/subjects` — CRUD + filter by grade
  - `/api/grades` — grade sections CRUD/list + fetch by id (+ resync-cohort)
  - `/api/exams` — exam types, grid, score (upsert), summary, transcripts, template versions
- Additional mounted routes (current `backend/server.js`):
  - `/api/auth` — login/logout/verify (cookie JWT)
  - `/api/security` — security endpoints (privacy settings, auth lock events)
  - `/api/audit` — audit log listing
  - `/api/users` — admin-only user management
  - `/api/teachers` — teachers CRUD + password reset/deactivate/reactivate
  - `/api/attendance` — attendance mark/list + audit
  - `/api/timetable` — timetable CRUD + period/teacher utilities
  - `/api/announcements` — announcements CRUD + unread-count + SSE stream
  - `/api/realtime` — SSE stream for client refresh events
  - `/api/library` — digital library resources (pdf/link) + permissions
  - `/api/transcripts` — transcript generation endpoints
  - `/api/cohorts` — cohort CRUD + archive
  - `/api/promotions` — preview/execute promotions
  - `/api/setup` — setup helpers/seed-like endpoints (guarded)
  - `/api/dashboard` — dashboard statistics/aggregations
  - `/api/finance` — finance module (invoices, receipts, expenses, payroll, appointments)
  - `/api/ai` — AI assistant endpoints (thread storage per principal)
- Server entry: `backend/server.js` → dotenv → connect Mongo → ensureIndexes() → middleware (helmet/cors/limits/cookies/csrf) → mount routes → listen.
- Env: `backend/.env` (recommended). Required keys are documented in `docs/SETUP.md` and `backend/.env.example`.

### 3.1 Middleware & request lifecycle (current)
- i18n: `i18nMiddleware()` attaches `req.t()` based on `Accept-Language` (ar/so/en).
- Response shape: `responseNormalize()` standardizes common JSON responses to `{ success: true|false, ... }` (without breaking array/document responses).
- Audit trail: `auditTrail()` logs successful mutating `/api/*` requests with permission context.
- CSRF: `csrfProtection` applied under `/api/*` (double-submit) for cookie-based auth.
- Uploads:
  - `/api/uploads/library/*` is protected and audited on GET/HEAD.
  - `/api/uploads/*` is protected static serving for uploaded files.

### 3.2 Notes (legacy)
- `backend/routes/finance.routes.js` exists but is not mounted; current server mounts `backend/routes/financeRoutes.js`.

## 4) Data Models (Kooban)
- Student: { studentId, fullName, gender, dob, guardianName, contactNumber, address?, admissionDate, status }, text index: (fullName, studentId)
- Enrollment: { student, gradeSection, academicYear, grade, shift, cohort?, sequenceInYear, status, joinedAt, leftAt? }, unique (student, academicYear, sequenceInYear)
- GradeSection: { section, capacity?, grade, shift, subjects[] }, unique (grade+shift+section)
- Subject: { subjectName, subjectCode, grades[] }, indexes: subjectCode (unique), subjectName (1)
- Grade, AcademicYear, Shift: { name } unique
- ExamType, Exam, ExamScore: types, exam instance per (type+year+section+templateVersion), score per (student+exam+subject)
- TransferLog: transfer audit trail (with optional revert links)

Faahfaahinta dhamaystiran: `docs/DATA_MODELS.md`.

## 5) Socodka Xogta (Flow)
- Students List → feature hooks/state → feature API (`features/*/api/*`) → backend → `{ data, meta }` → shared table UI
- Reassign/Transfer → modal (cascading filters) → `/api/transfers` validates capacity/enrollment → success → refresh + toast
- Exams → `getExamGrid` → `saveExamScore` → `getExamSummary`/`getStudentTranscript`

## 6) Go'aamo Muhiim ah
- “Class” → “GradeSection” beddelid dhammaystiran (frontend + backend). Collection: `gradesections`.
- Frontend API: feature-level API modules (`frontend/src/features/*/api/*`) oo wada adeegsada `frontend/src/shared/api/http.js` (fetchJson + apiUrl).
- 404 UX gooni ah (outside app chrome) si uusan u qabsan Sidebar/Navbar.
- Env: Vite vars (public) vs Backend secrets (private) kala saarid cad.

## 7) Amniga & Tayada
- Cookie auth + CSRF protection (double-submit token)
- Rate limiting + progressive login cooldown/lock (see `docs/DEPLOY_SECURITY_FLOW_SOOMAALI.md`)
- Helmet security headers, x-powered-by disabled
- Unique constraints + conflict handling (409) + indexes ensured on boot

## 8) Mustaqbal
- Promotions endpoints (preview/execute) — `docs/PROMOTION.md`
- Audit log UI for `TransferLog`
- Reports/Exports (CSV/PDF) iyo print polish
