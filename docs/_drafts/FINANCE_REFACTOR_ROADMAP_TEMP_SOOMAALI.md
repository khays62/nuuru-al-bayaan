# Finance Refactor Roadmap (TEMP) — Nuuru-native (Somali)

> Ujeeddo: In Finance module-ka loo dhigo **Nuuru patterns** (Design System + `StandardTable` + React Query keys + realtime invalidation + export visible columns only) **adigoon jebin** business logic, validations, ama endpoints-ka hadda jira.

Dukumentigan waa “ku meel gaar” (TEMP) oo loogu talagalay in uu noqdo checklist + talaabooyin cad-cad oo kooxdu raacdo marka ay bilaabayso shaqada.

---

## Status (Feb 2026) — halkay maraysaa?

Waxaa hore u dhammaaday (✅):
- ✅ Expenses: FE API wrapper + React Query keys + `StandardTable` + export “visible columns only”.
- ✅ Accounts: FE API wrapper + React Query keys + `StandardTable` + export “visible columns only”.
- ✅ Realtime (entity-level) ee Expenses/Accounts: backend emits `expenses:changed` / `accounts:changed` → FE invalidation.
- ✅ Payroll: main list table waxaa loo wareejiyey `StandardTable` (UI consistency).
- ✅ Student Finance: ReceiptTab + PreviousBalanceTab + AmountTypeTab + FeeTypeTab waxaa loo wareejiyey `StandardTable` (UI consistency).
- ✅ Frontend build wuu pass-gareeyaa kadib migrations-kaan.

Waxa wali ka dhiman (➡️ Next):
- ⬜ Payroll API/QueryKeys/Hooks (Nuuru-native) + targeted invalidation.
- ⬜ Student Finance API/QueryKeys/Hooks (Nuuru-native) + targeted invalidation.
- ⬜ Realtime events & invalidation: Payroll + Student Finance (create/update/delete) si list-yadu auto-refresh u noqdaan.
- ⬜ Export standardization (visible columns only) ee Payroll + Student Finance (meelaha wali custom export ah).
- ⬜ Remaining raw `<table>` ee finance tabs/modals (low risk UI consistency).

---

## 0) Xeerarka (Constraints) — ha la jabin

- **Ha beddelin behavior-ka Finance**: endpoints, validation rules, and permission checks waa inay la mid ahaadaan sidii ay hadda yihiin.
- **Refactor-ku waa incremental/strangler**: wax cusub ku dar (hooks/keys/UI wrapper), kadib tartiib u wareeji pages-ka—ha sameyn “big bang rewrite”.
- **Pagination**: client-side sida Teachers module (no server-side paging hadda).
- **Realtime**: raac pattern-ka jira: backend `publishRealtime({ type: 'x:changed', ... })` → frontend dispatcher → `EVENTS.*` → `use*RealtimeInvalidation` invalidates React Query keys.
- **Export**: “visible columns only” sida Teachers export (haddii column la qariyo, export-kana ha ka baxo).
- **Design system**: ku dheg `shared/components/ui/*` + `StandardTable` + `DataToolbar` patterns; ha abuuranin theme/colors cusub.

---

## 1) Waxa aan sameyneyno vs waxa aanan sameyneyn

### Waxaan sameyneyno (Scope)
- Finance API layer standardization (frontend): hal meel oo `fetchJson` la wada isticmaalo.
- React Query `queryKeys` + hooks standard.
- Finance list pages: u wareejin `StandardTable` + toolbars/filters/export.
- Realtime invalidation: finance entities marka la create/update/delete.

### Ma sameyneyno hadda (Out of scope)
- DB schema redesign weyn.
- Endpoint contract breaking changes.
- UX features cusub (modals/pages cusub) aan hore u jirin.

---

## 2) “Source of truth” patterns-ka Nuuru (si aan u raacno)

Tixraac dukumentiyadan jira:
- `docs/FRONTEND_API_RESTRUCTURE.md` — sida loo dhiso frontend API modules.
- `docs/FRONTEND_UI_SHARED_COMPONENTS_PLAN.md` — shared UI system.
- `docs/REALTIME_REACT_QUERY_PATTERN_SOOMAALI.md` — realtime → invalidation.

Qodobada muhiimka ah:
- FE API calls: `frontend/src/shared/api/http.js` (`fetchJson`, `apiUrl`).
- Tables: `StandardTable` (columns, visibility, export patterns).
- Realtime: `frontend/src/shared/realtime/realtimeDispatcher.js` + `frontend/src/utils/events.js` + `useRealtimeInvalidation`.

---

