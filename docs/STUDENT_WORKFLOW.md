# STUDENT_WORKFLOW.md



# Student Workflow: Bulk Login Model (Username = StudentID, Default Password)

Dukumentigan waxa uu si buuxda u sharxayaa qaabka ugu habboon ee ardayda badan loogu maamulo login iyo profile access, iyadoo aan la abuureyn user manual ah arday walba. Waa model scalable ah oo ammaan ah.

---

## 1. Qaabka Bulk Student Login

- **Student Profile:**
  - Dhammaan ardayda waxa lagu kaydiyaa Student.js (studentID, fullName, gradeSection, iwm).
- **User Creation:**
  - User model looma abuuro arday walba marka hore.
  - Marka la furo login-ka ardayda, studentID kasta waxa loo isticmaalaa sida username.
  - Password default ah (tusaale: "2025student") ayaa loo dejinayaa dhammaan ardayda.
  - User-ka lama abuuro ilaa ardaygu login-galo markii ugu horreysa (on-demand user creation, ama script bulk create).

## 2. Model & Privileges

- **User Model (Student Login):**
  - username = studentID
  - passwordHash (default, la bedeli karo)
  - privileges: ["STUDENT_VIEW"]
  - status: Active/Inactive
  - (optional) firstLogin: true/false (si loo ogaado in password la bedelay)
- **Student Model (Student.js):**
  - studentID, fullName, gradeSection, gender, iwm.
- **RBAC:**
  - STUDENT_VIEW privilege wuxuu xaddidayaa waxa uu arki karo/gali karo (kaliya profile-kiisa iyo natiijooyinkiisa)

## 3. Xiriirka Login & Profile

- **Login Flow:**
  1. Student wuxuu geliyaa username = studentID, password = default (ama mid horey loo bedelay)
  2. Backend waxa uu raadiyaa User by username (studentID)
     - Haddii user-ka uusan jirin, waa la abuuraa on-demand (privilege=STUDENT_VIEW, status=Active, passwordHash=default, firstLogin=true)
  3. Marka user la helo, waxa la sameeyaa lookup Student profile by studentID
  4. JWT token waxa lagu daraa studentID
  5. Dashboard-ka waxa laga akhriyaa profile-kiisa iyo natiijooyinkiisa iyadoo la isticmaalayo studentID

## 4. Isticmaalka Student: UI & Permissions

- **Frontend (Student Dashboard):**
  - Student wuxuu login-galaa (studentID, password)
  - Haddii uu weli default password yahay, waxaa loo diraa page "Change Password" (force password change)
  - Marka password la bedesho, firstLogin=false
  - Dashboard wuxuu si toos ah uga akhriyaa profile-kiisa (Student) iyo natiijooyinkiisa (ExamScore) iyadoo la isticmaalayo studentID
  - Student walba waxa uu leeyahay profile u gooni ah, natiijooyin u gooni ah, iyo studentID
  - Ma jiro edit/delete wax ka baxsan profile-kiisa (haddii la oggolaado)
- **Backend Enforcement:**
  - GET /api/exams/grid, GET /api/exams/summary
    - Middleware: Haddii req.user.privileges.includes("STUDENT_VIEW")
    - Hubi in uu ardaygu arko kaliya xogtiisa (req.user.username == studentID)
    - Haddii kale: 403 Forbidden

## 5. Student Lifecycle Summary (End-to-End)

1. **Create Student Profile:** Admin/Staff → Student Management → Student profile (studentID, fullName, gradeSection, iwm)
2. **Bulk Login Ready:** User model looma abuuro arday walba, laakiin studentID kasta waa username
3. **Login:** Student → Login page (studentID, default password)
4. **Force Password Change:** Haddii uu weli default password yahay, ardayga waxaa loo diraa page "Change Password"
5. **Access:** Student → Dashboard → Profile-kiisa iyo natiijooyinkiisa (by studentID)
6. **Security:** Backend/Frontend hubin joogto ah (RBAC + studentID)

## 6. API Endpoints (Draft)

- POST /api/students (create student profile)
- POST /api/auth/login (studentID, password)
- PATCH /api/users/:id/password (change password)
- GET /api/students/:studentID (fetch student profile)
- GET /api/exams/grid?studentID (student: only own)
- GET /api/exams/summary?studentID (student: only own)

## 7. UI Wireframe (Textual)

- **Student ManagementPage (Admin/Staff):**
  - Add/Edit Student profile (studentID, fullName, gradeSection, iwm)
- **Student Login Page:**
  - Username: studentID
  - Password: default (markii hore), kadib mid la bedelay
- **Change Password Page:**
  - Haddii uu weli default password yahay, ardayga waxaa loo diraa page-kan
- **Student Dashboard (Student):**
  - Profile-kayga (xogta Student profile)
  - Natiijooyinkayga (imtixaanada la galay, ExamScore)
  - Ogeysiisyada

## 8. Notes & Best Practices

- User creation manual looma baahna arday walba, studentID waa username
- Default password ha noqdo mid adag oo la bedeli karo
- Force password change on first login (firstLogin flag ama logic)
- Xog lama celinayo, profile iyo natiijooyin waa la join-gareeyaa by studentID
- Admin/Staff kaliya ayaa reset u sameyn kara password haddii la ilaawo
- Audit log samee si loo ogaado ardayda aan weli password bedelin
- Waa scalable, ammaan, waqti badbaadin

---

Dukumentigan waa in lagu lifaaqo docs-ka mashruuca si team-ka oo dhan u fahmo lifecycle-ka Student.