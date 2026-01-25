# Dufcad (Cohorts) — Kooban

La cusboonaysiiyay: 22 Oct 2025

---

## Dulmar
- Dufcad = magac kooxeed (batch) loo wado ardayda inta ay ka socdaan heerarka dugsiga.
- Dufcad waxaa lagu keydiyaa Enrollment-ka ardayga (cohortId). Waxaa loo adeegsadaa filter/warbixin iyo studentId generation.
- Dufcad waa la abuuri karaa wakhti kasta (bilow, mid-year, final-year) iyadoo ku xiran siyaasadda maamulka.

---

## Sida ay u shaqeyso
- Assignment: cohort-ka waxaa la siiyaa marka Enrollment la abuuro (POST /api/students), waxaana hadda ku jira policy ah in cohortId uu REQUIRED yahay.
- Promotion: cohort badanaa wuu raacaa Enrollment-ka cusub (default: preserve), iyadoo policy-ga promotion logic uu go'aaminayo.
- Transfer: cross-AY transfer wuxuu copy-gareeyaa cohort-ka enrollment-kii hadda (si dufcadda u sii socoto) haddii policy-gaas la doorto.
- Admin Update: Resync-cohort ee GradeSection hadda ma qaado cohort (GS cohort ma jiro); action-ku wuxuu u dejinayaa `Enrollment.cohort = null` ee active enrollments ee GS-kaas (haddii loo baahdo in “nadiifin” la sameeyo).
- Graduation: marka terminal grade (tusaale Level 10) la gaaro year-end → Student.status=Graduated; TransferLog(type='GRADUATION', cohortId).

### Cohort + GS badan (Sections/Shifts)
- Hal cohort (tusaale “Dufcada 1aad”) waxaa lagu xiri karaa GS-yo badan oo isla Grade iyo isla AY ah (A/B sections, Morning/Evening shifts). Taasi waa intake-kaas oo dhan.
- Dufcad cusub (tusaale “Dufcada 2aad”) ee intake dambe → abuuro GS-yada Level 1 per Section/Shift oo la xiriya magaca cusub; dufcadihii hore ma saameyneyso.
- Cohort naming: ku talin unique(name[, startAcademicYear]) + seq haddii loo baahdo; magac isku mid ah ha ka dhigin laba intake oo kala duwan.

---

## Model kooban
- Cohort: { name, status, (ikhtiyaar: startAcademicYear, seq, notes) }
- GradeSection: { gradeId, section, shift, subjects[], capacity? }
- Enrollment: { studentId?, gradeSectionId, academicYearId, gradeId, shiftId, cohortId, sequenceInYear(1|2), status, joinedAt, leftAt }
	- Unique: (student, academicYear, sequenceInYear)
- Student: { studentId, status }

Index talo: unique(name[, startAcademicYear]) iyo filter(status).

---

## Auto-provision (Ikhtiyaari)
- Haddii target GS uusan jirin xilliga promotion-ka → server-ku wuu abuuri karaa (policy ON) isagoo ilaalinaya Section/Shift/Cohort, AY (mid-year=AY, year-end=AY+1) iyo subjects-ka oo laga qaato curriculum-ka Grade target.

---

## Denormalization & Sync
- Source of truth: `Enrollment.cohort`.
- `Enrollment.cohort` waxa la dhigaa marka enrollment la abuuro (students create/enroll flows), ama marka promotion/transfer uu sameeyo enrollment cusub.
- Resync endpoint-ka GS wuxuu u adeegaa kaliya nadiifin: `POST /api/grades/sections/:id/resync-cohort` → set `Enrollment.cohort = null` (active) ee GS-kaas.

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
	- Guard: 409 if referenced by any Enrollment
- GET /api/grades/sections?grade=&shift=&section=
	- GradeSection list (AY-agnostic)
- POST /api/grades/sections/:id/resync-cohort
	- Action: Updates active enrollments of this GS → set enrollment.cohort = null
- GET /api/enrollments?cohort=&status=&page=&limit=
	- For listings and reports.

## UI faahfaahin (Frontend)
- Cohorts Management Page (pages/CohortsPage.jsx)
	- Toolbar: search (q), status filter (active/archived), add cohort.
	- Table: Name, Status, Start AY?, CreatedAt, Actions (edit, archive, delete if safe).
	- Modal (Create/Edit): name (required), start AY (optional), status, notes.
- GradeSection Form (existing):
	- GS cohort uma laha (AY/Cohort waxay ku jiraan Enrollment).
	- Sidaa darteed cohort selection waxa ay ka dhacdaa Student Registration / Promotion (Enrollment).
- Student List/Profile:
	- Show current cohort chip from active Enrollment.cohort; filter by cohort in list view.
- Promotion Dialog:
	- Show “Cohort (preserved)” and target GS preview; if missing GS, show auto-create (subjects ka imanaya Grade curriculum).

## Edge kooban
- CURRICULUM_MISSING_FOR_GRADE: curriculum ee Grade target ma dhamma.
- Delete guard: cohort lama tirtiri karo haddii enrollments ay ku xiran yihiin.

---

## Guul (Success)
- Promotion preserve Cohort; Transfer default preserve Cohort.
- Graduation qabsanaysa cohort sax ah (Enrollment-ka ugu dambeeyay) oo leh log.
- Auto-provision waxay ka ilaalisaa target-missing iyadoo ixtiraameysa xeerarka.

