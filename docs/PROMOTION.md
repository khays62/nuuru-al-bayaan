
# Dalacsiinta Ardayda (Student Promotion) — Kooban

Last updated: 27 Nov 2025

---

## Dulmar
- Dalacsiinta waxay u wareejisaa ardayga Grade-ka xiga iyadoo la ilaalinayo Section iyo Shift (Cohort preserve policy).
- Curriculum (maadooyin) waxa lagu qeexaa heerka Grade-ka (Associated Subjects), ee ma aha in GS walba gacanta lagu buuxiyo.
- Haddii Target GradeSection (GS) maqan yahay xilliga promotion, server-ku wuu abuuri karaa otomaatig ahaan GS-ka saxda ah (auto-create) isagoo isticmaalaya curriculum-ka Grade-ka la beegsanayo.

---

## Qeexitaan muhiim ah
- Grade: Heerka waxbarasho (Level 1 → Level 10); wuxuu siddaa curriculum (Associated Subjects).
- GradeSection (GS): isku darka AcademicYear, Shift, Grade, Section, iyo Subjects.
  - Aqoonsiga GS waa isku-dar (AY, Shift, Grade, Section). Marka Grade ama AY isbeddelo → GS cusub ayuu noqonayaa (inkastoo Section/Shift/Cohort ay ahaadaan sidii hore).
- Enrollment: mar walba hal enrollment oo active; waxa kale oo uu sita `cohort` (denormalized) oo laga qaato GS.
- Cohort (Dufcad): magac kooxeed ku xiran GS; ardaygu wuxuu ka dhaxlaa cohort-ka GS-ka uu ku qoran yahay (waxaa lagu stamp gareeyaa Enrollment.cohort).

---

## Xeerarka Promotion-ka
- Invariants: Section iyo Shift isma beddelaan; 1 active enrollment had iyo jeer; Cohort preserve.
- Mid-Year (seq 1 → seq 2):
  - Grade → ++ (tusaale: Level 1 → Level 2) isla AcademicYear.
  - Close old enrollment → Create new enrollment to Target GS (AY: isla sanadka, Section/Shift/Cohort sidii).
- Year-End (non-terminal):
  - Grade → ++, AcademicYear → AY+1; Section/Shift/Cohort sidii.
  - Close old → Create new enrollment to Target GS.
- Year-End (terminal grade, tusaale Level 10):
  - Graduation: Close enrollment (status='graduated'). Student.status policy waxay ku xirnaan kartaa deployment-ka (haddii la doonayo in si toos ah loo dhigo “Graduated”).
  - Ma abuurayo enrollment cusub.

Xusuusin: Inkastoo Section/Shift/Cohort aysan isbeddelayn, promotion-ku had iyo jeer wuxuu tilmaamayaa GS KALE (sababtoo ah Grade/AY ayaa isbeddelaya). Taasi waa sababta aan u xirno enrollment-kii hore una abuurno enrollment cusub.

---

## Kaydinta iyo Taariikhda (Enrollment)
- GS waa document la aqoonsado (AY, Shift, Grade, Section). Markuu Grade ama AY isbeddelo → GS cusub ayuu noqdaa.
- Taariikhda waxaa lagu hayaa Enrollment:
  - Close old enrollment (effectiveTo);
  - Create new enrollment oo tilmaamaya target GS (effectiveFrom).
  - Stamp `enrollment.cohort = targetGS.cohort` si warbixin/filters ay u fududaadaan.
- Tani waxay damaanad qaadaysaa in taariikhda safarka ardayga (timeline) la raaci karo fasal-illaa-fasal, iyadoo aan wax ka beddel lagu samayn GS-kii hore.

