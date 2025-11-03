# Qorshaha Ku-meel-gaarka ah (Sprint Tasks)

Dukumeentigan waa jadwal shaqo ku-meel-gaar ah. Marka aan dhammeystirno, waan tirtiri doonnaa. Waxaa ku qoran waxyaabaha la qurxinayo/la hagaajinayo ee jira — ma aha features cusub oo waaweyn.

## NEW (2025-11-01): Enrollment‑Centric Refactor & Workflow — Plan

Ujeeddo: In wax laga beddelo qaabka GradeSection (GS) si uu u noqdo reusable (joogto ah sanado kasta), AY (AcademicYear) iyo Cohort-na looga wareejiyo GS una wareegaan Enrollment, si arday cusub aan loogu qasbin AY/Cohort hore marka ardaydii hore la dalacsiiyo.

### Asbaabta iyo dhibaatada
- Hadda: GS wuxuu xambaarsan yahay AY iyo mararka qaar Cohort → marka ardaydii la dalacsiiyo sanadka xiga, GS‑kii Level 1 (AY: 2024‑2025) weli wuu taagan yahay; arday cusub haddii lagu daro GS‑kaas, wuxuu ku dhacayaa AY‑gii hore (qalad).

### Xalka la ansixinayo (Refactor)
- GS (GradeSection) → Ka saar AY iyo Cohort. GS waxa uu noqdaa qeexida fasalka oo keliya: Grade (Level), Section (A/B/…), Shift (Morning/Evening), Capacity, Subjects[].
- Enrollment → Noqo xudunta xiriirka: Student + GS + AY + Cohort (+ status, sequenceInYear, iwm.).
- Cohort → Si toos ah loogu xiro AY marka la abuuro; ardayga waxa uu Cohort‑ka ku helaa iyada oo loo marayo Enrollment.

### Qiyaaso & shuruudo (Assumptions)
- MongoDB waa nadiif (wax data ah kuma jiraan marka laga reebo lookups: Shift, Grade, ExamType, AY). Collections: GradeSection/Student/Enrollment hore ayaa la nadiifiyey.
- Sidaas daraaddeed, MIGRATION xog adag ma jiro → waxaan toos u qaadaneynaa schemas cusub iyo seeders caadi ah.

### Isbeddelka Model‑lada (Before → After)

#### GradeSection

| Field | Before | After |
|---|---|---|
| grade | required (ref Grade) | unchanged |
| section | required (string) | unchanged |
| shift | required (ref Shift) | unchanged |
| capacity | number | unchanged |
| subjects[] | [ref Subject] | unchanged |
| academicYear | ref AcademicYear (in GS) | REMOVED (→ waxay tagtaa Enrollment) |
| cohort | ref Cohort (in GS) | REMOVED (→ waxay tagtaa Enrollment) |
| unique index | { grade, academicYear, shift, section } | UPDATED → { grade, shift, section } |

#### Enrollment

| Field | Before | After |
|---|---|---|
| student | ref Student | unchanged |
| gradeSection | ref GradeSection | unchanged (laakiin GS waa reusable) |
| academicYear | ref AcademicYear | ensure REQUIRED & indexed |
| cohort | ref Cohort | ensure OPTIONAL/REQUIRED per flow; indexed |
| status | enum (active/inactive/…) | unchanged |
| sequenceInYear | number | unchanged (unique with student+AY) |
| unique index | (student, academicYear, sequenceInYear) | unchanged |

#### Cohort

| Field | Before | After |
|---|---|---|
| name | string (unique per AY) | unchanged |
| academicYear | ref Academic Year | unchanged |
| status/archived | boolean | unchanged |

#### Indexes (summary)
- Drop legacy GS index: { grade, academicYear, shift, section }.
- Add GS unique index: { grade, shift, section }.
- Ensure Enrollment indexes sidii hore (student+AY+sequenceInYear) iyo queries caadiga ah (AY, GS, cohort) → create supporting compound indexes as needed.

### Saameynta API/BE (Checklist)

Models/Schema:
- [ ] Update `models/GradeSection.js`: ka saar `academicYear`, `cohort`; cusbooneysii unique index; xaqiiji refs iyo virtuals haddii jira.
- [ ] `models/Enrollment.js`: xaqiiji `academicYear` REQUIRED; `cohort` indexed; indexes ok.

Controllers/Routes:
- [ ] `gradeSectionController`:
  - Remove/read fields AY/Cohort from create/update payloads.
  - Uniformity check: ha ku xirnayn AY; kaliya Grade+Shift+Section.
  - Listing: haddii aad u baahato filter by AY, waa in lagu saleeyaa Enrollment counts (optional future), laakiin GS liiska laftiisa AY ma laha.
