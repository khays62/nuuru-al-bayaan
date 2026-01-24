# Nuuru Al‑Bayaan: DRY Refactor & System Structure Guide (Soomaali)

Ujeeddo: In aan nadiifinno oo casriyeyno qaabka mashruuca (frontend + backend) si uu u noqdo **DRY**, **scalable**, oo la jaanqaada best practices‑ka MERN + React/Vite — **adigoon jebin** wax kasta oo hadda shaqeynaya.

Qoraalkan waa “roadmap” aad raaci kartaan tillaabo‑tillaabo (incremental refactor). Ma beddelayno business logic‑ga haddii uusan qasab ahayn.

---

## Xaaladda hadda (Progress / Done)
Hoos waa waxa hadda la dhameeyey (si aad ula socoto). Wax kasta oo aan la dhameynin waxaa ku yaal “Checklist” (qaybta 6).

- [x] Phase 1: `app/`, `shared/`, `features/` skeleton + re-export bridges (0 behavior change)
- [x] Phase 2 (users): Users API “single source of truth” waxaa loo raray `features/users`, kii hore-na waa bridge
- [x] Phase 2: `frontend/src/api/modules/*` GET calls waxaa loo mideeyey `fetchJson` (direct `fetch()` waa laga saaray modules-ka)
- [x] Phase 3 (bilow): router-ku wuxuu hadda ka import-gareeyaa teacher/student pages `features/*/pages` (bridge entrypoints)
- [x] Phase 3 (bilow): student/teacher dashboard tabs/components router-ku wuxuu ka import-gareeyaa `features/*/components` (bridge entrypoints)
- [x] Phase 4: Auth flow waxaa loo mideeyey `fetchJson` (axios + ensureCsrf duplication waa laga saaray)
- [x] Phase 5: Backend pagination helper (`parsePagination`) + controllers update (DRY)
- [x] Phase 5: Backend response normalization adapter (`responseNormalize`) + tests (backward-compatible)
- [x] Phase 6 (teachers): full move (pages + components + api + queryKeys) + bridges preserved
- [x] Phase 7 (teachers): cleanup legacy teacher bridges (tirtir `src/components/teacher` + `src/queryKeys/teacher.js` kadib marka imports la wareejiyo)
- [x] Phase 6 (students): full move (pages + components) + imports fix + feature-first students API (`features/students/api`) + `studentKeys`
- [x] Phase 7 (students): cleanup legacy students API module (tirtir `src/api/modules/students.js` kadib marka usage la wareejiyo)
- [x] Smoke checks: `frontend npm run build` waa pass (hore ayaa loo xaqiijiyey)
- [x] Real tests: frontend (Vitest) + backend (Jest) tests waa la abuuray, waana pass

---

## DRY: Waxa weli noo haray (Actionable Checklist)
Ujeeddo: In aan ku soconno **1–3 task mar** (si aan u hubinno in build/run uusan jabin).

### A) Frontend — DRY Remaining

#### A1) API imports (feature-local vs global barrel)
- Calaamad: pages/components feature ah oo ka import-gareeya `../api` ama `src/api/index.js` halkii ay ka isticmaali lahaayeen feature API.
- Meesha laga raadiyo:
  - `frontend/src/features/**/pages/**/*.jsx`
  - `frontend/src/features/**/components/**/*.jsx`
- Tusaale (hadda muuqda):
  - `frontend/src/features/users/pages/UserManagementPage.jsx` → `from "../api"`
- Xalka:
  - Ku beddel: `from "../api/usersApi"` ama `from "../api/index"` (feature-local barrel).
  - Ka fogow `src/api/index.js` marka feature-local exports ay diyaar yihiin.

#### A2) HTTP “single source of truth” (bridge vs canonical)
- Calaamad: `shared/api/http.js` oo kaliya re-export ka sameeya `src/api/http.js` (bridge) + features qaar oo weli ka import-gareeya `src/api/http.js`.
- Meesha:
  - `frontend/src/shared/api/http.js`
  - `frontend/src/api/http.js`
  - `frontend/src/features/**/api/*.js`
- Xalka (laba ikhtiyaar):
  1) **Canonical = `src/shared/api/http.js`**
     - Nuqulka “real implementation” u rar `shared/api/http.js`
     - `src/api/http.js` ka dhig bridge: `export * from '../shared/api/http.js'`
  2) **Canonical = `src/api/http.js`** (hadda u eg in la sameeyey)
     - Ka dhig `shared/api/http.js` bridge oo keliya (hadda sidaas bay u badan tahay)
     - Hubi in *features oo dhan* ay import ka sameeyaan `shared/api/http` (consistent)

