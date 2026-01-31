# Qaabka Realtime + React Query (TanStack Query) — Warbixin & Rollout Plan (Af‑Soomaali)

Dukumiintigan wuxuu sharaxayaa qaabka aan ku hirgelinnay **Students** si uu u noqdo “reference/pilot” oo lagu dabaqi karo qaybaha kale ee mashruuca.

## 1) Magaca saxda pattern‑ka

**Event‑Driven Cache Invalidation (EDCI) with SSE + TanStack Query**

Macnaha:
- Backend wuxuu diraa dhacdooyin realtime ah (SSE) marka data is beddesho.
- Frontend wuxuu u turjumaa dhacdooyinkaas event‑yo gudaha app‑ka ah.
- Kadib wuxuu sameeyaa **React Query invalidation** (oo granular ah) si queries‑ku u refetch gareeyaan data sax ah.

Tani waxay ka dhigan tahay: **Realtime → Events → Invalidate Queries → UI updated**.

## 2) Sababta aan u dooranay

- React Query wuxuu noqdaa “single source of truth” ee data fetching/caching.
- UI‑ga wuu deggan yahay (no manual state juggling / render loops).
- Realtime‑ku ma noqdo “state management kale”; wuxuu noqdaa kicin (trigger) oo keliya.
- Performance: invalidation waa la xaddiday (granular keys), taasoo yaraynaysa refetch‑yo badan.

## 3) Architecture‑ka guud (Frontend)

**SSE stream**
- Frontend wuxuu ku xirmaa: `GET /api/realtime/stream` (EventSource)
- Hook: `frontend/src/shared/realtime/useRealtimeStream.js`

**Dispatcher**
- SSE payload → app events
- File: `frontend/src/shared/realtime/realtimeDispatcher.js`

**Event bus (frontend)**
- Dispatcher wuxuu diraa EVENTS.*
- Feature‑ku wuxuu “dhageystaa” EVENTS si uu u invalidate gareeyo keys.

**React Query invalidation (feature‑level)**
- Students dashboard invalidation: `frontend/src/features/students/components/dashboard/useStudentDashboardRealtimeInvalidation.js`
- Students list/page invalidation: ku jira Students pages/components (invalidate keys + emit local events)

## 4) Architecture‑ka guud (Backend)

**Publish realtime events**
- Markii DB update dhaco (create/update/transfer/attendance/etc)
- Backend wuxuu wacaa: `publishRealtime(payload)`

**SSE route**
- Endpoint: `backend/routes/realtimeRoutes.js`
- Xaqiijin roles + filtering

## 5) Security (Student role) — muhiim

Dhibkii ugu weynaa ee la xaliyay: **student role realtime ma helin** sababtoo ah SSE stream role‑gated ayuu ahaa.

Xalka:
- Student waa loo ogolaaday inuu ku xirmo SSE.
- Laakiin backend wuxuu sameeyaa **filtering**:
  - Student wuxuu heli karaa oo keliya event types “safe” ah.
  - Student‑scoped events (tusaale `students:changed`, `transfers:changed`) waa la hubiyaa inay la socdaan `req.user.studentRef`.

Tani waxay ka hortagtaa data leakage (student ma arko events aan isaga quseyn).

## 6) Key principles (Rules of the road)

1. **Ha ku kaydin UI state data‑ga server‑ka** haddii React Query query kuu qaban karto.
2. **Query keys ha noqdaan centralized** (hal meel) si invalidation loo maamulo.
3. **Invalidate granular keys** (ha invalidatin `base` haddii aan loo baahnayn).
4. **Mutations**: isticmaal `useMutation` + `onSuccess` invalidation.
5. **Realtime**: ha “setState” ku buufin data realtime payload; realtime‑ku waa trigger.
6. **Backend**: publish event kasta oo muhiim ah; haddii aan publish jirin, realtime waa “qolof”.

## 7) Students pilot — waxa la standard‑gareeyay

