# Qorshaha Nadiifinta System‑ka (Refactor Plan) — Nuuru Al‑Bayaan

**Taariikh:** 2026‑01‑03  
**Ujeeddo:** In mashruuca (MERN) laga dhigo mid *nadiif ah, la fahmi karo, aan repetitive ahayn*, isla markaana aan jabin production/dev shaqadiisa.  
**Xeerka ugu weyn:** *Wax feature cusub ma qoreyno ilaa structure-ka la hagaajiyo*.

---

## 0) Xeerarka shaqada (Rules of Engagement)

### 0.1 Secrets & `.env` (waa arrin muhiim ah)
- **`.env` waa local secret** (MongoDB URI, JWT secret, iwm). Waxaa sax ah in uu ku jiro kombiyuutarkaaga/hosting, laakiin **ma aha in la commit gareeyo**.
- **Repo-ga waxaa lagu hayaa kaliya `.env.example`** (tusaale/guide).  
- Haddii `.env` la tirtiro, backend-ku wuu jabi karaa sababtoo ah `MONG_URL` ayaa noqonaya `undefined`. Sidaas darteed:
  - Mar walba: `.env` ha kuu yaallo local.
  - Repo: `.env` ha ku jirin (gitignore).

### 0.2 Tallaabo kasta = Yar + La tijaabiyo
- Tallaabo kasta kadib waxaan sameyneynaa **smoke check**:
  - Backend: server wuu istaagaa + DB wuu connect garayaa.
  - Frontend: `npm run build` ama `npm run dev` wuu shaqeeyaa.
- Haddii wax jabo: isla tallaabadaas ayaa la rollback gareeyaa ka hor inta aan la sii socon.

### 0.3 Qeexitaanka “Done”
Tallaabo waa “DONE” marka:
- App-ku wuu ordaa (backend + frontend),
- `git status` uu nadiif yahay (ama changes-ka tallaabadaas kaliya jiraan),
- Waxay leedahay docs/notes kooban oo sheegaya waxa la sameeyey.

---

## 1) Phase 1 — Repo Hygiene (Qashin saarid + kala saarid)

### 1.1 Waxa la qabanayo
- Ka saar repo-ga waxyaabaha aan system-ka qayb ka ahayn:
  - build outputs (tusaale `frontend/dist/`)
  - logs (`*.log`, `build_err.txt`, `build_out.txt`)
  - temporary responses (`cookies.txt`, `login_response.txt`)
- Hubi `.gitignore` in uu daboolayo:
  - `node_modules/`, `dist/`, `build/`, `*.log`, `.env*`, iwm.
- Scripts-ka gacanta (manual scripts) hal meel u rar:
  - `backend/scripts/`

### 1.1.1 Checklist (tallaabo-tallaabo)
**Tallaabada 1: Hubi waxa repo-ga ku jira (ha taaban `.env`)**
- Ujeeddo: in aan aragno waxyaabaha la rabo in la nadiifiyo.
- Samee:
  - `git status`
  - `git ls-files | findstr /i "\.env"` (Windows)

**Tallaabada 2: Qeex waxa la tirtirayo (Artifacts only)**
- Waxaa la tirtiraa (examples):
  - `frontend/dist/`
  - `frontend/*.log` iyo `frontend/build*.log`
  - `backend/*response*.txt`, `backend/cookies.txt`
- Waxaa la ilaalinayaa:
  - `backend/.env` (LOCAL ONLY; adiga MongoDB Atlas URI-gaaga halkaa ayuu ku jiraa)

**Tallaabada 3: Hubi `.gitignore` (si aysan dib ugu soo noqon)**
- Ujeeddo: in artifacts-ka mar dambe aan la commit garayn.
- Hubi in `.gitignore` uu leeyahay:
  - `.env` iyo `.env.*`
  - `**/node_modules/`
  - `**/dist/` iyo `**/build/`
  - `*.log`

**Tallaabada 4: Scripts-ka rarid (non-breaking)**
- Ujeeddo: tools-ka iyo scripts-ka meel cad.
- Qorshe:
  - `backend/createAdmin.js` → `backend/scripts/createAdmin.js`
  - (optional) `backend/seed/*` → `backend/scripts/seed/*`
  - (optional) `backend/tests/*` (manual runners) → `backend/tools/*`

**Tallaabada 5: Smoke check**
- Backend:
  - `cd backend`
  - `npm run server`
  - Hubi: DB connect + server port.
- Frontend:
  - `cd frontend`
  - `npm run build` ama `npm run dev`

**Tallaabada 6: Done mark**
- Marka wax walba shaqeeyo, Phase 1 DONE.

### 1.2 Sababta
- Repo nadiif ah = fudud in la fahmo, fudud in la deploy gareeyo, oo yareeya qaladaadka.