#### A3) Permissions (routing policy) duplication
- Calaamad: permissions-ku mar waxay yaalliin `routes/permissions.js`, marna `shared/auth/permissions.js` oo re-export ah.
- Meesha:
  - `frontend/src/routes/permissions.js`
  - `frontend/src/shared/auth/permissions.js`
  - `frontend/src/routes/router.jsx`
- Xalka:
  - Dooro hal “home” (talo: `frontend/src/shared/auth/permissions.js`)
  - Router ha ka import-gareeyo halkaas.
  - `routes/permissions.js` ha noqdo bridge (ama la tirtiro marka references 0 noqdaan).

#### A4) List/Table pages boilerplate (UI DRY)
Ujeeddo: in UI‑ga loo sameeyo **reusable shared components** (hal meel laga maamulo), adigoon jebin UI‑ga hadda shaqaynaya, isla markaana aan la taaban business logic.

**Fiiro:** DRY‑ga “title + subtitle/description” hadda waan iska daynay; focus‑ku waa tables/state/actions/modals/permissions/styling.

##### A4.0) List page layout (ListPageShell)
- Xagee uu ka jiro:
  - Pages badan oo leh header/actions/toolbar layout isku eg: `frontend/src/features/**/pages/*.jsx`
  - Legacy/common components: `frontend/src/components/common/**`
- Sababta:
  - Layout‑ka “list page” (actions + toolbar + content) wuu ku celcelinayaa; mar walbana way kala duwanaan kartaa spacing/structure.
- Xalka (safe, incremental):
  - Hal “source of truth”: `frontend/src/shared/components/ListPageShell.jsx`
  - Legacy path ha noqdo bridge: `frontend/src/components/common/ListPageShell.jsx` (re-export)
  - Ku dabaq hal page (pilot), kadib expand.

##### A4.1) Table states (Loading / Error / Empty) + retry
- Xagee uu ka jiro:
  - Meelo badan oo pages ah oo sameeya `if (isLoading) ...`, `if (error) ...`, `if (rows.length===0) ...` ka hor/ku wareegsan `TableShell`.
  - Raadso usage: `LoadingState`, `EmptyState`, `TableShell` gudaha `frontend/src/features/**/pages/*.jsx`.
- Sababta:
  - Table state handling‑ku wuxuu noqdaa “spaghetti” oo page‑kasta si gooni ah u qoro.
  - Waxay keentaa inconsistency (empty message, retry button, skeleton, spacing) iyo bugs (mar state‑ku sax ma aha).
- Xalka (safe, incremental):
  - Abuur wrappers cusub (canonical) gudaha shared:
    - `frontend/src/shared/components/table/TableState.jsx` (handles: loading/error/empty/success)
    - `frontend/src/shared/components/table/RetryButton.jsx` (optional)
  - Ku re-use garee components‑ka jira (`LoadingState`, `EmptyState`, `TableShell`) halkii aad ka beddeli lahayd behavior.
  - Page‑yada u wareeji hal‑hal: table blocks oo dhan ku duub `TableState` si logic‑gu u nadiifoobo.

##### A4.2) Pagination wiring (page/limit/total) normalization
- Xagee uu ka jiro:
  - Pages badan oo ku celceliya props‑ka `PaginationControls` (meta/page/limit/handlers) mar walba.
  - Gaar ahaan list pages: students/teachers/cohorts/subjects/grades/transfers/attendance/results.
- Sababta:
  - Pagination‑ku waa UI pattern shared ah; duplication‑ku wuxuu kordhiyaa khaladaadka (page reset, off-by-one, meta mismatch).
- Xalka (safe, incremental):
  - Abuur wrapper canonical:
    - `frontend/src/shared/components/table/PaginationBar.jsx` (thin wrapper ku wareegsan `PaginationControls`)
  - Goal: hal meel lagu standardize gareeyo labels/disabled states/edge cases, adigoon beddelin API‑ga backend.

##### A4.3) Action buttons (loading/disabled/error states) standard
- Xagee uu ka jiro:
  - Buttons badan oo sameeya `disabled={isLoading}`, `onClick` guards, iyo spinner text patterns kala duwan.
  - Waxaa badanaa la isticmaalaa `ActionButton`, laakiin usage‑ku wuu kala duwanaan karaa.
- Sababta:
  - UX inconsistency (loading label, disabled rules, double-submit prevention) + repeated code.
- Xalka (safe, incremental):
  - Ka dhig hal “home” shared:
    - `frontend/src/shared/components/actions/ActionButton.jsx` (ama re-export wrapper haddii `ActionButton` hore u jiro)
  - Ku dar conventions:
    - `isLoading`, `disabled`, `variant`, `confirm` (optional) — si one-liner loogu isticmaalo pages.
  - Legacy path(s) ha noqdaan bridge si aan imports u jabin.

