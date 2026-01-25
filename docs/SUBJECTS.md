# Subjects

Last updated: 25 Jan 2026

Subjects module-ku wuxuu maamulaa maadooyinka iyo xiriirkooda Grade/GradeSection.

---

## Model (kooban)
`Subject`
- `subjectName`
- `grade` (optional; depends on schema usage)

Fiiro:
- GradeSection wuxuu hayaa `subjects[]` si timetable/exams/transcript u ogaadaan maadooyinka fasalka.

---

## API
Base: `/api/subjects`
- `GET /api/subjects?grade=<gradeId>`
- `POST /api/subjects`
- `PUT /api/subjects/:id`
- `DELETE /api/subjects/:id`

---

## Frontend
- Feature: `frontend/src/features/subjects/*`
- Typical flows:
  - list/search
  - add/edit
  - delete guard (haddii uu ku xiran yahay GS/exams)
