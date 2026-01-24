# Audit & Talooyin Kahor Deploy (Soomaali)
Dulmar: Qoraalkan waa “audit + checklist” (local). Ujeedadu waa in khaladaadka la helo, la kala hormariyo, kadibna si tartiib tartiib ah loo saxo. Qodob kasta hoostiisa waxaa ku qoran **Status** (✅/⏳) si loo arko waxa la dhammeeyey.
## Sida loo kala hormariyo (Severity)
- **Critical**: Haddii la deploy-gareeyo sidaan, amni/availability/xaquuq (data) si toos ah bay u halis gelaysaa.
- **High**: Khatar weyn ama bug keeni kara data leak/privilege issue; waa in si degdeg ah loo saxo.
- **Medium**: Waxay keeni kartaa khaladaad/maintenance culus, laakiin maaha “blocker” degdeg ah.
- **Low**: Talooyin/qaabeyn/design; hagaajin dambe.
## Critical (waa in la saxo kahor deploy)
### 1) Secrets iyo passwords (repo/history risk)
- Meel: [backend/.env](backend/.env)
- Dhib: `.env` waxaa ku jiri kara `MONG_URL` (credentials), `JWT_SECRET`, iyo default passwords.
- Sabab: Haddii file-kan waligiis hore loo commit-gareeyay ama la share-gareeyay, sirta waa “leak” xitaa haddii hadda la ignore-gareeyay.
- Xal:
  - ✅ Root `.gitignore` hore ayuu u ignore-gareeyaa `.env` iyo `**/.env*`.
  - **Rotate secrets**: beddel MongoDB password + beddel `JWT_SECRET`.
  - Ka fogow default passwords; ku qas first-login password change.
- Impact haddii aan la sixin: DB/Auth compromise.
### 2) Password policy daciif ah + legacy plaintext support
- Meel: [backend/controllers/authController.js](backend/controllers/authController.js), [backend/models/Student.js](backend/models/Student.js), [backend/controllers/userController.js](backend/controllers/userController.js)
- Dhib: Default `123456` + taageero plaintext compare (legacy) → brute force/guessing way fududaan kartaa.
- Xal: Hash-only + password rules + mustChangePassword (staff/teacher/student) + rate limiting.
- Impact: Account takeover.
- Status: ✅ Waxaa la adkeeyey (default password .env-only + login hardening + rate limit + force-change behavior).
### 3) Frontend ESLint errors (React hooks rule-of-hooks)
- Meel: tusaale [frontend/src/pages/GradePage.jsx](frontend/src/pages/GradePage.jsx), [frontend/src/pages/StudentDashboardPage.jsx](frontend/src/pages/StudentDashboardPage.jsx)
- Dhib: “Hooks called conditionally” waa runtime bug (crash/undefined behavior).
- Xal: Refactor si hooks ay u noqdaan top-level (no early return ka hor hooks), nadiifi `toast` undefined, unused vars, iwm.
- Impact: Page crash + user experience xun.
- Status: ✅ Rules-of-hooks errors waa la saaray (wrapper components ayaa loo kala qaaday).
## High (saxo degdeg ah)
### 4) Missing security hardening (Helmet + Rate limiting)
- Meel: [backend/server.js](backend/server.js)
- Dhib: Helmet/rate limit ma jiraan; login/API brute force/DDOS u nugul.
- Xal: `helmet()` + `express-rate-limit` (si gaar ah `/api/auth/login`) + general throttling.
- Waxa hadda jira (muhiim):
  - Helmet headers waa la shiday (CSP waa `false` si uusan SPA dev u jabin).
  - `/api` general limiter + `/api/auth/login` layered limiter (IP + IP+identity).
  - `TRUST_PROXY` waxaa loo gate-gareeyay env (`TRUST_PROXY=1`) si looga fogaado IP spoofing.
  - `x-powered-by` waa la damiyey.
  - `express.json({ limit: '50kb' })` si looga yareeyo “big body” abuse.
  - 404 + error handler (JSON) si aan loo helin HTML errors/stack leaks.
  - ✅ Rate limit keyGenerator wuxuu isticmaalayaa `ipKeyGenerator(req)` (IPv6 bypass risk waa la xaliyey).