##### A4.4) Modals + Confirm (delete/disable) patterns
- Xagee uu ka jiro:
  - Pages badan oo leh modal open/close state + form submit + confirm delete.
  - Badanaa waxaa jira `Modal` component, laakiin confirm patterns waa kala duwan.
- Sababta:
  - Confirm flows (delete/toggle status) waa shared UX; duplication‑ku wuxuu keenaa kala duwanaansho iyo khaladaad.
- Xalka (safe, incremental):
  - Abuur shared confirm layer:
    - `frontend/src/shared/components/feedback/ConfirmDialog.jsx`
    - `frontend/src/shared/hooks/useConfirm.js` (optional)
  - Page‑yada: kaliya wac `confirm({ title, message })` kadibna samee action.

##### A4.5) Toasts / Notifications (success/error)
- Xagee uu ka jiro:
  - Meelo kala duwan oo success/error messages ah (mar inline, mar alert, mar console).
- Sababta:
  - User feedback waa shared; haddii aan la standardize‑gareyn, UI‑ga wuu “qalloocmaa”.
- Xalka (safe, incremental):
  - Hal provider shared + helper:
    - `frontend/src/shared/components/feedback/ToastProvider.jsx` (ama integration haddii library hore u jiro)
    - `frontend/src/shared/hooks/useToast.js`
  - Ha beddelin business logic; kaliya standardize “how to show messages”.

##### A4.6) Permission‑gated UI (show/hide/disable)
- Xagee uu ka jiro:
  - Router‑ka permissions wuu jiraa, laakiin UI‑level (buttons/actions) mararka qaar wali waxay ku qoran yihiin page‑kasta.
- Sababta:
  - Permission policy waa shared; in page‑kasta laga qoro waxay keentaa duplication + inconsistency.
- Xalka (safe, incremental):
  - Abuur shared helper/components:
    - `frontend/src/shared/auth/permissions.js` (already canonical)
    - `frontend/src/shared/components/auth/Can.jsx` (ama `RequirePermission`)
  - Page‑yada: `Can permission={...}` ku duub buttons/sections.

##### A4.7) Styling tokens/variants (hal meel laga maamulo)
- Xagee uu ka jiro:
  - Repeated classNames/inline styles (spacing, colors, button variants, table container styles).
- Sababta:
  - UI‑ga haddii uusan lahayn design tokens, pages kala duwan waxay yeelanayaan “look & feel” aan isku mid ahayn.
- Xalka (safe, incremental):
  - Samee hal “token layer” shared:
    - `frontend/src/shared/styles/tokens.css` (ama `shared/components/ui/` primitives)
  - Ku dar UI primitives yaryar (Card, Section, Stack) si pages u nadiifoobaan.

##### Habka aan u fulinno (si aan uusan u jabin)
1) Marka hore samee shared wrappers (no behavior change; re-use existing components).
2) Ka dhig legacy paths bridge re-exports (si imports hore u sii shaqeeyaan).
3) Ku dabaq **hal page** (pilot) kadib `npm run build`.
4) Kadib u gudub pages kale (mid mid).

**Progress (la qabtay):**
- `ListPageShell` canonical waa la abuuray: `frontend/src/shared/components/ListPageShell.jsx`
- Bridge waa la dhigay: `frontend/src/components/common/ListPageShell.jsx`
- Pilot waa la dabaqay: `frontend/src/features/users/pages/UserManagementPage.jsx`

#### A5) Query keys conventions (minor DRY)
- Calaamad: `queryKeys.js` files kala duwan oo style kala duwan leh.
- Meesha:
  - `frontend/src/features/users/queryKeys.js`
  - `frontend/src/features/teachers/queryKeys.js`
  - `frontend/src/features/students/queryKeys.js`
- Xalka:
  - Samee convention (naming + array shape) oo isku mid ah.
  - Ikhtiyaar: helper `makeQueryKeys(featureName)`.

  **Progress (la qabtay):**
  - Helper waa la abuuray: `frontend/src/shared/queryKeys/makeQueryKeys.js`
  - `users/teachers/students` queryKeys waa la isku nidaamiyey (key shapes lama beddelin)

### B) Backend — DRY Remaining

#### B1) Error handling normalization (controllers)
- Calaamad: controller kasta `try/catch` + `res.status(500)` uu qoro si gooni ah.
- Meesha:
  - `backend/controllers/*.js`
  - `backend/middleware/responseNormalize.js` (haddii la isticmaalayo)
- Xalka:
  - Abuur `asyncHandler(fn)` (middleware) + global error handler.
  - Controllers ha noqdaan “thin” oo `throw` sameeya ama `next(err)`.

