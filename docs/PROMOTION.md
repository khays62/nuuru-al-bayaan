
# Dalacsiinta Ardayda (Student Promotion)

Tilmaam buuxa oo ku saabsan process-ka dalacsiinta ardayda: backend, frontend, API, data model, iyo UI flow.

**Last updated:** 7 Oct 2025

---

## Dulmar (Overview)
Dalacsiinta waa process academic ah oo ardayda loo dalacsiiyo gradeSection-ka xiga, iyadoo la eegayo natiijooyinka imtixaanka (mid-year ama final-year). Mapping-ka curriculum-ka (subjects) gradeSection walba waa la yaqaan, sidaas darteed dalacsiinta waa automatic.

**Key Points:**
- GradeSection: AcademicYear, Shift, Grade(level), Section, Subjects
- Subject mapping: Maadooyinka la abuuro, gradeSection walba lagu mapping-gareeyo
- Promotion: Ardayda la dalacsiinayo → gradeSection xiga → subjects-kaas

---

## Data Model
- **Subject:** { _id, code?, nameAr, nameEn }
- **Grade:** { _id, levelNumber, nameAr, nameEn }
- **GradeSection:** { _id, gradeId, section, academicYear, shift, subjects: [subjectId], capacity }
- **Enrollment:** { student, gradeSectionId, effectiveFrom, effectiveTo, status, sequenceInYear, migrationType }

---

## Backend (API Contract)
- **GET /api/grades** → Liiska grade-yada (levels)
- **GET /api/shifts** → Morning/Evening
- **GET /api/subjects** → Liiska maadooyinka
- **GET /api/gradeSections?gradeId&shiftId&academicYear** → Liiska gradeSection-yada + subjects
- **GET /api/students?page&limit&search&sortBy&sortDir&gradeSectionId?&status?**
  - Ku dar summary ee enrollment-ka active: { gradeSection, academicYear, shift, grade, section, subjects }
  - Ikhtiyaari: subjectCount (aggregation)
- **POST /api/promotions/mid-year**
  - Body: { studentIds: [...], date? }
  - Server: Validate active enrollment sequenceInYear=1, check gradeSection(target), close old, create new enrollment (gradeSection xiga, same year, sequence=2)
  - Response: promoted[], skipped[], errors[] (GRADESECTION_MISSING)
- **POST /api/promotions/year-end**
  - Body: { studentIds: [...], date? nextAcademicYear? }
  - Server: Validate active enrollment (seq 1 ama 2), check gradeSection(target, next year), close old, create new enrollment (gradeSection xiga, next year, sequence=1)

---

## Xeerar Muhiim ah (Business Rules)
- Hal enrollment active per student.
- Mid-Year: sequenceInYear=1 → target = gradeSection xiga, same year
- Year-End: sequenceInYear=1 ama 2 → target = gradeSection xiga, next year
- Shift, Section, AcademicYear, Grade(level) waa la xakameynayaa
- Curriculum-ka (subjects) gradeSection-ka cusub waa la yaqaan
- Subject count waa la muujinayaa (backend aggregation ama FE cache)

---

## Frontend (UI Flow)
### Grade Management
- Admin wuxuu abuuraa gradeSection-yada, mapping subjects sax ah
- Table: Section | Grade | Academic Year | Shift | Subjects | Capacity | Actions