- Status: ✅ La hirgeliyey (helmet + throttling + header-trust safeguards + IPv6-safe limiter keys).
### 5) Validation la’aan (NoSQL injection / regex DoS)
- Meel: controllers kala duwan, gaar ahaan search/query params
- Dhib: Inputs aan la xadidin/validate-gareyn waxay keeni karaan query culus ama filter injection.
- Xal: Joi/Zod middleware per endpoint + regex escape + max lengths.
- Waxa la qabtay (core hardening):
  - [backend/middleware/validate.js](backend/middleware/validate.js) (Zod validator; Express 5 `req.query` waa getter-only, sidaas darteed validator-ku wuxuu u update-gareeyaa query/params *in-place* si uusan u keenin 500)
  - Auth: [backend/routes/authRoutes.js](backend/routes/authRoutes.js) (login + change-password max lengths)
  - User Management: [backend/routes/userRoutes.js](backend/routes/userRoutes.js) (query/body validation)
  - Students list + ids: [backend/routes/studentRoutes.js](backend/routes/studentRoutes.js)
  - Grade sections search/id: [backend/routes/gradeSectionRoutes.js](backend/routes/gradeSectionRoutes.js) + regex escape gudaha controller
  - Pagination sync: UI wuxuu leeyahay Rows selector (oo ay ku jirto "All"), sidaas darteed list endpoints waxay oggol yihiin `limit` weyn (bounded) si frontend/backend isula socdaan.
- Status: ✅ (qodobada ugu halista badan waa la xoojiyey; endpoints kale waa la sii ballaarin karaa).
### 6) Teacher scope / ownership checks (server-side)
- Meel: routes/controllers teacher-student/exams/attendance
- Dhib: Haddii backend uusan ku xirin teacherRef/assignment, teacher wuxuu arki karaa xog aan u bannaanayn.
- Xal: Ownership checks server-side (teacherRef + assignments) + consistent RBAC.
- Waxa la qabtay:
  - Middleware assignments: [backend/middleware/teacherScope.js](backend/middleware/teacherScope.js)
  - Students list: teacher wuxuu arki karaa roster kaliya (waa inuu keenaa `gradeSectionId`, assignment ayaa la check-gareeyaa) gudaha [backend/controllers/studentController.js](backend/controllers/studentController.js)
  - Grade sections: teacher wuxuu arkaa kaliya classes-kiisa ([backend/controllers/gradeSectionController.js](backend/controllers/gradeSectionController.js))
  - Exams score save: controller-ku wuxuu xaqiijiyaa assignment (TeacherAssignment) gudaha [backend/controllers/examController.js](backend/controllers/examController.js)
- Status: ✅ (scope checks muhiim ah waa la adkeeyey; haddii aad rabto waxaan ku ballaarin karnaa endpoints kale).
### 7) Admin safety (self-delete / last-admin)
- Meel: [backend/controllers/userController.js](backend/controllers/userController.js)
- Dhib: Admin wuxuu disable/tirtiri karaa naftiisa ama admin kii ugu dambeeyay.
- Xal: Guard rules: “no self-delete” + “at least 2 admins”.
- Status: ✅ Waxaa lagu daray guards (no self-delete/status-change + prevent last-admin removal).
### 8) CSRF risk (cookie auth)
- Meel: API guud ahaan
- Dhib: Haddii CORS/sameSite mustaqbalka la dabciyo, CSRF way kici kartaa.
- Xal: CSRF token (csurf) ama sameSite Strict + HTTPS + origin allowlist.
- Waxa la qabtay (implementation): Double-submit CSRF token
  - Backend: [backend/middleware/csrf.js](backend/middleware/csrf.js) + `app.use('/api', csrfProtection)` gudaha [backend/server.js](backend/server.js)
  - Endpoint: `GET /api/auth/csrf` (soo celiya token + cookie)
  - Frontend: [frontend/src/api/http.js](frontend/src/api/http.js) wuxuu ku daraa `X-CSRF-Token` unsafe methods; [frontend/src/auth/AuthContext.jsx](frontend/src/auth/AuthContext.jsx) wuxuu sameeyaa CSRF bootstrap ka hor login/logout.