#### B2) Pagination/filter parsing reuse
- Calaamad: `page/limit/sort` parse repeated.
- Meesha:
  - `backend/utils/pagination.js` (ama utility la mid ah)
  - controllers list endpoints
- Xalka:
  - Hal helper `parsePagination(req.query)` + `parseSort(req.query)`.
  - Controllers oo dhan ha isticmaalaan.

#### B3) Response shape consistency
- Calaamad: endpoints qaar `{ message }`, qaar `{ success:false, message }`, qaar `{ ok }`.
- Meesha:
  - `backend/controllers/**`
  - `backend/middleware/responseNormalize.js`
- Xalka:
  - “Adapter” (responseNormalize) ha ilaaliyo backward compatibility.
  - U qeex contract docs/README: listing → `{ data, meta }`, action → `{ ok, data, error }`.

---

## Sida aan u xalinno (Hab shaqo)
Marka task la dooranayo:
1) `grep` ku hel usage‑ka (meelaha uu ka jiro)
2) Hal file/feature ku patch garee
3) `npm run build` (frontend) ama `npm test` (backend) ku xaqiiji
4) Markaas kadib u gudub task-ka xiga

## 0) Hal xeer muhiim ah (si aanan u jabin mashruuca)
Refactor‑ku ha noqdo **strangler approach**:
- Marka hore **abuuri structure cusub** + **re-export / wrappers**
- Kadibna si tartiib ah u wareeji imports/usage
- Ugu dambayn tirtir duplikeyt‑yada (marka wax walba la xaqiijiyo)

Tani waxay ka ilaalisaa in build/run uu jabiyo ama pages/routes ay lumaan.

---

## 1) Re‑analysis: waxa hadda muuqda (high signal)
### Frontend (React + Vite)
Waxyaabaha ugu waaweyn ee structure‑ka hadda jira:
- `src/api/` (http wrapper + modules)
- `src/auth/` (AuthContext + ProtectedRoute + login page)
- `src/routes/` (router + permissions)
- `src/pages/` (pages badan)
- `src/components/` (domain components: student/teacher/attendance/...)
- `src/hooks/`, `src/utils/`, `src/config/`, `src/queryKeys/`

### Backend (Node/Express)
Layer‑based structure:
- `routes/`, `controllers/`, `models/`, `services/`, `middleware/`, `config/`, `utils/`

---

## 2) DRY issues (ku celcelis) ee la helay
Hoos waa “meelaha ugu qaalisan” ee DRY violations ka jira (waxay keeni karaan bugs iyo maintenance culus):

### 2.1 Frontend: HTTP client + error handling waa isku dhex yaac
Waxaa jira 3 qaab oo la isku marayo:
- `fetchJson()` (ku jira `src/api/http.js`) oo leh CSRF + 401 event
- `fetch()` toos ah (ku jira pages iyo components)
- `axios` (badanaa `src/auth/AuthContext.jsx` + components qaarkood)

Dhibaatada:
- Error handling iyo response parsing isku mid ma aha.
- CSRF header mar baa la diraa marna lama dirao (waxay ku xirnaan kartaa file‑ka).
- 401 handling (global logout) mar baa shaqeeya marna maya.

### 2.2 Frontend: API “modules” qaar waa DRY‑less (pattern kala duwan)
Tusaale `src/api/modules/students.js`:
- `create/update/deactivate/...` waxay isticmaalaan `fetchJson`
- `list/getProfile/...` waxay isticmaalaan `fetch` toos ah + fallback silent

Tani waxay keentaa contract aan joogto ahayn (mar `{ok:true}`, mar `null`, mar `{data, meta}`), sidaas darteed UI‑gu wuxuu noqdaa “defensive spaghetti”.

### 2.3 Frontend: Auth CSRF logic waa duplicated
- `fetchJson` wuxuu isku dayaa CSRF cookie bootstrap + retry.
- `AuthContext` wuxuu leeyahay `ensureCsrf()` oo sameeya isla shaqo.

Single source of truth ma jiro.

### 2.4 Frontend: “Page” vs “Component” (Feature-first qeexid)
Maadaama aad doorateen **Feature-first**, waxaan qaadaneynaa convention cad (single source of truth):
- `src/features/<feature>/pages/` = **route entries / pages** (page‑yada waaweyn)
- `src/features/<feature>/components/` = **tabs/screens/components** (UI sections)
- `src/shared/components/` = **reusable UI** (button, modal, table, feedback, layout primitives)

Sidaas darteed: teacher/student “tabs” waa components (ama screens), laakiin **page‑ga weyn** ee teacher/student wuxuu ku jiraa `src/features/teachers/pages/` iyo `src/features/students/pages/`.

