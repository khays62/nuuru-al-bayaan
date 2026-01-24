## API‑ga Frontend — Feature‑first (Update)

Dukumeentigan wuxuu sharxayaa qaab‑dhismeedka API‑ga frontend ee hadda (feature‑first), sida loo isticmaalo, iyo sida loo daro endpoints cusub.

Update: Qaabkii hore ee `src/api/modules/*` waa la guuriyey/waa la tiray. Hadda endpoints‑ka badankood waxay ku jiraan `src/features/<feature>/api/*`.

## Erayo muhiim ah (Micno)
- Repo: Mashruuca oo dhan (repository‑ga aad hadda la shaqaynayso).
- Barrel re‑export: Waa fayl (tusaale `src/features/users/api/index.js`) oo ka soo dhoofiya waxyaabo badan, kadibna hal meel ka re‑dhoofiya.
- Exports: Waa waxyaabaha aad ka soo saarto module‑ka adigoo isticmaalaya `export` (tusaale funsiyo sida `export const getSubjects = ...`).
- Thin barrel: Waa “barrel” aad u khafiif ah oo aan lahayn logic, kaliya re‑export; badanaa waxaa loo adeegsadaa in la ilaaliyo "backward compatibility" (imports‑kii hore si ay u sii shaqeeyaan).

## Qaab‑dhismeedka hadda (Feature‑first)
```
src/
   shared/
      api/
         http.js               # apiUrl(), fetchJson(), http client (canonical)
   features/
      lookups/
         api/lookups.js
      subjects/
         api/subjects.js
      exams/
         api/exams.js
      grades/
         api/gradeSections.js
      transfers/
         api/transfers.js
      users/
         api/usersApi.js
         api/index.js          # barrel u gaar ah users (feature‑local)
   api/
      http.js                 # (bridge/compat) haddii faylal hore u tixraacaan
      sessionAbort.js         # session-level abort controller (still used)
      index.js                # (compat barrel) haddii meelaha qaar wali ka import-gareeyaan
```

## Sida loo isticmaalo API‑ga (talo)

- Doorbid: Ka import‑garee feature‑ka uu leeyahay:
   - Tusaale: `import { getSubjects } from '@/features/subjects/api/subjects'`
   - Tusaale: `import { listUsers } from '@/features/users/api/usersApi'`

- Wicitaanada HTTP‑ga waxaa lagu mideeyey `src/shared/api/http.js`:
   - `apiUrl(path)`
   - `fetchJson(pathOrUrl, options)`

## Endpoints / Modules (tusaalooyin)

- Lookups: `src/features/lookups/api/lookups.js`
   - `getGrades()` / `getAcademicYears()` / `getShifts()`

- Subjects: `src/features/subjects/api/subjects.js`
   - `getSubjects()` / `addSubject()` / `updateSubject()` / `deleteSubject()`

- Exams: `src/features/exams/api/exams.js`

- Students: `src/features/students/api/studentsApi.js`

- Grades/Sections: `src/features/grades/api/gradeSections.js`

## Qaabka khaladaadka iyo natiijooyinka
- `fetchJson` marka uu helo HTTP error → wuxuu tuuraa Error(message, status, data). Modules qaar si ula kac ah ayay u soo celiyaan `{ ok: false, error }` halkii ay Error u tuuri lahaayeen, si ay ugu fududaato pages-ka.
- Unified return shapes:
   - listings: `{ data, meta }`
   - actions: `{ ok, status?, data | error }` ama `{ data } | { error }`

## Sida loo daro endpoint cusub (tusaale kooban)
1) Ku dar feature‑ka uu leeyahay: `src/features/<feature>/api/<name>.js`.
2) Qor function‑ka, adigoo isticmaalaya `src/shared/api/http.js`:
    ```js
   import { fetchJson, apiUrl } from '@/shared/api/http';
    export async function listFees(params = {}) {
       const qs = new URLSearchParams(params).toString();
       return await fetchJson(`${apiUrl('/fees')}${qs ? `?${qs}` : ''}`);
    }
    ```
3) (Ikhtiyaar) haddii feature‑ka uu leeyahay barrel: ku dar `src/features/<feature>/api/index.js`.
4) Isticmaal boggaaga/components:
    ```js
   import { listFees } from '@/features/<feature>/api/<name>';
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

## Sidee u joogteynaa DRY + Feature‑first?
- Isticmaal alias‑ka `@` (Vite + jsconfig) si aad uga baxdo relative paths dheer.
- Ku koobo shared UI/logic `src/components/common/*` iyo `src/shared/*`.
- Ka fogow “global barrel” haddii uusan daruuri ahayn; feature‑local exports ayaa ka nadiifsan.

