# API Reference (Kooban)

Base: http://localhost:7000/api

## Students
- GET /students
  - Query: page, limit, search, status, academicYear, grade, shift, gradeSectionId, sort (e.g. createdAt:desc)
  - Returns: { data, meta }
- POST /students
  - Body: { fullName, gender, dob, guardianName, contactNumber, address?, admissionDate, gradeSectionId }
  - Returns: { student, enrollment }
- GET /students/:id
  - Returns: { student, latestEnrollment, stats }
- GET /students/:id/history
  - Returns: { data, meta }
- PATCH /students/:id/enrollment/reassign
  - Body: { gradeSectionId, enrollmentId? }
  - Returns: { message, enrollment }

## Grade Sections
- GET /grades/sections
  - Query: page, limit, search, grade, academicYear, shift, section, sort
- POST /grades/sections
- PUT /grades/sections/:id
- DELETE /grades/sections/:id

## Subjects
- GET /subjects?grade=<id>
- POST /subjects
- PUT /subjects/:id
- DELETE /subjects/:id

## Lookups
- GET /lookups/grades
- GET /lookups/academic-years
- GET /lookups/shifts