## 3) Roadmap — phases (talaabo-talaabo)

### Phase 0 — Baseline & Safety (1–2 saac)
**Goal**: Kahor refactor, hubi in system-ku “green” yahay.

Checklist:
- [x] Frontend `npm run build` waa inuu pass-gareeyaa.
- [ ] Backend smoke tests (haddii jira scripts) waa inay pass-gareeyaan.
- [ ] Qor “baseline endpoints” (Finance) liis (kaliya docs) si aan u ogaano waxa aanan jebin.
- [ ] Hubi permission gating: UI-only vs backend-enforced (kaliya in la fahmo; ha beddelin hadda).

Deliverable:
- Roadmap-kan + baseline checklist waa diyaar.

---

### Phase 1 — Finance Frontend API layer (non-breaking)
**Goal**: Finance endpoints oo dhan hal API folder ha ku uruuraan; pages-ka hore ha sii shaqeeyaan.

Talaabooyin:
- [x] Samee `frontend/src/features/finance/api/` (ama haddii hore u jiro, nadiifi):
  - `accountsApi.js`, `expensesApi.js`, `categoriesApi.js`, `payrollApi.js`, iwm.
- [~] API functions-ka ha noqdaan “thin wrappers” (kaliya request/response):
  - Wax logic ah ha ku darin (formatting/business rules).
- [ ] Dhinac dhig (temporary) mapping of old calls → new API wrapper.

Verification:
- [ ] Same endpoints, same payloads, same errors.

---

### Phase 2 — Query Keys + Hooks standard
**Goal**: Finance entity kasta yeelato keys iyo hooks consistent.

Talaabooyin:
- [~] Samee `frontend/src/features/finance/queryKeys*`:
  - (Hadda waxaa jira `queryKeys.js` (expenses/accounts) — waxaa weli ka dhiman payroll/student/categories keys in la kala dhigo ama la ballaariyo.)
- [ ] Samee hooks:
  - `useExpensesListQuery(filters)`
  - `useCreateExpenseMutation()`
  - `useUpdateExpenseMutation()`
  - `useDeleteExpenseMutation()`
- [x] Invalidations-ka mutation-ha ha noqdaan **targeted** (invalidate list keys + detail keys relevant) (Expenses/Accounts).

Verification:
- [ ] Pages-ka la wareejiyey hooks-kan waa inay weli si sax ah u shaqeeyaan.

---

### Phase 3 — StandardTable migration (Pilot-first)
**Goal**: Finance list pages → `StandardTable` + shared toolbar/filters/export.

**Go’aanka Pilot (default)**
- Pilot 1: **Expenses** (risk medium, usage common, easiest to validate)
- Pilot 2: **Accounts** (dependency for expenses/invoices)
- Payroll: **later** (risk high: salary rules, approvals, totals)

Update: Payroll iyo Student Finance UI qayb ahaan waa la waafajiyey (StandardTable), laakiin API/keys/realtime/export wali waa in la dhameystiraa.

Talaabooyin (Pilot entity kasta):
- [ ] List page ku beddel `StandardTable`:
  - columns definitions (key/label/render)
  - client-side sort/search (haddii hore u jiray)
  - client-side pagination sida Teachers
- [ ] Ku dar column visibility (storageKey) haddii pattern-ka module-yada kale sidaas sameeyo.
- [ ] Export: u samee “visible columns only”.
  - Strategy: export rows-ka ha ku saleysnaadaan columns visible.
  - Haddii export-ku hadda “hard-coded” yahay, refactor-ka ha noqdo helper ku jira feature folder (ha ku degdegin shared haddii aadan u baahnayn).

Verification:
- [ ] Lists: count, search, sort, pagination, actions waa inay la mid noqdaan.
- [ ] Export: columns visible kaliya ayaa baxa.

---

### Phase 4 — Realtime: finance invalidation (non-breaking)
**Goal**: Markasta oo expense/account iwm la beddelo, UI ha refresh-gareeyo (React Query invalidate) adigoon manual refresh sameyn.

#### 4.1 Backend event naming
Default incremental strategy (safe):
- Bilow hal event guud: `finance:changed`
  - payload: `{ type: 'finance:changed', entity?: 'expenses'|'accounts'|..., entityId?: '...' }`
- Markaad degto kadib, u kala saar entity-level:
  - `expenses:changed`, `accounts:changed`, `financeCategories:changed`, ...

Status: Expenses/Accounts entity-level events waa la hirgeliyey; payroll/student wali lama gaarin.