- Students pages/components waxay u wareegeen React Query (`useQuery`/`useMutation`).
- Query keys: `frontend/src/features/students/queryKeys.js` (base/prefix keys si granular invalidation u suurtagasho).
- Dashboard tabs: invalidation granular ah oo la wadaago.
- SSE reliability: reconnect/watchdog/ping + probe/debug.
- Student login realtime: SSE la ogolaaday + backend filtering.

## 8) Debugging & observability

Waxaad isticmaali kartaa flags (browser localStorage):
- `debug:realtime = "1"` → realtime stream logs (global).
- `debug:students = "1"` → Students page error logs (dev/debug).
- `debug:studentsApi = "1"` → Students API layer error logs.

Sidoo kale status probe:
- `window.__realtimeSseStatus` (si loo arko status‑ka stream‑ka).

## 9) Rollout plan (Mashruuca intiisa kale)

Qorshe ku celcelin (template) oo lagu dabaqo feature kasta (tusaale: Teachers, Attendance reports, Timetable, Exams/Results, Cohorts…):

### Step A — Query keys (feature)
- Samee `src/features/<feature>/queryKeys.js`
- Ku dar:
  - `base` (prefix)
  - keys granular ah: list/detail/summary/…
  - “base per entity” haddii aad u baahan tahay invalidation scoped

Acceptance:
- Hal file oo keliya ayaa qeexaya keys‑ka.

### Step B — Canonical API module
- Samee `src/features/<feature>/api/<feature>Api.js`
- Halkaas ku ururi calls‑ka fetchJson.
- API layer ha noqdo “quiet” (ha buuxin console), error handling‑kuna ha noqdo predictable.

Acceptance:
- Component‑yada ma wacaan endpoints si toos ah; waxay wacaan api module.

### Step C — Convert pages to `useQuery`
- List pages: `useQuery({ queryKey, queryFn, enabled, staleTime })`
- Detail pages/tabs: queries gooni gooni ah, oo keys granular ah.

Acceptance:
- UI state wuxuu noqonayaa filters/sort/modal open oo keliya; data waa query.

### Step D — Convert actions to `useMutation`
- create/update/delete/activate…
- `onSuccess`: invalidate keys sax ah
- optionally: `emit<Feature>Changed({ source: 'local', action, id, ts })` si UI‑ga isla markiiba u kaco (dedupe aware)

Acceptance:
- No manual refetch chains; React Query invalidation kaliya.

### Step E — Realtime invalidation hook (feature‑level)
- Samee `use<Feature>RealtimeInvalidation()` ama “shared invalidation” hook.
- Dhageyso events from dispatcher (EVENTS.*).
- Invalidate keys granular ah.

Acceptance:
- Marka backend publish sameeyo, 2 browser oo kala duwan updates arkaan.

### Step F — Backend publish events
- Controller kasta oo beddela data: `publishRealtime({ type, ...scopeFields })`
- Scope fields:
  - entity id (studentId/teacherId…)
  - gradeSectionId haddii ay khuseyso
  - date/period haddii attendance

Acceptance:
- “Create/Update/Delete/Transfer/Attendance mark/Timetable change” mid kasta publish ayuu leeyahay.

### Step G — Authorization + filtering
- Haddii role cusub la ogolaado SSE:
  - allow role in route
  - filter event types
  - filter by user scope (studentRef/teacherRef…)

Acceptance:
- No data leakage: user role ma arko events aan u gaar ahayn.

## 10) Checklist (quick)

- [ ] Feature keys centralized
- [ ] API module exists
- [ ] Pages useQuery
- [ ] Actions useMutation
- [ ] Realtime invalidation hook exists
- [ ] Backend publishes for all writes
- [ ] SSE role gating + filtering correct
- [ ] Cross‑browser verified

---

Haddii aad rabto, waxaan sameyn karaa rollout‑ka “Teachers” ama “Attendance reports” sida module‑ka xiga (pilot 2) anigoo raacaya template‑kan.
