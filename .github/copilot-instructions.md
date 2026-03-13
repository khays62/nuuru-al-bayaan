# Copilot Instructions — Nuuru Al-Bayaan Academic Management System

This file gives GitHub Copilot permanent context about the project so the owner can delegate
implementation tasks directly from GitHub Issues. Read every section before writing any code.

---

## 1. Project Summary

**Nuuru Al-Bayaan** is a full-stack, Arabic/Somali Islamic-institute management system.

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind v4, React Router v7, TanStack Query v5 |
| Backend | Node.js (ESM), Express 5, Mongoose 8 (MongoDB) |
| Auth | HttpOnly JWT cookie (`auth_token`) + CSRF double-submit cookie (`csrf_token`) |
| Realtime | Server-Sent Events (SSE) → custom dispatcher → `queryClient.invalidateQueries` |
| i18n | i18next — three locales: `so` (Somali, default-docs), `ar` (Arabic, RTL), `en` |
| AI chatbot | OpenAI-compatible API → `AiChatContext` + `AiChatPanel` (drag-to-resize) |

**UI language:** English  
**Documentation language:** Af-Soomaali  
**Dev ports:** backend `:7000`, frontend `:5173` (Vite proxies `/api/*` → `:7000`)

---

## 2. Monorepo Layout

```
nuuru-al-bayaan/
├── backend/
│   ├── config/         # db.js (Mongoose), cookies.js, config.js
│   ├── controllers/    # One file per feature (e.g. studentController.js)
│   ├── middleware/     # authMiddleware, csrf, checkPermission, auditTrail,
│   │                   # i18n, responseNormalize
│   ├── models/         # Mongoose schemas (≈35 models)
│   ├── routes/         # Express routers (one per feature)
│   ├── services/       # Business logic called by controllers
│   ├── utils/          # permissions.js, defaultPasswords.js, indexMaintenance.js
│   ├── tests/          # Jest tests (--experimental-vm-modules)
│   └── server.js       # Entry point: dotenv → DB → middleware → routes → listen
└── frontend/
    └── src/
        ├── App.jsx             # Shell: Sidebar + Navbar + <Outlet> + AiChatPanel
        ├── auth/               # AuthContext, ProtectedRoute, LoginPage
        ├── config/navigation.js # Sidebar nav items (label, path, icon, permissions)
        ├── features/           # Feature-based modules (see §5)
        ├── i18n/               # i18next setup, locales (so/ar/en), useI18n hook
        ├── routes/             # router.jsx (createBrowserRouter) + permissions.js
        ├── shared/
        │   ├── api/http.js     # fetchJson + apiUrl (CANONICAL — use everywhere)
        │   ├── auth/           # permissionContract.js, permissions.js
        │   ├── components/     # ui/, table/, layout/, ai/, exports/, realtime/
        │   ├── realtime/       # useRealtimeStream, realtimeDispatcher
        │   └── theme/          # ThemeContext (dark/light)
        └── utils/              # events.js, buildQueryParams.js, exportTable.js
```

---

## 3. Backend Architecture

### 3.1 server.js Boot Order
```
dotenv.config()
→ validate DEFAULT_INITIAL_PASSWORD env
→ connectDB() + ensureIndexes()
→ app = express()
→ cors (allowlist from CORS_ORIGIN env)
→ helmet (CSP off for SPA)
→ express.json({ limit: '50kb' })
→ cookieParser()
→ i18nMiddleware()       ← attaches req.t()
→ responseNormalize()    ← wraps { success, ... } for plain objects
→ auditTrail()           ← logs POST/PUT/PATCH/DELETE with permission context
→ csrfProtection         ← double-submit (skips GET/HEAD/OPTIONS, non-browser)
→ apiLimiter             ← 600 req/min global
→ loginIpLimiter         ← 200 req/15 min on /api/auth/login
→ mount all routes
→ 404 handler, error handler
→ app.listen(PORT)
```

### 3.2 Auth Flow
- Login → `authController.login` → sign JWT → set `auth_token` HttpOnly cookie + `csrf_token` cookie
- `protect` middleware: reads `auth_token` → verifies JWT → checks `tokenVersion` (global logout) → checks security lock → attaches `req.user`
- Global logout: increment `principal.tokenVersion` → all existing tokens rejected
- CSRF: frontend reads `csrf_token` cookie → sends `X-CSRF-Token` header → backend compares; auto-retry on 403 CSRF error

