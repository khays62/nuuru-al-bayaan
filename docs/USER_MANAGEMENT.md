

# User Management System (Admin & Staff)

Nidaamkan waxa uu xakameeyaa abuurista, maamulka, iyo xadidaadda xuquuqda (privileges) ee isticmaalayaasha Admin iyo Staff. Waa in qof kasta oo cusub si fudud u fahmi karo sida loo abuuro user, loo xakameeyo waxa uu qaban karo, iyo sida backend/frontend ay u wada shaqeeyaan.

## 1. Doorrada (Roles)

- **ADMIN:**
	- Waa qofka ugu sareeya nidaamka (superuser).
	- Wuxuu leeyahay awood buuxda: wuxuu abuuri karaa, tirtiri karaa, ama edit-gareyn karaa dhammaan users, students, grade sections, subjects, exams, iwm.
	- Marka user cusub la abuurayo, Admin-ka ayaa dooran kara privilege kasta oo uu user-kaas yeelanayo (checkbox group).
	- Tusaale: Admin wuxuu siin karaa Staff privilege ah "STUDENT_ADD" iyo "GRADESECTION_EDIT" oo kaliya.

- **STAFF:**
	- Waa shaqaale maamulka ama xafiiska.
	- Xuquuqdiisa waxa lagu xakameeyaa granular privileges (checkboxes):
		- Tusaale: "STUDENT_ADD" (ku dar arday), "STUDENT_EDIT" (edit arday), "GRADESECTION_DELETE" (tirtir fasal), iwm.
		- Privileges waa array of strings, mid kasta waxa uu matalaa action gaar ah.
	- Staff kasta waxa uu yeelan karaa xuquuq u gaar ah, sidaa darteed shaqooyinka waa la kala xadidi karaa.

### Tusaale Privileges Table

| Privilege            | Sharaxaad                        |
|----------------------|----------------------------------|
| STUDENT_ADD          | Ku dar arday cusub               |
| STUDENT_EDIT         | Edit-garee xogta arday           |
| STUDENT_DELETE       | Tirtir arday                     |
| GRADESECTION_ADD     | Ku dar fasal/section cusub       |
| GRADESECTION_EDIT    | Edit-garee fasal/section         |
| GRADESECTION_DELETE  | Tirtir fasal/section             |
| SUBJECT_ADD          | Ku dar subject cusub             |
| SUBJECT_EDIT         | Edit-garee subject               |
| SUBJECT_DELETE       | Tirtir subject                   |
| EXAM_ADD             | Ku dar imtixaan cusub            |
| EXAM_EDIT            | Edit-garee imtixaan              |
| EXAM_DELETE          | Tirtir imtixaan                  |

Privileges waa la ballaarin karaa mustaqbalka.


## 2. User Creation & Management

- **User Model:**
	- privileges: string[] (tusaale: ["STUDENT_ADD", "GRADESECTION_EDIT"])
	- fullName, username, passwordHash, status (Active/Inactive), iwm.
- **RBAC Middleware:**
	- requirePrivileges(["PRIVILEGE_NAME"]):
		- Tusaale: requirePrivileges(["STUDENT_ADD"]) → 403 Forbidden haddii user-ku uusan lahayn privilege-kaas.
- **Frontend (UserManagementPage):**
	- Admin oo kaliya ayaa geli kara page-kan.
	- Add/Edit User modal: checkbox group oo muujinaya privilege kasta (magac + sharaxaad).
	- Table: Full Name | Username | Privileges (chips) | Status | Actions (Edit, Delete, iwm)
	- Marka user la abuuro/edit-gareeyo, privileges waa la xulan karaa (checkboxes).
	- Action kasta (Add, Edit, Delete) waxa la xakameeyaa iyadoo la eegayo privileges user-ka (haddii privilege la waayo, button-ka waa la disable-gareeyaa ama lama muujiyo).

### Tusaale Flow

1. Admin wuxuu gujiyaa "Add User".
2. Foomka waxa uu leeyahay:
	- fullName, username, password, status
	- Privileges: [ ] STUDENT_ADD [ ] STUDENT_EDIT [ ] ... (checkboxes)
3. Admin wuxuu xulanayaa privileges uu user-kaas yeelanayo.
4. Marka la submit-gareeyo, user-ka cusub waxa uu kaydsan yahay privileges uu xushay.
5. Marka user login-galo, waxa uu sameyn karaa oo kaliya actions uu privilege u leeyahay.


## 3. Authentication & Access Control

- **Login:** Username/password, JWT session
- **RBAC (Role-Based Access Control):**
	- Backend: Middleware kasta waxa uu hubiyaa in user-ku leeyahay privilege sax ah ka hor inta aan la ogolaanin action (CRUD, iwm).
	- Frontend: UI-ga waxa la xakameeyaa privileges (tusaale: haddii user-ku uusan lahayn "STUDENT_ADD", Add Student button lama muujiyo).


## 4. API & UI/UX

- **API Endpoints:**
	- /api/users (CRUD, privileges)
	- /api/auth/login, /api/auth/me
	- /api/students, /api/grades/sections, /api/subjects, iwm (CRUD, privilege check)
- **Frontend:**
	- UserManagementPage: Add/Edit User (checkbox group), Table, Search, Sort
	- Action buttons (Add/Edit/Delete) waxa la xakameeyaa privileges

---


## 5. Xigashooyin (References)

- Wixii la xiriira Student eeg: STUDENT_WORKFLOW.md
- Wixii la xiriira Teacher eeg: TEACHER_WORKFLOW.md
