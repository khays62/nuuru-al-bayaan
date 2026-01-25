# API Reference (Kooban)

Base: http://localhost:7000/api

## Students
- GET /students
  - Query: page, limit, search, status, academicYear, grade, shift, gradeSectionId, sort (e.g. createdAt:desc)
  - Returns: { data, meta }
- POST /students
  - Body: { fullName, gender, dob, guardianName, contactNumber, address?, admissionDate, gradeSectionId, academicYearId, cohortId }
  - Returns: { student, enrollment }
- GET /students/:id
  - Returns: { student, latestEnrollment, stats }
- GET /students/:id/history
  - Returns: { data, meta }
- PATCH /students/:id/enrollment/active
  - Body: { active: boolean }
  - Returns: { message, enrollment }
- GET /students/:id/transfers
- GET /students/:id/latest-transfer
- GET /students/:id/full-transcript

## Grade Sections
- GET /grades/sections
  - Query: page, limit, search, grade, shift, section, sort
- POST /grades/sections
- PUT /grades/sections/:id
- DELETE /grades/sections/:id
- POST /grades/sections/:id/resync-cohort
  - Fiiro: GS cohort ma laha; resync wuxuu u dejinayaa `Enrollment.cohort = null` (active) ee GS-kaas.

## Subjects
- GET /subjects?grade=<id>
- POST /subjects
- PUT /subjects/:id
- DELETE /subjects/:id

## Lookups
- GET /lookups/grades
- GET /lookups/academic-years
- GET /lookups/shifts
- GET /lookups/exam-types

## Transfers
- GET /transfers/candidates
- PATCH /transfers/:id
- GET /transfers/logs

## Promotions
- GET /promotions/preview
- POST /promotions/execute

## Cohorts
- GET /cohorts
- POST /cohorts
- PATCH /cohorts/:id
- DELETE /cohorts/:id

## Exams
- GET /exams/types
- POST /exams/ensure
- GET /exams/grid
- PUT /exams/score
- GET /exams/summary
- GET /exams/transcript
- GET /exams/template/versions
- GET /exams/template/detail

## Transcript
- GET /transcripts/students/:id/full-transcript
- GET /transcripts/students/:id/overall-summary
- GET /transcripts/classes/:academicYearId/:gradeSectionId/overall-ranks

## Teachers
- GET /teachers?status&search
- POST /teachers
- PATCH /teachers/:id
- DELETE /teachers/:id
- POST /teachers/:id/create-login
- GET /teachers/:id/assignments
- POST /teachers/:id/assignments
- DELETE /teachers/:id/assignments/:assignmentId
- GET /teachers/:id/roster?ay&gs

## Timetable
- GET /timetable/slots?gs&teacher&day&from&to&mine
- POST /timetable/slots
- POST /timetable/slots/bulk
- POST /timetable/slots/swap
- PATCH /timetable/slots/:id
- DELETE /timetable/slots/:id

## Attendance
- POST /attendance/mark
- GET /attendance
- GET /attendance/reports/summary
- GET /attendance/reports/details
- GET /attendance/reports/student-range
- GET /attendance/student/self
- GET /attendance/student/:id/self

## Announcements
- GET /announcements
- POST /announcements
- PUT /announcements/:id
- DELETE /announcements/:id

## Auth
- POST /auth/login
- GET /auth/csrf
- GET /auth/verify
- POST /auth/logout
- POST /auth/change-password
- PATCH /auth/users/:id/reset-lockout

## Users (Admin)
- GET /users
- POST /users
- PATCH /users/:id
- DELETE /users/:id
