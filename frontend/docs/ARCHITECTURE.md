# Qaab Dhismeedka Frontend-ka (Architecture)

Dukumentigan waxa uu sharxayaa sida aan u rabno inaan u habeeyno code-ka si uu u noqdo: nadiif, la kala fahmi karo, dib-u-isticmaal leh (reusable), isla markaana fudud in lagu daro waxyaabo cusub mustaqbalka.

## 1. Ujeeddada Guud
Waxaan rabnaa in pages kala duwan (Subjects, Classes, Students, iwm) ay ka faa’iideystaan qaab isku mid ah oo lagu maareeyo:
- Raadinta (Search)
- Shaandhaynta (Filters)
- Kala-sarraynta (Sorting)
- Bogagga & tirada la soo bandhigayo (Pagination)
- CRUD (Create, Read, Update, Delete) modals
- Toast fariimaha (success / error)

Halka aan ka fogaaneyno:
- Isku-celin (code repeated)
- Logic ku dhex qasan UI
- Magacyo aan nidaam lahayn

## 2. Qaab Faylal (Folder Structure) La Soo Jeediyay
```
frontend/src/
  api/
    entityClient.js        # Shaqo guud oo la hadasha backend (fetch + query params)
    subjectsApi.js         # API gaar ah Subjects
    studentsApi.js         # (marka dambe)
    classesApi.js          # (marka dambe)
  hooks/
    useEntityList.js       # Hook dhexe: search + sort + pagination + filters + load
    useDebouncedValue.js   # (Ikhtiyaari) Dib u dhig search si load badan looga baaqsado
  components/
    common/
      DataToolbar/
        DataToolbar.jsx    # Isku keenista search + filters + sort + actions
        SearchInput.jsx    # Input gaar ah raadinta
        FilterSelect.jsx   # Select guud oo filter ah
        SortControls.jsx   # Badhamada ama toggles sort
      Pagination/
        PaginationControls.jsx # Bogaal wareegaya (Prev/Next + limit)
      Feedback/
        EmptyState.jsx     # Fariin marka aysan xog jirin
        LoadingState.jsx   # Fariin ama spinner marka xog la sugayo
    entity/
      CrudModal.jsx        # Modal guud oo lagu geliyo foom
      EntityTableShell.jsx # Qaab guud oo table layout + fallback
  pages/
    SubjectPage.jsx        # Page la refactor gareyn doono marka hore
  (Legacy ClassPage removed)         
    StudentPage.jsx        # Mustaqbal: qaabkan la raacin doono
  utils/
    buildQueryParams.js    # Dhisidda ?page=1&limit=10&search=...
    formatters.js          # Shaqooyin yar yar (taariikh, magac iwm)
  docs/
    ARCHITECTURE.md        # Dukumentigan
```

## 3. Heerarka Mas’uuliyadda (Responsibility Layers)
| Heer | Maxay Qabtaan |
|------|---------------|
| Pages | Isu keenista qaybo + dejinta foom CRUD + isticmaalka hook-yada |
| Hooks | Maareynta state iyo lifecycle (fetch, sort, pagination) |
| API Modules | Xiriirka backend (fetch, error throw) |
| Components | Soo bandhig UI nadiif ah (wax yar logic) |
| Utils | Functions yaryar oo aan React ku xirnayn |

## 4. Hook-ka: `useEntityList`
Hook-kan waa wadnaha liisaska. Wuxuu:
- Kaydiyaa: `items`, `meta`, `isLoading`, `error`, `searchTerm`, `filters`, `page`, `limit`, `sortBy`, `sortDir`.
- Wacaa `fetchFn(params)` (params waxaa ka mid ah page, limit, search, sort, filters).
- Ku kaydiyaa `sortBy` iyo `sortDir` gudaha `localStorage` iyadoo la isticmaalayo furaha `persistKey`.
- Haddii bogga hadda jira ka baxo (tusaale page 5 kadibna data noqoto 3 pages) → toosiya page.

Qaabka natiijada backend ee aan rabno (standard):
```json
{
  "data": [ ... ],
  "meta": { "page":1, "limit":10, "total":120, "totalPages":12, "sortBy":"createdAt", "sortDir":"desc" }
}
```

Waxa uu soo celinayaa object ay ka mid yihiin:
```
{
  items,
  meta,            # xogta pagination + sort
  isLoading,
  error,
  searchTerm,
  setSearch(),
  setFilter(name, value),
  setPage(),
  setLimit(),
  toggleSort(field),
  refresh(),
  currentParams    # Fududeynta debug/log
}
```

