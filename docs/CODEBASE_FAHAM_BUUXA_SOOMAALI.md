# Nuuru Al-Bayaan — Faham Buuxa Koodbeyska (Af-Soomaali)

> **Dukumiintigan wuxuu sharaxayaa si dhammeystiran mashruuca oo dhan: folder-yada, fayl-yada, backend, frontend, iyo sida ay isugu xiran yihiin dhammaan qaybaha muhiimka ah.**

---

## Tusmada

1. [Dulmar Guud](#1-dulmar-guud)
2. [Qaab Dhismeedka Folder-yada](#2-qaab-dhismeedka-folder-yada)
3. [Backend — Qaab Dhismeedka](#3-backend--qaab-dhismeedka)
4. [Frontend — Qaab Dhismeedka](#4-frontend--qaab-dhismeedka)
5. [Sida Auth ka u Shaqeyso](#5-sida-auth-ka-u-shaqeyso)
6. [Realtime Bus (SSE) iyo React Query](#6-realtime-bus-sse-iyo-react-query)
7. [AI Chatbot Feature](#7-ai-chatbot-feature)
8. [Bell Notification (Digniinta Xagga Amniga)](#8-bell-notification-digniinta-xagga-amniga)
9. [Tarjumida (i18n / Translation)](#9-tarjumida-i18n--translation)
10. [UI Primitives iyo Shared Components](#10-ui-primitives-iyo-shared-components)
11. [Features-ka Kala Duwan — Sharax](#11-features-ka-kala-duwan--sharax)
12. [Sida Backend iyo Frontend ay Isugu Xiran Yihiin](#12-sida-backend-iyo-frontend-ay-isugu-xiran-yihiin)
13. [Amnigeynta (Security)](#13-amnigeynta-security)
14. [Xiriirka Dhammaan Qaybaha](#14-xiriirka-dhammaan-qaybaha)

---

## 1) Dulmar Guud

**Nuuru Al-Bayaan** waa nidaam maareynta xaaladda akadeemiga (Academic Management System) oo loo sameeyay machadka islaamiga ee Nuuru Al-Bayaan. Nidaamku wuxuu u adeegaa:

- **Admin**: Maamulka buuxa — ardayda, macallimiinta, xogta, waxbarashada, maaliyadda
- **Staff**: Shaqaalaha — cidda la siiyey ogolaanshaha gaar ah
- **Teacher**: Macallimka — darajo-koob, xaadiridda, jadwalka
- **Student**: Ardayga — adeegga iskooga (self-service dashboard)

**Tech Stack:**
| Qaybta | Tiknoolajiyadda |
|--------|-----------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js (ESM) |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT (HttpOnly Cookie) + CSRF (Double-Submit) |
| Realtime | SSE (Server-Sent Events) |
| AI | OpenAI-compatible API (GitHub Models / Azure) |
| i18n | i18next (so / ar / en) |
| Data Fetching | TanStack React Query (v5) |

---

## 2) Qaab Dhismeedka Folder-yada

```
nuuru-al-bayaan/
├── backend/               ← Node.js/Express server
│   ├── config/            ← Config (DB, cookies, app)
│   ├── controllers/       ← Route handlers (thin layer)
│   ├── middleware/        ← Auth, CSRF, audit, validate, i18n, etc.
│   ├── models/            ← Mongoose schemas (DB models)
│   ├── routes/            ← Express routers (1 file per feature)
│   ├── services/          ← Business logic (fat layer)
│   ├── utils/             ← Utilities (realtime bus, permissions, pagination...)
│   ├── i18n/              ← Backend i18n translations (ar/so/en)
│   ├── seed/              ← Seed data scripts
│   ├── tests/             ← Backend tests
│   └── server.js          ← Entry point
│
├── frontend/              ← React/Vite SPA
│   ├── public/            ← Static assets (favicon, etc.)
│   └── src/
│       ├── App.jsx        ← App shell (layout + providers)
│       ├── main.jsx       ← React entry point (mounts providers)
│       ├── queryClient.js ← TanStack React Query client config
│       ├── index.css      ← Global styles + design tokens
│       │
│       ├── auth/          ← Auth context, ProtectedRoute, login page
│       ├── config/        ← Navigation config (navItems)
│       ├── hooks/         ← App-level hooks
│       ├── i18n/          ← Translation provider + locales (so/ar)
│       ├── pages/         ← Generic pages (NotFound, HomeRedirect)
│       ├── routes/        ← React Router + permission helpers
│       │
│       ├── features/      ← Feature-based modules (1 folder per feature)
│       │   ├── announcements/
│       │   ├── attendance/
│       │   ├── audit/
│       │   ├── cohorts/
│       │   ├── dashboard/
│       │   ├── exams/
│       │   ├── finance/
│       │   ├── grades/
│       │   ├── library/
│       │   ├── lookups/
│       │   ├── privacy-control/
│       │   ├── promotions/
│       │   ├── results/
│       │   ├── security/
│       │   ├── setup/
│       │   ├── students/
│       │   ├── subjects/
│       │   ├── teachers/
│       │   ├── timetable/
│       │   ├── transcript/
│       │   ├── transfers/
│       │   └── users/
│       │
│       └── shared/        ← Waxyaabaha la wadaago dhammaan features-ka
│           ├── api/       ← http.js (fetchJson + apiUrl)
│           ├── auth/      ← Permission contract + helpers
│           ├── components/
│           │   ├── ai/        ← AI Chatbot (Context, Panel, Widget)
│           │   ├── audit/     ← Audit trail components
│           │   ├── DataToolbar/
│           │   ├── exports/   ← Excel/CSV export components
│           │   ├── feedback/  ← Loading, Spinner, EmptyState, PageLoading
│           │   ├── filters/   ← Filter components
│           │   ├── layout/    ← Navbar + Sidebar
│           │   ├── Pagination/
│           │   ├── print/     ← Print components
│           │   ├── table/     ← StandardTable, DataTable, TableState, PaginationBar
│           │   └── ui/        ← UI Primitives (Button, Input, Modal, Badge, ...)
│           ├── data/
│           ├── hooks/         ← Shared hooks
│           ├── queryKeys/     ← makeQueryKeys helper
│           ├── realtime/      ← SSE stream + dispatcher
│           ├── theme/         ← ThemeContext (dark/light)
│           └── utils/         ← Shared utilities
│
└── docs/                  ← Dhammaan dukumiintiyada mashruuca
    ├── ARCHITECTURE.md
    ├── API.md
    ├── OVERVIEW.md
    ├── SETUP.md
    └── ...
```

---

## 3) Backend — Qaab Dhismeedka

### 3.1 Meesha Laga Bilaabo: `server.js`

Faylku waa **entry point** ee backend-ka. Wuxuu:
1. Load garaa dotenv (`.env`)
2. Ku xidaa MongoDB (`connectDB()`)
3. Hubiyaa indexes MongoDB (`ensureIndexes()`)
4. Sameeya Express app
5. Ku daraa middleware-yada (cors, helmet, rateLimit, cookieParser, i18n, CSRF, auditTrail)
6. Ku darayaa dhammaan routes-ka (mounted on `/api/*`)
7. Ka dhigaa server oo dhegeysta port 7000

### 3.2 Middleware-yada Aasaasiga (Tartib ahaan)

| Middleware | File | Waxa uu qabto |
|-----------|------|----------------|
| CORS | `server.js` | Ka oggola origins-ka la oggolaaday oo keliya, credentials=true |
| Helmet | `server.js` | Security headers (XSS, frameguard, etc.) |
| express.json | `server.js` | Parse JSON body (max 50kb) |
| cookieParser | `server.js` | Cookie-yada akhri (including `auth_token`, `csrf_token`) |
| i18nMiddleware | `middleware/i18n.js` | `req.t()` function u daraa — tarjumaad server-side |
| responseNormalize | `middleware/responseNormalize.js` | `{ success: true/false }` format-ka standardize |
| auditTrail | `middleware/auditTrail.js` | Log-garee mutating requests-ka (POST/PUT/PATCH/DELETE) |
| csrfProtection | `middleware/csrf.js` | Double-submit CSRF token check |
| apiLimiter | `server.js` | Rate limit: 600 req/min per IP |
| loginIpLimiter | `server.js` | 200 failed login req/15min per IP |
| protect | `middleware/authMiddleware.js` | JWT verify + user load |
| authorizeRoles | `middleware/authMiddleware.js` | Role check (admin/staff/teacher/student) |
| checkPermission | `middleware/checkPermission.js` | Module/action permission check |

### 3.3 Routes Architecture

Dhammaan routes-ku waxay ku mount yihiin `/api/*`:

```
/api/auth          → authRoutes.js      → authController.js
/api/security      → securityRoutes.js  → securityController.js
/api/audit         → auditRoutes.js     → auditController.js
/api/lookups       → lookupRoutes.js    → lookupController.js
/api/students      → studentRoutes.js   → studentController.js
/api/subjects      → subjectRoutes.js   → subjectController.js
/api/grades        → gradeSectionRoutes.js → gradeSectionController.js
/api/exams         → examRoutes.js      → examController.js
/api/cohorts       → cohortRoutes.js    → cohortController.js
/api/promotions    → promotionRoutes.js → promotionController.js
/api/library       → libraryRoutes.js   → libraryController.js
/api/transfers     → transferRoutes.js  → transferController.js
/api/transcripts   → transcriptRoutes.js → transcriptController.js
/api/teachers      → teacherRoutes.js   → teacherController.js
/api/attendance    → attendanceRoutes.js → attendanceController.js
/api/timetable     → timetableRoutes.js → timetableController.js
/api/announcements → announcementRoutes.js → announcementController.js
/api/realtime      → realtimeRoutes.js  → (SSE stream)
/api/setup         → setupRoutes.js     → setupController.js
/api/dashboard     → dashboardRoutes.js → dashboardController.js
/api/finance       → financeRoutes.js   → financeControl/
/api/ai            → aiRoutes.js        → (AI Chatbot)
/api/users         → userRoutes.js      → userController.js
/api/uploads/library → (static, guarded)
/api/uploads       → (static, guarded)
```

### 3.4 Controllers vs Services

**Controllers** (thin layer): waxay qaabilsanaadaan HTTP request/response oo keliya.
**Services** (fat layer): waxay qaabilsanaadaan business logic-ka.

Tusaale:
- `controllers/attendanceController.js` → wuxuu yeedha `services/activityNotificationService.js`
- `services/aiChat.js` → wuxuu maareeyaa OpenAI API calls
- `services/announcementStream.js` → SSE announcements

### 3.5 Models-ka (Xogta Database)

MongoDB Mongoose schemas-ka ugu muhiimsan:

| Model | File | Waxa uu matalayaa |
|-------|------|-------------------|
| Student | `Student.js` | Macluumaadka ardayga |
| Enrollment | (ka dhex muuqda models-ka) | Ardayga xiriirka fasalka + sanadka |
| GradeSection | `GradeSection.js` | Fasalka (grade+shift+section) |
| Grade | `Grade.js` | Heerka waxbarashada (1-12, ...)  |
| Shift | `Shift.js` | Waqtiga fasalka (morning/afternoon) |
| AcademicYear | `AcademicYear.js` | Sanadka akadeemiga |
| Subject | `Subject.js` | Maaddada waxbarashada |
| Teacher | `Teacher.js` | Macallinaka |
| TeacherAssignment | `TeacherAssignment.js` | Macallinka u xilsaaran fasalka |
| Exam | `Exam.js` | Imtixaanka |
| ExamScore | `ExamScore.js` | Natiijada ardayga imtixaanka |
| ExamType | `ExamType.js` | Nooca imtixaanka |
| AttendanceRecord | `AttendanceRecord.js` | Xaadiridda ardayga |
| AttendanceAuditLog | `AttendanceAuditLog.js` | Log-ga beddelidda xaadiridda |
| Announcement | `Announcement.js` | Xayeysiisyada |
| Cohort | `Cohort.js` | Kooxda ardayda |
| TransferLog | `TransferLog.js` | Taariikh wareejinta ardayga |
| Timetable | `Timetable.js` | Jadwalka fasalka |
| LibraryResource | `LibraryResource.js` | Kheyraadka maktabadda (PDF/link) |
| AiChatThread | `AiChatThread.js` | AI chat thread-yada |
| ActivityNotification | `ActivityNotification.js` | Bell notifications |
| AuditLog | `AuditLog.js` | Audit trail-ka dhammaan ficilada |
| AuthLockEvent | `AuthLockEvent.js` | Xaaladda lock-ka login |
| User | `User.js` | Staff/Admin/Student user accounts |
| Admin | `Admin.js` | Admin account (deprecated, User model la isticmaalaa) |
| PrivacySettings | `PrivacySettings.js` | Qaabeynta privacy-ga |
| LessonPlan | `LessonPlan.js` | Qorshaynta casharka |
| Fee / FeeInvoice / FeePayment / ... | `Fee*.js` | Maaliyadda ardayga |
| Expense / FinanceCategory / ... | `Expense.js`, etc. | Kharashyada |
| Payroll | `Payroll.js` | Mushaarka shaqaalaha |

---

## 4) Frontend — Qaab Dhismeedka

### 4.1 Entry Point: `main.jsx`

Meesha React-ku ka bilaabmo. Wuxuu wrap garaa app-ka mid kasta oo Provider ah:
- `QueryClientProvider` (TanStack React Query)
- `AuthProvider` (AuthContext)
- `I18nProvider` (tarjumidda)
- `ThemeProvider` (dark/light)
- `RouterProvider` (React Router)

### 4.2 App Shell: `App.jsx`

Wuxuu muujiyaa layout-ka guud:
- Sidebar (bidixda — nav links)
- Navbar (sare — page title, bell, lang switcher, AI button, logout)
- `<Outlet />` (content-ka page-ka hadda socda)
- `AiChatPanel` (midig — AI panel)
- `ForcePasswordChangeModal` (if needed)

Waxa kale:
- Page view tracking (audit) marka route is beddesho
- RTL support: marka luqadda Arabic la doorto, direction waa midig-bidix

### 4.3 Feature-based Architecture

**Mabda'a**: Kull feature wuxuu leeyahay folder-kiisa (e.g. `features/students/`):

```
features/students/
├── api/         ← API calls u gaar ah students-ka
├── components/  ← UI components u gaar ah students-ka
├── pages/       ← Route pages (StudentPage, StudentDashboardPage)
└── queryKeys.js ← React Query key-yada gaar u ah students-ka
```

**Shared layer** (`shared/`) waa waxyaabaha dhammaan features-ka wadaagaan:
- `shared/api/http.js` — `fetchJson` + `apiUrl` (hal meel oo laga sameeyo API calls)
- `shared/components/ui/` — UI primitives
- `shared/components/table/` — Table system
- `shared/realtime/` — SSE stream + dispatcher
- `shared/auth/` — Permission contract + helpers
- `shared/queryKeys/makeQueryKeys.js` — Query key factory

### 4.4 Router iyo ProtectedRoute

**Router** (`routes/router.jsx`): wuxuu kaydiyaa dhammaan routes-ka app-ka.

**ProtectedRoute** (`auth/ProtectedRoute.jsx`): Guard-ka hortiisa ah. Haddii user-ku:
- Ma login galin → redirect u dir `/login`
- Login galay laakiin role-kiisu ma oggola → Redirect/NotFound
- Login galay oo permission-kiisu ma oggola → Redirect/NotFound

Routes-ka ugu muhiimsan:
```
/login              → LoginPage (public)
/dashboard          → DashboardPage (admin/staff only)
/students           → StudentPage
/students/:id       → StudentDashboardPage (tabs: profile, enrollment, transcript, ...)
/teachers           → TeachersPage
/teachers/:id       → TeacherProfilePage
/grades             → GradePage
/subjects           → SubjectPage
/attendance         → AttendancePage
/attendance-reports → AttendanceReportsPage
/timetable          → TimetablePage
/exams              → ExamManagementPage
/results            → ResultPage
/transcript         → TranscriptPage (bulk)
/transfers          → TransfersPage
/promotions         → PromotionPage
/cohorts            → CohortsPage
/library            → LibraryManagementPage
/announcements      → AnnouncementsPage
/finance/dashboard  → FinanceDashboardPage
/finance/accounts   → FinanceAccountsPage
/finance/student-finance → FinanceStudentFinancePage
/finance/payroll    → FinancePayrollPage
/finance/expenses   → FinanceExpensesPage
/users              → UserManagementPage (admin only)
/tracking-audit     → TrackingAuditPage
/privacy-control    → PrivacyControlPage
/teacher-dashboard  → TeacherDashboardPage (teacher role only)
/student-dashboard  → StudentSelfDashboardShell (student role only)
```

---

## 5) Sida Auth ka u Shaqeyso

### 5.1 Login Flow (Tallaabooyin)

```
1. User gala username/password (ama studentId/password) Login Page-ka
2. AuthContext.login() → POST /api/auth/login
3. Backend (authController.login):
   a. Hubi username/password
   b. Hubi rate-limit (loginCooldownLevel)
   c. Hubi in account-ku active yahay
   d. Sign JWT (payload: id, role, tokenVersion)
   e. Set HttpOnly cookie: auth_token (expires: 1d dev / 7d prod)
   f. Set csrf_token cookie (non-httponly — frontend-ka wuu akhrin karaa)
   g. Return { success: true, user: { ... } }
4. Frontend: fetchCurrentUser() → GET /api/auth/verify → set user state
5. App-ka ayaa la soo galaa (role-based redirect)
```

### 5.2 Token Verification (Heartbeat)

- AuthContext wuxuu maalin kasto (default: 15s) sameeya `GET /api/auth/verify`
- Haddii token-ku dhacay ama account-ka la joojiyay → Auto-logout
- Document hidden aad → Interval-ku wuu gaboobaa (30s) si battery-ga looga badbaadshiyo

### 5.3 Session Invalidation (Global Logout)

- Marka admin `tokenVersion` User-ka kiciyaa (e.g. password reset), token-ku waa stale
- `protect` middleware: `decoded.v !== principal.tokenVersion` → 401 → auto-logout
- Cross-tab logout: `localStorage.setItem(AUTH_LOGOUT_KEY, ...)` → dhammaan tabs-yada ayaa logout ka sameeya

### 5.4 CSRF Protection

- Backend: **double-submit token pattern**
  - Cookie: `csrf_token` (non-httponly) — frontend-ku wuu akhrin karaa
  - Header: `X-CSRF-Token` — frontend-ku wuu ku daraa unsafe requests-ka
  - Backend `csrf.js` middleware: wuxuu barbar dhigaa cookie + header
- Frontend (`http.js`): unsafe methods (POST/PUT/PATCH/DELETE) — `getCookie('csrf_token')` → ku dar header
- CSRF retry: haddii 403 CSRF error → `GET /api/auth/csrf` → hesho token cusub → ku celi request

### 5.5 Permission System

**Admin**: wuu garanayaa wax kasta (full access)
**Staff/Teacher/Student**: waxay leeyihiin permissions granular ah

Permissions-ka waxay ku jiraan:
- Backend: `utils/permissions.js` — `PERMISSION_CONTRACT` (allowlist per module/action)
- Frontend: `shared/auth/permissionContract.js` — same contract mirrored

Permission check:
```javascript
// Frontend
const { hasPermission } = useAuth();
hasPermission('students', 'add')   // true/false

// Backend (middleware)
checkPermission('students', 'add') // 403 haddii la'ahayn
```

Modules-ka muhiimsan: `students, teachers, exams, attendance, timetable, library, security, finance*, ...`

---

## 6) Realtime Bus (SSE) iyo React Query

### 6.1 Qaabka guud: EDCI (Event-Driven Cache Invalidation)

```
Backend data is beddesho
       ↓
publishRealtime({ type: 'students:changed', ... })
       ↓  [realtimeBus.js — EventEmitter]
SSE stream: GET /api/realtime/stream
       ↓  [useRealtimeStream.js — EventSource]
realtimeDispatcher.dispatch(payload)
       ↓  [realtimeDispatcher.js]
emitStudentsChanged({ source: 'realtime', ... })
       ↓  [events.js — CustomEvent on window]
Feature hook (e.g. useStudentsRealtimeInvalidation.js)
       ↓  [on(EVENTS.STUDENTS_CHANGED, handler)]
queryClient.invalidateQueries(['students', ...])
       ↓  [TanStack React Query]
React Query wuxuu sameeyo refetch → UI soo cusboonaysii
```

### 6.2 Backend: `utils/realtimeBus.js`

```javascript
// In-memory EventEmitter (single process)
export const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(0); // clients badan

export function publishRealtime(payload) {
  realtimeBus.emit('event', payload);
}
```

Meesha laga isticmaalo: `publishRealtime({ type: 'students:changed' })` — controllers + services marka data is beddesho.

### 6.3 Backend: SSE Endpoint (`/api/realtime/stream`)

- `realtimeRoutes.js`: `GET /api/realtime/stream` (protected, roles: admin/staff/teacher/student)
- Wuxuu jaraa response headers:
  ```
  Content-Type: text/event-stream
  Cache-Control: no-cache
  Connection: keep-alive
  ```
- Wuxuu dhegeysta `realtimeBus.on('event', handler)` → wuxuu client-ka u diri payload
- Heartbeat: `ping` event kull 25s (si connection-ka uu u noolaan)
- Marka client disconnect gareeyo → listener waa la siminayaa

### 6.4 Frontend: `useRealtimeStream.js`

- **EventSource**: browser-ka built-in SSE client
- Auto-reconnect: exponential backoff (1s → 2s → 4s → ... → 30s max)
- Watchdog: haddii 60s aan la helinay wax → reconnect
- Window online event + visibility change → reconnect
- Status tracking: `window.__realtimeSseStatus` (debugging)

### 6.5 Frontend: `realtimeDispatcher.js`

Wuxuu SSE payload-ka "translate" u gareeya app events:
- Debounce (250ms default) — prevents refresh storms marka events badan dhacaan
- Type mapping: `'students:changed'` → `emitStudentsChanged(...)`
- Types supported: students, teachers, users, expenses, accounts, finance, subjects, timetable, grades, cohorts, transfers, promotions, exams, results, attendance, transcript, announcements, library, security:authLocksChanged, security:privacyPolicyChanged

### 6.6 Frontend: `events.js` (Event Bus)

```javascript
// CustomEvent on window object
export function emit(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
export function on(name, cb) { window.addEventListener(name, cb); }
export function off(name, cb) { window.removeEventListener(name, cb); }
```

Features-ku waxay isticmaalaan `on(EVENTS.STUDENTS_CHANGED, handler)` → cache invalidation.

### 6.7 React Query Client (`queryClient.js`)

```javascript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 daqiiqadood — cache-ka wuu "fresh" yahay
      gcTime: 60 * 60 * 1000,       // 1 saacadood — cache garbage collection
      refetchOnWindowFocus: true,    // Marka user tab-ka u laabto → refresh
      refetchOnReconnect: true,      // Network-ka dib u socda → refresh
      retry: (failCount, err) => {   // 400/401/403/404 → ha retry-garayn
        if ([400,401,403,404].includes(err?.status)) return false;
        return failCount < 2;
      }
    }
  }
})
```

---

## 7) AI Chatbot Feature

### 7.1 Overview

AI Chatbot wuxuu u ogolaanayaa admin/staff/teacher/student in ay la hadlaan AI assistant-ka si ay u fahmaan nidaamka.

### 7.2 Backend

**API Routes** (`/api/ai`):
```
GET  /ai/chat/threads         → List chat threads-ka user-ka
POST /ai/chat/threads         → Create thread cusub
GET  /ai/chat/history         → Message history (threadId query param)
POST /ai/chat/message         → Send message → AI reply
DELETE /ai/chat/threads/:id   → Delete thread
```

**AI Service** (`services/aiChat.js`):
- OpenAI-compatible client (GitHub Models / Azure)
- Default model: `gpt-4.1`
- Env vars: `GITHUB_TOKEN` ama `OPENAI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`
- Global cooldown: marka 429 (rate limit) → cooldown timer
- Error handling: 429 (quota), 503 (busy), 401/403 (auth), 502 (fallback)

**DB Model** (`AiChatThread.js`):
- Thread per user: `{ userId, threadId, title, messages: [{role, content, createdAt}] }`
- Max 20 threads per user

**AI DB Tools** (`services/aiDbTools.js`):
- AI wuxuu xog ka heli karaa nidaamka: e.g., tiro ardayda, macallimiinta, etc.

### 7.3 Frontend

**AiChatContext** (`shared/components/ai/AiChatContext.jsx`):
- State: `isOpen`, `width` (resizable panel)
- Actions: `open()`, `close()`, `toggle()`, `setWidth()`
- Provider-ka: `<AiChatProvider>` — ku duuban App.jsx

**AiChatPanel** (`shared/components/ai/AiChatPanel.jsx`):
- Panel ku dhex jira layout-ka midigta
- Threads sidebar (list, create, delete)
- Message list (user bubbles + assistant bubbles)
- Input area (textarea + Send button)
- Drag-to-resize (bidix)
- Keyboard: Enter → send, Shift+Enter → newline

**AiChatWidget** (`shared/components/ai/AiChatWidget.jsx`):
- Button Navbar-ka (✨ icon) → toggle panel

**Sida loo furiyo**: Click "Sparkles" icon Navbar-ka

---

## 8) Bell Notification (Digniinta Xagga Amniga)

### 8.1 Waxa Bell-ku Muujiyaa

Bell icon (`🔔`) Navbar-ka wuxuu muujiyaa:
- **AuthLock events**: haddii user-ka ama student-ka password-kiisu dhacay ama account-ka la xiray
- Alerts: reset password, unlock, deactivate/activate accounts

### 8.2 Backend

**ActivityNotification model** (`ActivityNotification.js`):
```javascript
{
  category: String,    // 'exams', 'attendance', etc.
  action: String,      // 'add', 'edit', etc.
  title: String,
  message: String,
  actorUserId, actorName, actorRole,
  classLabel, subjectLabel,
  metadata: Object,
  aggregateKey: String, // si events la mid ah loo mideeyo
  resolvedAt: Date,    // null = unresolved
  readAt: Date,        // null = unread
}
```

**activityNotificationService.js**:
- `createActivityNotification()` — create notification cusub
- `upsertAggregatedActivityNotification()` — midee notifications la mid ah (aggregation window: 90s)
- Kadib creation → `publishRealtime({ type: 'security:authLocksChanged' })` → bell refresh

**Security Routes** (`/api/security`):
```
GET    /security/auth-locks/count  → Tiro alerts unread
GET    /security/auth-locks        → List events
POST   /security/clear/:id         → Clear event gaar ah
POST   /security/clear-all         → Clear all
POST   /security/mark-all-read     → Mark all read
POST   /security/reset-password    → Reset password from bell
POST   /security/unlock            → Unlock account from bell
PATCH  /security/deactivate/:id    → Deactivate account
PATCH  /security/activate/:id      → Activate account
```

### 8.3 Frontend (Navbar)

- **Bell button**: icon Bell, badge (tiro alerts-ka)
- **useQuery** for `getAuthLockCount()` → polling count
- **Dropdown panel**: marka bell la gujiso → list alerts
- Actions per alert: Reset Password, Unlock, Deactivate, Activate, Clear
- **Realtime**: `useRealtimeStream` → marka `security:authLocksChanged` dhacdo → React Query invalidation → bell count refresh

---

## 9) Tarjumida (i18n / Translation)

### 9.1 Luqadaha Taageeran

| Code | Luqadda |
|------|---------|
| `so` | Af-Soomaali |
| `ar` | Carabi |
| `en` | English (default / fallback) |

### 9.2 Frontend i18n

**i18n.js** (`frontend/src/i18n/i18n.js`):
- i18next library + i18next-browser-languagedetector
- Resources: `so.js`, `ar.js` (imported inline — fast, no async)
- Language stored: `localStorage.setItem('app:lang', lang)`
- Direction: `ar` → RTL (`document.dir = 'rtl'`), `so`/`en` → LTR

**I18nProvider** (`I18nProvider.jsx`):
- Wrap garaa app-ka oo dhan
- Storage event listener: marka user tab kale luqad badalo → dhammaan tabs ayaa is beddelaan
- `setLang(lang)` function → app-ka oo dhan wuu cusboonaysiiyo

**useI18n Hook** (`useI18n.js`):
```javascript
const { lang, isRTL, setLang, t } = useI18n();
// isticmaal:
t('students.addStudent', { defaultValue: 'Add Student' })
```

**Locales**:
- `i18n/locales/so.js` — Af-Soomaali translations
- `i18n/locales/ar.js` — Carabi translations
- English: fallback values ku jira `defaultValue` parameter-ka

**fixMojibake utility** (`utils/fixMojibake.js`): tirtiraa characters-ka khaldan ee Carabi text-ka.

### 9.3 Backend i18n

**middleware/i18n.js**: wuxuu daraa `req.t()` function
- Reads `Accept-Language` header (frontend-ku wuu diraa luqadda)
- Translations: `backend/i18n/` folder
- Isticmaal: `req.t('common.notFound', null, 'Not found')` → soo celi message luqadda saxda ah

### 9.4 RTL Layout

Marka `ar` la doorto:
- `App.jsx`: `flexDirection: isRTL ? 'row-reverse' : 'row'` — Sidebar & AiPanel meelahooda beddela
- AI Panel: waa always midig (both LTR + RTL)
- `AiChatPanel`: `dir={isRTL ? 'rtl' : 'ltr'}`
- Navbar: RTL-aware icon placement

---

## 10) UI Primitives iyo Shared Components

### 10.1 UI Primitives (`shared/components/ui/`)

Kuwaani waa **design system-ka aasaasiga** — waxa loo isticmaalo si joogto ah:

| Component | Waxa uu qabto |
|-----------|----------------|
| `Button.jsx` | Batanka (variants: brand/outline/ghost/danger, sizes: sm/md/lg) |
| `Input.jsx` | Text input field |
| `Select.jsx` | Dropdown selector |
| `SearchableSelect.jsx` | Select leh search capability |
| `DropdownSelect.jsx` | Dropdown leh more options |
| `Checkbox.jsx` | Checkbox input |
| `Radio.jsx` | Radio button |
| `Textarea.jsx` | Multi-line text input |
| `Modal.jsx` | Dialog/modal window (portal-based) |
| `Badge.jsx` | Status badge (colored labels) |
| `Chip.jsx` | Tag-like element |
| `Card.jsx` | Bordered container |
| `Alert.jsx` | Alert/notice message |
| `FormField.jsx` | Label + input wrapper |
| `Label.jsx` | Form label |
| `EmptyState.jsx` | "No data" display |
| `LoadingState.jsx` | Loading indicator |
| `Skeleton.jsx` | Loading skeleton (gray placeholder) |
| `Separator.jsx` | Horizontal divider |
| `ActionButton.jsx` | Icon + action button |
| `ListPageShell.jsx` | List page wrapper |
| `badges/` | Specialized badge variants |

**Design Tokens** (`index.css`): CSS custom properties (colors, radius, spacing) — theme-based.

### 10.2 Table System (`shared/components/table/`)

Dhammaan pages-ka liiska isticmaalaan tabla system-ka:

| Component | Role |
|-----------|------|
| `StandardTable.jsx` | Basic table (thead/tbody) |
| `DataTable.jsx` | Feature-rich table (sort, filter, pagination, column visibility) |
| `TableState.jsx` | State management (loading/empty/error states) |
| `SortableTh.jsx` | Clickable sortable column header |
| `PaginationBar.jsx` | Pagination controls (page 1/2/3...) |
| `PaginationControls.jsx` | Prev/Next buttons |
| `ColumnVisibilityMenu.jsx` | Show/hide columns menu |
| `RowActionButtons.jsx` | Edit/Delete buttons per row |
| `StickyTableControls.jsx` | Sticky search/filter bar |
| `TableShell.jsx` | Outer wrapper |

### 10.3 Layout Components (`shared/components/layout/`)

**Sidebar.jsx**:
- Navigation links (navItems from `config/navigation.js`)
- Role-based visibility (admin/staff/teacher/student sees different links)
- Announcement unread badge
- Collapsible (icons only mode)
- Mobile drawer mode
- Privacy policy gates (student tabs)

**Navbar.jsx**:
- Page title
- Mobile menu toggle
- Language switcher (so/ar/en)
- Theme toggle (dark/light)
- AI Chat button (✨)
- Bell notifications (Security)
- User profile info
- Logout button
- `useRealtimeStream` + `useAnnouncementsStream` (both start here)

### 10.4 Feedback Components (`shared/components/feedback/`)

- `LoadingState.jsx` — Spinner leh text
- `EmptyState.jsx` — Wax laga heli waayay
- `PageLoading.jsx` — Full-page loading
- `Spinner.jsx` — Rotating spinner

### 10.5 Shared Hooks (`shared/hooks/`)

- Hooks reusable ah oo dhammaan features-ku isticmaali karaan

### 10.6 DataToolbar

- `DataToolbar/` — Search, filter, export buttons toolbar

### 10.7 Theme System (`shared/theme/ThemeContext.jsx`)

- `useTheme()` hook → `theme.isDark`, `theme.toggle()`
- Dark/Light mode — CSS class-based (Tailwind dark mode)

---

## 11) Features-ka Kala Duwan — Sharax

### 11.1 Students (Ardayda)

**Backend**: `/api/students` — CRUD ardayda + enrollments + password reset + photo upload
**Frontend**: `features/students/`
- `StudentPage` — List + search + filter + pagination
- `StudentDashboardPage` — Individual student profile (tabs):
  - `AdminStudentHomeTab` — Overview cards
  - `ProfileTab` — Personal info
  - `EnrollmentsTab` — Enrollment history
  - `TranscriptTab` — Natiijada (academic transcript)
  - `AttendanceTab` — Xaadiridda
  - `TimetableTab` — Jadwalka fasalka
  - `LibraryTab` — Kheyraadka maktabadda
  - `TransfersTab` — Wareejinta
  - `FinanceTab` — Maaliyadda ardayga

**Student Self Dashboard**: `StudentSelfDashboardShell` — Role: student → iskooda
- Tabs: Home, Transcript, Attendance, Timetable, Finance, Library, Profile, Enrollments, Transfers
- Privacy Policy gates: admin wuxuu xukumi karaa tabs student-ku arki karo

### 11.2 Teachers (Macallimiinta)

**Backend**: `/api/teachers` — CRUD + assignments + photo upload
**Frontend**: `features/teachers/`
- `TeachersPage` — List
- `TeacherProfilePage` — Profile (waxa la dhiibtay, jadwalka)
- `TeacherDashboardPage` — Teacher role: their classes
- `TeacherClassesPage` — Classes list (teacher)
- `TeacherDashboardPrefetcher` — Prefetch data marka teacher log in gareeyo

### 11.3 Grades & Sections (Fasalada)

**Backend**: `/api/grades` — GradeSection CRUD (grade+shift+section)
**Frontend**: `features/grades/GradePage`
- Fasalada, waqtiyada (shifts), subjects la xidid

### 11.4 Subjects (Maaddooyinka)

**Backend**: `/api/subjects` — CRUD + grade associations
**Frontend**: `features/subjects/SubjectPage`

### 11.5 Exams (Imtixaannada)

**Backend**: `/api/exams`:
- Exam types (ExamType)
- Exam grid (score matrix: student × subject)
- Score upsert (ExamScore)
- Summary + transcript generation

**Frontend**: `features/exams/`
- `ExamManagementPage` — Geli natiijooyinka
- `ExamSettingsPage` — Noocyada imtixaanka iyo version-yada

### 11.6 Results (Natiijooyinka)

**Frontend**: `features/results/ResultPage` — Muuji natiijada
**Backend**: transcripts + exam summaries

### 11.7 Attendance (Xaadiridda)

**Backend**: `/api/attendance` — Record, edit, reports
**Frontend**: `features/attendance/`
- `AttendancePage` — Geli xaadiridda (teacher ama staff)
- `AttendanceReportsPage` — Warbixinta xaadiridda

### 11.8 Timetable (Jadwalka)

**Backend**: `/api/timetable` — CRUD jadwalka
**Frontend**: `features/timetable/TimetablePage`
- View, edit, print, download

### 11.9 Announcements (Xayeysiisyada)

**Backend**: `/api/announcements` — CRUD + SSE stream
**Frontend**: `features/announcements/`
- `AnnouncementsPage` — All roles access
- Unread badge Sidebar-ka
- `useAnnouncementsStream` — SSE stream gaar u ah announcements
- `useAnnouncementsUnread` — Count unread

**SSE Stream Gaar ah**: `/api/announcements/stream` (oo ka gooni ah realtime stream-ka guud)

### 11.10 Promotions (Kor u qaadidda Fasalka)

**Backend**: `/api/promotions` — Preview + execute promotion
**Frontend**: `features/promotions/PromotionPage`
- Preview ardayda eligible ah
- Execute promotion (ardayda kor u qadi)

### 11.11 Cohorts (Kooxaha Ardayda)

**Backend**: `/api/cohorts`
**Frontend**: `features/cohorts/CohortsPage`
- ID generation system (e.g. `DU5SA15`)

### 11.12 Transfers (Wareejinta)

**Backend**: `/api/transfers` — Warehouse ardayga fasalba fasal
**Frontend**: `features/transfers/TransfersPage`
- Xuli ardayga + fasalka cusub + history

### 11.13 Transcript (Warbixinta Akadeemiga)

**Backend**: `/api/transcripts`
**Frontend**: `features/transcript/TranscriptPage`
- Print/Download PDF

### 11.14 Library (Maktabadda)

**Backend**: `/api/library` — PDF upload + links + download audit
**Frontend**: `features/library/LibraryManagementPage`
- Upload resources (admin/staff/teacher)
- Download (all roles, audited)
- Static file serving: guarded — `/api/uploads/library` (requires auth + permission)

### 11.15 Finance (Maaliyadda)

**Backend**: `/api/finance` — Finance endpoints (granular)
**Frontend**: `features/finance/`
- `FinanceDashboardPage` — Summary stats
- `FinanceAccountsPage` — Aasaaska lacagaha, institutions, ledger
- `FinanceStudentFinancePage` — Fees ardayda, receipts, previous balances
- `FinancePayrollPage` — Mushaarka shaqaalaha
- `FinanceExpensesPage` — Kharashyada + categories

### 11.16 Setup (Dejinta Nidaamka)

**Backend**: `/api/setup`
**Frontend**: `features/setup/`
- `GradesSetupPage` — Heer-joogta waxbarashada
- `ShiftsSetupPage` — Waqtiyada fasalada
- `AcademicYearsSetupPage` — Sannadyada akadeemiga

### 11.17 User Management (Maareynta Isticmaalayaasha)

**Backend**: `/api/users` — Admin only: CRUD staff/teacher accounts + permissions
**Frontend**: `features/users/`
- `UserManagementPage` — List all users
- `UserProfilePage` — Profile + change permissions
- Realtime: marka user-ka la beddelo → `EVENTS.USERS_CHANGED` → auth refresh

### 11.18 Dashboard

**Backend**: `/api/dashboard`
**Frontend**: `features/dashboard/DashboardPage`
- Stats overview (ardayda, macallimiinta, ...)
- Quick links

### 11.19 Audit Trail (Tracking)

**Backend**: `/api/audit` — Log-ga dhammaan ficilada
**Frontend**: `features/audit/TrackingAuditPage`
- Client-side page view tracking (`App.jsx`)
- Server-side action logging (middleware/auditTrail.js)

### 11.20 Security

**Backend**: `/api/security` — Auth locks, bell notifications
**Frontend**: `features/security/` + Navbar bell panel

### 11.21 Privacy Control

**Backend**: `/api/auth/privacy-policy` + `/api/setup/*`
**Frontend**: `features/privacy-control/PrivacyControlPage`
- Admin controls waxa students arki karaan (tabs, data)
- `StudentDashboardPolicyRoute` — gates student tabs

### 11.22 Lookups

**Backend**: `/api/lookups` — Academic years, grades, shifts, exam types (reference data)
**Frontend**: `features/lookups/` — Cached dropdown data (React Query)

---

## 12) Sida Backend iyo Frontend ay Isugu Xiran Yihiin

### 12.1 Networking

```
Browser (Frontend: Vite)
    ↓  HTTP requests to /api/*
Vite Dev Proxy (vite.config.js)
    ↓  proxy → http://localhost:7000
Express Backend (port 7000)
    ↓  process + respond
MongoDB Atlas / Local
```

**Production**: Frontend build (`dist/`) waxaa laga server gareeya static hosting ama reverse proxy (Nginx) → `/api/*` waxaa laga proxy gareeya backend-ka.

### 12.2 API Client (`shared/api/http.js`)

`fetchJson(path, options)` waa xulasho-u-jirta API calls-ka:
- Auto: Content-Type, credentials: 'include', CSRF header, Accept-Language
- 401 → `window.dispatchEvent(new CustomEvent('auth:unauthorized'))` → auto-logout
- CSRF retry: haddii 403 CSRF → bootstrap cookie → retry
- Error: `err.status + err.data` structure

### 12.3 Data Flow Example (Students List)

```
User opens /students page
    ↓
StudentPage renders
    ↓
useQuery(['students', filters]) → fetchStudents(filters) → GET /api/students?page=1&limit=20&q=...
    ↓ backend
protect middleware (JWT verify)
checkPermission('students', 'view')
studentController.listStudents()
    → MongoDB find() + pagination
    → { success: true, data: [...], meta: { total, page } }
    ↓ frontend
React Query caches data
StandardTable/DataTable renders rows
```

### 12.4 Data Mutation Flow (e.g. Add Student)

```
User fills form → Submit
    ↓
addStudentMutation.mutate(payload)
    ↓
POST /api/students (with X-CSRF-Token header + JSON body)
    ↓ backend
csrf check → protect → checkPermission → validate(body) → studentController.createStudent()
    → Student.create() + Enrollment.create()
    → publishRealtime({ type: 'students:changed' })
    → { success: true, data: newStudent }
    ↓ frontend
onSuccess: toast.success('Student added')
queryClient.invalidateQueries(['students']) → refetch list
```

---

## 13) Amnigeynta (Security)

### 13.1 Layers-ka Amniga

| Layer | Mechanism |
|-------|-----------|
| Transport | HTTPS (production) |
| Auth | JWT HttpOnly Cookie (1d dev / 7d prod) |
| CSRF | Double-submit token (csrf_token cookie + X-CSRF-Token header) |
| Rate Limiting | 600 req/min general; 200 failed login/15min |
| Progressive Lockout | loginCooldownLevel (warnings → 24h lock) |
| Session Invalidation | tokenVersion (global logout) |
| Idle Timeout | Client-side timer (configurable via privacyPolicy) |
| Cross-tab Logout | localStorage broadcast |
| Input Validation | Zod schemas (backend) |
| Permissions | PERMISSION_CONTRACT allowlist |
| Security Headers | Helmet.js |
| File Upload | multer (size/type limits) |
| Library Download | Guarded static serving + audit log |

### 13.2 Progressive Login Lockout

```
loginCooldownLevel 0: normal
loginCooldownLevel 1: warning (+ short delay)
loginCooldownLevel 2: longer delay
loginCooldownLevel 3: longer delay
loginCooldownLevel 4: 24h lock (auth_token cleared, 401 on protect)
```

Admin wuxuu ka reset gareeya Security page-ka ama bell panel-ka.

---

## 14) Xiriirka Dhammaan Qaybaha

### Sawirka (Diagram in text)

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                 │
│                                                         │
│  main.jsx (QueryClient + Auth + I18n + Theme + Router)  │
│       ↓                                                 │
│  App.jsx (Sidebar + Navbar + Outlet + AiPanel)          │
│       ↓                                                 │
│  features/*/pages/* (Route pages)                       │
│    ↓ useQuery/useMutation (React Query)                 │
│  features/*/api/* (fetchJson wrapper)                   │
│    ↓ shared/api/http.js (fetchJson + CSRF + cookies)    │
│  ─────────────────────────────────────────────────── ─  │
│  shared/realtime/useRealtimeStream.js (SSE EventSource) │
│    ↓ realtimeDispatcher.js → events.js (CustomEvent)    │
│    ↓ feature hooks → queryClient.invalidateQueries()    │
└─────────────────────────────────────────────────────────┘
                       ↑↓ HTTP + SSE + Cookies
┌─────────────────────────────────────────────────────────┐
│                   BACKEND (Express/Node.js)              │
│                                                         │
│  server.js → middleware stack → routes                  │
│    ↓                                                    │
│  routes/*.js → controllers/*.js → services/*.js         │
│    ↓                                                    │
│  models/*.js (Mongoose) → MongoDB                       │
│    ↓                                                    │
│  utils/realtimeBus.js (EventEmitter) → SSE clients      │
│    ↓                                                    │
│  services/aiChat.js → OpenAI API (GitHub Models/Azure)  │
└─────────────────────────────────────────────────────────┘
```

### Xiriirka Muhiimka ah

| Qaybta | Xiriirka |
|--------|---------|
| `AuthContext` | `fetchJson('/auth/verify')` kull 15s; `login()` / `logout()` |
| `useRealtimeStream` | `EventSource('/api/realtime/stream')` — backend `realtimeBus` |
| `realtimeDispatcher` | SSE payload → `events.js` CustomEvents → React Query invalidation |
| `AiChatPanel` | `fetchJson('/ai/chat/message')` → `services/aiChat.js` → OpenAI |
| Bell (Navbar) | `getAuthLockCount()` + `useRealtimeStream` → `security:authLocksChanged` |
| `I18nProvider` | `i18next` + localStorage; `http.js` sends `Accept-Language` header |
| `ThemeContext` | CSS class + localStorage; dark/light mode |
| `ProtectedRoute` | `useAuth()` → role/permission check → redirect |
| `checkPermission` | Backend middleware → `PERMISSION_CONTRACT` allowlist |

---

## Gloseri (Eray-bixin)

| Erayga | Macnaha |
|--------|---------|
| SSE | Server-Sent Events — server → client events (one-way) |
| JWT | JSON Web Token — token authentication |
| CSRF | Cross-Site Request Forgery — attack prevention |
| ESM | ES Modules (`import/export`) |
| ODM | Object Document Mapper (Mongoose → MongoDB) |
| EDCI | Event-Driven Cache Invalidation — qaabka realtime-ka |
| Invalidation | Kicinta cache-ka si uu u refetch gareeyo |
| Debounce | Raagsii events badan oo dhow si loo mideeyo |
| Heartbeat | Verification kull muddo yar (auth verify + SSE ping) |
| Permission contract | Allowlist-ka modules/actions ee la oggolaaday |
| Double-submit CSRF | Cookie + Header barbar dhig si CSRF looga ilaaliyo |
| Feature-based | Folder-yada sida feature-ka loo kala qaado |
| Shared layer | Infrastructure wadaagta dhammaan features-ka |
| Design tokens | CSS variables-ka (colors, radius, spacing) |
| RTL | Right-to-Left (Carabi direction) |
| LTR | Left-to-Right (English/Somali direction) |
