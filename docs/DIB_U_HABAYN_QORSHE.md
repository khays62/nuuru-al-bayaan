# Qorshaha Dib‑u‑Habeynta Mashruuca (Somali)

Fiiro muhiim ah: Dukumeentigan waa qorshe taariikhi ah (historical plan). Qaabka hadda jira ee API‑ga frontend waxaa lagu sharaxay `FRONTEND_API_RESTRUCTURE.md`. Halkani ha u aragto xusuus/qorshe hore, ee ma aha sida hadda wax u shaqeeyaan.

Dukumeentigan waxa uu qeexayaa qorshe nidaamsan oo aan ku nadiifineyno oo ku casriyeyneyno mashruuca (MERN) annagoo ilaalineyna shaqada hadda socota. Ujeeddadu waa in aan:
- Ka saarno ku-celcelis (duplicates) iyo iswaafajin la’aan (consistency issues).
- Dhisno qaab-dhismeed faylal (folders) oo casri ah oo fududeeya dib‑u‑isticmaalka (reusable: qaybo/koodh dib marar badan loogu adeegsan karo meelo kala duwan iyada oo aan la qorin mar kasta).
- Abuurno qaybo (components) iyo hook‑yo yaryar (small contracts: heshiisyo cad oo qeexaya gelinta/soo‑bixidda component/hook) si la isku halayn karo.
- Qorsheyneyno fulin tartiib ah (phased) si aysan u jabin wax ka mid ah shaqada hadda.

Fiiro: Erayada qaar oo English ah waxaan si kooban u sharaxay:
- Reusable: “dib‑u‑isticmaal leh” — qayb ama koodh aad ugu adeegsan karto meelo badan adigoon qorin mar kale.
- Hook (React): farsamo yar oo qaab state/saameyn ah dib loogu isticmaalo (tusaale: raadinta debounced, filters isku xiran).
- Component: qayb muuqaal (UI) oo la soo ururiyey (tusaale: Table, Select, Badge).
- RBAC: Role‑Based Access Control — xakameynta oggolaanshaha iyadoo lagu saleynayo “doorka” isticmaalaha (Admin, Teacher…). (Mashruuceenna: waan qorsheyn doonaa mustaqbalka; haddana lama fulinayo.)

---

## 1) Meelaha Lagu Hagaajinayo (Duplicates, Consistency, Qaab‑dhismeed)

Qodobadan ma aha beddel degdeg ah ee waa qorshe oggolaansho kadib la fulinayo:

1. API wicitaanada hal meel ka maamul (joogteyn)
   - Dhibaatada: Qaar ka mid ah components (tusaale `StudentTable.jsx`) waxay `fetch('/api/...')` si toos ah u wacaan, halka `apiService.js` hore u bixinayo isla shaqada. Tani waxay keentaa laba qaab oo isbarbar socda, taas oo adkeyneysa khalad‑baarista iyo mustaqbalka (auth headers, iwm.).
   - Waxa aan samaynayno:
     - Xeer guud: dhammaan wicitaanada HTTP ha maraan `src/api/apiService.js` (ama wrapper hoose `entityClient.js`).
     - Ha jirin `fetch` toos ah oo ku jira components; halkii, isticmaal API functions.
   - Faa’iido: Hal meel oo headers, qalad‑maareyn, iyo caching loogu hago; fududeynta auth mustaqbalka.

2. Filters “isku xiran” ha noqdaan hook reusable
   - Dhibaatada: Pages badan (Students/Results/Exams/Transcripts) waxay u baahan yihiin isla silsilad xulashooyin ah: Academic Year → Grade → Shift → Section; mararka qaar subject.
   - Waxa aan samaynayno:
     - Abuuro hook `useCascadingFilters` oo maamula state‑ka iyo soo dejinta (load) sections marka AY/Grade/Shift la doorto; sidoo kale subject haddii loo baahdo.
     - Dhis `Select` reusables: `AcademicYearSelect`, `GradeSelect`, `ShiftSelect`, `GradeSectionSelect`, `SubjectSelect`.
   - Faa’iido: Koodh kooban, khalad‑yar, iyo UI joogto ah.

