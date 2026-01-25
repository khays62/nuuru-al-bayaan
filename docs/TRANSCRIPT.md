# Transcript

Last updated: 25 Jan 2026

Transcript-ka wuxuu soo bandhigaa natiijada ardayga across multi-year (enrollments), isagoo ilaalinaya versioning (templateVersion) si scores hore aysan u jabin.

---

## 1) Sources of Truth
- Enrollment timeline: `Enrollment` (student → AY + GS + grade/shift + status).
- Scores: `ExamScore` ku xiran `Exam`.
- Versioning: `Exam.templateVersion` + inference si loo doorto version sax ah per AY+GS.

---

## 2) API

### Full transcript (multi-year)
- `GET /api/students/:id/full-transcript` (compat)
- `GET /api/transcripts/students/:id/full-transcript` (new)

Returns (kooban):
- `student`
- `enrollments[]` (chronological)
  - `academicYear`, `gradeSection`, `status`, `joinedAt`, `leftAt`
  - `transcript` (examTypes, subjects, rows, overall, templateVersion)
- `transfers[]` (context)
- `summary` (cumulative)

### Overall summary
- `GET /api/transcripts/students/:id/overall-summary`

### Class overall ranks
- `GET /api/transcripts/classes/:academicYearId/:gradeSectionId/overall-ranks`

---

## 3) Frontend
- Page: `frontend/src/features/transcript/pages/TranscriptPage.jsx`
- Supports:
  - Select AY + Cohort + EnrollmentStatus + (optional) timeline segment
  - Multi-student selection
  - Print (uses shared PrintHeader/PrintFooter)

---

## 4) Printing
Faahfaahin daabacaad: eeg `PRINTING.md`.