- Status: ✅
### 9) Route fallthrough: 401 halkii 404 (debug/monitoring)
- Meel: [backend/server.js](backend/server.js) + [backend/routes/userRoutes.js](backend/routes/userRoutes.js)
- Dhib: `/api` router (admin-only) wuxuu qarin karaa “route not found” oo u beddeli kara 401.
- Xal: mount `userRoutes` si gaar ah (`/api/users`) ama 404 handler ka hor auth router.
- Status: ✅ `userRoutes` waxaa loo raray `/api/users` si 404 sax ah u soo noqdo.
### 10) CORS/HTTPS config pitfalls
- Meel: [backend/server.js](backend/server.js) + config
- Dhib: `CORS_ORIGIN` default localhost; prod haddii aan la saxin cookies/requests way jabayaan ama origin khaldan baa furmi kara.
- Xal: prod origin allowlist + HTTPS + secure cookies.
- Waxa la qabtay:
  - CORS allowlist + reject unknown origins gudaha [backend/server.js](backend/server.js)
  - Cookie config la env-gareeyay: [backend/config/cookies.js](backend/config/cookies.js)
    - `COOKIE_SAMESITE=strict|lax|none`
    - `COOKIE_SECURE=1` (production recommended)
    - `COOKIE_DOMAIN=.example.com` (optional)
- Status: ✅ (deploy-kaaga waa inuu dejiyo env vars sax ah)

### 11) User Management: ha soo bandhigin Student/Teacher
- Meel: [backend/controllers/userController.js](backend/controllers/userController.js), [frontend/src/pages/UserManagementPage.jsx](frontend/src/pages/UserManagementPage.jsx)
- Dhib: Maadaama Student/Teacher ay hadda ku jiraan `User` collection, `GET /api/users` wuxuu soo celin karaa roles aan ku habboonayn User Management table.
- Xal: `GET /api/users` default wuxuu ka reebaa `student` iyo `teacher` (waxay leeyihiin pages/APIs u gaar ah). `create/update` ee `/api/users` sidoo kale lama oggola roles-kaas.
- Status: ✅ La saxay (server-side filter + client-side defensive filter).

### 11b) Session lifecycle: global logout + stale cookie invalidation + idle logout
- Ujeeddo: Marka user-ku “logout” sameeyo, waa inuu ka baxaa **meel walba** (tabs + browsers) oo cookie/JWT-kii hore aan mar dambe shaqayn.
- Waxa la qabtay:
  - Backend: Token-ku wuxuu xanbaarsan yahay `v` (tokenVersion), server-kuna wuxuu diidaa token stale ah (401) isagoo sidoo kale cookie-ga nadiifinaya.
  - Logout: default waa “global” (tokenVersion increment) si sessions hore u noqdaan invalid.
  - Frontend: cross-tab sync (localStorage broadcast) + 30s idle auto-logout + 401 auto-logout; waxaa kale oo jira heartbeat `/api/auth/verify` si uu u ogaado global logout xitaa haddii userku wax request ah uusan samayn.
- Status: ✅
## Medium (hagaajin muhiim ah)
### 12) Error handling uniformity
- Dhib: Status codes/response shapes inconsistent.
- Xal: Standardize `{ success, message, code }` + consistent 4xx/5xx.
- Waxa la qabtay:
  - Central JSON 404 + error handler gudaha [backend/server.js](backend/server.js)
  - Permission middleware errors: [backend/middleware/checkPermission.js](backend/middleware/checkPermission.js) hadda wuxuu soo celinayaa `{ success:false, message }`.