Admin Flow kooban (intake → safar):
- Bilowga: Admin wuxuu abuuraa GS-yada Level 1 ee sanadka (AY) per Shift/Section, waxa la siiyaa Cohort (tusaale Dufcada 1aad) iyo capacity.
- Inta kale: Promotion ayaa u qaabilsan Level 2…10 (AY kama beddelanto mid-year; AY+1 at year-end). Haddii target GS maqan yahay → auto-create (haddii policy ON).
- Intake cusub (Dufcada 2aad): Admin wuxuu si gaar ah u abuuraa GS-yada Level 1 (AY) per Shift/Section oo ku magacaaban Cohort cusub; tan kama saameyneyso dufcadihii hore ee sii socda.

---

## Cohort (Dufcad) — Iswaafajin
- Promotion: Cohort ISMA beddelo; target GS waa inuu leeyahay isla cohort (ama cohort-less).
- Transfer: Waxaa go'aamiya target GS (overwrite) — ardaygu toos ayuu u qaataa cohort-ka GS-ka cusub (ku saabsan Transfer, eeg `TRANSFER.md`).
- Admin Update: Haddii cohortId laga beddelo GS oo arday active jiraan, samee resync si `Enrollment.cohort` loogu waafajiyo cohort-ka GS.

---

## Auto-Create GradeSection (Target maqan)
- Haddii target GS uusan jirin xilliga promotion-ka, server-ku WAA UU ABUURI KARAA GS cusub isagoo ilaalinaya:
  - Section/Shift: sidii,
  - Cohort: isla cohort-kii ardayga (promotion preserve),
  - AY: Mid-Year → isla AY; Year-End → AY+1,
  - Subjects: laga soo qaado Associated Grades ee Grade-ka la beegsanayo.
  - Enrollment cusub: stamp `cohort = targetGS.cohort`.
- Haddii curriculum-ka (Associated Subjects ee Grade-ka target) uusan dhammaystirnayn → lama abuuri karo → error: CURRICULUM_MISSING_FOR_GRADE.

---

## Khaladaad (Error Codes)
- ACTIVE_ENROLLMENT_MISSING
- GRADESECTION_MISSING (haddii auto-create OFF ama fashilmo)
- COHORT_MISMATCH_TARGET (target GS cohort kala duwan — promotion waa preserve)
- COHORT_TARGET_MISSING (lama helin GS isla cohort — marka auto-create OFF/FAIL)
- CAPACITY_FULL (haddii la adeegsado)
- SHIFT_CHANGE_NOT_ALLOWED (shift beddelid = Transfer)
- TERMINAL_GRADE_GRADUATION_ONLY (terminal year-end → graduation kaliya)
- CURRICULUM_MISSING_FOR_GRADE (curriculum-ka Grade target ma dhammaystirna)
- MULTIPLE_TARGET_GS (waxaa jira GS badan oo buuxinaya (AY, Shift, Grade, Section, Cohort) — waa in index-ka unique laga ilaaliyo tan).

---

## Tusaalooyin Gaaban
- Mid-Year: (Level 1, 2025, Morning, A, Cohort C1) → (Level 2, 2025, Morning, A, Cohort C1)
  - Haddii GS-kan maqan yahay → auto-create; subjects-ka laga qaado Grade 2.
- Year-End (non-terminal): (Level 2, 2025, Morning, A, C1) → (Level 3, 2026, Morning, A, C1)
  - Haddii GS-kan maqan yahay → auto-create; subjects-ka laga qaado Grade 3.
- Year-End (terminal): (Level 10, 2025, Morning, A, C1) → Graduated; log GRADUATION(cohortId=C1).

---

## Guul (Success Criteria)
- Promotion preserve Section/Shift/Cohort; kaliya Grade (iyo AY at year-end) ayaa isbeddela.
- Auto-create GS marka loo baahdo, iyadoo curriculum laga qaadanayo Grade target.
- Graduation terminal-grade waa sax, logs buuxa.
- Idempotent: orod laba jeer → kuwa hore u guuray waa skipped.

---