### 3.3 Permission System
- Roles: `admin`, `staff`, `teacher`, `student`
- Staff get granular per-module, per-action permissions (stored in `User.permissions.*`)
- `PERMISSION_CONTRACT` in `backend/utils/permissions.js` defines allowed actions per module
- Backend: `hasPermission(req.user, module, action)` from `middleware/checkPermission.js`
- Frontend: `canAccess(user, module, action)` from `shared/auth/permissions.js`

### 3.4 Adding a New Backend Route
1. Create `backend/models/MyModel.js` (Mongoose schema)
2. Create `backend/controllers/myController.js` (business logic calls service)
3. Create `backend/services/myService.js` (DB queries)
4. Create `backend/routes/myRoutes.js` (Express Router with `protect` + `checkPermission`)
5. Import & mount in `server.js`: `app.use('/api/my-feature', myRoutes)`
6. Add to `PERMISSION_CONTRACT` in `utils/permissions.js` if staff need granular access

### 3.5 Realtime Publishing (Backend)
```js
import { publishRealtime } from '../services/realtimeService.js';
// After a DB mutation:
publishRealtime('my_feature_changed', { /*optional payload*/ });
```
This fires to all connected SSE clients. The frontend dispatcher maps event names to query invalidations.

---

## 4. Frontend Architecture

### 4.1 Provider Stack (main.jsx)
```
StrictMode
└── BrowserRouter / createBrowserRouter
    └── QueryClientProvider (queryClient.js)
        └── AuthProvider (AuthContext)
            └── I18nProvider
                └── ThemeContext
                    └── RouterProvider → App
```

### 4.2 API Calls — ALWAYS use fetchJson
```js
import { fetchJson, apiUrl } from '../../shared/api/http.js';

// GET
const data = await fetchJson('/students?page=1');

// POST
const result = await fetchJson('/students', {
  method: 'POST',
  body: JSON.stringify({ fullName: 'Ali' }),
});
```
- `fetchJson` handles: CSRF injection, Accept-Language, 401 → `auth:unauthorized` event, CSRF auto-retry
- **Never** use raw `fetch`, `axios`, or any other HTTP client outside the finance module (which has its own axios instance for legacy reasons)

### 4.3 Adding a New Feature Module
Follow this exact structure (example: `my-feature`):

```
frontend/src/features/my-feature/
├── api/myFeatureApi.js       # fetchJson wrappers (getAll, create, update, delete)
├── queryKeys.js              # { myFeature: { all: ['my-feature'], ... } }
├── pages/MyFeaturePage.jsx   # Top-level page component
├── components/               # Feature-specific components
└── useMyFeatureRealtimeInvalidation.js  # invalidate on SSE event
```

Add the route to `frontend/src/routes/router.jsx`:
```jsx
{
  path: '/my-feature',
  element: (
    <ProtectedRoute allowedRoles={['admin']} permissions={myFeatureAny}>
      <MyFeaturePage />
    </ProtectedRoute>
  ),
}
```

Add nav item to `frontend/src/config/navigation.js`.

### 4.4 Realtime Invalidation Pattern (Frontend)
Every feature that receives realtime updates creates a hook like:
```js
// features/my-feature/useMyFeatureRealtimeInvalidation.js
import { useRealtimeInvalidation } from '../../shared/realtime/useRealtimeInvalidation';
import { queryKeys } from './queryKeys';

export function useMyFeatureRealtimeInvalidation() {
  useRealtimeInvalidation('my_feature_changed', [queryKeys.myFeature.all]);
}
```
Then call it at the top of the feature's page component.

### 4.5 Shared UI Components — Use These (Do Not Re-Create)
| Component | Path | Purpose |
|---|---|---|
| `Button` | `shared/components/ui/Button.jsx` | Primary/secondary/danger actions |
| `Input` | `shared/components/ui/Input.jsx` | Text fields |
| `Select` | `shared/components/ui/Select.jsx` | Dropdowns |
| `Modal` | `shared/components/ui/Modal.jsx` | Dialog wrapper |
| `Badge` | `shared/components/ui/Badge.jsx` | Status chips |
| `StandardTable` | `shared/components/table/StandardTable.jsx` | Full table with sort/paginate/columns |
| `DataTable` | `shared/components/table/DataTable.jsx` | Lightweight data table |
| `EmptyState` | `shared/components/feedback/EmptyState.jsx` | Empty list placeholder |
| `LoadingState` | `shared/components/feedback/LoadingState.jsx` | Loading skeleton |
| `ExportButtons` | `shared/components/exports/ExportButtons.jsx` | CSV/Excel/PDF/Copy |
| `AcademicYearSelect` | `features/lookups/components/AcademicYearSelect.jsx` | Lookup dropdown |
| `GradeSelect` | `features/lookups/components/GradeSelect.jsx` | Grade filter |
| `GradeSectionSelect` | `features/lookups/components/GradeSectionSelect.jsx` | Section filter |