- Status: ✅ (core layer); controllers-ka qaar wali waxay hayaan shapes duug ah (waa la sii nadiifin karaa).
### 13) Audit trail / observability
- Dhib: Isbeddelada muhiimka ah (users/promotions/transfers/exams scores) audit log ma leh.
- Xal: AuditLog model + middleware + structured logging.
- Waxa la qabtay:
  - Audit writer: [backend/services/auditService.js](backend/services/auditService.js)
  - Login + change-password audit: [backend/controllers/authController.js](backend/controllers/authController.js)
  - User create/update/delete/toggle audit: [backend/controllers/userController.js](backend/controllers/userController.js)
- Status: ✅ (qeyb muhiim ah); waxaad ku kordhin kartaa transfers/promotions/exam-scores haddii aad rabto.
### 14) Status casing / consistency
- Dhib: “Active/Inactive” vs “active/inactive” inconsistency waxay keeni kartaa edge bugs.
- Xal: enum midaysan + migration.
- Waxa la qabtay:
  - Students API wuxuu aqbalaa `active/inactive` ama `Active/Inactive` (DB-na wuxuu sii hayaa `Active/Inactive`) gudaha [backend/controllers/studentController.js](backend/controllers/studentController.js)
- Status: ✅ (API boundary); migration midaysan waa optional.

### 15) Frontend lint (ESLint) nadiifin
- Dhib: ESLint errors waxay joojin karaan CI/build ama waxay qariyaan bugs dhab ah.
- Xal: Ka saar `no-unused-vars` iyo hook misuse; ka dhig “errors = 0” kahor deploy.
- Status: ✅ ESLint errors = 0 (warnings wali way jiri karaan).
## Low (design/optimization)
### 16) Student ↔ User architecture
- Dhib: Students collection gooni ah; haddii la rabo unified auth, waxay u baahan tahay design/migration.
- Ujeeddo: Hal “Accounts/User” collection oo ay ku jiraan dhammaan dadka login kara (admin/staff/teacher/student) si auth/RBAC u noqdo mid midaysan (security + maintainability).
- Xaaladda hadda:
  - Teacher login waa User account oo ku xiran `teacherRef` ([backend/controllers/teacherController.js](backend/controllers/teacherController.js), [backend/models/User.js](backend/models/User.js)).
  - Student login hadda waa **User-first** (role=`student`, username=`studentId`) ([backend/controllers/authController.js](backend/controllers/authController.js), [backend/models/User.js](backend/models/User.js)).
  - Student profile data wali wuxuu ku jiraa Student collection (User.studentRef → Student._id) ([backend/models/Student.js](backend/models/Student.js)).
  - Student “self access” wuxuu isticmaalaa `req.user.studentRef` (new model) ama fallback `req.user._id` (legacy) ([backend/middleware/studentSelf.js](backend/middleware/studentSelf.js)).

- Qorshe (phased migration, aan jebin behavior-ka hadda):
  1) **Schema/links**
    - Ku dar `role: 'student'` gudaha User enum.
    - Ku dar `studentRef` gudaha User (User → Student profile link), sida `teacherRef`.
  2) **Create student User accounts (new enrollments)**
    - Marka Student la abuuro + studentId la assign-gareeyo, samee User cusub:
     - `username = studentId` (loginId)
     - `role = 'student'`
     - `studentRef = student._id`
     - `password` ka qaado default (hash) + `mustChangePassword=true` (la mid teacher pattern).
  3) **Migration existing students (one-time script / admin action)**
    - U samee User account student kasta oo leh `studentId` non-empty.
    - Password: copy hashed password-ka Student (si aysan ardaydu u lumin password-kooda).
    - Conflict checks: haddii username/email hore u jiro → report list (manual resolution).
  4) **Auth update (backward compatible)**
    - `POST /api/auth/login`: student login ha noqdo User-first (`role='student' AND username=studentId`), ka dibna fallback Student (legacy) inta migration socoto.
    - `protect`/`verify`: token cusub ha noqdo User _id; sii hay Student-lookup fallback si tokens hore u shaqeeyaan ilaa cutover.
  5) **Student self routes update**
    - Update [backend/middleware/studentSelf.js](backend/middleware/studentSelf.js) si student u check-gareeyo `req.user.studentRef` (marka req.user uu yahay User student) ama `req.user._id` (legacy Student token).
    - `PUT /api/students/change-password` + reset routes: u wareeji inay update-gareeyaan User.password (optionally sync Student.password inta legacy fallback jiro).
  6) **Cutover & cleanup**
    - Marka 100% students ay leeyihiin User accounts:
      - Orod: `node backend/scripts/migrateStudentsToUsers.js --apply`
      - Hubi: dry-run `wouldCreate=0` + `alreadyLinkedByStudentRef = totalStudents`
      - Jooji wixii legacy fallback ah haddii ay wali jiraan (login/verify/protect) → Student wuxuu noqdaa “profile/data” kaliya.
      - Password source-of-truth: `User.password` (Student.password waxaa lagu reebi karaa legacy-only ama laga saari karaa mustaqbalka).
      - DB index note: User.email unique waa inuu noqdaa **sparse** si accounts aan email lahayn u shaqeeyaan.