Faa’iidada: qof kasta oo team‑ka ah wuu garanayaa hal meel oo page/feature logic laga raadiyo, mana dhacdo in page kale ku dhex lunto `components/` ama `pages/` aan la aqoon.

### 2.5 Frontend: Permissions & routing rules meel kala duwan
- `src/routes/permissions.js` waa OK, laakiin waxaa fiican in loo qaabeeyo “auth/permissions policy” ama “shared policy”, si uusan router‑ku u noqon meel logic badan.

### 2.6 Backend: Pagination parsing waa duplicated
Controllers badan waxay sameeyaan:
- `pageNum = Math.max(parseInt(page)||1,1)`
- `limitNum = Math.min(Math.max(parseInt(limit)||10,1),100)`

Tani waa DRY violation; waa in la sameeyo helper: `parsePagination(req.query)`.

### 2.7 Backend: Response shape / error pattern ma aha 100% unified
Waxaa jira mix:
- `{ success:false, message }` (qaabka cusub)
- `{ message }` kaliya (qaabka hore)

Haddii aad hal mar beddesho response shape, frontend wuu jabayaa. Sidaas darteed: in lagu hagaajiyo **incremental** (adapter/wrapper) ama hal endpoint‑hal endpoint.

---

## 3) Go’aamada DRY (Single Source of Truth) — waxa aan ku talinayo
### 3.1 Frontend: hal API client
Dooro hal client oo mashruuca oo dhan la isticmaalo.

Recommended: **standardize on `fetchJson`** (maxaa yeelay:
- already leeyahay CSRF echo + retry
- already dispatch gareeya `auth:unauthorized`
- si fiican ugu shaqeeya cookie auth (`credentials: 'include'`)
)

Ujeeddo:
- `src/shared/api/client.js` → wrapper(s)
- Modules oo dhan → `fetchJson` kaliya
- Auth flows (verify/login/logout/change-password) → `fetchJson`

### 3.2 Frontend: contract unified
API functions ha noqdaan hal qaab:
- success: `return data` (normalized)
- error: `throw` (handled at UI layer) ama `return { ok:false, ... }` — laakiin hal pattern dooro.

Talo: isticmaal `throw` + UI hooks (React Query) si ay u handle gareeyaan.

### 3.3 Backend: helper utilities
- `backend/utils/pagination.js` → parse + bounds
- `backend/utils/respond.js` → success/error helpers (optional)

---

## 4) Recommended FINAL folder structure (target)
Qaybtan waa “target structure” ee aan rabno in aan ku dhownaano. Looma baahna hal mar in la gaadho.

### 4.1 Frontend (React + Vite) — Feature-first (go’aanka aan dabaqeyno)
```
frontend/src/
  app/
    providers/
      AuthProvider.jsx
      QueryProvider.jsx
    router/
      router.jsx
      routes.constants.js
    AppShell.jsx
    main.jsx

  shared/
    api/
      client.js
      http.js
      errors.js
    auth/
      permissions.js
      roles.js
    components/
      ui/
      table/
      feedback/
      layout/
    hooks/
    utils/
    config/
    events/

  features/
    auth/
      pages/
      components/
      hooks/
      api/
    students/
      pages/
      components/
      hooks/
      api/
      queryKeys.js
    teachers/
      pages/
      components/
      hooks/
      api/
      queryKeys.js
    attendance/
    exams/
    timetable/
    transcripts/
    announcements/
    users/            # admin-only user management
    lookups/
    promotions/
    cohorts/
    transfers/
    results/

  assets/
  styles/
```

**Fiiro:**
- “Page” = `features/<x>/pages/` (route entries)
- “Tabs/Screens” = `features/<x>/components/`
- “Reusable UI” = `shared/components/`
- “Domain API” = `features/<x>/api/`
- `shared/api` waa single source of truth.

### 4.2 Backend (Express/MERN) — pragmatic modularization (minimal breakage)
Haddii aad rabto isbeddel yar:
```
backend/
  config/
  middleware/
  routes/
  controllers/
  services/
  models/
  utils/
    pagination.js
    respond.js
  validators/
    auth.validators.js
    students.validators.js
    ...
```

Haddii aad mustaqbalka rabto modular (feature modules) (bigger refactor):
```
backend/src/
  app.js
  server.js
  config/
  middleware/
  modules/
    students/
      students.routes.js
      students.controller.js
      students.service.js
      students.validator.js
    ...
  shared/
    utils/
    respond.js
    pagination.js
```

**Talo muhiim ah:** haddii aad u wareegayso `backend/src`, samee “compatibility layer” (old imports forward to new).

---

## 5) What to merge/move/delete/rename (talooyin la taaban karo)
### 5.1 Frontend — Moves (safe, incremental)
1) `src/routes/router.jsx` → `src/app/router/router.jsx`
   - Sabab: router waa “app bootstrap”.

