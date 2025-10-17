# Wareejinta Ardayga (Student Transfer)

Hagitaan nadiif ah oo ku saabsan Transfer: xeerar, API-yada jira, socodka (step-by-step), relinking scores, audit, iyo FE indicators.

Last updated: 15 Oct 2025

---

## 1) Dulmar Kooban
- Transfer: U wareejin arday fasal/section kale isla sanadka waxbarashada (Academic Year) gudihiisa. Promotion ma aha.
- Xaddidaad muhiim ah: Transfer-ka hadda waxa la oggol yahay oo keliya SAME Academic Year. Cross-AY → Future Work.
- Shuruud: Enrollment-kii ugu dambeeyay waa inuu yahay status=active (ama si manual ah loo “unlock” gareeyo). Haddii inactive → transfer lama oggola.
- Capacity: Haddii target section capacity uu buuxo → waa la diidayaa.
- Scores: Haddii AY + Grade isku mid yihiin → ExamScore waxa la relink-gareeyaa via examType mapping (EnsureExams → exams per type in target). Haddii Grade kala duwan → scores lama relink-gareeyo.
- Audit: TransferLog la sameeyaa; “Returned” waxaa lagu muujinayaa marka falka cusub uu yahay dib-u-noqosho (revertOf).

---

## 2) Socodka (Server) – Step by Step
Endpoint: PATCH /api/students/:id/enrollment/transfer

Input body:
- gradeSectionId (waajib)
- enrollmentId (ikhtiyaari; haddii aan la bixin waxaa la qaataa kii ugu dambeeyay)
- reason (ikhtiyaari)

Tallaabooyinka:
1. Xaqiiji IDs: studentId iyo gradeSectionId sax ma yihiin?
2. Soo hel target GradeSection + populate (academicYear, grade, shift). Haddii la waayo → 404.
3. Haddii target.capacity > 0 → tirso active enrollments ee halkaas; buuxo? → 409.
4. Dooro enrollment: explicit enrollmentId ama kii ugu dambeeyay ee ardayga.
5. Xeer: enrollment.status waa inuu yahay 'active' → haddii kale 400.
6. Xeer: AcademicYear isku mid ma yihiin? → haddii kale 400 (Cross-AY not supported now).
7. Haddii isla section la doortay → no-op response (wax isbeddel ah ma jiro).
8. Update enrollment: gradeSection, grade, shift → keydi.
9. Scores relink (haddii AY + Grade isku mid yihiin):
   - EnsureExams: abuuri exams per examType ee target haddii aysan jirin.
   - Hel exams-ka source vs target (isla AY, sections kala duwan) → map by examType → ExamScore.updateMany: exam:sourceExam → exam:targetExam.
10. Audit: TransferLog.create(). Haddii A→B hore u jirto oo hadda B→A la sameeyay → log cusub wuxuu helaa revertOf, labadana reverted=true.
11. Response: { message, enrollment, transferLog }.

---

## 3) API Reference (Jira)
- PATCH /api/students/:id/enrollment/transfer
  - Same-AY only; requires enrollment.status=active; capacity check; exam relink if same Grade.
- GET /api/students/:id/transfers
  - Audit logs (paginated). `byUser` populate waxaa kaliya la sameeyaa haddii User model la diiwaan galiyay.
- GET /api/students/:id/latest-transfer
  - Hal log oo ugu dambeeya; optimized for badge.
- GET /api/students/:id/full-transcript
  - Transcript per enrollment + transfers + summary. Relinked scores waxay ka muuqdaan halka ay tagaan.
- PATCH /api/students/:id/enrollment/active  body: { active: boolean }
  - Manual unlock/lock ee enrollment-ka ugu dambeeya (non-terminal states oo keliya).
- PATCH /api/students/:id/deactivate | /reactivate
  - Deactivate: Student.status=Inactive + auto set latest enrollment to 'inactive' (soft lock).
  - Reactivate: Student.status=Active + auto set latest enrollment 'inactive' → 'active'.

---

## 4) Frontend Indicators (Badges & Timeline)
- TransferBadge (latest):
  - If log.reverted || log.revertOf → “Returned from {fromSection}” (green/emerald).
  - Else → “Transferred from {fromSection}” (amber).
- TransferTimeline: dhammaan logs; FE waxa ay sort-gareyneysaa si akhris ahaan u fudud.
- StudentProfilePage: header badge (latest), section 'Transfers' toggle Show latest/all.
- ResultPage: badge-ka waxa uu raadiyaa log u dambeeyay ee ku soo galay section-ka hadda.

---

## 5) Xeerarka Muhiimka ah (Recap)
- Hal enrollment “current” per student per AY.
- Transfer: SAME Academic Year kaliya (hadda). Grade way is beddeli kartaa; relink scores kaliya marka Grade isku mid tahay.
- Enrollment waa inuu yahay 'active' marka la transfer-gareynayo. Haddii 'inactive' → 400.
- Capacity waxa la tixgeliyaa haddii la dejiyay.

---

## 6) Data Models (Quick Snapshot)
- Enrollment: { student, gradeSection, academicYear, grade, shift, status: 'active'|'inactive'|'transferred'|'promoted'|'graduated'|'withdrawn', joinedAt, leftAt }
- TransferLog: { student, fromGradeSection, toGradeSection, byUser?, date, reason?, reverted: boolean, revertOf?: ObjectId }
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
  - Transfer modal/flow works; badges/timeline render; “Returned” wording only on the revert log.
  - Student table shows both Active and Inactive students; Reactivate toggles back.

---

## 10) Mustaqbal (Future Work)
- Cross-Academic-Year transfer: close old enrollment (leftAt) + create new enrollment; scores not relinked.
- Batch transfers endpoint.
- “Correction” light flow (no audit log) – haddii loo baahdo policy ahaan.