### 4.6 i18n
- Backend: `req.t('key', params, 'English fallback')`
- Frontend: `const { t } = useI18n(); t('key', { defaultValue: 'English fallback' })`
- Locale files: `frontend/src/i18n/locales/so.js` and `ar.js`
- RTL: `isRTL` from `useI18n()` — App.jsx reverses flex direction for Arabic

---

## 5. Feature Module Map

| Feature | Backend route | Frontend path | Notes |
|---|---|---|---|
| Students | `/api/students` | `/students` | List, profile, enrollment history |
| Student Dashboard | `/api/students` | `/students/:id` | Tabbed: Profile, Enrollments, Transcript, Attendance, Timetable, Library, Finance |
| Teachers | `/api/teachers` | `/teachers` | CRUD + assignments + dashboard |
| Grades/Sections | `/api/grades` | `/grades` | GradeSection CRUD, roster |
| Subjects | `/api/subjects` | `/subjects` | CRUD + grade linkage |
| Exams | `/api/exams` | `/exams` | Types, grid, score upsert, summary |
| Exam Settings | `/api/exams` | `/exam-settings` | Template versions |
| Results | `/api/exams` | `/results` | Score reports, filters |
| Transcript | `/api/transcripts` | `/transcript` | Multi-year PDF |
| Attendance | `/api/attendance` | `/attendance` | Mark + reports |
| Timetable | `/api/timetable` | `/timetable` | Slot management, conflict detection |
| Transfers | `/api/transfers` | `/transfers` | Inter-section transfer + revert |
| Promotions | `/api/promotions` | `/promotions` | Year-to-year promotion |
| Cohorts | `/api/cohorts` | `/cohorts` | Dufcad management |
| Finance - Dashboard | `/api/finance` | `/finance` | Summary charts |
| Finance - Student fees | `/api/finance` | `/finance/student-finance` | Invoices, payments |
| Finance - Payroll | `/api/finance` | `/finance/payroll` | Staff salary |
| Finance - Expenses | `/api/finance` | `/finance/expenses` | General expenses |
| Finance - Accounts | `/api/finance` | `/finance/accounts` | Chart of accounts |
| Library | `/api/library` | `/library` | Upload, download (PDF/text), permission-gated |
| Announcements | `/api/announcements` | `/announcements` | Read + permission-gated write |
| Dashboard | `/api/dashboard` | `/dashboard` | Stats, charts, recent activity |
| Users | `/api/users` | `/users` | Admin-only user CRUD + permissions |
| Audit | `/api/audit` | `/tracking-audit` | System action log |
| Privacy Control | `/api/security` | `/privacy-control` | Session/password/login policies |
| AI Chat | `/api/ai` | (floating panel) | Thread-based chat, OpenAI API |
| Auth | `/api/auth` | `/login` | Login, logout, CSRF, heartbeat |
| Setup | `/api/setup` | `/setup/*` | Grades, Shifts, Academic Years |

---

## 6. Data Models — Key Schemas

| Model | Collection | Key fields |
|---|---|---|
| `Student` | `students` | `studentId`, `fullName`, `gender`, `dob`, `guardianName`, `contactNumber`, `status` |
| `Enrollment` | `enrollments` | `student`, `gradeSection`, `academicYear`, `grade`, `shift`, `cohort`, `sequenceInYear`, `status` |
| `GradeSection` | `gradesections` | `section`, `grade`, `shift`, `subjects[]`, `capacity` |
| `User` | `users` | `username`, `role` (admin/staff/teacher/student), `permissions.*`, `tokenVersion`, `mustChangePassword` |
| `Teacher` | `teachers` | `fullName`, `employeeId`, `specialization`, linked to User |
| `TeacherAssignment` | `teacherassignments` | `teacher`, `gradeSection`, `subject`, `academicYear` |
| `Exam` | `exams` | `examType`, `academicYear`, `gradeSection`, `templateVersion` |
| `ExamScore` | `examscores` | `student`, `exam`, `subject`, `score` |
| `AttendanceRecord` | `attendancerecords` | `student`, `gradeSection`, `date`, `status`, `markedBy` |
| `Timetable` | `timetables` | `gradeSection`, `subject`, `teacher`, `day`, `startTime`, `endTime` |
| `AuditLog` | `auditlogs` | `userId`, `action`, `description`, `ip`, `path` |
| `PrivacySettings` | `privacysettings` | Singleton — session expiry, password policy, login lockout config |
| `ActivityNotification` | `activitynotifications` | Bell notifications; aggregation window |
| `LibraryResource` | `libraryresources` | `title`, `kind`, `file.path`, download permission |