2) `src/routes/permissions.js` → `src/shared/auth/permissions.js`
   - Sabab: permissions policy waa shared, ma aha router‑only.

3) Teacher/Student: u wareeji Feature-first (pages gudaha features)
   - Teacher:
     - `features/teachers/pages/` = page‑yada waaweyn (route entries)
     - `features/teachers/components/` = tabs/screens
   - Student:
     - `features/students/pages/` = page‑yada waaweyn (route entries)
     - `features/students/components/` = tabs/screens
   - Sabab: yoolku waa clarity + scalability + DRY (API/hooks/queryKeys waxaa lagu dhowaanayaa feature‑ka).

4) `src/api/http.js` → `src/shared/api/http.js` (ama ha ahaato isla file, laakiin u samee re-export)
   - Sabab: shared infra.

5) `src/api/modules/*` → `features/<domain>/api/*`
   - Sabab: API layer waa domain‑specific.

6) `src/queryKeys/` → ku dhow feature‑ka (`features/<domain>/queryKeys.js`)
   - Sabab: query keys waa “feature contract”.

7) `src/hooks/` (feature-specific) → ku dhow feature‑ka (`features/<domain>/hooks/`)
  - Sabab: hooks badan waxay ku tiirsan yihiin domain data/query keys; marka feature‑ka la raaciyo, duplication wuu yaraadaa.

### 5.2 Frontend — Merge/cleanup
- `features/users/api/usersApi.js`: isku keen `listUsers/createUser/updateUser/deleteUser/toggleUserStatus/getUserById/getUserAuditLogs`.
- Ka saar commented‑out blocks (waxay qariyaan source of truth).

### 5.3 Backend — Helpers (low risk)
- Samee `backend/utils/pagination.js` oo controllers ka isticmaalaan.
- Samee `backend/utils/asyncHandler.js` (optional) si try/catch duplication loo yareeyo.

### 5.4 Backend — Validators
- Haddii controllers ay sameeyaan validation inline, u kala saar `validators/` si DRY loo noqdo.

---

## 6) Migration plan (tillaabo‑tillaabo, aan jebinayn production behavior)
Hoos waa “order” la isku halayn karo:

### Phase 1 — Add new folders + re-export (0 behavior change)
1) [x] Abuur `frontend/src/app/` iyo `frontend/src/shared/`.
2) [x] Samee `frontend/src/shared/api/` oo ku re-export gareeya `fetchJson/apiUrl` (wax behavior ma beddelayo).
3) [x] Samee `frontend/src/shared/auth/permissions.js` oo export gareeya isla objects-ka hadda (`studentsAny`, ...).

4) [x] Abuur `frontend/src/features/` oo bilow hal feature (tusaale `users` ama `students`) adigoon wax imports jabin:
  - ku samee “bridge” exports (barrel) si code‑kii hore u sii shaqeeyo inta aad wareejineyso.

Acceptance:
- `npm run build` waa inuu weli pass gareeyaa.

### Phase 2 — Unify HTTP usage (small, safe steps)
4) [x] Ku bilow hal feature (tusaale: `users`).
5) [x] `api/modules/users.js` → bridge (single source of truth waa `features/users/api/usersApi.js`).
6) [x] Features kale: `api/modules/<x>.js` ka beddel `fetch(...)` → `fetchJson(...)` si response/error u noqdaan consistent.
7) [x] `api/modules/*`: ka saar `credentials/include` + manual `res.ok` checks (waxaa maamula `fetchJson`) adigoo ilaalinaya return-shape-kii hore.

Acceptance:
- Feature‑kaas CRUD + list waa inuu shaqeeyaa.

### Phase 3 — U wareeji Teacher/Student pages gudaha `features/` (routing unchanged)
8) [x] U guuri teacher/student route entries (pages waaweyn) → `features/teachers/pages/*` iyo `features/students/pages/*`.
  - Fiiro: hadda waxaan isticmaalnay “bridge entrypoints” (feature page file-ku wuxuu re-export gareeyaa page-kii hore) si aanan u jabin wax.
9) [x] U guuri tabs/screens (sub-views) → `features/<x>/components/*`.
  - Fiiro: hadda waa bridge entrypoints (si “source of truth” u ahaato hal meel, adigoon risk-gelin move weyn).
10) [x] Router‑ka: kaliya imports beddel (paths). Route URLs ha is beddelin.

Acceptance:
- Navigation iyo deep links (e.g. `/students/:id/profile`) waa inay shaqeeyaan.