- [ ] `studentController` (Add student):
  - Payload cusub: `{ student, enrollment: { academicYearId, cohortId?, gradeSectionId } }`.
  - Marka la abuuro Student → ku samee Enrollment cusub ee AY hadda socda (iyo Cohort hadda socda) + GS la doortay.
- [ ] `promotionController`:
  - Target GS helid: ku saley grade+shift+section (reusable). Haddii GS‑ka xiga ma jiro → auto‑create (once) la’aan AY.
  - Enrollment cusub marka la promote‑gareeyo: AY cusub + GS cusub; Cohort sida siyaasadda (badanaa isku cohort ama graduation path).
- [ ] `examController`: Saameyn la’aan badan; logic‑ga wuxuu raacaa Enrollment. Hubi queries aysan ku xiranayn GS.AY.
- [ ] `lookupController`/`cohortController`: Saameyn la’aan ballaaran.

Seeds/Utils:
- [ ] `utils/indexMaintenance.js`: ka saar/drop legacy GS indexes; sync new indexes.
- [ ] `seed/…`: wax ka beddel ma yar ee lookups yihiin kuwa jira; GS seed optional (Admin manually creates base GSs).

### Saameynta FE (Checklist)

Pages/Forms:
- [ ] Grade Sections (GS) Page/Form: Ka saar AY/Cohort fields; sii daa Grade, Shift, Section, Capacity, Subjects[]. Filasho: GS mar la abuuro, sanado badan dib‑loo‑isticmaali karo.
- [ ] Student Registration: Ku dar doorashada AY (active) + Cohort (active) + GS (reusable); kadib POST → Student + Enrollment.
- [ ] Promotions Page: To/From GS waa kuwa reusable; auto‑create GS target haddii maqan (grade+shift+section). AY ka yimaada Year‑End mode sida hadda.
- [ ] Results/Transcript: Saameyn muuqata ma leh (waxaa ku xiran Enrollment). Labeling/filters waa in ay adeegsadaan AY/Cohort ka imanaya Enrollment.

API Layer:
- [ ] Update `src/api/modules/gradeSections.js`: payloads cusub ee create/update (la’aan AY/Cohort). List API uma baahna AY filter hadda.
- [ ] Update `src/api/modules/students.js`: endpoint cusub/updated ee add‑student‑with‑enrollment.
- [ ] Cross‑check Promotions/Exams modules; badanaa unchanged.

### Hab‑raaca Shaqo Cusub (Workflow)
1) Setup (hal‑mar): Admin waxa uu abuuraa GS bases: "Level 1‑A‑Morning", "Level 1‑B‑Morning", …; Subjects iyo Grade mapping horey u jiraan.
2) Yearly: Admin waxa uu sameeyaa AY cusub (Promotion year‑end) + Cohort cusub (AY‑gaas); GS lama taabanayo.
3) New Student: Create Student → Create Enrollment with { AY: active, Cohort: active, GS: reusable chosen }.
4) Promotion: From { AY X, GS L1‑A } → To { AY X+1, GS L2‑A } (GS reusable). Enrollment hore close → Enrollment cusub la abuuro.

### Tijaabooyin / QA (Acceptance)
- Add Student (AY=2025‑2026, Cohort="Dufcadda 1aad", GS=L1‑A): Enrollment waxaa ku qoran AY sax ah; Transcript/Results sax.
- Promote isla ardayga Year‑End: Enrollment cusub (AY=2026‑2027, GS=L2‑A); GS L1‑A ma xambaarsana AY; arday cusub 2026‑2027 waxa lagu dari karaa L1‑A iyada oo AY sax ah.
- Delete GS subject with scores → guards weli shaqeeya (BE 409; FE disabled checkbox) — unchanged.
- Indexes: GS duplicate (grade+shift+section) lama oggola; Enrollment uniqueness (student+AY+sequenceInYear) ilaalan.

### Rollout (DB nadiif ah → simple)
1) Merge schemas (BE) → run server → ensure indexes synced.
2) FE updates → forms cusub (GS/Student/Promotion) → manual e2e.
3) Seeds/Lookups: hubi Shift/Grade/ExamType/AY.
4) Smoke tests: add student, promote, exams, transcript/print.

### Jadwal kooban (talo)
- Day 1: BE models/controllers + indexes; minimal tests.
- Day 2: FE forms/pages + API layer; manual tests.
- Day 3: QA fixes + docs update (API.md, PROMOTION.md, COHORTS.md).

