# Grades & Grade Sections

Last updated: 25 Jan 2026

Qoraankan wuxuu sharxayaa maamulka GradeSections (fasallada: Grade+Shift+Section) iyo sida subjects loogu xiro GS.

---

## 1) Qeexitaan
- **Grade:** level (e.g. Level 1..10) + curriculum/subjects.
- **GradeSection (GS):** `grade + shift + section` (AY-agnostic, reusable).
- **AcademicYear:** waxaa lagu hayaa Enrollment/Exam contexts.

---

## 2) API
Base: `/api/grades`

- `GET /api/grades/sections`
  - Query: `page`, `limit`, `search`, `grade`, `shift`, `section`, `sortBy`, `sortDir`

- `POST /api/grades/sections`
  - Body: `{ gradeId, shiftId, section, capacity?, subjects[] }`

- `PUT /api/grades/sections/:id`
- `DELETE /api/grades/sections/:id`

- `POST /api/grades/sections/:id/resync-cohort`
  - Fiiro: GS cohort ma laha; action-kan hadda wuxuu u dejinayaa `Enrollment.cohort = null` (active) ee GS-kaas (nadiifin/repair).

---

## 3) Frontend
- Page: `frontend/src/features/grades/pages/GradePage.jsx`
  - Filters: Grade, Shift, Section + search
  - CRUD: add/edit/delete
  - Roster modal (view students in GS)

---

## 4) Rules
- Unique GS identity: `(grade, shift, section)` waa unique.
- Capacity: haddii la dejiyo, transfers ayaa tixgelinaya.
