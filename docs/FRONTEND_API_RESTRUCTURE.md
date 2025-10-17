## API‑ga Frontend — Sida uu hadda u shaqeeyo

Dukumeentigan wuxuu sharxayaa qaab‑dhismeedka hadda ee API‑ga frontend, sida loo isticmaalo, iyo sida loo daro endpoints cusub. Waxa uu beddelay kii hore ee qorshaha guuritaanka.

## Erayo muhiim ah (Micno)
- Repo: Mashruuca oo dhan (repository‑ga aad hadda la shaqaynayso).
- Barrel re‑export: Waa fayl (tusaale `src/api/index.js`) oo ka soo dhoofiya (import) waxyaabo badan meelo kala duwan, kadibna hal meel ka re‑dhoofiya (export). Faa’iido: hal path oo keliya ayaad ka import‑gareyn kartaa.
- Exports: Waa waxyaabaha aad ka soo saarto module‑ka adigoo isticmaalaya `export` (tusaale funsiyo sida `export const getSubjects = ...`).
- Thin barrel: Waa “barrel” aad u khafiif ah oo aan lahayn logic, kaliya re‑export; badanaa waxaa loo adeegsadaa in la ilaaliyo "backward compatibility" (imports‑kii hore si ay u sii shaqeeyaan).

## Qaab‑dhismeedka hadda
```
src/
  api/
    http.js                 # API_BASE_URL, apiUrl(), fetchJson()
    modules/
      subjects.js           # getSubjects, addSubject, updateSubject, deleteSubject
      exams.js              # getExamTypes, getExamGrid, saveExamScore, getExamSummary, getExamSummaryAbort
      students.js           # list/create/update/deactivate/reactivate/transfer/profile/history/transcript
      gradeSections.js      # list/create/update/delete/getById
      lookups.js            # getGrades/years/shifts (+cache)
   index.js                # Barrel: re‑export modules/* hal meel
   apiService.js           # (la tirtiiray) hore wuxuu ahaa thin barrel; hadda ma jiro
```

## Sida loo isticmaalo API‑ga

- Imports hal meel ka keen: `src/api/index.js` (barrel)
   - Tusaale: `import { getSubjects, getGrades } from '../api'`
- Dhammaan wicitaanada API waxay maraan helper‑ka `src/api/http.js`:
   - `apiUrl(path)`: dhisa URL sax ah (`VITE_API_BASE_URL` + path)
   - `fetchJson(urlAmaPath, options)`: sameeya fetch + JSON parsing + error handling

## Modules la heli karo

- `modules/lookups.js`
   - `getGrades(options)` (cache)
   - `getAcademicYears()` (cache)
   - `getShifts()` (cache)

- `modules/subjects.js`
   - `getSubjects(params)` → { data, meta }
   - `addSubject(payload)` → { data } | { error, field }
   - `updateSubject(id, payload)` → { data } | { error, field }
   - `deleteSubject(id)` → { data } | { error, details }

- `modules/exams.js`
   - `getExamTypes()` → Array
   - `getExamGrid({ academicYearId, gradeSectionId, subjectId })` → { ok, data | error }
   - `saveExamScore({ studentId, examId, subjectId, scoreObtained })` → { ok, status, data }
   - `getExamSummary(params)` → { ok, data | error }
   - `getExamSummaryAbort(params, { signal })` → { ok, data | error }
   - `getStudentTranscript(params)` → { ok, data | error }

- `modules/students.js`
   - `listStudents(params)` → { data, meta }
   - `createStudent(payload)` → { ok, status, data }
   - `updateStudent(id, payload)` → { ok, status, data }
   - `deactivateStudentApi(id)` / `reactivateStudentApi(id)` → { ok, status, data }
   - `transferEnrollmentApi(id, payload)` → { ok, status, data }
   - `getStudentProfile(id)` → object | null
   - `getStudentHistory(id, params)` → { data, meta }
   - `getFullTranscript(id)` → { ok, data | error }
   - `getStudentTransfers(id, params)` → { data, meta }

- `modules/gradeSections.js`
   - `listGradeSections(params)` → { data, meta }
   - `createGradeSection(payload)` → { ok, data | error }
   - `updateGradeSection(id, payload)` → { ok, data | error, blocked? }
   - `deleteGradeSection(id)` → { ok, data | error }
   - `getGradeSectionById(id)` → { ok, data | error }

## Qaabka khaladaadka iyo natiijooyinka
- `fetchJson` marka uu helo HTTP error → wuxuu tuuraa Error(message, status, data). Modules qaar si ula kac ah ayay u soo celiyaan `{ ok: false, error }` halkii ay Error u tuuri lahaayeen, si ay ugu fududaato pages-ka.
- Unified return shapes:
   - listings: `{ data, meta }`
   - actions: `{ ok, status?, data | error }` ama `{ data } | { error }`

## Sida loo daro endpoint cusub (tusaale kooban)
1) Abuur ama furo module ku habboon `src/api/modules/` (tusaale `fees.js`).
2) Qor function-ka:
    ```js
    import { fetchJson, apiUrl } from '../http';
    export async function listFees(params = {}) {
       const qs = new URLSearchParams(params).toString();
       return await fetchJson(`${apiUrl('/fees')}${qs ? `?${qs}` : ''}`);
    }
    ```
3) Ku dar barrel-ka `src/api/index.js`:
    ```js
    export * from './modules/fees.js';
    ```
4) Isticmaal boggaaga/components:
    ```js
    import { listFees } from '../api';
    ```

## Xusuusin
- `VITE_API_BASE_URL` (frontend) ma aha sir; waxa ay kaliya tilmaamaysaa halka backend laga heli karo.
- Sirta dhabta ah (database URIs, tokens, secrets) wuxuu ku jiraa backend `.env` oo kaliya—waligiis ha ku darin frontend `.env*`.

## Xusuusin / Talooyin
- Ha beddelin signatures iyo return shapes inta la guurayo.
- Ilaali caching‑ka lookups‑ka (grades/years/shifts) marka loo wareejinayo `lookups.js`.
- Ku hay qaabka error‑ka mid ah (`{ ok, data, error }` iwm) si joogto ah.
- Doorbid PR‑yo yaryar: module‑ka mid kasta mar.

## Su’aalo & Jawaabo kooban
- Maxay faa’iido u leedahay kala‑jabka modules?
  - Nadiif, dayactir fudud, is‑xirnaan hoose (low coupling), kooxda waxay si toos ah u helaan file‑ka saxda ah.
- Maxaa loo sii hayaa `apiService.js` (thin barrel) halkii aan isla markiiba u tirtiri lahayn?
  - Si aan u ilaalino imports‑ka jira (backward compatibility). Kadib marka pages‑ku u wareegaan `../api`, waan tirtiri karnaa.
- entityClient.js maxaa ka dhacay?
  - Waxaa la tirtiray (lama isticmaalin, si aan u yareyno is‑dhexyaac). Haddii mustaqbal loo baahdo, waxaa wanaagsan in uu la jaanqaado `http.js` halkii uu ka yeelan lahaa config u gaar ah.

## Sidee hadda u bilaabi karnaa?
- Talo: ku bilow Talaabada 1 iyo 2 ee `http.js` + `lookups.js`. Markaas tijaabi bogagga isticmaalaya lookups (filters), kadib sii wad modules kale.