## 5. Components Sharaxaad
- `SearchInput.jsx`: Input kooban oo waca `onChange(value)`.
- `FilterSelect.jsx`: Qaadata `options` + `value` + `onChange`.
- `SortControls.jsx`: Farriin ka muujinaysa field-ka hadda iyo jihada (↑/↓) + wacda `toggleSort`.
- `PaginationControls.jsx`: Ka kooban Prev / Next / page size selector.
- `EmptyState.jsx`: Fariin + button ikhtiyaari ah (`onAction`).
- `LoadingState.jsx`: Fariin ama spinner.
- `DataToolbar.jsx`: Isku keenista search + filters + sort + add new button (layout isku mid ah page walbo).
- `CrudModal.jsx`: Modal guud oo aan ku dhex rido foom gaar ah (SubjectForm, GradeForm...).
- `EntityTableShell.jsx`: Qaab-dhismeed table (thead/tbody) + fallback marka aan xog jirin.

## 6. API Lakabka
`entityClient.js`:
- Shaqo keliya: wax ka dhis URL + query string → fetch → JSON
- Waxaa ka yar shaqooyin gaar ah sida `fetchSubjects(params)` oo ku jira `subjectsApi.js`.

Sabab: Haddii mustaqbalka aad u wareegto GraphQL ama aad u baahato headers gaar ah → Hal meel ayaad wax ka beddeli.

## 7. Magac & Kaydin (Naming & Persistence)
- LocalStorage keys: `${persistKey}.sortBy` / `${persistKey}.sortDir` / (mustaqbal `.${persistKey}.limit`).
- Components waa in ay yeeshaan magacyo qeexaya shaqadooda (ha la oran `ListBox2.jsx`).
- Hooks waxay ku bilaabmaan `use` (React convention).

## 8. Habka Refactor-ka (Tallaabooyin)
1. Dhis `utils/buildQueryParams.js`.
2. Dhis `api/entityClient.js` + `subjectsApi.js`.
3. Dhis `hooks/useEntityList.js` (no debouncing yet).
4. Dhis UI components yar-yar (SearchInput, SortControls, PaginationControls, DataToolbar).
5. Refactor `SubjectPage.jsx` si ay ugu tiirsanaato hook + components.
6. Ku dar comments iyo faallo Somali ah.
7. Markuu shaqeeyo → qaabka waxaa loo adeegsadaa `GradePage.jsx` iyo `StudentPage.jsx`.
8. Ku dar optional: `useDebouncedValue` haddii search aad u firfircoon yahay.

## 9. Comments & Standard
Fayl walba kor:
```js
// File: useEntityList.js
// Sharaxaad: Hook guud oo maareeya liis xog leh (search, filter, sort, pagination).
```
Jirka dhexdiisa:
```js
// --- State Initialization ---
// --- Effects: Reload when params change ---
// --- Helpers: toggleSort etc ---
```

## 10. Faa’iidooyinka Qaabkan
| Faa’iido | Sharaxaad |
|----------|-----------|
| Dib-u-isticmaal | Hal mar ayaad qortaa sorting/pagination logic. |
| Nadiifnimo | Page-ka ma mashquulinayo logic badan. |
| Fududeyn Mustaqbal | Entity cusub = kaliya API + Table + Form. |
| Dayactir Yar | Haddii khalad jiro sorting → hal meel ka sax. |
| Isku Ekaansho | UX isku mid ah dhammaan pages. |

## 11. Tusaale Kooban (Pseudo) Isticmaalka Hook-ga
```jsx
const {
  items: subjects,
  meta,
  isLoading,
  error,
  setSearch,
  setFilter,
  toggleSort,
  setPage,
  setLimit,
  refresh
} = useEntityList({
  fetchFn: fetchSubjects,
  initialSortBy: 'createdAt',
  initialSortDir: 'desc',
  initialLimit: 10,
  persistKey: 'subjects',
  extraFilters: { grade: '' }
});
```

## 12. Halista Haddii Aan Qaabkan La Raacin
- Khatarta “duplicate logic”: 4 places sort bug.
- Isbeddel cusub (tusaale prefetch) wuxuu noqonayaa dadaal badan.
- Kordhin mashquul: Page walba 300+ lines state + effects.