3. Miisas (Tables) iyo badhamo (Actions) ha yeeshaan qaybo wadaag ah
   - Dhibaatada: Tailwind classes iyo qaab miis isku dhow ayaa meelo badan lagu celceliyaa.
   - Waxa aan samaynayno:
     - `TableShell.jsx` (wrapper nadiif ah: paper + table + zebra + head styles).
     - `StatusBadge.jsx` (Active/Inactive iwm) — midab/qaab joogto ah.
     - `ActionButton.jsx` (icon + variant: primary/neutral/danger) — in laga fogaado classes kala yaac.
     - (Ikhtiyaari) `DataTable.jsx` oo columns-config qaata haddii aan dooneyno abstraction ballaaran.
   - Faa’iido: Joogteyn muuqaal, code kooban, iyo degdeg wax ka beddel.

4. Event bus yar (xog is‑cusboonaysiin gudaha FE)
   - Dhibaatada: Waxaa la adeegsanayaa `window.dispatchEvent(new CustomEvent('subjects:changed'))` iwm. Adeegsigani wuu shaqeeyaa balse magacyada dhacdooyinka (events) way firdhan yihiin.
   - Waxa aan samaynayno:
     - `src/utils/events.js` → constants + helpers: `emitSubjectsChanged()`, `onSubjectsChanged(cb)`, `offSubjectsChanged(cb)`.
   - Faa’iido: Magacyo mideysan, khalad‑yar (typo), iyo fududeynta beddelka gudaha.

5. Print nadiifin (Transcripts/Results)
   - Waxa aan samaynayno:
     - Ku dar taageero CSS counters (bogga iyo tirada bogagga) iyo `@page` rules gudaha `index.css` ama `print.css` si banner/footer u noqdaan kuwo hufan.
   - Faa’iido: Daabacaad xirfad leh (page X of Y) iyo muuqaal joogto ah.

6. Magac joogto ah ee goobaha (naming)
   - Talo: Aggregations isticmaal `gradeSection` halkii `class` si uu ula jaanqaado backend models iyo docs; tani waa nadiifin tartiib ah (aan wax jabin).

---

## 2) Qaab‑Dhismeed (Folders) Casri ah oo Kordhiya Dib‑u‑Isticmaalka

Waxaa lagu darayaa/diyaarinayaa (ma tirtirayno kuwa jira, ee si tartiib ah ayaan u raraynaa):

```
src/
  components/
    common/
      badges/
        StatusBadge.jsx
      table/
        TableShell.jsx
        DataTable.jsx           # ikhtiyaari, haddii columns‑config loo baahdo
      forms/
        Input.jsx               # ikhtiyaari mustaqbal
        Select.jsx              # ikhtiyaari mustaqbal
        AsyncSelect.jsx         # ikhtiyaari
      toolbar/
        DataToolbar.jsx         # (wuu jiraa)
        SearchInput.jsx         # (wuu jiraa)
        FilterSelect.jsx        # (wuu jiraa)
        SortControls.jsx        # (wuu jiraa)
      pagination/
        PaginationControls.jsx  # (wuu jiraa)
      feedback/
        Spinner.jsx             # (wuu jiraa)
        EmptyState.jsx          # (wuu jiraa)
        LoadingState.jsx        # (wuu jiraa)
    lookups/
      AcademicYearSelect.jsx
      GradeSelect.jsx
      ShiftSelect.jsx
      GradeSectionSelect.jsx
      SubjectSelect.jsx

  hooks/
    useCascadingFilters.js
    useLookups.js               # cache wrappers (grades/years/shifts)
    useEventBus.js              # ikhtiyaari

  utils/
    events.js                   # constants + emit/on/off helpers
    buildQueryParams.js         # (wuu jiraa)
    print.js                    # ikhtiyaari (counters helpers)
```

Fiiro: “ikhtiyaari” macnaheedu waa in aan qorsheynayno, balse aan ku darno marka loo baahdo.

---

## 3) Qaybaha iyo Hook‑yada La Abuuri Doono (Small Contracts)

Hoos waxaa ku taxan heshiisyada (contracts) gaaban: waxa la gelinayo (props), waxa la soo saarayo, iyo khaladaadka la tixgelinayo. Tani waxay fududeynaysaa in aan si tartiib ah ugu beddelno pages‑ka jira.

### 3.1 StatusBadge.jsx
- Ujeeddo: in lagu muujiyo xaaladda (Active/Inactive/…)
- Props: `status: string`
- Soo saar: `<span className="...">Active</span>` (midab joogto ah)
- Khaladaad: haddii `status` aan la garanayn → qaab “neutral”.
- Meelaha laga adeegsanayo: StudentTable, StudentProfile, Results badges…

