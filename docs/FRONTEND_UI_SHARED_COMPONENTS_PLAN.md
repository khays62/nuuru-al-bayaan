# FRONTEND UI: 5 Qodob (Shared Components) — Nuuru Al-Bayaan

Taariikh: 2026-01-24

Ujeeddo: Doc-kan waa “hal meel” oo nadiif ah oo lagu caddeeyo 5-ta qodob ee aan ku dhiseyno shared UI, si aan ugu dabaqno page walba oo mashruuca ah, islamarkaana components-ka laga xukumo hal meel.

---

## Hadaf cad (Goal)

- UI-ga oo dhan ha noqdo **consistent** (style + behavior).
- Components-ka reusable-ka ah ha yeeshaan **hal source of truth**.
- Page walba: “feature logic” ha ahaato gudaha feature-ka, UI reusable ha ahaato shared.

---

## Xeerarka (Rules) — si aan loo wareerin

1) Single source of truth:
   - Canonical shared: `frontend/src/shared/components/**`
   - No bridges / no duplicates.
2) Goorta wax shared noqdaan:
   - Haddii component uu ka faa’iideeyo 2+ pages/2+ features → shared.
   - Haddii uu hal feature kaliya gaar u yahay → `frontend/src/features/<feature>/components/**`.
3) Page walba: ha isku dayin “UI cusub” oo gaar ah; isticmaal shared primitives & shared patterns.
4) Isbeddel walba kadib: `npm run build` (si aan u hubinno wax jabin).

---

## 5 Qodob — (Waa maxay → Structure → Sida loogu dabaqo)

### Qodob 1: Design System (tokens + UI primitives)

**Waa maxay?**
- Hal meel oo lagu dejiyo “look & feel” (tokens: colors/radius/shadows/typography) + primitives (Button/Input/Select/Modal/Card/Badge/Empty/Loading).
- Ujeeddo: pages-ka ha noqdaan “assembly”, ma aha copy/paste Tailwind classes.

**Folder/File structure**
- Tokens:
  - `frontend/src/index.css`
- Utility:
  - `frontend/src/shared/utils/cn.js`
- Primitives (canonical):
  - `frontend/src/shared/components/ui/Button.jsx`
  - `frontend/src/shared/components/ui/Input.jsx`
  - `frontend/src/shared/components/ui/Select.jsx`
  - `frontend/src/shared/components/ui/Modal.jsx`
  - `frontend/src/shared/components/ui/Card.jsx`
  - `frontend/src/shared/components/ui/Badge.jsx`
  - `frontend/src/shared/components/ui/EmptyState.jsx`
  - `frontend/src/shared/components/ui/LoadingState.jsx`

**Sida loogu dabaqo (page walba)**
1) Samee primitives-ka la isticmaalo maalin walba (Button/Input/Select/Card).
2) Hal-hal u beddel pages-ka: buttons/forms/modals → primitives.
3) Marka style la beddelo (focus ring/colors) → pages oo dhan automatic ayey u qaataan.

---

### Qodob 2: StandardTable UX (hal table pattern)

**Waa maxay?**
- Table UX isku mid ah page walba: sticky controls, column visibility (persisted), sortable headers, pagination.
- “Contract” cad si table-yada loo qoro si aan la isku dhex yaacin.

**Folder/File structure**
- Table stack (canonical):
  - `frontend/src/shared/components/table/StandardTable.jsx`
  - `frontend/src/shared/components/table/DataTable.jsx`
  - `frontend/src/shared/components/table/PaginationBar.jsx`
  - `frontend/src/shared/components/table/TableState.jsx`
- Sorting helper:
  - `frontend/src/shared/hooks/useClientSort.js`

**Sida loogu dabaqo (page walba)**
1) Table kasta ku dar `storageKey` (format: `<feature>:<table>:columns:v1`).
2) Ku wareeji table block-ka `StandardTable` (ama DataTable pattern shared).
3) Hubi: sorting + column visibility + pagination ay shaqeeyaan.

---

### Qodob 3: Client mode vs Server mode (UX isku mid)

**Waa maxay?**
- Data yar → client sorting/paging (instant).
- Data badan → server paging/sorting (performance).
- UX isku mid, strategy kaliya ayaa is beddesha.

**Folder/File structure**
- Client sorting:
  - `frontend/src/shared/hooks/useClientSort.js`
- Server list (feature):
  - `frontend/src/features/<feature>/api/*`
  - `frontend/src/features/<feature>/hooks/*`

**Sida loogu dabaqo (page walba)**
1) Pages-ka “instant sorting” loo baahan yahay → client mode.
2) Pages-ka heavy → server mode, laakiin headers/controls ha ahaadaan isla style.

---

### Qodob 4: Data layer (service boundaries + query hooks)

**Waa maxay?**
- UI ha noqdo “thin”, data fetching ha noqdo hooks/services.
- Hal qaab oo consistent ah oo error/loading/caching u shaqeeya.

**Folder/File structure**
- Feature API:
  - `frontend/src/features/<feature>/api/*`
- Feature hooks:
  - `frontend/src/features/<feature>/hooks/*`

**Sida loogu dabaqo (page walba)**
1) Page kasta: ka saar fetch logic-ka gudaha page-ka, u rar hooks.
2) UI components ha helaan data via hooks, ma aha direct fetch.

---

### Qodob 5: Project hygiene (folder rules + imports hal meel)

**Waa maxay?**
- Hab-nidaam si aad “components-ka hal meel uga xukuntaan” oo aan la isku dhex yaacin.

**Folder/File structure**
- Shared:
  - `frontend/src/shared/components/**`
  - `frontend/src/shared/hooks/**`
  - `frontend/src/shared/utils/**`
- Features:
  - `frontend/src/features/<feature>/{api,hooks,components,pages}`

**Sida loogu dabaqo (page walba)**
1) Import policy: reusable UI → shared; feature-only UI → feature folder.
2) Optional (mustaqbal): Vite aliases (tusaale `@shared/*`) si imports u nadiif noqdaan.

---

## Rollout (si tartiib ah, laakiin page walba lagu dabaqo)

1) Ku bilow 2–3 pages “reference” (kuwa ugu dayashada fiican).
2) Ka dib u soco page-by-page:
   - Buttons/forms/modals → primitives
   - Tables → StandardTable + storageKey
3) Mar kasta smoke check:
   - UI ma jabay?
   - Sorting/pagination ma shaqeeyaan?
   - `npm run build` ma gudbaa?