---

## 7. Environment Variables

### Backend (`backend/.env`)
```
PORT=7000
MONG_URL=mongodb://127.0.0.1:27017/nuuru_al_bayaan
JWT_SECRET=<strong-random>
CSRF_SECRET=<strong-random>
DEFAULT_INITIAL_PASSWORD=<initial-password>
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
# Optional:
TRUST_PROXY=1          # Set when behind a reverse proxy
OPENAI_API_KEY=...     # For AI chatbot feature
OPENAI_BASE_URL=...    # Override endpoint (e.g., local LLM)
```

### Frontend (`frontend/.env.development`)
```
VITE_API_BASE_URL=http://localhost:7000/api
```

---

## 8. Running the Project

```bash
# Backend
cd backend && npm install && npm run server   # http://localhost:7000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev     # http://localhost:5173

# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test

# Frontend lint
cd frontend && npm run lint
```

---

## 9. Coding Conventions

### Backend
- **ESM only** (`"type": "module"` in package.json) — use `import`/`export`, never `require()`
- Validate all request bodies with **Zod** before any DB operation
- Always return `{ success: true|false, data?, message? }` — `responseNormalize` middleware wraps plain objects automatically for routes that return Mongoose docs directly
- Use `req.t('key', params, 'English fallback')` for all user-facing strings
- Controllers should be thin — push business logic into services
- All async route handlers must propagate errors with `next(err)` or `try/catch → next(err)`

### Frontend
- **Feature-based folders**: keep all files for a feature inside `src/features/<feature>/`
- **Never** bypass `fetchJson` — it handles CSRF, auth, locale headers, 401 dispatch
- Use `@tanstack/react-query` for all server state; avoid local `useState` for remote data
- Query keys: define in `features/<feature>/queryKeys.js`; use `makeQueryKeys` helper when creating factory keys
- Realtime: call `useMyFeatureRealtimeInvalidation()` inside each feature page; dispatcher maps SSE events to query invalidations
- UI: always use components from `shared/components/ui/` — do not add raw HTML `<input>`, `<button>`, `<select>` directly in pages

### Naming
- Backend files: `camelCase.js` (models: `PascalCase.js`)
- Frontend components: `PascalCase.jsx`; hooks: `useXxx.js`; API modules: `camelCase.js`
- Branch names: `feature/`, `fix/`, `docs/`, `refactor/` prefix

---

## 10. Security Rules (Must Follow)

1. **JWT_SECRET and CSRF_SECRET** must never be committed. Always read from `process.env`.
2. All mutating routes (`POST/PUT/PATCH/DELETE`) must use `protect` + `csrfProtection`.
3. Staff permission checks: use `hasPermission(req.user, module, action)` — never hard-code role strings for fine-grained access.
4. File uploads: validate MIME type + extension; store under `backend/uploads/`; never serve uploads without `protect`.
5. Library downloads: additionally require `library.download` permission (see `server.js` `/api/uploads/library`).
6. Never log passwords, tokens, or PII in `console.log`.
7. All user input validated with Zod on the backend before DB writes.
8. Student passwords: hashed with bcryptjs; default set from `DEFAULT_INITIAL_PASSWORD` env.

---

## 11. Testing

### Backend (Jest + mongodb-memory-server)
- Tests in `backend/tests/`
- Run: `npm test` from `backend/`
- Use `mongodb-memory-server` for in-process MongoDB

### Frontend (Vitest)
- Tests co-located with source (e.g., `shared/api/http.test.js`)
- Run: `npm test` from `frontend/`

---

## 12. How to Delegate Tasks (for the Project Owner)

To assign a task to Copilot, open a GitHub Issue with:
1. **What** — the feature, fix, or change you want
2. **Where** — which module/page/route is affected (refer to §5 Feature Module Map)
3. **Acceptance criteria** — how you'll know it's done

Copilot will read these instructions, understand the conventions, and implement the change
following the patterns described above.

**Example issues you can create:**
- "Add a search bar to the Library page that filters by title and kind"
- "Fix: Exam grid does not reload after saving a score without refreshing the page"
- "Add an 'Export to Excel' button on the Attendance Reports page"
- "Add a new 'Donations' feature: model, API (CRUD), and a page under Finance"
- "Show total enrolled students count on the Dashboard stats card"
