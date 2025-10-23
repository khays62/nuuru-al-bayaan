# Dufcad (Cohorts) — Kooban

La cusboonaysiiyay: 22 Oct 2025

---

## Dulmar
- Dufcad = magac kooxeed (batch) loo wado ardayda inta ay ka socdaan heerarka dugsiga.
- Dufcad waxaa lagu xiriyaa GradeSection (GS); ardayga ku jira GS wuu qaataa cohort-kaas.
- Dufcad waa la abuuri karaa wakhti kasta (bilow, mid-year, final-year) iyadoo ku xiran siyaasadda maamulka.

---

## Sida ay u shaqeyso
- Assignment: GS → cohortId (source of truth); Enrollment → cohortId (denormalized) si filter/warbixin u sahlanaato.
- Promotion: cohort ISMA beddelo; target GS waa inuu la mid noqdaa cohort-ka student-ka (ama cohort-less) — eeg PROMOTION.md.
- Transfer: ardaygu wuxuu qaadanayaa cohort-ka target GS (overwrite).
- Admin Update: Haddii cohortId laga beddelo GS oo arday active jiraan → samee resync si `Enrollment.cohort` loogu waafajiyo cohort-ka GS.
- Graduation: marka terminal grade (tusaale Level 10) la gaaro year-end → Student.status=Graduated; TransferLog(type='GRADUATION', cohortId).

### Cohort + GS badan (Sections/Shifts)
- Hal cohort (tusaale “Dufcada 1aad”) waxaa lagu xiri karaa GS-yo badan oo isla Grade iyo isla AY ah (A/B sections, Morning/Evening shifts). Taasi waa intake-kaas oo dhan.
- Dufcad cusub (tusaale “Dufcada 2aad”) ee intake dambe → abuuro GS-yada Level 1 per Section/Shift oo la xiriya magaca cusub; dufcadihii hore ma saameyneyso.
- Cohort naming: ku talin unique(name[, startAcademicYear]) + seq haddii loo baahdo; magac isku mid ah ha ka dhigin laba intake oo kala duwan.

---

## Model kooban
- Cohort: { name, status, (ikhtiyaar: startAcademicYear, seq, notes) }
- GradeSection: { gradeId, section, academicYear, shift, subjects[], capacity, cohortId? }
- Enrollment: { studentId, gradeSectionId, academicYearId, gradeId, shiftId, cohortId?, sequenceInYear(1|2), status, joinedAt, leftAt }
	- Unique composite index lagu taliyay: (academicYear, shiftId, gradeId, section) si looga hortago GS badan oo isku mid ah.
- Student: { cohortId?, status }

Index talo: unique(name[, startAcademicYear]) iyo filter(status).

---

## Auto-provision (Ikhtiyaari)
- Haddii target GS uusan jirin xilliga promotion-ka → server-ku wuu abuuri karaa (policy ON) isagoo ilaalinaya Section/Shift/Cohort, AY (mid-year=AY, year-end=AY+1) iyo subjects-ka oo laga qaato curriculum-ka Grade target.

---

## Denormalization & Sync
- Source of truth: `GradeSection.cohort`.
- `Enrollment.cohort`: waxa lagu dhigaa markasta oo enrollment la abuuro ama la wareejiyo (promotion/transfer) iyadoo laga nuugayo `gradeSection.cohort`.
- Haddii `GradeSection.cohort` isbeddelo, samee “resync” batch: update all active enrollments of that GS → set `enrollment.cohort = gs.cohort`.
- Note: resync ma aha transfer; waxay kaliya hagaajinaysaa calaamadda cohort si warbixinaha u saxnaadaan.

---

## API iyo UI kooban
## API faahfaahin (Server)
- GET /api/cohorts?q=&status=&page=&limit=
	- Returns: { items: [{ _id, name, status, startAcademicYear?, createdAt }], page, total }
- POST /api/cohorts
	- Body: { name: string, startAcademicYear?: ObjectId, status?: 'active'|'archived', notes?: string }
	- 201: { _id, name, status, startAcademicYear?, notes }
- PUT /api/cohorts/:id
	- Body: { name?, startAcademicYear?, status?, notes? }
	- 200: updated doc
- DELETE /api/cohorts/:id
	- Guard: 409 if referenced by any GradeSection/Enrollment
- GET /api/grade-sections?ay=&grade=&shift=&section=&cohort=
	- Includes cohort in payload; unique guard on (ay,shift,grade,section)
- POST /api/grade-sections/:id/resync-cohort
	- Action: Updates active enrollments of this GS → set enrollment.cohort = gs.cohort
- GET /api/enrollments?cohort=&status=&page=&limit=
	- For listings and reports.

## UI faahfaahin (Frontend)
- Cohorts Management Page (pages/CohortsPage.jsx)
	- Toolbar: search (q), status filter (active/archived), add cohort.
	- Table: Name, Status, Start AY?, CreatedAt, Actions (edit, archive, delete if safe).
	- Modal (Create/Edit): name (required), start AY (optional), status, notes.
- GradeSection Form (existing):
	- Add Cohort selector (searchable dropdown fed from GET /api/cohorts?status=active).
	- On save, GS stores cohort; server guard ensures uniqueness of GS identity.
- Student List/Profile:
	- Show current cohort chip from active Enrollment.cohort; filter by cohort in list view.
- Promotion Dialog:
	- Show “Cohort (preserved)” and target GS preview; show warning if mismatch; if missing GS, show auto-create with preserved cohort.

## Edge kooban
- COHORT_MISMATCH_TARGET (promotion): target GS cohort ka duwan.
- COHORT_TARGET_MISSING: lama helin GS isla cohort (haddii auto-provision OFF/FAIL).
- CURRICULUM_MISSING_FOR_GRADE: curriculum ee Grade target ma dhamma.
- Delete guard: cohort lama tirtiri karo haddii students/GS ay ku xiran yihiin.

---

## Guul (Success)
- Promotion preserve Cohort; Transfer overwrite Cohort sida GS.
- Graduation qabsanaysa cohort sax ah (GS-kii ugu dambeeyay) oo leh log.
- Auto-provision waxay ka ilaalisaa target-missing iyadoo ixtiraameysa xeerarka.