### StudentPage
- Filters: GradeSectionSelect, Status, Search
- Columns: StudentID | FullName | Gender | GradeSection | AcademicYear | Shift | Subjects(#) | Status | Contact | Actions
- Subjects(#):
  - Backend aggregation: subjectCount from active enrollment
  - Ama frontend prefetch: gradeSection cache (subjects)
- Edit modal: Xog shakhsiyeed kaliya (bedel gradeSection via Promotion/Transfer)

### Profile Page
- Timeline: GradeSection history (Level, Section, Year, Shift)
- Section "Subjects for current level": subjects from gradeSection ee active enrollment

### Promotion Page
- Tabs: Mid-Year, Year-End
- Controls: GradeSection filter, AcademicYear (auto)
- Flow:
  1. Load Eligible (GET /students?gradeSectionId&status)
  2. Table: Student | Current GradeSection | Target GradeSection | Subject Count (target) | Select
  3. Promote Selected → run endpoint → summary

---

## Validation & Error Handling
- Always 1 active enrollment per student.
- GradeSection target waa in uu jiraa (mandatory)
- Promotion ha joojiyo ardayga haddii gradeSection target uusan jirin (GRADESECTION_MISSING)
- UI digniin: ardayga la joojiyay ama gradeSection la'aan

---


## Tusaale Flow (Sax)
### Mid-Year: GradeSection A (Level 1, 2025, Morning, Section A) → GradeSection A (Level 2, 2025, Morning, Section A)
- Kahor: Enrollment: { gradeSection=A, grade=1, year=2025, shift=Morning, section=A, seq=1 }
- Promotion: Close old, create new: { gradeSection=A, grade=2, year=2025, shift=Morning, section=A, seq=2 }
- Subjects: Grade 2, Section A, 2025, Morning → subjects mapping

### Year-End: GradeSection A (Level 2, 2025, Morning, Section A) → GradeSection A (Level 3, 2026, Morning, Section A)
- Close current (gradeSection=A, grade=2, 2025, shift=Morning, section=A, seq=2)
- Create new: { gradeSection=A, grade=3, year=2026, shift=Morning, section=A, seq=1 }
- Subjects: Grade 3, Section A, 2026, Morning → subjects mapping

---

## Falanqeyn iyo Iswaafajin
GradeSection: Waa entity-ga isku xira AcademicYear, Shift, Grade(level), Section, iyo Subjects. Tusaale: “مستوى الأول” (Grade 1, 2024/2025, Morning, Section A) wuxuu leeyahay subjects gaar ah.
Subject Mapping: Maadooyinka waxaa la abuuraa, kadibna gradeSection walba waxaa lagu mapping-gareeyaa maadooyinka saxda ah (curriculum-ka).
Promotion Flow:
- Marka dalacsiin la sameynayo (mid-year ama final-year), ardayga waxaa loo raraa grade-ka xiga (tusaale: Grade 1 → Grade 2), laakiin section-ka (A) iyo shift/academicYear waa la xakameynayaa.
- Ardayga cusub ee gradeSection-kaas wuxuu si toos ah u qaadanayaa maadooyinka lagu mapping-gareeyay gradeSection-kaas (curriculum-ka).
- AcademicYear iyo Shift waa la xakameynayaa, sida sawirka ka muuqata.

### Abuurista Xogta Asaasiga ah
- Maadooyin (Subjects) la abuuro.
- Grade(level) la abuuro (مستوى الأول ilaa مستوى العاشر).
- GradeSection walba la abuuro, oo lagu mapping-gareeyo maadooyinka saxda ah.
- Ardayda la abuuro, enrollment lagu sameeyo gradeSection sax ah.

### Dalacsiinta (Promotion)
- Mid-Year: Ardayda gradeSection-ka hadda → gradeSection-ka xiga (isla AcademicYear, sequence=2, section waa isla section).
- Final-Year: Ardayda gradeSection-ka hadda → gradeSection-ka xiga (AcademicYear+1, sequence=1, section waa isla section).
- Ardayga cusub wuxuu qaadanayaa maadooyinka gradeSection-ka cusub (curriculum-ka mapping).

### Automation
- System-ka wuxuu si toos ah u xisaabin karaa ardayda la dalacsiinayo, grade-ka xiga, iyo subjects-ka la qaadanayo.
- Ma jiro manual mapping dalacsiin kasta; curriculum-ka gradeSection walba waa la yaqaan.

---

## Next Steps
- Backend: Add gradeSection endpoint, Students list subjectCount aggregation, Promotion endpoints
- Frontend: GradeSection management, StudentPage filters/columns, Profile subjects, PromotionPage

---

## Ansixinta (Confirmation)
- GradeSection per (level+shift+year+section) waa mandatory
- StudentPage ha muujiso Subject count (backend aggregation)
- Promotion ha joojiyo ardayga haddii gradeSection target uusan jirin (GRADESECTION_MISSING)

---

Haddii wax la beddelo ama la ballaariyo, update this doc.

---

## Roles & Permissions
- Admin: Waxay samayn karaan promotion (mid-year, year-end), waxay maamuli karaan gradeSections iyo subjects.
- Teacher: Ikhtiyaari ahaan waxay arki karaan eligibility iyo summary, laakiin ma dalacsiin karaan haddii aan loo siin ogolaansho (configurable).
- Staff: Kaliya aragti kooban; wax ka beddel promotion ma leh.

RBAC talo: ku dar permission keys sida `promotions.run`, `gradeSections.manage`, `subjects.manage`.

## Audit & Logs
- Promotion run: log per student { studentId, from: {grade, year, section}, to: {grade, year, section}, type: 'mid'|'final', byUserId, at: timestamp }.
- Endpoint response ha kaydiso summary-ga gaar ahaan errors[] si dib loo eego.

## Edge Cases (Dhab ahaantii dhacaya)
- Student without active enrollment → error: ACTIVE_ENROLLMENT_MISSING.
- Target gradeSection (level+shift+year+section) maqan → error: GRADESECTION_MISSING.
- Student already at target grade for same year mid-year (seq=2 exists) → skipped: ALREADY_PROMOTED_THIS_YEAR.
- Capacity checks (haddii la adeegsado): target capacity buuxsamay → error: CAPACITY_FULL.
- Shift change inta lagu jiro promotion lama ogola (waa Transfer) → error: SHIFT_CHANGE_NOT_ALLOWED.
- Multiple promotions run repeated → idempotent: same inputs → skipped.

## Success Criteria
- 1 active enrollment per student had iyo jeer.
- Promotion endpoints: idempotent, clear summary { promoted[], skipped[], errors[] }.
- UI: Eligible list sax ah, subject count sax ah, confirmation modals, and toasts.
- Logs: promotion history muuqata ee Profile timeline.

## Minimal API Examples
### POST /api/promotions/mid-year
Request:
{
  "studentIds": ["64f...a2", "64f...b3"],
  "date": "2025-02-20"
}
Response:
{
  "promoted": ["64f...a2"],
  "skipped": [{ "studentId": "64f...b3", "reason": "ALREADY_PROMOTED_THIS_YEAR" }],
  "errors": []
}

### POST /api/promotions/year-end
Request:
{
  "studentIds": ["64f...c4"],
  "date": "2025-06-30",
  "nextAcademicYear": "2025-2026"
}
Response:
{
  "promoted": ["64f...c4"],
  "skipped": [],
  "errors": [{ "studentId": "64f...d5", "code": "GRADESECTION_MISSING" }]
}

## Testing Checklist
- Backend unit tests:
  - Mid-Year: seq=1 → seq=2 same year; seq=2 → skipped.
  - Year-End: seq=1|2 → seq=1 next year.
  - Missing gradeSection target → error.
  - Active enrollment missing → error.
  - Idempotency: run twice → second run skipped.
- Frontend smoke:
  - GradeSection mapping shows subjects.
  - StudentPage shows subject count and filters work.
  - PromotionPage loads eligible list; summary toasts appear.
  - Profile timeline updates with new enrollment entry.
