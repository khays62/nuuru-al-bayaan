# Wareejinta Ardayga (Student Transfer)

Hagitaan nadiif ah oo ku saabsan Transfer: xeerar, API-yada jira, socodka (step-by-step), relinking scores, audit, iyo UI.

Last updated: 27 Nov 2025

---

## 1) Dulmar Kooban
- Transfer: U wareejin arday fasal/section kale. Ma aha Promotion.
- Same-AY: Waxaa la oggol yahay; haddii Grade isku mid yahay → scores waa la relink-gareeyaa (examType mapping). Haddii Grade kala duwan → scores lama relink-gareeyo.
- Cross-AY (forward): Waxaa la oggol yahay in AY loo boodboodo mustaqbalka; enrollment-kii hore waa la xiraa, cusub ayaa la abuurayaa; scores lama wareejinayo AY kala duwan dhexdeeda.
- Cross-AY (return): Kaliya waxaa loo oggol yahay Return (dib ugu noqosho) AY hore ee horey u jiray, waxaana qasab ah in la raaco GS kii asalka ahaa (Grade/Shift/Section kuwaas oo la mid ah kii hore).
- Shuruud: Enrollment-kii ugu dambeeyay waa inuu yahay status=active (ama si manual ah loo “unlock” gareeyo). Haddii inactive → transfer lama oggola.
- Capacity: Haddii target section capacity uu buuxo → waa la diidayaa.
- Audit: TransferLog la sameeyaa; “Returned” waxaa lagu muujinayaa marka falka cusub uu yahay dib-u-noqosho (revert detection + reverted flags).

---

## 2) Socodka (Server) – Step by Step
Endpoint cusub: PATCH /api/transfers/:id

Input body:
- gradeSectionId (waajib)
- academicYearId | academicYear | targetAcademicYear | yearName (ikhtiyaari; cross-AY marka la doonayo)
- enrollmentId (ikhtiyaari; haddii aan la bixin waxaa la qaataa kii ugu dambeeyay)
- reason (ikhtiyaari)

Tallaabooyinka:
1. Xaqiiji IDs: studentId iyo gradeSectionId sax ma yihiin?
2. Soo hel target GradeSection + populate (grade, shift). Haddii la waayo → 404.
3. Haddii target.capacity > 0 → tirso active enrollments ee halkaas; buuxo? → 409.
4. Dooro enrollment: explicit enrollmentId ama kii ugu dambeeyay ee ardayga.
5. Xeer: enrollment.status waa inuu yahay 'active' → haddii kale 400.
6. Haddii academicYearId la bixiyay oo ka duwan midka enrollment-ka hadda:
  - Haddii AY cusub < AY hadda → Return: waxay u baahan tahay in enrollment hore u jiro AY-gaas isla GS-kii asalka ahaa; haddii kale → diidmo.
  - Haddii AY cusub > AY hadda → Forward: xaqiiji in uusan jirin enrollment hore AY-gaas; xiro enrollment hadda, abuur enrollment cusub (scores lama wareejiyo cross-AY).
7. Haddii academicYear aan la bixin (Same-AY transfer):
  - Haddii isla section la doortay → no-op response (wax isbeddel ah ma jiro).
  - Update enrollment: gradeSection, grade, shift → keydi.
8. Scores relink (kaliya haddii AY + Grade isku mid yihiin):
  - EnsureExams: abuuri exams per examType (templateVersion active/default) ee target haddii aysan jirin.
   - Hel exams-ka source vs target (isla AY, sections kala duwan) → map by examType → ExamScore.updateMany: exam:sourceExam → exam:targetExam.
9. Audit: TransferLog.create(). Haddii A→B hore u jirto oo hadda B→A la sameeyay → log cusub wuxuu helaa revertOf, labadana reverted=true.
10. Response: { message, enrollment, transferLog }.

---

## 3) API Reference (Updated)
- GET /api/transfers/candidates
  - Lists Active students oo leh ACTIVE latest enrollment; supports filters: academicYear, grade, shift, gradeSectionId, search, sort, pagination.
- PATCH /api/transfers/:id
  - Performs transfer (Same-AY or Cross-AY). Requires latest enrollment.status='active'. Honors capacity and policies.
