# AUTHZ (Permissions) – Dukumenti Rasmi ah (Jan 2026)

> Ujeeddo: Dukumentigan wuxuu isku keenayaa **policy-ga**, **jadwalka oggolaanshaha (matrix)**, iyo **drift/halis** si team-ku hal meel uga akhriyo.
>
> Qodob muhiim ah: **Backend-ka ayaa go’aanka ugu dambeeya leh** (source of truth). Frontend gating = UX kaliya.

---

## 1) Policy-ga Rasmi ah (Go’aanka)

### 1.1 User Management
- User Management (`/users` + `/api/users/*`) = **ADMIN KALIYA**.
- Staff/teacher/student: **ma laha** wax access ah User Management (xitaa haddii UI wax muujiyo/qariyo).

### 1.2 Security (Auth-locks, reset/unlock/deactivate/activate)
- Staff wuxuu samayn karaa **qaar ka mid ah security actions** (reset/unlock/deactivate/activate) **kaliya haddii permissions gaar ah la siiyo**.
- Taas macnaheedu: **staff role kaliya ma filna**; waa in uu leeyahay `security.view` / `security.edit` / `security.resetPassword` sida loo qeexay backend.

### 1.3 Teacher/Student access (Scope)
- Teacher/Student badankood **kuma tiirsana permissions object**; waxay ku tiirsan yihiin **scope rules** (TeacherAssignment, student-self checks) iyo controllers.

---

## 2) Halbeeg (Terminology / Glossary)
- **FE** = Frontend (UI), **BE** = Backend (API).
- **Roles**: `admin`, `staff`, `teacher`, `student`.
- **Permissions**: `User.permissions[module][action]` (tusaale `students.view`, `security.edit`).
- **Scope**: xadidaad “yaa arki kara maxay” (teacher assigned classes, student own data).
- **Mutations**: endpoints wax beddela (POST/PUT/PATCH/DELETE).

---

## 3) Jadwalka Oggolaanshaha (Authorization Matrix)

Jadwalkan waa “map” u dhexeeya FE routes/nav iyo BE endpoints. Ujeeddo: in la fahmo **yaa geli kara maxay**.

| Qayb / Page | FE Route | BE Base (API) | Roles (FE) | Permissions (BE) | Scope (Teacher/Student) |
|---|---|---|---|---|---|
| User Management | `/users`, `/users/:userId` | `/api/users/*` | admin | admin-only (`authorizeRoles('admin')`) | N/A |
| Security tools | (Navbar actions) | `/api/security/*` | admin, staff | `security.view` / `security.edit` / `security.resetPassword` | N/A |
| Lookups | (used by many pages) | `/api/lookups/*` | public usage | (currently no `protect`) | N/A |
| Students | `/students`, `/students/:id/*` | `/api/students/*` | admin, staff | `students.*` (ANY for reads; specific for writes) | Teacher reads allowed but must be scoped; Student self via `allowStudentSelfOr` |
| Teachers | `/teachers`, `/teachers/:id` | `/api/teachers/*` | admin, staff | `teachers.*` + some actions via `security.*` | Teacher self via `requireTeacherSelf` |
| Grades/Classes | `/grades` | `/api/grades/*` | admin, staff, teacher | `grades.*` (writes); reads may allow via students perms | Teacher reads are scoped to assigned gradeSections |
| Subjects | `/subjects` | `/api/subjects/*` | admin, staff | `subjects.*`; reads may also allow via `timetable` perms | N/A |
| Attendance | `/attendance` | `/api/attendance/*` | admin, staff, teacher | `attendance.*` | Teacher actions require assignment; Student self endpoints exist |
| Attendance Reports | `/attendance-reports` | `/api/attendance/*` | admin, staff, teacher | `attendanceReports.*` (with some compatibility) | Teacher assignment scope; student range read special-cased |
| Timetable | `/timetable` | `/api/timetable/*` | admin, staff, teacher | `timetable.*` (writes), reads may allow via attendance | Teacher/student read their own timetable (controller scope) |
| Exams | `/exams` | `/api/exams/*` | admin, staff, teacher | `exams.view` / `exams.input` (varies per endpoint) | Teacher assignment required for class/subject actions |
| Exam Settings | `/exam-settings` | `/api/exams/*` | admin, staff | `exams.input` | N/A |
| Results | `/results` | (in exams/transcripts flows) | admin, staff, teacher | `results.view/print/download` | Teacher scope applies where relevant |
| Transcripts | `/transcripts` | `/api/transcripts/*` | admin, staff | `transcript.view/print/download` | Student self allowed for own transcript |
| Transfers | `/transfers` | `/api/transfers/*` | admin, staff | `transfers.view/transfer` (legacy: `students.transfer`) | Student self UI exists; BE is staff/admin permission-gated |
| Promotions | `/promotions` | `/api/promotions/*` | admin, staff | `promotions.*` | N/A |
| Cohorts | `/cohorts` | `/api/cohorts/*` | admin, staff | `cohorts.*` | Teacher reads allowed but scoped |
| Announcements | `/announcements` | `/api/announcements/*` | admin, staff, teacher, student | reads: auth only; writes: `announcements.*` for staff | Teacher writes allowed; controller enforces ownership |

