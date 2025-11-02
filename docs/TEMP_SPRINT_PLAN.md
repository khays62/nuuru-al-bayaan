# Qorshaha Ku-meel-gaarka ah (Sprint Tasks)

Dukumeentigan waa jadwal shaqo ku-meel-gaar ah. Marka aan dhammeystirno, waan tirtiri doonnaa. Waxaa ku qoran waxyaabaha la qurxinayo/la hagaajinayo ee jira — ma aha features cusub oo waaweyn.

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

## 8) Promotions — Apply Doc
- Ujeeddo: Qorshaha `PROMOTION.md` in la dabaqo marka code la diyaariyo.

## 9) Users Logic (Admin/Staff/Teacher/Student)
- Ujeeddo: Define RBAC flows (basic) — placeholder ilaa auth la bilaabo.

## 10) Cohorts (Dufcad) — Graduating Batch Naming (NEW)
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