### API Impact (quick matrix)

| Endpoint | Change | Note |
|---|---|---|
| POST /api/grade-sections | Remove AY/Cohort fields | Body: { gradeId, shiftId, section, capacity?, subjects[] }
| PUT /api/grade-sections/:id | Remove AY/Cohort fields | Same as create |
| GET /api/grade-sections | AY filter no longer native | Optional future: counts by AY via Enrollment |
| POST /api/students | Accept embedded enrollment | Body includes { enrollment: { academicYearId, cohortId?, gradeSectionId } } |
| POST /api/promotions/execute | Reuse GS by grade/shift/section | Auto‑create if missing; AY moves forward |
| Exams endpoints | No change | Ensure queries use Enrollment, not GS.AY |

## 1) Qurxin Tables (Shared TableShell) — DONE
- Ujeeddo: Hal muuqaal isku mid ah dhammaan miisaska.
- Qodobbo:
  - `border-collapse: collapse` (Tailwind/utility class)
  - Header qurux badan: background color khafiif ah, font-semi-bold, uppercase (ikhtiyaar), sticky top (ikhtiyaar).
  - Rows: zebra alt bg, hover highlight, compact padding.
- Saameyn: Students, Subjects, Grades (GradeSections), Results, Exams, Transcript tables.
- Aqbalid: Miis kasta wuxuu qaataa TableShell; header/bg/hover isku mid; lint ok.

## 2) Qurxin Buttons (Refresh/Print/Actions) — DONE
- Ujeeddo: Variants mideysan: primary/neutral/danger/ghost + icon spacing.
- Qodobbo:
  - Size: sm/md; radius: md; focus ring; disabled state.
  - Icons: `lucide-react`; left icon + text spacing.
- Saameyn: Toolbars (Refresh/Print), row actions.
- Aqbalid: Buttons isku muuqaal bog kasta; keyboard focus muuqda.

## 3) Exam Management — Order & Weighting (Mid-Term → Final) — DONE
- Ujeeddo: Markii grid la soo saaro, ku soo bandhig Mid-Term ka hor Final.
- Farsamo:
  - FE: sort exam types by priority `{ 'Mid-Term': 1, 'Final': 2 }` (fallback A→Z) ka hor render.
  - Weighting: Mid‑Term = 40%, Final = 60% (total 100). Totals/averages ee Results/Transcript waxa lagu xisaabinayaa weights-kan.
    - FE (degdeg): ku dabaq `weightMap = { mid:0.4, final:0.6 }` iyadoo lagu aqoonsanayo exam type by name regex `/mid/i` iyo `/final/i`.
    - BE (ikhtiyaari mustaqbal): `getSummary` iyo `getTranscript` in ay bixiyaan `weightedTotal` si FE u fududaato.
  - Save API kama saameynayo (scores weli 0..100). Weight kaliya wuxuu saameeyaa isku-darka/qiimeynta.
- Aqbalid: Grid/summary waxay soo baxaan Mid‑Term marka hore; Results/Transcript totals waxay adeegsadaan 40/60; sorting/ranking sax ah.

## 4) GradeSection Edit — Guard + UI (Checkbox) after Scores — DONE
- Dhibaato: Hadda waa suurtagal in subject laga deselect gareeyo xitaa marka ExamScores horey loogu diiwaan geliyey GradeSection+Subject.
- Xalka:
  - BE (talo): Endpoint `GET /api/exams/has-scores?gradeSectionId=&subjectId=` (ama bulk) → `{ hasScores: boolean }`.
  - FE: UI ka beddel `select` → `checkbox` list ee Subjects. Marka edit furo → fetch guard map; disable checkbox ama ku dar lock icon/tooltip.
    - Haddii user isku dayo Update iyadoo maado leh scores laga saaray: blok + toast error gaaban: "Maado X dhibco ayaa horey ugu qoran — lama saari karo".
  - Haddii guard maqan yahay BE, fallback FE: isku day Update, BE waa in uu diidaa 409 (si sax ah u ilaalinayo integrity).
- Aqbalid: Subjects ku yimaada checkbox; subject leh scores lama deselect karo; FE toast cad; BE 409 haddii la jabiyo.

## 4.1) GradeSection Edit — Reload Subjects on each open — DONE
- Dhibaato: Subject list hal-mar ayaa load-gareeya; markale furitaanka ma arko kuwa cusub.
- Xalka: On modal open (each time) → re-fetch subjects (skip cache) `getSubjects({ force: true })` ama param disables cache.
- Aqbalid: Fur/fogee/fur → mar walba subject list waa updated.