## API faahfaahin (Server)
- POST /api/students/:studentId/promote
  - Body: {
      timing: 'mid-year' | 'year-end',
      autoCreate?: boolean
    }
  - Server algorithm (kooban):
    1) Load active enrollment E (guard ACTIVE_ENROLLMENT_MISSING)
    2) Determine target Grade (E.grade+1) and AY (same if mid-year, +1 if year-end)
    3) Resolve target GS by (AY, E.shift, targetGrade, E.section, cohort preserve)
    4) If missing:
       - if autoCreate: create GS with subjects from targetGrade curriculum and cohort = E.cohort
       - else 409 (COHORT_TARGET_MISSING | GRADESECTION_MISSING)
    5) Close E (leftAt=now, status='promoted');
       Create E2 with sequenceInYear (2 mid-year else 1 next AY), cohort=targetGS.cohort, status='active'
    6) Return { fromGS, toGS, enrollment: E2 }
  - Responses:
    - 200 { fromGS, toGS, enrollment }
    - 409 { code, message }
- GET /api/students/:studentId/enrollments
  - Returns timeline (recent first) with GS + cohort populated
- GET /api/grade-sections?ay=&grade=&shift=&section=&cohort=
  - For client-side discovery of potential targets (optional)

### Promotion (bulk)
- GET /api/promotions/preview
  - Query: ay, grade, shift, section, cohort, q (search), timing, studentIds[] (optional)
  - Returns: {
      items: [
        { studentId, fromGS, target: { toGrade, toAY, section, shift, cohort },
          toGS: { _id? },
          action: 'promote'|'graduate'|'error',
          errors: [code]
        }
      ],
      summary: { total, promotable, graduates, missingTargets, capacityIssues }
    }
- POST /api/promotions/execute
  - Body: { timing, autoCreate?: boolean, studentIds?: [], filters?: { ay, grade, shift, section, cohort, q } }
  - Behavior: haddii `studentIds` la siiyo → kuwaas keliya; haddii kale → server waxa uu adeegsadaa filters si uu u doorto kuwa hadda filtered ah (preview gudaha ayuu ku celiyaa)
  - Returns: { successes: [...], failures: [{ studentId, code, message }] }

RBAC (talo): Admin | AcademicOfficer → can preview/execute promotions.

---

## La Xiriir — Transfer vs Promotion
- Haddii ujeeddadu tahay in la beddelo Section/Shift (AY isku mid), isticmaal Transfer (eeg `TRANSFER.md`).
- Haddii loo baahan yahay in la boodo AY mustaqbalka sababo jadwal (non-promotion), isticmaal Cross-AY Transfer (scores lama wareejiyo). Promotion Year-End waxa kaliya oo ay u booddaa AY+1 iyadoo Grade → ++ isla Section/Shift/Cohort.

## UI faahfaahin (Frontend) — Promotion Page (Standalone)
- Path: `/promotions` (sidebar item: “Promotions”)
- Ujeeddo: Dalacsiin kooxeed ama shaqsiyeed, iyadoo la ilaalinayo xeerarka (preserve Section/Shift/Cohort) iyo auto-create GS marka loo baahdo.

Page Layout:
- Header toolbar:
  - Timing: [Mid-Year | Year-End]
  - Filters: Academic Year (source), Grade, Shift, Section, Cohort, Search by student name/ID
  - Actions: [Preview] [Promote]
- Main content (two-pane):
  - Left: Students table (active enrollments matching filters) with multi-select.
    - Columns: Student ID, Name, Current AY, Grade, Section, Shift, Cohort
  - Right: Preview panel (after [Preview]):
    - Summary counts: total selected, target GS existing vs missing, capacity warnings, terminal-grade → graduation count
    - Auto-create toggle (default ON, policy-controlled)
    - Per-student preview rows (condensed): fromGS → toGS (AY/Grade/Section/Shift/Cohort), status badges
- Footer: Promote button (disabled until preview OK), with confirmation modal.

Student Profile integration (optional):
- Button “Promote” → deep-link to `/promotions?studentId=...` preselecting the student.

Timeline (StudentProfilePage):
- Render enrollments with seq, AY, Grade, Section, Shift, Cohort chip; latest on top.