### 3.2 ActionButton.jsx
- Ujeeddo: hal qaab oo badhamo ah (icon + qoraal + nooc)
- Props: `variant: 'primary'|'neutral'|'danger'|'info'`, `onClick`, `title?`, `icon?`, `children`
- Soo saar: `<button className="...variant‑styles...">{icon}{children}</button>`
- Khaladaad: `disabled` estado iyo aria‑labels haddii loo baahdo.
- Meelaha laga adeegsanayo: StudentTable (View/Edit/Transfer/Deactivate/Reactivate), Subject/Grade tables.

### 3.3 TableShell.jsx
- Ujeeddo: wrapper ka dhiga miiska mid nadiif ah (paper + zebra + head styles)
- Props: `children`
- Soo saar: `<div className="paper"><table className="...">{children}</table></div>`
- Meelaha laga adeegsanayo: dhammaan miisaska.

### 3.4 DataTable.jsx (ikhtiyaari)
- Ujeeddo: miis ku shaqeeya columns config si loo yareeyo JSX‑ga safafka.
- Props: `columns: Array<{key, header, render?(row)}>, data: any[], keyField: string, emptyState?`
- Soo saar: Head auto + Rows render; haddii `render` la bixiyo, ku isticmaal unuggaas.
- Xaddidaad: beddel weyn; waxa fiican in la qaato ka dib “pilot”.

### 3.5 AcademicYearSelect.jsx, GradeSelect.jsx, ShiftSelect.jsx, GradeSectionSelect.jsx, SubjectSelect.jsx
- Ujeeddo: Select‑yo wadaag ah oo leh loading/empty iyo “disabled cascades”.
- Props guud: `value`, `onChange(v)`, `disabled?`, `className?`
- Gudaha: wac `apiService.js` oo leh caching (sida hadda `getGrades()` iwm).
- Khaladaad: muuqaal “Failed to load” ama dib‑isku day yar haddii loo baahdo.
- Meelaha laga adeegsanayo: Students/Results/Exams/Transcripts toolbars.

### 3.6 useCascadingFilters.js
- Ujeeddo: maamul AY→Grade→Shift→Section state + load sections marka saddexda hore dhammaadaan.
- Inputs: `initial = { academicYearId:'', gradeId:'', shiftId:'', gradeSectionId:'' }`
- Outputs:
  ```js
  {
    academicYearId, setAcademicYearId,
    gradeId, setGradeId,
    shiftId, setShiftId,
    gradeSectionId, setGradeSectionId,
    sections, loadingSections,
    resetLower(level) // tusaale marka AY beddelmo, nadiifi grade/shift/section
  }
  ```
- Khaladaad: nadiifi sectons marka parents is beddelaan; ha orodsiin codsi haddii value‑yo madhan yihiin.

### 3.7 utils/events.js
- Ujeeddo: hal meel oo lagu maamulo dhacdooyinka gudaha FE.
- Exports:
  ```js
  export const EVENTS = {
    SUBJECTS_CHANGED: 'subjects:changed',
    STUDENTS_CHANGED: 'students:changed',
  };
  export function emit(name, detail) { /* window.dispatchEvent */ }
  export function on(name, cb) { /* addEventListener */ }
  export function off(name, cb) { /* removeEventListener */ }
  export function emitSubjectsChanged(detail) { emit(EVENTS.SUBJECTS_CHANGED, detail); }
  ```
- Faa’iido: magacyo mideysan iyo subscribe/unsubscribe fudud.

---

## 4) Jadwal Fulineed (Phased, Isu‑tijaabo)

Qorshahan waa mid tartiib ah oo aan jebinayn code‑ka jira. Marxalad kasta waxay leedahay ujeeddooyin cad iyo “Success Criteria”.

### Marxalad 1 — Joogteynta API iyo Qaybaha Yaryar (Pilot: Students)
- Hawlaha:
  1) `StudentTable.jsx` → jooji `fetch` toos ah; u guur `apiService` (`deactivateStudentApi`, `reactivateStudentApi`).
  2) Abuur `StatusBadge.jsx` + beddel calaamadaha status.
  3) Abuur `ActionButton.jsx`; ku beddel badhamada View/Edit/Transfer/Deactivate/Reactivate.
  4) Abuur `events.js`; u beddel `dispatchEvent` isticmaalka helpers.
- Guul lagu cabbiro: Table‑ka shaqaynaya sidii hore, koodhka badhamada gaaban yahay, API‑ga hal meel laga waco.

### Marxalad 2 — Filters Isku Xiran (Pilot: Results ama Exams)
- Hawlaha:
  1) Abuur `useCascadingFilters.js`.
  2) Abuur `AcademicYearSelect/GradeSelect/ShiftSelect/GradeSectionSelect/SubjectSelect`.
  3) Ku dabaq hal page (tusaale Results) si loo xaqiijiyo UX + performance (debounce/abort haddii loo baahdo).