### Phase 4 — Auth client DRY
11) [x] AuthContext + password-change flows: `axios` waa laga saaray oo waxaa loo beddelay `shared/api` (`fetchJson`).
12) [x] CSRF bootstrap: hal meel (waa `fetchJson`) — `ensureCsrf()` duplicated waa laga saaray.

Acceptance:
- login/logout/verify/idle logout/global logout waa inay shaqeeyaan.

### Phase 5 — Backend DRY utilities
13) [x] Ku beddel controllers‑ka pagination helper.
14) [x] Response normalization: adapter middleware (`responseNormalize`) + tests (backward-compatible, no UI breakage).

### Phase 6 — Frontend: ka gudub “bridge” → real move (feature-by-feature)
Ujeeddo: hadda `features/*` badankood waa entrypoints (re-export). Phase-kan wuxuu noqonayaa in aan si tartiib ah u **u guurino file‑yada dhabta ah** (pages/components/api/queryKeys/hooks) gudaha `features/<feature>/...`, anagoo weli ilaalinayna bridges si UI uusan u jabin.

15) [x] Doorso 1 feature (teachers) oo dhamaystir “full move” (pages + components + api + queryKeys).
16) [x] Teachers: `src/api/modules/teachers.js` → `features/teachers/api/*` (old path waa bridge).
17) [x] Teachers: `src/queryKeys/teacher.js` → `features/teachers/queryKeys.js` (old path waa bridge).
18) [x] Teachers: `src/pages/*Teacher*.jsx` → `features/teachers/pages/*` (old path waa bridge).
19) [x] Teachers: `src/components/teacher/**` → `features/teachers/components/**` (old path waa bridge).
20) [x] Teachers kadib: `frontend npm run build` + `frontend npm test` waa pass.

#### Phase 6 (Students) — Hab “manual cut/paste” (si degdeg ah)
Hadaf: inaad adigu si taxadar leh u rar-to (cut/paste) files-ka student-ka meesha feature-first, kadibna aniga ayaan:
- saxayaa imports-ka
- samaynayaa DRY (API + queryKeys)
- dhigayaa legacy paths bridges (ama tirtirayaa marka la xaqiijiyo)

**Tallaabo 0: Kahor intaadan wax rarinin**
- Orod `frontend npm run build` si aad u hubiso in baseline-ka uu shaqeynayo.
- Hubi `git status` si aad u aragto waxa la beddelay.

**Tallaabo 1: Rar “pages” (route entries)**
- Ka rar: [frontend/src/pages/StudentPage.jsx](frontend/src/pages/StudentPage.jsx)
  - Ku dheji: [frontend/src/features/students/pages/StudentPage.jsx](frontend/src/features/students/pages/StudentPage.jsx) (overwrite stub-ka export-ka)
- Ka rar: [frontend/src/pages/StudentDashboardPage.jsx](frontend/src/pages/StudentDashboardPage.jsx)
  - Ku dheji: [frontend/src/features/students/pages/StudentDashboardPage.jsx](frontend/src/features/students/pages/StudentDashboardPage.jsx)

**Tallaabo 2: Rar “dashboard tabs/shell” (student dashboard UI)**
Kuwan waxay hadda ku jiraan legacy, features-kuna waa stubs (re-export). Waxaad sameysaa overwrite:
- Ka rar (mid mid):
  - [frontend/src/components/student/dashboard/AdminStudentHomeTab.jsx](frontend/src/components/student/dashboard/AdminStudentHomeTab.jsx)
  - [frontend/src/components/student/dashboard/ProfileTab.jsx](frontend/src/components/student/dashboard/ProfileTab.jsx)
  - [frontend/src/components/student/dashboard/EnrollmentsTab.jsx](frontend/src/components/student/dashboard/EnrollmentsTab.jsx)
  - [frontend/src/components/student/dashboard/TranscriptTab.jsx](frontend/src/components/student/dashboard/TranscriptTab.jsx)
  - [frontend/src/components/student/dashboard/AttendanceTab.jsx](frontend/src/components/student/dashboard/AttendanceTab.jsx)
  - [frontend/src/components/student/dashboard/TimetableTab.jsx](frontend/src/components/student/dashboard/TimetableTab.jsx)
  - [frontend/src/components/student/dashboard/LibraryTab.jsx](frontend/src/components/student/dashboard/LibraryTab.jsx)
  - [frontend/src/components/student/dashboard/TransfersTab.jsx](frontend/src/components/student/dashboard/TransfersTab.jsx)
  - [frontend/src/components/student/dashboard/StudentSelfDashboardShell.jsx](frontend/src/components/student/dashboard/StudentSelfDashboardShell.jsx)