- GET /api/transfers/logs
  - Global audit logs (paginated) with student and from/to GS labels.
- GET /api/students/:id/transfers | /latest-transfer | /full-transcript
  - Student-focused views oo weli jira (timeline/badges/transcript). Lama isticmaalayo in la sameeyo transfer.
- PATCH /api/students/:id/enrollment/active  body: { active: boolean }
  - Manual unlock/lock ee enrollment-ka ugu dambeeya (non-terminal states oo keliya).
- PATCH /api/students/:id/deactivate | /reactivate
  - Deactivate: Student.status=Inactive + auto set latest enrollment to 'inactive' (soft lock).
  - Reactivate: Student.status=Active + auto set latest enrollment 'inactive' → 'active'.

---

## 4) Frontend (Page & Indicators)
- TransfersPage (`/transfers`):
  - Toolbar filters (AY/Grade/Shift/Section/Search) + Gating (waxba lama soo rogo ilaa core filters la maro).
  - Candidates table: shows current AY/Grade/Section/Shift per student + per-row Transfer button.
  - Transfer modal: opens instantly; shows Spinner while loading latest enrollment; disables fields until ready.
  - All Transfers table: global logs (paginated + search) hoos ka muuqda.
- StudentPage: Kama jiro Transfer action; isticmaal TransfersPage.
- Profile/Timeline: Weli waxa jira badges iyo timeline oo adeegsanaya GET `/students/:id/transfers` iyo `/latest-transfer`.

---

## 5) Xeerarka Muhiimka ah (Recap)
- Hal enrollment “current” per student per AY.
- Same-AY: Relink scores kaliya marka Grade isku mid tahay; haddii isla section → no-op.
- Cross-AY: Forward allowed (scores lama wareejiyo); Return allowed oo keliya AY hore + GS asalka ah.
- Enrollment waa inuu yahay 'active' marka la transfer-gareynayo. Haddii 'inactive' → 400.
- Capacity waxa la tixgeliyaa haddii la dejiyay.

---

## 6) Data Models (Quick Snapshot)
- Enrollment: { student, gradeSection, academicYear, grade, shift, cohort?, sequenceInYear, status: 'active'|'inactive'|'transferred'|'promoted'|'graduated'|'withdrawn', joinedAt, leftAt }
- TransferLog: { student, fromGradeSection, toGradeSection?, byUser?, date, reason?, notes?, reverted, revertOf? }
- Exam/ExamType/ExamScore: relink waxay ku saleysan tahay examType mapping ee isla AY.

Populate guard: `byUser` la populate-gareeyo oo keliya haddii `mongoose.models.User` jiro (si looga fogaado MissingSchemaError).

---

## 7) Edge Cases
- Same section → no-op response.
- Target missing → 404.
- No active enrollment → 400.
- Capacity full (if configured) → 409.
- Enrollment inactive (due to deactivation) → 400 (unlock/activate first).
- Missing User model → logs wali soo laabanayaan (iyadoo aan byUser la populate-gareyn).

---

## 8) Admin Controls (Unlock/Lock & De/Activate)
- Auto-Lock: Deactivate student → latest enrollment: active → inactive (soft lock).
- Auto-Unlock: Reactivate student → latest enrollment: inactive → active.
- Manual: PATCH /students/:id/enrollment/active { active: true|false } (non-terminal states oo keliya).

---

## 9) Testing Checklist (Updated)
- Backend:
  - Same-AY transfer to different section (same grade → relink; different grade → no relink).
  - Capacity full prevention.
  - No active enrollment / inactive enrollment → 400.
  - Same section → no-op.
  - Revert pair → revertOf set; both logs.reverted=true.
  - Populate guard works when User model missing.
- Frontend:
  - TransfersPage: candidates are gated; modal shows Spinner; actions refresh tables.
  - All Transfers table paginates and searches by name/ID.
  - Profile badges/timeline render; “Returned” wording only on the revert log.

---

## 10) Mustaqbal (Future Work)
- Batch transfers endpoint.
- “Correction” light flow (no audit log) – haddii loo baahdo policy ahaan.