### 1.3 Done criteria
- Repo kuma jiro build outputs/logs/temp files.
- `backend/scripts/` wuxuu noqdaa meesha scripts-ku yaallaan.

### 1.3.1 Caddeyn (Proof)
- `git status` waa nadiif (ama kaliya changes-ka phase-ka).
- Marka aad `npm run server` backend-ka ka orodsiiso, wuu istaagaa.

### 1.4 Khataraha + Mitigation
- **Khatar:** File muhiim ah ayaa si khalad ah loo tirtiraa.
- **Mitigation:** Tallaabo kasta ka hor `git status` + ka dib `git status` iyo haddii loo baahdo `git checkout -- <file>`.

---

## 2) Phase 2 — Backend Structure Standardization (aan behavior beddelin)

### 2.1 Ujeeddo
In backend-ka laga dhigo mid leh hal “pattern” oo cad: routes → middleware → controllers → services → models.

### 2.2 Waxa la qabanayo
- **Duplication ka saar**:
  - `authorizeRoles` wuxuu hadda ku jiraa laba meel (authMiddleware + roleMiddleware). 
  - Go’aan: hal source ha noqdo (tusaale `middleware/authMiddleware.js`).
- **Commented code nadiifi**:
  - Files badan waxay leeyihiin versions hore oo comment ah. Git history ayaa qabta, file-ka ha noqdo hal truth.
- **Scripts/Tools kala saar**:
  - `tests/` folder-ka backend wuxuu u egyahay “manual runners” (promotion samples). Waxaa fiican in lagu magacaabo `tools/` ama `scripts/`.

### 2.2.1 Checklist (tallaabo-tallaabo)
**Tallaabada 1: Samee inventory-ga duplication**
- Ujeeddo: in aan ogaano halkee `authorizeRoles` iyo auth helpers yaallaan.
- Samee:
  - raadinta: `authorizeRoles` / `roleMiddleware` / `authMiddleware`.

**Tallaabada 2: Go’aan “single source of truth”**
- Waxaan dooranaynaa:
  - `backend/middleware/authMiddleware.js` inuu noqdo meesha kaliya ee `protect` + `authorizeRoles` lagu hayo.
- `backend/middleware/roleMiddleware.js`:
  - ama waa la tirtiraa
  - ama wuxuu noqdaa re-export (si aan code kale u jabin haddii uu import jiro).

**Tallaabada 3: Nadiifi commented-out blocks (kaliya kuwa waaweyn)**
- Ujeeddo: file-ku ha noqdo hal version.
- Fiiro: ha taaban logic shaqeynaya, kaliya ka saar qashinka/versions hore.

**Tallaabada 4: Isku hagaaji naming (light)**
- Ujeeddo: consistency.
- Tusaale:
  - `transcript` vs `transcripts` naming in FE/BE (doc-ka waqti gaar ah ayaan ku xallin doonnaa haddii ay jiraan mismatch).

**Tallaabada 5: Smoke check**
- `npm run server` backend-ka.
- Run minimal API call (tusaale `/api/auth/verify`) si loo hubiyo auth middleware.

### 2.3.1 Done criteria (faahfaahin)
- `authorizeRoles` hal meel.
- Import paths ma jabiyaan.
- Backend starts + DB connects.

### 2.3 Sababta
- Waxaa yaraata jahawareerka (meel walba code kala duwan). 
- Maintenance-ka iyo debugging-ka wuu fududaadaa.

### 2.4 Done criteria
- `authorizeRoles` hal meel.
- Files muhiim ah ma laha blocks waaweyn oo commented-out ah.
- Backend endpoints ma jabaan.

---

## 3) Phase 3 — Teacher Identity & Auth Model (Go’aanka: `teacher` role + scope-by-assignments)

> Tani waa phase-ka ugu muhiimsan ka hor Teacher Dashboard.

### 3.1 Go’aamada la qaatay
- Teacher wuxuu ku geli doonaa **username**.
- Teacher ma yeelanayo “permissions object” sida staff.
- Teacher access wuxuu ku xirmayaa **TeacherAssignment** (scope).
- Default password: **environment variable** (tusaale `DEFAULT_INITIAL_PASSWORD`), kadibna teacher waa in la qasbaa **change password** markii ugu horreysay.

### 3.2 Problem-ka hadda jira
- `Teacher` model ma laha password/auth fields.
- Login controller wuxuu raadiyaa Admin/User/Student, laakiin Teacher lama login-gelin karo.
- FE routing qaar hore ayuu ugu oggol yahay `teacher`, laakiin backend User schema `role` wuxuu ahaa `admin|staff`.

