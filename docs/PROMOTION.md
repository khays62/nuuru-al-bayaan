
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
- GradeSection (GS): isku darka Shift, Grade, Section, iyo Subjects (GS waa reusable across sanadaha).
  - Fiiro: AcademicYear iyo Cohort hadda waxay ku jiraan Enrollment, ma aha GS.
- Enrollment: mar walba hal enrollment oo active; waxa kale oo uu sita `academicYear` iyo `cohort`.
- Cohort (Dufcad): magac kooxeed ku xiran AcademicYear; waxaa lagu kaydiyaa `Enrollment.cohort` si filters/warbixin u fududaadaan.

---

## Xeerarka Promotion-ka
- Invariants: Section iyo Shift isma beddelaan; 1 active enrollment had iyo jeer; Cohort preserve.
- Mid-Year (seq 1 → seq 2):
  - Grade → ++ (tusaale: Level 1 → Level 2) isla AcademicYear.
  - Close old enrollment → Create new enrollment to Target GS (AcademicYear isla sanadka, Cohort preserve).
- Year-End (non-terminal):
  - Grade → ++, AcademicYear → AY+1; Section/Shift/Cohort sidii.
  - Close old → Create new enrollment to Target GS.
- Year-End (terminal grade, tusaale Level 10):
  - Graduation: Close enrollment (status='graduated'). Student.status policy waxay ku xirnaan kartaa deployment-ka (haddii la doonayo in si toos ah loo dhigo “Graduated”).
  - Ma abuurayo enrollment cusub.

Xusuusin: Inkastoo Section/Shift/Cohort aysan isbeddelayn, promotion-ku had iyo jeer wuxuu tilmaamayaa GS KALE (sababtoo ah Grade ayaa isbeddelaya). Taasi waa sababta aan u xirno enrollment-kii hore una abuurno enrollment cusub.

---

## Kaydinta iyo Taariikhda (Enrollment)
- GS waa document la aqoonsado (Shift, Grade, Section). Markuu Grade isbeddelo → GS cusub ayuu noqonayaa.
- Taariikhda waxaa lagu hayaa Enrollment:
  - Close old enrollment (effectiveTo);
  - Create new enrollment oo tilmaamaya target GS (effectiveFrom).
  - Set `enrollment.cohort` (policy-ga promotion-ku go'aamiyo: preserve ama new).
- Tani waxay damaanad qaadaysaa in taariikhda safarka ardayga (timeline) la raaci karo fasal-illaa-fasal, iyadoo aan wax ka beddel lagu samayn GS-kii hore.

Admin Flow kooban (intake → safar):
- Bilowga: Admin wuxuu abuuraa GS-yada Level 1 (Grade+Shift+Section) hal mar; waxaa la dejin karaa capacity iyo subjects.
- Sanad walba: Admin wuxuu abuuraa AcademicYear cusub + Cohort cusub (AY-gaas).
- Intake: Add Student → Enrollment cusub (AY + Cohort + GS la doortay).
- Promotion: u qaabilsan Level 2…10 (AY kama beddelanto mid-year; AY+1 at year-end). Haddii target GS maqan yahay → auto-create (haddii policy ON).

---

## Cohort (Dufcad) — Iswaafajin
- Promotion: Cohort ISMA beddelo (waxaa lagu ilaalinayaa Enrollment.cohort).
- Transfer: Cohort default waa preserve (Enrollment.cohort lama beddelo transfer-ka caadiga ah).
- Admin Update: Cohort waxa lagu maareeyaa Enrollment/AY context; GS cohort uma laha.

---

## Auto-Create GradeSection (Target maqan)
- Haddii target GS uusan jirin xilliga promotion-ka, server-ku WAA UU ABUURI KARAA GS cusub isagoo ilaalinaya:
  - Section/Shift: sidii,
  - Subjects: laga soo qaado Associated Grades ee Grade-ka la beegsanayo.
  - Enrollment cusub: wuxuu qaataa AY-ga target-ka (mid-year: isla AY, year-end: AY+1) iyo Cohort preserve.
- Haddii curriculum-ka (Associated Subjects ee Grade-ka target) uusan dhammaystirnayn → lama abuuri karo → error: CURRICULUM_MISSING_FOR_GRADE.

---

## Khaladaad (Error Codes)
- ACTIVE_ENROLLMENT_MISSING
- GRADESECTION_MISSING (haddii auto-create OFF ama fashilmo)
- CAPACITY_FULL (haddii la adeegsado)
- SHIFT_CHANGE_NOT_ALLOWED (shift beddelid = Transfer)
- TERMINAL_GRADE_GRADUATION_ONLY (terminal year-end → graduation kaliya)
- CURRICULUM_MISSING_FOR_GRADE (curriculum-ka Grade target ma dhammaystirna)
- MULTIPLE_TARGET_GS (waxaa jira GS badan oo buuxinaya (Shift, Grade, Section) — waa in index-ka unique laga ilaaliyo tan).

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
- Promotions waxay ku socdaan endpoints-ka cusub:
  - GET /api/promotions/preview
  - POST /api/promotions/execute

Fiiro: Promotion logic wuxuu ka shaqeeyaa Enrollment-ka (academicYear + cohort) iyo GradeSection (grade+shift+section).

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