- Ku dheji (overwrite stubs):
  - [frontend/src/features/students/components/dashboard/AdminStudentHomeTab.jsx](frontend/src/features/students/components/dashboard/AdminStudentHomeTab.jsx)
  - [frontend/src/features/students/components/dashboard/ProfileTab.jsx](frontend/src/features/students/components/dashboard/ProfileTab.jsx)
  - [frontend/src/features/students/components/dashboard/EnrollmentsTab.jsx](frontend/src/features/students/components/dashboard/EnrollmentsTab.jsx)
  - [frontend/src/features/students/components/dashboard/TranscriptTab.jsx](frontend/src/features/students/components/dashboard/TranscriptTab.jsx)
  - [frontend/src/features/students/components/dashboard/AttendanceTab.jsx](frontend/src/features/students/components/dashboard/AttendanceTab.jsx)
  - [frontend/src/features/students/components/dashboard/TimetableTab.jsx](frontend/src/features/students/components/dashboard/TimetableTab.jsx)
  - [frontend/src/features/students/components/dashboard/LibraryTab.jsx](frontend/src/features/students/components/dashboard/LibraryTab.jsx)
  - [frontend/src/features/students/components/dashboard/TransfersTab.jsx](frontend/src/features/students/components/dashboard/TransfersTab.jsx)
  - [frontend/src/features/students/components/dashboard/StudentSelfDashboardShell.jsx](frontend/src/features/students/components/dashboard/StudentSelfDashboardShell.jsx)

**Tallaabo 3: Rar student shared components (Form/Table/Transfer UI)**
Haddii folder-kan uusan jirin, samee: [frontend/src/features/students/components](frontend/src/features/students/components)
- Ka rar:
  - [frontend/src/components/student/StudentForm.jsx](frontend/src/components/student/StudentForm.jsx)
  - [frontend/src/components/student/StudentTable.jsx](frontend/src/components/student/StudentTable.jsx)
  - [frontend/src/components/student/TransferBadge.jsx](frontend/src/components/student/TransferBadge.jsx)
  - [frontend/src/components/student/TransferTimeline.jsx](frontend/src/components/student/TransferTimeline.jsx)
- Ku dheji:
  - [frontend/src/features/students/components/StudentForm.jsx](frontend/src/features/students/components/StudentForm.jsx)
  - [frontend/src/features/students/components/StudentTable.jsx](frontend/src/features/students/components/StudentTable.jsx)
  - [frontend/src/features/students/components/TransferBadge.jsx](frontend/src/features/students/components/TransferBadge.jsx)
  - [frontend/src/features/students/components/TransferTimeline.jsx](frontend/src/features/students/components/TransferTimeline.jsx)

**Tallaabo 4: Ka tag “bridges” (si aan UI u jabin)**
Haddii aad cut/paste sameyso, legacy file-ku wuu baaba’ayaa. Si routes/imports qaar aysan u jabin inta aan anigu saxayo, samee bridge file yar (re-export) isla path-kii hore.
Aniga ayaan sidoo kale samayn karaa bridges-kaas markaad dhamayso rarista.

**Tallaabo 5: Kadib markaad tiraahdo “waan raray” (aniga waxa aan qabanayo)**
- Sax imports-ka student pages/components si ay u isticmaalaan feature-first paths.
- Samee `features/students/api/*` (single source of truth) + bridge `api/modules/students.js` haddii loo baahdo.
- Samee `features/students/queryKeys.js` + update React Query usage.
- Kadib: `frontend npm run build` + `frontend npm test`.

### Phase 7 — Cleanup (marka aad hubto in wax walba shaqeeyaan)
21) [ ] Ka saar bridges/duplikeyt‑yada aan mar dambe la isticmaalayn.
22) [ ] Nadiifi legacy folders (tusaale: `src/pages`, `src/routes`, `src/queryKeys`) marka imports-ka oo dhan la wareejiyo.

---

## 7) Best practices (MERN + Vite) — kooban
- Feature‑oriented UI + domain APIs u dhow feature‑ka.
- Shared infra (api client, auth policy, ui primitives) ha ahaadaan `shared/`.
- Router ha noqdo thin: only routes + guards.
- Backend: keep controllers thin, services fat (domain logic), validators separate.
- Hal response contract (laakiin change‑ka samee incremental).

---

## 8) Checklist: Kahor inta aadan tirtirin wax
- `frontend: npm run build`
- `frontend: npm test`
- `backend: npm test`
- Run basic smoke flows: login, list students, create/edit, logout, verify.
- `git diff` hubi in changes ay yihiin “imports/moves” mostly.

---

## 9) Qorshe degdeg ah (hal sadar)
Waxaan rabnaa: **feature‑oriented frontend + DRY shared API/auth + backend helpers**, iyadoo la raacayo refactor‑incremental si uusan mashruuca u jabin.
