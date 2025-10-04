# Teacher Workflow: From Creation to Assignment and Usage (Backend & Frontend)

Dukumentigan waxa uu si buuxda u sharxayaa lifecycle-ka Teacher: laga bilaabo abuurista user, privilege-kiisa, assignment-ka subject/section, ilaa isticmaalka UI (frontend) iyo enforcement (backend). Waa blueprint mustaqbal ah oo dhammaan team-ka fahmi karo.

---


## 1. Abuurista Teacher (User Creation)

- **Goobta:** User Management (Admin/Staff)
- **Foomka Add/Edit User:**
  - fullName, username (unique), password (ama auto-generate), status (Active/Inactive)
  - privileges: checkbox group (ADMIN, STAFF, TEACHER, VIEW_ONLY)
    - Tusaale: `[ ] ADMIN   [ ] STAFF   [x] TEACHER   [ ] VIEW_ONLY`
    - Waa la dooran karaa privilege(s) badan, TEACHER waa in la xusho si uu u noqdo macallin.
  - Submit → POST /api/users
  - Backend: password waa la hash-gareeyaa, user waa la abuuraa, privileges waa la kaydiyaa.

- **Goobta:** User Management (Admin/Staff)
- **Tallaabooyinka:**
  1. Admin/Staff wuxuu tagaa User ManagementPage.
  2. Wuxuu gujiyaa "Add User".
  3. Foomka waxaa lagu buuxiyaa:
     - fullName
     - username (unique)
     - password (ama auto-generate)
     - privileges: ["TEACHER"] (checkbox/multi-select)
     - status: Active
  4. Submit → POST /api/users
  5. Backend: password waa la hash-gareeyaa, user waa la abuuraa, privilege "TEACHER" waa la kaydiyaa.

## 2. Teacher Privileges & Model

- **Privileges:** ["TEACHER"] (keliya ama la socon kara kuwa kale sida VIEW_ONLY)
- **User Model:**
  - fullName, username, passwordHash, status, privileges: string[]
- **RBAC:**
  - TEACHER privilege wuxuu xaddidayaa waxa uu arki karo/gali karo (kaliya sections/subjects loo xilsaaray)


## 3. Assignment: Teacher ↔ Section/Subject/AY

- **Goobta:** GradeSection Management (Admin/Staff)
- **Tab:** "Teacher Assignments" (GradeSectionPage)
  - Table: Subject | Assigned Teacher(s) | Actions (Assign/Change/Remove)
  - Assign/Change: Modal ama dropdown oo lagu doorto teacher (users leh privilege=TEACHER)
  - POST /api/teachers/assign { userId, gradeSectionId, academicYearId, subjectId }
  - Table waa la refresh-gareeyaa, assignments waa la edit/tirtiri karaa (DELETE /api/teachers/assign/:id)
  - Backend: TeacherAssignment model { user, gradeSection, academicYear, subject }
  - GET /api/teachers/assignments?gradeSectionId&academicYearId si loo muujiyo assignments.

- **Goobta:** GradeSection Management (Admin/Staff)
- **Tallaabooyinka:**
  1. Admin/Staff wuxuu tagaa GradeSection/Section details ama "Teacher Assignments" tab.
  2. Wuxuu doortaa Academic Year, Shift, Section.
  3. Wuxuu arkaa liiska subjects-ka section-kaas.
  4. Subject kasta, wuxuu xiraa (assign) macallin (dropdown: users leh privilege=TEACHER).
  5. POST /api/teachers/assign { userId, gradeSectionId, academicYearId, subjectId }
  6. Backend: TeacherAssignment model waa la abuuraa (user, gradeSection, academicYear, subject).
  7. UI waxay muujisaa assignments-ka jira, edit/remove waa la samayn karaa.


## 4. Teacher Usage: UI & Permissions

- **Frontend (Teacher Dashboard):**
  - Teacher wuxuu login-galaa (username/password), JWT token privilege=TEACHER
  - Dashboard: List of assignments (Section, Academic Year, Subject, Action: Enter Scores)
  - "Enter Scores": grid for entering scores for assigned students/subject only
  - Teacher ma arki karo/gali karo wax aan loo xilsaarin

- **Backend Enforcement:**
  - API-yada (GET /api/exams/grid, PUT /api/exams/score, iwm):
    - Middleware: Hubi privilege=TEACHER iyo in uu leeyahay TeacherAssignment sax ah
    - Haddii kale: 403 Forbidden

- **Frontend (Teacher Dashboard):**
  - Teacher wuxuu login-galaa (username/password)
  - JWT token privilege=TEACHER
  - Dashboard wuxuu muujinayaa:
    - Sections/subjects uu leeyahay (ayuu gali karaa scores)
    - Students ee section-kaas/subject-kaas
    - Exam grid (Mid/Final) oo uu galiyo scores
    - Ma jiro edit/delete wax ka baxsan scores subject-kiisa
- **Backend Enforcement:**
  - GET /api/exams/grid, PUT /api/exams/score, GET /api/exams/summary
    - Middleware: Haddii req.user.privileges.includes("TEACHER")
    - Hubi in uu leeyahay TeacherAssignment sax ah (user, gradeSection, academicYear, subject)
    - Haddii kale: 403 Forbidden

## 5. Teacher Lifecycle Summary (End-to-End)

1. **Create User:** Admin/Staff → User Management → privilege=TEACHER
2. **Assign:** Admin/Staff → Section/Subject → Assign teacher(s) per subject
3. **Login:** Teacher → Login page → JWT token
4. **Access:** Teacher → Dashboard → Only assigned sections/subjects
5. **Action:** Teacher galiyaa scores ardayda subject-kiisa
6. **Security:** Backend/Frontend hubin joogto ah (RBAC + assignment)

## 6. API Endpoints (Draft)

- POST /api/users (privilege=TEACHER)
- GET /api/users?privilege=TEACHER (list teachers)
- POST /api/teachers/assign { userId, gradeSectionId, academicYearId, subjectId }
- DELETE /api/teachers/assign/:id
- GET /api/teachers/assignments?userId&academicYearId
- GET /api/exams/grid?gradeSectionId&academicYearId&subjectId (teacher: only assigned)
- PUT /api/exams/score (teacher: only assigned)

## 7. UI Wireframe (Textual)

- **User ManagementPage (Admin/Staff):**
  - Add/Edit User → privilege=TEACHER
- **GradeSectionPage (Admin/Staff):**
  - Tab: "Teacher Assignments"
  - Table: Subject | Assigned Teacher(s) | Actions (Assign/Remove)
- **Teacher Dashboard (Teacher):**
  - List: My Sections/Subjects
  - For each: Enter Scores (Exam Grid)
  - View: Students, Results (read-only)

## 8. Notes & Best Practices

- TeacherAssignment waa subject-level, si sax ah loo xakameeyo access.
- Waa la taageeri karaa macallin dhigaaya dhowr subject/section/AY.
- Admin/Staff kaliya ayaa maamuli kara assignments.
- Teacher ma abuuri karo/ma tirtiri karo assignments, kaliya wuu arki karaa/gali karaa scores subject-kiisa.
- Haddii teacher privilege laga saaro user, access-ka assignments-kaas wuu dhammaanayaa.

---

Dukumentigan waa in lagu lifaaqo docs-ka mashruuca si team-ka oo dhan u fahmo lifecycle-ka Teacher.