### 3.3 Xalka la rabo (Single principal: `User`)
**Qorshe:** Teacher data + Teacher account waa labo doc oo is xiran:
- `Teacher` collection: teacher profile (fullName, teacherId, email, phone, status…)
- `User` collection: auth account (username, password, role=`teacher`, teacherRef)

### 3.4 Tallaabooyinka implementation (tallaabo-tallaabo)
1) **User schema update**
   - ku dar `teacher` role
   - ku dar `teacherRef: ObjectId -> Teacher`
2) **Teacher creation flow (admin action)**
   - marka teacher la abuuro:
     - create Teacher doc
     - create User doc:
       - `role = 'teacher'`
       - `username = (go’aanka: teacherId ama username field gaar ah)`
       - `password = DEFAULT_INITIAL_PASSWORD` (hash)
       - `teacherRef = teacher._id`
3) **Login flow**
   - authController wuxuu raadin karaa user-ka `User.findOne({ username })` (role teacher included).
4) **Force password change**
   - Marka teacher login-galo, backend wuxuu soo celiyaa `mustChangePassword=true` haddii password-ku weli yahay default.
   - Frontend: modal/flow la mid ah student.

### 3.5 Done criteria
- Teacher cusub waa la abuuri karaa (Teacher + User).
- Teacher wuxuu login gali karaa.
- Teacher first login → forced change password.

### 3.6 Security notes (kooban)
- Default password waa in la beddelaa; waa in aan la oggolaan in default password la sii wato.
- JWT secret **waa inuu noqdaa env** (production waa in uu noqdo mid adag).

---

## 4) Phase 4 — Teacher Scope Checks (Authorization sax ah)

### 4.1 Ujeeddo
Teacher wuxuu arkaa oo qori karaa kaliya GS/subjects uu assigned u yahay.

### 4.2 Waxa la qabanayo
- Create middleware helper:
  - `requireTeacherScope({ gradeSectionId, subjectId? })`
  - wuxuu ka hubiyaa `TeacherAssignment.exists({ teacher: teacherRef, gradeSection, subject? })`
- Apply scope checks on endpoints:
  - roster
  - attendance mark/get
  - exams grid/save
  - results summary

### 4.3 Done criteria
- Teacher trying a non-assigned GS → 403.
- Teacher sees only his own data.

---

## 5) Phase 5 — Frontend Router Split + Reuse (React best practices)

### 5.1 Ujeeddo
`src/main.jsx` hadda waa buuran (router + permissions). Waxaan rabnaa modular:
- `src/routes/router.jsx`
- `src/routes/permissions.js`

### 5.2 Waxa la qabanayo
- Router tree ka rar `main.jsx`.
- Permissions arrays ka rar `main.jsx`.
- `navigation.js` ka saar blocks waaweyn oo commented-out.

### 5.3 Reuse plan (filters/tabs)
- Attendance page wuxuu leeyahay pattern fiican (DataToolbar + FilterSelect + Tabs).
- Exam/Results pages filters-ka waa la midayn doonaa oo loo rogi doonaa “tabs + reusable filter controls” si aysan u noqon repetitive.

### 5.4 Done criteria
- Frontend build/run OK.
- Behavior-ka routes ma is beddelo (refactor kaliya).

---

## 6) Phase 6 — Teacher Dashboard (marka auth+scope diyaar noqdaan)

### 6.1 Routes (proposal)
- `/teacher` → dashboard
- `/teacher/timetable`
- `/teacher/attendance`
- (later) `/teacher/exams`
- (later) `/teacher/results`

### 6.2 UI principle
- Sida Student dashboard: shell + nested routes/tabs.
- Teacher wuxuu arkaa “cards” iyo “quick actions” (as per spec).

### 6.3 Done criteria
- Teacher wuxuu arkaa dashboard + timetable + attendance (restricted to assignments).

---

## 7) Phase 7 — Deployment Readiness (kadib MVP)

### 7.1 Waxa la qabanayo
- CORS + cookie settings (sameSite/secure) si prod domain kala duwan u shaqeeyo.
- Rate limiting + helmet (optional laakiin recommended).
- Doc: SETUP/DEPLOY steps.

### 7.2 Done criteria
- Prod deploy ma jabayo login.

---

## Appendix A — Environment variables (Guide)

### Backend (local)
- `.env` (LOCAL ONLY, not committed)
  - `MONG_URL=...`
  - `JWT_SECRET=...`
  - `DEFAULT_INITIAL_PASSWORD=...`

### Backend example
- `.env.example` (repo ku jira): kaliya tusaale.

---

## Appendix B — Qorshaha tijaabada (Smoke checks)

### Backend
- `npm run server`
- Verify: `Connected to the database` + `Server is running`.

### Frontend
- `npm run dev` (or `npm run build`)
- Verify: app loads + login works.