- Notes (final): haddii aad rabto “full cutover”, waxaa fiican in la sameeyo:
  - Student schema: ka saar `password/failedLoginAttempts/lockUntil` ama ka dhig non-auth
  - Endpoint-yada reset/change-password: xaqiiji inay taabanayaan User.password oo keliya
  - Script: report conflicts (username/email) kahor apply

- Acceptance criteria (si aan u ogaano in la gaaray):
  - Student wuxuu login karaa `studentId + password` iyadoo JWT uu ku xidhan yahay User _id.
  - Teacher/Staff/Admin behavior waxba kama jabaan.
  - Student self endpoints waxay shaqeeyaan oo kaliya student-kiisa (ownership).
  - Reset password (staff) wuxuu reset-gareeyaa account-ka saxda ah.

- Dry-run (report only): [backend/scripts/dryRun_migrateStudentsToUsers.js](backend/scripts/dryRun_migrateStudentsToUsers.js)
### 17) Frontend bundle size warning
- Dhib: Chunk >1500kB warning.
- Xal: code splitting / manualChunks.
- Waxa la qabtay:
  - Vite `manualChunks` vendor split (react/pdf/excel/query) gudaha [frontend/vite.config.js](frontend/vite.config.js)
- Status: ✅
## Checks la sameeyay (local)
### Backend HTTP smoke (status codes)
- `GET /` → 200
- `GET /api/auth/verify` (cookie ma jiro) → 200
- `GET /api/lookups/grades` → 200
- `GET /api/lookups/shifts` → 200
- `GET /api/lookups/academic-years` → 200
- `GET /api/lookups/exam-types` → 200
- `GET /api/users` (protected) → 401
- `GET /api/students` (protected) → 401
- `GET /api/exams/types` (protected) → 401
- `GET /api/attendance` (protected) → 401

### Frontend build
- `cd frontend` → `npm run build` → ✅ Success (built ~35s)
- Ogeysiis: “chunks >1500kB” warning → code splitting/manualChunks (Medium/Low)

### Backend verify (local)
- `node --check backend/server.js` → ✅ OK
- `cd backend` → `npm test` → ✅ PASS (3/3)

### Frontend lint
- `cd frontend` → `npm run lint` → ✅ errors = 0

### Frontend tests + npm audit
- `cd frontend` → `npm test` → ✅ PASS (2/2)
- `cd frontend` → `npm audit` → ✅ 0 vulnerabilities
- Note: Moderates-ka (vite/esbuild chain ee vitest) waxaa la xaliyey kadib `vitest` upgrade.

### Git hygiene (local)
- Waxaa jira untracked files frontend; ka hor inta aan la tirtirin waa in la go'aamiyaa “intended features” vs “temp/accidental”.
- Untracked hadda muuqda:
  - `frontend/src/components/grade/GradeSectionRosterModal.jsx`
  - `frontend/src/components/teacher/dashboard/`
  - `frontend/src/pages/ExamSettingsPage.jsx`
  - `frontend/src/pages/HomeRedirect.jsx`
  - `frontend/src/pages/TeacherDashboardPage.jsx`
  - `frontend/src/queryKeys/`
  - `frontend/src/routes/`