## 13. Mustaqbal Ikhtiyaari ah
- `useBulkSelection` (checkbox select + bulk delete).
- `useColumnVisibility` (hide/show columns).
- `VirtualizedTable` haddii xog badan timaaddo.
- Theme config (hal meel lagu beddelo midabada / spacing).

## 14. Gunaanad
Qaabkan waxa uu kaa dhigayaa inaad ka fikirto “Maxaa u gaar ah entity-gan?” halkii aad mar walba ka bilaabi lahayd search/sort/pagination. Waxaad helaysaa nadiif, isku xirnaan yar (loose coupling) iyo ballaarin fudud.

-- Haddii aad ogolaato, tallaabada xigta: waxaan bilaabayaa abuurista hook + components yar yar; ama waxaad dhihi kartaa wax ka beddel ka hor.

---

## 15. Dhibaatooyinkii La Xaliyay (Resolved Issues Log)
Qaybtan waxay diiwaangelisaa dhibaatooyinkii muhiimka ahaa ee la helay inta lagu dhisayay nidaamka iyo sida loo xaliyay. Waxay ka caawinaysaa mustaqbalka in aanan ku noqonin khaladaad hore ama si dhakhso ah loo fahmo sababta qaarkood design decisions loo qaaday.

| # | Dhibaatada | Calaamadaha/ Saameynta | Sababta Asalka | Xalka | Fiiro Mustaqbal |
|---|------------|------------------------|----------------|-------|-----------------|
| 1 | `require is not defined` (Module error) | Backend ma start garayn (ESM error) | Isku dhaf CommonJS & ES Modules | Backend oo dhan loogu beddelay ESM imports ("type":"module") | Ilaali consistency stack mustaqbalka |
| 2 | Infinite /subjects requests | Network tab spam 100s requests, loading loop | `useEntityList` dependency ku xirnaansho `fetchFn` inline + JSON stringify loop + page correction | Hook refactor: `fetchFn` → `useRef`, signature guard, in-flight flag, debounce search | Ku dar AbortController haddii la rabo cancel |
| 3 | CRUD after update/delete lama cusboonaanayo isla markiiba | User refresh manual uu u baahan yahay | Guard duplicate request ayaa joojinayey re-fetch | `refresh()` hadda force reload (load(true)) | Optimistic update ikhtiyaari mustaqbal |
| 4 | Duplicate `subjectCode` error UX aan caddeyn | Fariin generic ama aan la tarjumin si fiican | Server 409, frontend aan field mapping sameyn | Server wuxuu soo celiyaa `{field, message}`; frontend mapping + toast | Standardize error mapping module |
| 5 | Regex error: `Regular expression is invalid: \` | Server 500 marka user qoro `\` iwm | Search string toos loogu geliyay `$regex` | Escape user input (escapeRegExp) ka hor RegExp | Ka fikir rate limit iyo ReDoS protection hore |
| 6 | Grades lookup laba jeer (dev) | 2 GET /lookups/grades | React StrictMode double invoke + effect | Caching + in-flight promise in `getGrades` | Invalidate cache marka grade la abuuro |
| 7 | Loading UX liita | Plain text "Loading..." | Placeholder basic | Skeleton table + spinner abstraction (`Spinner`, `LoadingState` variants) | Add delay to avoid flash (ikhtiyaari) |
| 8 | Toolbar button position inconsistent | Add New button dhexda kaga jiray | Layout aan unified ahayn | Header reposition + actions top-right | Samee `PageHeader` reusable mustaqbal |
| 9 | Sorting state lumaysa reload | User sort preferences mar walba dib u dhac | Sort state ma la kaydin | Persist `sortBy/sortDir` localStorage | Ku dar persist limit / filters hadhow |
|10 | Requests badan marka la qorayo search | Network chatter weyn | Inline immediate fetch on each keystroke | Debounced search (350ms) | Tune delay per entity size |

## 16. Module-ka Classes (Fasalada) – Qaab & Xeerar

### 16.1 Ujeeddo
Maamul fasallada iyadoo la xiriirinayo: Grade, AcademicYear, Shift, Subjects. Waxaa la hubiyaa in maaddooyinka (subjects) ku jira fasal ay taageeraan grade-kaas.

### 16.2 Model Highlights
```
Class: {
  className: String (required, trimmed),
  capacity: Number (ikhtiyaari),
  grade: ObjectId (Grade, required),
  academicYear: ObjectId (AcademicYear, required),
  shift: ObjectId (Shift, required),
  subjects: [ObjectId(Subject)] (filtered by grade compatibility),
  timestamps: true
}
Unique Index: { grade, academicYear, shift, className } (compound) → Ka hortagaya in fasal isku magac ah la sameeyo isla sanad + shift + grade isku mid.
```

### 16.3 Validation Flow (Create / Update)
1. Xogta aasaasiga ah: `className, grade, academicYear, shift` waa required.
2. AcademicYear & Shift waa la xaqiijiyaa (existence check) → 400 haddii mid khaldan.
3. Subjects (haddii la keenay):
   - Waxaa la soo jiidayaa Subject docs `_id in subjects`.
   - Waxaa la hubiyaa in subject walba `grades` ay ku jirto grade-ka fasalka.
   - Kuwa aan la jaan qaadi karin → waa la sifeeyaa (auto-remove) waxaana lagu celinayaa `removedSubjects` (array magacyada) si UI u toosto.
4. Update scenario marka grade la beddelo:
   - Haddii user aanu soo gudbin subjects cusub, kuwii hore dib ayaa loo qiimeeyaa grade cusub → kuwa aan habboonayn waa la saaraa.
   - Haddii user soo gudbiyo subjects array cusub → waxaa la marayaa isla filtration logic-ka kor ku xusan.
5. Duplicate / Uniqueness: Mongo error code 11000 → 409 JSON `{ message: 'Class with these details already exists' }`.

### 16.4 API: Query Params Standard
```
(Legacy /api/classes removed; use /api/grades/sections)
Response: {
  data: [...],
  meta: { page, limit, total, totalPages }
}
```
`search` kaliya waxa uu ku shaqeeyaa `className` (case-insensitive regex sanitized basic). Mustaqbal: lagu dari karo capacity range / subjects count filter.

### 16.5 Frontend Integration
(`ClassPage.jsx` removed; `GradePage.jsx` uses `useEntityList`.)
- Filters: Grade, Academic Year, Shift.
- Sort default: `createdAt desc`; user waxa uu dooran karaa `className` ama `createdAt`.
- Table waxaa laga saaray mock data; hadda waxay qaadataa xogta backend oo `populate()` ah.
- CRUD Modal: `GradeForm` waxa uu leeyahay confirm dialog marka grade isbeddelo si looga saaro subjects hore (UX transparency).
- `removedSubjects` haddii server soo celiyo → toast ogaysiin structured list.

### 16.6 Edge Cases & Defenses
| Case | Tallaabada | Natiijo |
|------|------------|---------|
| Grade la beddelay + subjects hore jira | Form confirm → server re-validate | Subjects aan habboonayn waa la tirtiraa (client & server sync) |
| Subject la doortay oo aan grade ku jirin (tamper) | Server filter + return `removedSubjects` | Client wuu tusayaa user-ka |
| Query out-of-range page (e.g. page=9 kadib delete) | Hook page correction | Page -> last valid page |
| Duplicate combination (index) | Mongo 11000 | 409 JSON error response |
| Missing academicYear / shift | Pre-check existence | 400 error |

### 16.7 Mustaqbal Enhancements
- Pre-compute studentCount (aggregation) → display occupancy vs capacity.
- Add `status` field (Active / Archived) → filter.
- Bulk subject assignment wizard.
- Enrollment linking (Students table join + indexing performance): create index `{ class: 1 }` on Student model.

### 16.8 Performance Notes
- Filtering subjects on server eliminates illegal combinations before persistence.
- Compound index supports fast uniqueness + potential future query patterns (grade+year+shift lists).
- Potential additional index: `{ academicYear:1, shift:1 }` haddii reporting queries badan ku yimaadaan.

### 16.9 Updated Resolved Issues (Classes Additions)
| # | Dhibaatada | Calaamado | Sababta | Xalka | Fiiro |
|----|-----------|----------|---------|-------|-------|
| 11 | Class validation complexity | Risk of mismatched subjects after grade change | No centralized revalidation | Server revalidates & strips + client confirm modal | Add optimistic diff highlight |
| 12 | Inconsistent pagination meta (`pages` vs `totalPages`) | Frontend fallback logic | Early design difference | Standardized to `totalPages` in both controllers | Audit other endpoints |
| 13 | Table mismatch with backend populated refs | UI showing mock schema | Legacy mock placeholders | Refactored to consume populated doc structure | Consider generic Table renderer |

---

## 17. Data Flow Diagram (Verbal)
User → GradePage (search/filter changes) → `useEntityList` builds params → `listGradeSections()` constructs query string → Backend `listGradeSections` builds Mongo query + populate → Response `{ data, meta }` → Hook updates state → Table renders.

Modal Save → `GradeForm` submit → `createGradeSection/updateGradeSection` → Server validates & possibly strips subjects → Response includes `removedSubjects` → Form closes → `refresh()` → Hook force reload with updated signature.

---

## 18. Quick Reference (Cheat Sheet)
| Action | Frontend Function | Backend Endpoint | Notes |
|-------|-------------------|------------------|-------|
| List Grade Sections | listGradeSections(params) | GET /api/grades/sections | Supports search, filters, sort, pagination |
| Create Grade Section | createGradeSection(payload) | POST /api/grades/sections | Auto subject grade filtering |
| Update Grade Section | updateGradeSection(id,payload) | PUT /api/grades/sections/:id | Grade change triggers subject recheck |
| Delete Grade Section | deleteGradeSection(id) | DELETE /api/grades/sections/:id | Returns `{ message }` |

---

## 19. Next Planned Improvements
1. Documentation: Add Student module outline before implementation.
2. Add global error boundary + fallback UI.
3. Extract `PageHeader` component (shared between Subjects & Classes) for DRY.
4. Add `capacity` + occupancy to list meta & sorting.
5. Introduce caching for academic years & shifts similar to grades (in-flight guard).


### Qodobo Dheeraad ah oo La Tixgelinayo
- Add global request cancellation layer (AbortController) si search degdeg ah uusan CPU u cunin.
- Implement optimistic UI for list mutations (add/update/delete) si snappier dareen.
- Security layering: sanitize all user-provided query params (done for regex, harsan pagination bounds already capped).
- Metrics logging (optional) si loo cabbiro average load time / error rate.

### Sida Loo Cusboonaysiinayo Jadwalka
Marka dhibaato cusub la helo lana xalliyo:
1. Ku dar saf cusub (mark number kordhi).
2. Sharax calaamadaha & sababta root.
3. Ku qor xalka gaaban.
4. Haddii ay jirto talo mustaqbal (preventive) ku qor column-ka ugu dambeeya.

---

## 20. Students & Enrollment Module (Design & API Spec)

### 20.1 Ujeeddo
Maareynta ardayda (Student) iyo diiwaangelintooda fasalka sanad walba (Enrollment) si loo helo taariikh joogto ah, loona fududeeyo: liisaska fasalka, wareejinta (promotion), iyo raadinta.

### 20.2 Models Recap
Student:
```
studentId (String, unique, STU-<YEAR>-0001 pattern)
fullName (String, required)
gender ("Male" | "Female")
dob (Date, required)
guardianName (String, required)
contactNumber (String, required)
address (String, optional)
admissionDate (Date, required)
status (Active | Inactive)
timestamps
```
Indexes:
- unique studentId
- text index: (fullName, studentId)

Enrollment:
```
student (ref Student, required)
class (ref Class, required)
academicYear (ref AcademicYear, required)
grade (ref Grade, required)
shift (ref Shift, required)
status (active | transferred | promoted | graduated | withdrawn)
joinedAt (Date, required)
leftAt (Date, optional)
timestamps
```
Indexes:
- unique (student, academicYear)
- (class, status)
- (student, createdAt)

### 20.3 Xeerar & Invariants
1. Hal Enrollment sanad walba per student.
2. class → academicYear, grade, shift waa la dhaxlaa (lama soo gudbinayo foomka Student).
3. Deleting Class haddii ay jiraan enrollments.status = active → BLOCK 409.
4. Promotion sanad xiga = create enrollment cusub (student, newClass, nextYear) & update previous enrollment.status = promoted.
5. Withdrawal / transfer mustaqbal: update status + create enrollment cusub (transfer scenario).

### 20.4 API Endpoints (Phase 1)
| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| /api/students | GET | List students (paginated) | Filters: search, classId, academicYear, status |
| /api/students | POST | Create student + first enrollment | Body includes classId + student fields |
| /api/students/:id | GET | Student profile (latest + base info) | Quick view |
| /api/students/:id/history | GET | Enrollment history ordered recent→old | Pagination optional |
(use GradeSection relation via Enrollment)

### 20.5 API Endpoints (Promotion Phase)
| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| /api/promotions/preview | GET | Dry-run count & mapping | Params: fromYear, toYear, gradeMapping(optional) |
| /api/promotions/execute | POST | Perform bulk promotion | Transaction batches |

### 20.6 GET /api/students Query Params
```
page (default 1)
limit (default 10)
search (matches fullName OR studentId, case-insensitive)
classId (filter current active enrollment class)
academicYear (filter by active enrollment year)
status (Active/Inactive – student status)
sort (field:dir) → allowed: createdAt, fullName, studentId, admissionDate
```
Response:
```
{
  data: [ { _id, studentId, fullName, gender, admissionDate, status, class: { _id, className, gradeName, shiftName, academicYearName } } ],
  meta: { page, limit, total, totalPages, sortBy, sortDir }
}
```

### 20.7 Student Profile
GET /api/students/:id →
```
{
  student: { ...baseFields },
  latestEnrollment: { class, academicYear, grade, shift, status, joinedAt },
  stats: { totalYears, activeStatus }
}
```
GET /api/students/:id/history →
```
{ data: [enrollment...], meta: { total, page, limit, totalPages } }
```

### 20.8 Class Roster
(Legacy students-by-class endpoint removed)
- Query enrollments where class = :id AND status=active.
- Join student.

### 20.9 Promotion Flow (Design)
Steps:
1. Preview: fetch all active enrollments in fromYear; group by grade.
2. Determine target classes in toYear (same grade OR mapped grade+1 pattern) – configurable.
3. Validate capacity (if capacity enforced later) → show deficits.
4. Execute: In transaction batches (e.g. 100 at a time):
   - Update old enrollment.status = promoted.
   - Create new enrollment with joinedAt = promotionDate.
Rollback: If any batch fails → abort transaction; no partial promotions.

### 20.10 Data Integrity Guards (Current & Planned)
| Guard | Status | Notes |
|-------|--------|-------|
| Block duplicate (student, academicYear) | Implemented (unique index) | Enrollment schema |
| Block class deletion with active enrollments | Planned | Add check before delete |
| Validate class existence & populate derived fields | Implemented | addStudent controller |
| Prevent promotion twice same year pair | Planned | track promotion job id / check existing next year enrollment |
| Prevent editing studentId manually | Enforced | Field not in form + server controlled |

### 20.11 Performance & Index Strategy
| Query | Index | Reason |
|-------|-------|--------|
| List students by search | text (fullName, studentId) | Fast name/id lookup |
| Current class roster | (class, status) | Filter active quickly |
| History per student | (student, createdAt) | Sorted recent first |
| Unique per year | (student, academicYear) unique | Integrity |

### 20.12 Testing Scenarios (Outline)
1. Create student success → returns studentId pattern.
2. Duplicate creation same payload (race) → second request 409 (or idempotent decision future).
3. Invalid classId → 404.
4. Class deletion with enrollment active → 409.
5. List students search partial name → matches expected subset.
6. History sorting descending by joinedAt.
7. Promotion preview when no target classes → capacity deficit flagged.
8. Transaction rollback (simulate error mid-batch) → no partial enrollments created.

### 20.13 Implementation Order (Refined)
1. (DONE) Student + Enrollment create flow.
2. Paginated GET /students (active enrollment join).
3. Class roster endpoint.
4. Student profile + history endpoints.
5. Class deletion guard.
6. Promotion preview skeleton.
7. Promotion execute skeleton (later finalize logic).
8. Frontend StudentPage integration (list + form + refresh events).
9. Tests (unit: models hooks, integration: endpoints).

### 20.14 Frontend Adjustments Needed
| Old Field | New Field | Action |
|-----------|-----------|--------|
| dateOfBirth | dob | Rename |
| parentName | guardianName | Rename |
| contact | contactNumber | Rename |
| academicYearId (in form) | (removed) | Infer from class |
| status (form) | (remove from create) | Default server |

### 20.15 Events
- Dispatch custom event `students:changed` after successful create → pages listening refresh.

### 20.16 Future Extensions
- Transfer endpoint: move active enrollment to new class same year (update class + audit record).
- Soft delete student: set status=Inactive + close active enrollment with leftAt.
- Attendance & reporting will depend on Enrollment linkage.

---
