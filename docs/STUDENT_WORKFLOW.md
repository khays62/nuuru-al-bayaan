# Student Workflow (Lifecycle)

Last updated: 25 Jan 2026

Qoraalkan wuxuu sharxayaa socodka ardayga (abuuris → enrollment → transfer/promotion → transcript/results → deactivate/reactivate) iyo sida uu ugu xirmo backend API.

---

## 1) Abuuris (Intake / Registration)

**Frontend:** Students page / Add Student

**Backend:** `POST /api/students`
- Required body (ugu yaraan):
  - `fullName`, `gender`, `dob`, `guardianName`, `contactNumber`, `admissionDate`
  - `gradeSectionId` (GS la doortay)
  - `academicYearId` (AY-ga la doortay)
  - `cohortId` (dufcadda AY-gaas; policy ahaan waa required)

**Waxa server-ku sameeyo:**
- Abuuraa `Student`.
- Abuuraa `Enrollment` (status=`active`) oo xambaarsan: `gradeSection`, `academicYear`, `grade`, `shift`, `cohort`.
- Abuuraa `User` (role=`student`) si ardaygu u login-galo.
  - Username: `studentId`
  - Password: `DEFAULT_INITIAL_PASSWORD` (backend/.env)
  - `mustChangePassword=true` (ardayga waa inuu beddelaa password-ka markii ugu horreysa).

Fiiro:
- `Student.studentId` waxaa lagu sameeyaa qaab cohort-code ah (haddii cohort la bixiyo) si daabacaadda/warbixinta u fududaato.

---

## 2) Xaaladaha Enrollment
- Hal arday wuxuu yeelan karaa enrollments badan (taariikh ahaan), laakiin mar walba waxaa jira “latest enrollment” oo ah kan la tixraaco.
- `Enrollment.status` (muhiim): `active`, `inactive`, `transferred`, `promoted`, `graduated`, `withdrawn`.
- `sequenceInYear` (1 ama 2) wuxuu u kala saaraa mid-year vs after mid-year gudaha isla AcademicYear.

---

## 3) Transfer (Wareejin)

**Frontend:** Transfers page (`/transfers`)

**Backend:**
- `GET /api/transfers/candidates`
- `PATCH /api/transfers/:id` (id = studentId)
- `GET /api/transfers/logs`

Qodobo:
- Same-AY: grade isku mid ah → scores waa la relink-gareeyaa (examType mapping + templateVersion).
- Cross-AY forward: enrollment hore waa la xiraa, cusub ayaa la abuuraa (scores lama wareejiyo AY kala duwan).
- Cross-AY return: kaliya dib loogu noqdaa AY hore ee ardaygu hore u lahaa, waxaana qasab ah in GS-kaas AY-gaas la raaco.

Faahfaahin dheeraad ah: eeg `TRANSFER.md`.

---

## 4) Promotion (Dalacsiin)

**Frontend:** Promotions page (`/promotions`)

**Backend:**
- `GET /api/promotions/preview`
- `POST /api/promotions/execute`

Qodobo:
- Mid-Year: Grade++ isla AY; enrollment hore close → enrollment cusub create.
- Year-End: Grade++ iyo AY++ (AY+1); enrollment hore close → enrollment cusub create.
- Cohort: default preserve (Enrollment.cohort).

Faahfaahin dheeraad ah: eeg `PROMOTION.md`.

---

## 5) Results & Transcript

**Results (class/student views):**
- Exam endpoints (`/api/exams/*`) iyo Results UI (`RESULTS.md`).

**Transcript (multi-year):**
- `GET /api/students/:id/full-transcript` (compat)
- `GET /api/transcripts/students/:id/full-transcript` (new)

Fiiro:
- Transcript-ku wuxuu ku saleysan yahay enrollments (multi-year) + templateVersion inference si scores hore u sii ahaadaan sax.

---

## 6) Deactivate / Reactivate / Password

**Deactivate/Reactivate:**
- `PATCH /api/students/:id/deactivate`
- `PATCH /api/students/:id/reactivate`

**Password:**
- Student self: `PUT /api/students/change-password` (role=student)
- Staff/Admin reset: `PATCH /api/students/:id/reset-password`

---

## 7) RBAC (Kooban)
- Students: kaliya self endpoints (profile/transcript/attendance/timetable) iyadoo scope la ilaalinayo.
- Teachers: roster/timetable/attendance gudaha fasallada ay assigned u yihiin.
- Admin/Staff: maamulka buuxa (CRUD + reports + promotions/transfers).