- Guul: Page‑ka waxa uu isticmaalayaa hook + selects cusub, wax kasta u shaqeeya sidii hore, koodhka page‑ka wuu yaraaday.

### Marxalad 3 — TableShell iyo (ikhtiyaari) DataTable
- Hawlaha:
  1) Abuur `TableShell.jsx`; ku dabaq Students, Grade, Subject miisaska.
  2) (Ikhtiyaari) Abuur `DataTable.jsx` columns‑config oo ku tijaabi hal table si loo arko in abstraction‑ku faa’iido leeyahay.
- Guul: Miisas isku muuqaal; haddii DataTable la qaatay, columns config si fudud u dejisan.

### Marxalad 4 — Print & Nadiifin Magacyo
- Hawlaha:
  1) Ku dar `@page` iyo CSS counters ee `index.css` (ama `print.css`).
  2) Tartiib ugu beddel `class` → `gradeSection` labels gudaha frontend (isu‑waafajin docs/backend). (Kaliya meesha UI cabinaysa.)
- Guul: Daabacaad leh “Page X of Y”, UI magacyo isku mid.

---

## 5) Tallaabooyin Faahfaahsan (Hawl‑qabyo)

Hoos waxaa ku qoran “ka shaqee → hubi → cusbooneysii” qaab qodobaysan:

1) Abuur faylasha cusub (oo madhan marka hore) si la isla arko qaabka:
   - `src/components/common/badges/StatusBadge.jsx`
   - `src/components/common/table/TableShell.jsx`
   - `src/components/common/ActionButton.jsx`
   - `src/utils/events.js`
   - `src/hooks/useCascadingFilters.js`
   - `src/components/lookups/AcademicYearSelect.jsx`, `GradeSelect.jsx`, `ShiftSelect.jsx`, `GradeSectionSelect.jsx`, `SubjectSelect.jsx`

2) Ku dar docs‑daan (faylkan) liis “Done/Next” marka mid kasta la dhammeeyo.

3) Tijaabo kooban: ku dabaq Students → StatusBadge/ActionButton/TableShell + apiService only.

4) Marka la xaqiijiyo, u gudub Results/Exams → useCascadingFilters + Selects.

5) Dib u eegis code (lint/format) + qaabeyn magacyo (tartiib, PR‑yo yaryar) → `gradeSection` naming UI.

---

## 6) Qawaaniinta Joogteynta iyo Tayo‑Hubinta

- Ma beddelayno `package.json` (labada dhinac) — sidaad sheegtay.
- API calls: hal meel (apiService/entityClient). Components ma wici karaan `fetch` si toos ah.
- Props/Contracts: Qayb kasta ha lahaado docs kooban (inputs/outputs/khaladaad/guul). Halkan ayaan ku taxnay bilowga.
- Lint/Build/Tests: Ka hor PR kasta, xaqiiji in build = PASS, lint = PASS. (Marka dambe waxaan ku dari karnaa unit tests yar yar).
- UI Joogteyn: Midab/status badges/selector widths isku mid ah pages‑ka.

---

## 7) Khatarta iyo Ka‑Laabashada (Rollback)

- Waxaan u soconnaa “marxalado yaryar”. Haddii beddel gaar ah keeno dhibaato, si fudud ayaan u laaban karnaa sababtoo ah qaybaha cusub waa reusables aan beddelin logic‑ka core.
- PR‑yo yar yar oo hal bog ah mar kasta → sahal review iyo rollback.

---

## 8) Xusuusin ku saabsan RBAC/Auth (Mustaqbal)

- Marka mashruucu u baahdo multi‑user iyo amni, waxaan bilaabi doonnaa auth dhab ah (JWT + middleware) iyo RBAC. Dukumeenti gaar ah ayaan ka qori doonnaa (maanta ma fulineyno, oo waa ka baxsan qorshaha dib‑u‑habeynta UI/FE).

---

## 9) Gunaanad

Qorshahan waxa uu xoojinayaa dib‑u‑isticmaalka, joogteynta, iyo sahal ka shaqaynta mustaqbalka (features badan). Tallaabadu waa tartiib, hal page mar, iyadoo aan la jebin shaqada hadda. Marka aad ansixiso, waxaan bilaabi karnaa Marxalad 1 (Students) si aan u muujinno qaabka ka hor inta aan u fidin bogagga kale.