#### 4.2 Frontend wiring
Talaabooyin:
- [ ] Ku dar mapping dispatcher (type → emitter) sida features kale.
- [ ] Ku dar `EVENTS.FINANCE_CHANGED` (ama entity-level events).
- [ ] Samee `useFinanceRealtimeInvalidation()` (ama `useExpensesRealtimeInvalidation()`):
  - invalidate keys relevant (`expenseKeys.listBase`, `accountKeys.listBase`, etc.)
  - haddii payload keeno `entityId`, invalidate detail key-gaas.

Verification:
- [ ] Create/Update/Delete expense: list auto-refresh.
- [ ] Create/Update/Delete account: list auto-refresh.

---

### Phase 5 — Cleanup & DRY (kadib pilot success)
**Goal**: Markii 2–3 pages la wareejiyo, ka dib nadiifi duplication.

Talaabooyin:
- [ ] Ka saar helper duplicates (export builders, filter mappers) oo u rar `shared/` *kaliya* haddii ugu yaraan 2–3 features isticmaalaan.
- [ ] Standardize error handling (toast/messages) adigoon beddelin server messages.
- [ ] Hubi i18n keys: columns labels + toolbars.

---

## 4) Checklist-ka “Pilot 1: Expenses” (si aad u raacdaan)

### A) API + Keys
- [x] `expensesApi`: `list`, `create`, `update`, `remove`, `range`.
- [x] `expenseKeys`: list + filters.
- [x] Hooks: list + mutations (React Query) (khuseeya page-ka migrated).

### B) UI (StandardTable)
- [x] Columns: date, category, amount, account, note/description, actions.
- [x] Client-side pagination: same UX sida Teachers.
- [x] Export visible columns only.

### C) Realtime
- [x] Backend emits event on create/update/delete.
- [x] FE invalidates list keys.

### D) Verify
- [ ] Same validations (min/max, required fields).
- [ ] Same permission behavior (403/disabled buttons etc.)
- [ ] No console errors; build passes.

---

## 5) Checklist-ka “Pilot 2: Accounts”

- [x] API + keys + hooks.
- [x] StandardTable list page.
- [x] Export visible columns only.
- [x] Realtime invalidation.
- [ ] Verify: balances/aggregations haddii ay jiraan, waa in aysan is beddelin.

---

## 9) Qorshaha xiga (Priority order) — si aan u sii wadno adigoon jabin

1) Payroll (Nuuru-native data layer)
- [ ] Samee `payrollApi.js` thin wrapper (reuse endpoints-ka jira)
- [ ] Ku dar `payrollKeys` + hooks (list + mutations) + invalidations targeted
- [ ] Ku dar export “visible columns only” ee payroll list (haddii loo baahdo)
- [ ] Ku dar realtime: `payroll:changed` → FE invalidation

2) Student Finance (Nuuru-native data layer)
- [ ] Samee `studentFinanceApi.js` thin wrappers (endpoints-ka jira)
- [ ] Ku dar keys + hooks (students list, charges, payments, previous balances)
- [ ] Realtime: `studentFinance:changed` (ama entity-level) → invalidate relevant keys
- [ ] Export standardization (visible columns only) meelaha export-ku custom yahay

3) UI consistency cleanup (low risk)
- [ ] Remaining raw `<table>` ee finance tabs/modals u wareeji `StandardTable` marka ay *read-only* yihiin.
- [ ] Haddii table-ku leeyahay inputs (inline edit), `StandardTable` renderCell u isticmaal sida PreviousBalance.

---

## 6) “Definition of Done” (DoD) — marka phase la dhameeyo

Phase kasta (ama PR kasta) waa inuu buuxiyaa:
- [ ] Frontend build pass.
- [ ] No breaking changes to endpoints.
- [ ] UX iyo validations la mid ah (ama improved without changing rules).
- [ ] Realtime working (phase 4 kadib).
- [ ] Export visible columns only (phase 3 kadib).

---

## 7) Sida ugu fiican ee loo qabto (PR plan)

Si hawshu u fududaato oo u safe noqoto:
- PR-1: Finance API wrappers + queryKeys skeleton (no UI changes).
- PR-2: Expenses migrate to StandardTable + export visible columns.
- PR-3: Realtime for expenses (invalidate queries).
- PR-4: Accounts migrate + realtime.
- PR-5: Cleanup/DRY + i18n alignment.

---

## 8) Su’aal degdeg ah (hal go’aan oo keliya)

Haddii aad rabto in aan roadmap-kan “lock” gareeyo oo u rogo checklist implementation (file-by-file), ii xaqiiji:
- Pilot-ka ma noqdaa **Expenses → Accounts** (default) mise waxaad rabtaa in **Payroll** la hormariyo?