---

## 4) Drift / Halis (Waxyaabaha xasaasiga ah)

Qaybtan ma ahan “wax baa qaldan”; waa meelaha ay **drift ama risk** ka iman karaan, si aan u adkeyno annagoo aan wax jabin.

### 4.1 Staff access ee `/api/security/*` (la oggol yahay, laakiin xasaasi)
- Waa policy-gaaga in staff uu samayn karo reset/unlock/deactivate/activate marka permissions la siiyo.
- Adkeyn la sameeyo:
  - Permissions-ka `security.*` ha maamulo admin kaliya (User Management admin-only ayaa ka caawisa).
  - Audit logs: action kasta ha yeelato record (actor, target, IP, timestamp).

### 4.2 “Teacher bypass” ee FE `ProtectedRoute`
- Teacher routes qaar FE wuxuu ka boodayaa permission checks (teachers permissions object kuma tiirsana).
- Risk: UX drift (teacher wuxuu arki karaa page uu backend diido).
- Qorshe adkeyn (mustaqbal): teacher routes ha noqdaan kuwo si cad scope loo qeexay, backend-kuna ha noqdo source-of-truth.

### 4.3 Attendance Reports: labo permission model (compatibility)
- Backend: reports wuxuu oggolaan karaa `attendanceReports.*` ama `attendance.*` (compatibility).
- Risk: staff leh `attendance.edit` oo kaliya wuxuu geli karaa reports xitaa haddii FE uu filayo `attendanceReportsAny`.
- Qorshe: go’aanso deadline (cutoff) si compatibility loo nadiifiyo ama FE lagu mirroro.

### 4.4 Subjects list dependency (timetable)
- Backend: staff leh timetable permissions ayaa akhrin kara subjects (timetable UI dependency).
- Risk: FE nav wuxuu qarin karaa Subjects page, laakiin API read waa la oggolaan karaa.
- Qorshe: ku qor docs “intentional dependency”.

### 4.5 Lookups endpoints waa public
- Hadda `/api/lookups/*` ma leh `protect`.
- Haddii aad rabto adkeyn: ku dar `protect` (laakiin tani waa isbeddel behavior ah, markaa waxaa u baahan approval).

---

## 5) Qorshe Adkeyn (Hardening Tasks) – iyadoo aan wax la jabin

### 5.1 Single Source of Truth (Permissions Contract)
- Problem: permissions names/actions waxay ku kala yaalliin FE+BE meelo badan.
- Xal: samee hal “permissions contract” (JSON/TS) oo FE+BE wada isticmaalaan.
- Shuruudda guusha: permission cusub/isbeddel = hal meel.

### 5.2 Permissions payload validation (hadda la hirgeliyey)
- Waxaa la adkeeyey `/api/users` (admin-only) si permissions payload-ka u noqdo allowlist.
- Unknown module/action → `400` (si looga hortago privilege injection).
- Meesha: `backend/utils/permissions.js` + `backend/controllers/userController.js`.

### 5.3 Tests (AuthZ regression)
- Backend tests: middleware permissions + sanitizer.
- Shuruudda guusha: `npm test` catches authz regressions.

**Xaaladda hadda (Jan 2026):**
- Backend: `npm test` waa PASS.
- Frontend: `npm test` (vitest) iyo `npm run build` waa PASS (marka lagu ordo gudaha folder-ka `frontend`).

### 5.4 Documentation nadiifin
- Dukumentigan waa source-of-truth. Haddii docs kale ay sheegaan privileges hore, waa in la waafajiyaa (si drift u yaraado).

---

## 6) Runbook (Sida loo ordo tests/build)

### Backend
- `cd backend; npm test`

### Frontend
- `cd frontend; npm run build`
- `cd frontend; npm test`

> Fiiro: Haddii aad isticmaaleyso VS Code tasks oo mararka qaar ku soo baxa `ENOENT package.json`, ku orod commands-ka kor ku qoran gudaha terminal-ka adigoo `cd frontend` sameynaya.