## 6) Attendance (Tab) — Placeholder (Standalone)
- Ujeeddo: Ku dar plan tab Attendance (marka Teacher logic la diyaariyo). Hadda waxaa kaliya lagu darayaa jadwalka iyo dependencies.
- Dependency: Teacher pages/roles (basic) → Attendance forms/summary.
- Artefacts: Qayb ka mid ah `TEACHER_WORKFLOW.md` + design kooban oo UI.

## 5) Student Profile (Dashboard)
- Ujeeddo: Profile page oo nadiif ah: info card, active enrollment, timeline (transfers/promotions), quick filters.
- Qodobbo: Cards + tabs; print-friendly.
- Aqbalid: Layout consistent; loading/empty states.

## 7) Teacher Logic + Docs
- Ujeeddo: Qeexid endpoints iyo UI flows mustaqbalka (attendance, grading scopes).
- Artefacts: `docs/TEACHER_WORKFLOW.md` update.

## 8) Promotions — Apply Doc — DONE BUT STILL REFACTORING
- Ujeeddo: Qorshaha `PROMOTION.md` in la dabaqo marka code la diyaariyo.

## 9) Users Logic (Admin/Staff/Teacher/Student)
- Ujeeddo: Define RBAC flows (basic) — placeholder ilaa auth la bilaabo.

## 10) Cohorts (Dufcad) — Graduating Batch Naming — DONE BUT STILL REFACTORING
- Ujeeddo: In dugsi walba uu leeyahay "dufcad" (cohort/batch) magac gaar ah oo la raaciyo sanad/waqti; marka ardaydu qalin‑jabiso, dufcaddii ay ka mid ahaayeen ayaan ku lifaaqeynaa natiijooyinka/daabacaadda/warbixinnada.
- Farsamo (Model + BE):
  - Model: `Cohort` { _id, name (unique per academicYear), slug, academicYear (ref), notes?, createdAt }
  - Unique index: `{ academicYear: 1, name: 1 }` (prevent duplicates gudaha AY)
  - Links: `Student` → optional `cohortId` (marka uu qalin‑jabiyo ama marka la qoondeeyo); ama `TransferLog/Promotion` dhacdada qalinjabin ku lifaaq cohortId
  - Endpoints: CRUD `/api/cohorts` + lookup by AY; guard delete if referenced by students/transcripts
  - Display: API `getTranscript` iyo `getSummary` in ay soo celiyaan `cohort` haddii la heli karo
- FE (UI):
  - Settings → "Cohorts" page: list/add/edit per Academic Year
  - Promotion/Graduation flow: dooro Cohort marka la sameynayo graduation (ama auto‑suggest by AY)
  - Transcript/Results print headers: ku muuji "Cohort: X" haddii lagu lifaaqay
- Aqbalid:
  - Cohort name waa unique per Academic Year
  - Delete waa la diidaa haddii ay jiraan Students/Transcripts u xiran
  - Transcript/Results waxay muujiyaan cohort marka uu jiro
  - CSV/Exports waxay ka muuqataa cohort

---

## Jadwal kooban (talo)

Status (2025-10-22 — Updated):
- DONE: (1 — Tables, 2 — Buttons, 3 — Exam Order & 40/60 Weighting, 4 — Guard UI, 4.1 — Reload Subjects)
- Completed lately: Print polish (header/footer, pagination) for Transcripts/Results; toolbars responsive; Results table aligned with Transcript.

Prioritization (Next Waves):
1) Cohorts (Dufcad) — Graduating Batch Naming (NEW)
  - Muhiim u ah warbixinada qalin‑jabinta, print/exports, iyo raad‑raac sanado.
2) Student Profile (Dashboard)
  - UX muhiim ah; xambaarsan timeline + quick actions.
3) Promotions — Apply Doc (and minimal wiring)
  - La xiriira Cohort; suurto‑galinaya graduation flow sax ah.
4) Attendance (Tab) — Plan/placeholder (standalone)
  - U baahan Teacher role; qorshe iyo scaffolding hore.
5) Teacher Logic + Docs
6) Users Logic (RBAC baseline)

## Qodobo Farsamo (Notes)
- FE API: isticmaal `src/api/index.js` barrel.
- Lint: ESLint 9; hubi warnings hooks.
- Styling: Tailwind v4; ka fogow classes duplicate; isticmaal components shared.
- Docs: link garee isbeddel kasta ee UI/BE haddii la sameeyo.
