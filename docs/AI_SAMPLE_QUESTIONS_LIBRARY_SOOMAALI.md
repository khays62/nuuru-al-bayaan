# AI Sample Questions Library (Somali) — Tool-based

Ujeeddo: Su’aalahan waa tusaalooyin aad ku tijaabin karto AI chatbot-ka gudaha Nuuru Al-Bayaan. AI-ga ma sameeyo DB query “free-form”; wuxuu isticmaalaa tools la oggol yahay oo server-ku enforce gareeyo (role/permission/scope + limits).

Qoraal: Hal su’aal = hal tool (badanaa). Haddii su’aashu u baahato xog dheeraad ah, AI-gu wuxuu ku waydiin karaa faahfaahin (tusaale `gradeSectionId`, `date`, `month`).

---

## Student (Self-only)

### Timetable
- “Ii soo saar jadwalkayga usbuucan.” → `student_timetable_self` args `{}`
- “Jadwalkayga Isniin keliya ii keen.” → `student_timetable_self` args `{ "dayOfWeek": 1 }`
- “Maxaan leeyahay Arbacada 10:00?” → `student_timetable_self` args `{ "dayOfWeek": 3 }`
- “Jadwalka fasalkayga, 20 slot ugu badan.” → `student_timetable_self` args `{ "limit": 20 }`

### Attendance
- “Iga soo koob attendance-kayga bishaan (1 ilaa 30).” → `student_attendance_self_range_summary` args `{ "from": "2026-03-01", "to": "2026-03-30" }`
- “Imisa jeer ayaan maqnaa toddobaadkan?” → `student_attendance_self_range_summary` args `{ "from": "2026-03-01", "to": "2026-03-07" }`
- “Ka waran attendance-kayga 14 maalmood ee u dambeeyay?” → `student_attendance_self_range_summary` args `{ "from": "2026-02-16", "to": "2026-03-01" }`
- “Attendance-ka maanta ilaa berrito ii soo koob.” → `student_attendance_self_range_summary` args `{ "from": "2026-03-01", "to": "2026-03-02" }`

### Transcript
- “Ii soo saar index transcript-kayga (enrollments).” → `transcript_self_index` args `{}`
- “Muxuu ahaa fasalkaygii sanadkii hore?” → `transcript_self_index` args `{}`
- “Ii soo saar transcript-kayga (latest).” → `transcript_self_full` args `{ "mode": "latest" }`
- “Ii soo saar transcript-kayga oo dhan (full).” → `transcript_self_full` args `{ "mode": "full", "limitEnrollments": 6 }`

### Announcements
- “Maxaa announcements cusub?” → `announcements_recent` args `{ "limit": 10 }`
- “5-da ugu dambeysa i sii.” → `announcements_recent` args `{ "limit": 5 }`

---

## Teacher (Assignment-scoped)

### Assignments & Class roster
- “Ii sheeg fasallada aan hayo.” → `teacher_assignments` args `{}`
- “Ii soo saar roster-ka fasalkeyga (gradeSectionId waa kan: …).” → `teacher_class_roster` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 80 }`

### Timetable
- “Ii keen jadwalkayga (dhamaan fasallada aan haysto).” → `teacher_timetable_self` args `{}`
- “Kaliya casharrada aan anigu dhigayo (mineOnly).” → `teacher_timetable_self` args `{ "mineOnly": true }`
- “Isniin jadwalkayga ii soo saar.” → `teacher_timetable_self` args `{ "dayOfWeek": 1 }`

### Attendance (Teacher-scoped)
- “Attendance-ka fasalka X maanta ii soo koob.” → `teacher_attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance-ka period-ka 2 maanta?” → `teacher_attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>", "periodCode": "P2" }`
- “Attendance-ka fasalka X 14 maalmood (range).” → `teacher_attendance_class_range_summary` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "from": "2026-02-16", "to": "2026-03-01", "dailyLimit": 14 }`

### Results (Teacher-scoped)
- “Natiijooyinka subject-kayga fasalka X (subject summary).” → `results_class_summary` args `{ "academicYearId": "<ACADEMIC_YEAR_ID>", "gradeSectionId": "<GRADE_SECTION_ID>", "mode": "subject", "subjectId": "<SUBJECT_ID>", "topN": 20 }`

### Announcements
- “Announcements-ka fasalladayda la xiriira maxaa cusub?” → `announcements_recent` args `{ "limit": 10 }`
- “3-da ugu dambeysa i sii.” → `announcements_recent` args `{ "limit": 3 }`

---

## Staff (Permission-based)

Xasuusin: Staff tool availability waxay ku xiran tahay permissions-ka user-ka (PERMISSION_CONTRACT).

### Dashboard / permissions
- “Maxaa kooban dashboard-ka?” → `dashboard_summary` args `{}`
- “I tus permissions-kayga.” → `my_permissions` args `{}`

### Students
- “Raadi arday magaciisa ‘Ahmed’.” → `students_list` args `{ "q": "Ahmed", "limit": 20 }`
- “Ii keen ardayda fasalka (gradeSectionId) 50 ugu badan.” → `students_list` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 50 }`

### Teachers
- “Raadi teacher ‘Ayaan’.” → `teacher_profile` args `{ "q": "Ayaan", "limit": 10 }`

### Attendance
- “Attendance-ka fasalka X maanta.” → `attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 80 }`
- “Yaa calaamadeeyay attendance-ka fasalka X maanta?” → `attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance-ka fasalka X 30 maalmood (range).” → `attendance_class_range_summary` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "from": "2026-03-01", "to": "2026-03-30", "dailyLimit": 14 }`

### Transfers / Promotions
- “Transfers summary todobaadkan.” → `transfers_summary` args `{ "from": "2026-02-23", "to": "2026-03-01" }`
- “Transfer history arday: ‘STU-1002’.” → `student_transfer_history` args `{ "q": "STU-1002", "limit": 20 }`
- “Promotions summary bishan.” → `promotions_summary` args `{ "from": "2026-03-01", "to": "2026-03-31" }`

### Announcements
- “Announcements cusub 10-ka ugu dambeeya.” → `announcements_recent` args `{ "limit": 10 }`
- “Announcements count (range).” → `announcements_summary` args `{ "from": "2026-03-01", "to": "2026-03-31" }`

### Timetable
- “Jadwalka fasalka X (Isniin).” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "dayOfWeek": 1 }`
- “Jadwalka fasalka X oo dhan.” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>" }`

### Transcript
- “Index transcript-ka arday ‘STU-1002’.” → `transcript_student_index` args `{ "q": "STU-1002" }`
- “Index transcript-ka arday ID-giisa.” → `transcript_student_index` args `{ "studentId": "<STUDENT_OBJECT_ID>" }`
- “Transcript-ka arday (latest).” → `transcript_student_full` args `{ "q": "STU-1002", "mode": "latest" }`
- “Transcript-ka arday oo dhan (full).” → `transcript_student_full` args `{ "q": "STU-1002", "mode": "full", "limitEnrollments": 3 }`

### Results (if permitted)
- “Results summary fasalka X (overall/top 20).” → `results_class_summary` args `{ "academicYearId": "<ACADEMIC_YEAR_ID>", "gradeSectionId": "<GRADE_SECTION_ID>", "mode": "overall", "topN": 20 }`

### Security (if permitted)
- “Logins maanta.” → `logins_today` args `{}`
- “Audit summary 30 maalmood.” → `activity_summary` args `{ "from": "2026-02-01", "to": "2026-03-01" }`

### Finance (if permitted)
- “Expenses summary 7 maalmood (group by category).” → `finance_expenses_summary` args `{ "from": "2026-02-23", "to": "2026-03-01", "groupBy": "category" }`
- “Expenses summary (group by source).” → `finance_expenses_summary` args `{ "from": "2026-03-01", "to": "2026-03-31", "groupBy": "source" }`
- “Unpaid students March 2026 (without amounts).” → `finance_unpaid_students_summary` args `{ "month": "2026-03", "limit": 20, "includeAmounts": false }`
- “Unpaid students March 2026 (with amounts).” → `finance_unpaid_students_summary` args `{ "month": "2026-03", "limit": 20, "includeAmounts": true }`

---

## Admin (Full access; still safe)

### General
- “I tus dashboard summary.” → `dashboard_summary` args `{}`
- “I tus activity summary bisha Feb.” → `activity_summary` args `{ "from": "2026-02-01", "to": "2026-02-28" }`
- “Logins maanta.” → `logins_today` args `{}`

### Students / Teachers
- “Ardayda fasalka X.” → `students_list` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 50 }`
- “Raadi arday ‘Hodan’.” → `students_list` args `{ "q": "Hodan", "limit": 20 }`
- “Raadi teacher ‘Mohamed’.” → `teacher_profile` args `{ "q": "Mohamed", "limit": 20 }`

### Attendance
- “Attendance-ka fasalka X maanta.” → `attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance-ka fasalka X 31 maalmood (range).” → `attendance_class_range_summary` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "from": "2026-03-01", "to": "2026-03-31", "dailyLimit": 14 }`

### Timetable
- “Jadwalka fasalka X oo dhan.” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Jadwalka fasalka X Arbacada.” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "dayOfWeek": 3 }`

### Transcript
- “Transcript index arday ‘STU-1002’.” → `transcript_student_index` args `{ "q": "STU-1002" }`
- “Transcript-ka arday (latest).” → `transcript_student_full` args `{ "q": "STU-1002", "mode": "latest" }`
- “Transcript-ka arday oo dhan (full).” → `transcript_student_full` args `{ "q": "STU-1002", "mode": "full", "limitEnrollments": 3 }`

### Results
- “Results summary fasalka X (overall).” → `results_class_summary` args `{ "academicYearId": "<ACADEMIC_YEAR_ID>", "gradeSectionId": "<GRADE_SECTION_ID>", "mode": "overall", "topN": 20 }`
- “Difficulty ranking (subjects easiest→hardest).” → `results_class_summary` args `{ "academicYearId": "<ACADEMIC_YEAR_ID>", "gradeSectionId": "<GRADE_SECTION_ID>", "mode": "difficulty" }`

### Announcements
- “Announcements-kii ugu dambeeyay.” → `announcements_recent` args `{ "limit": 10 }`
- “Announcements count sanadkan.” → `announcements_summary` args `{ "from": "2026-01-01", "to": "2026-12-31" }`

### Transfers / Promotions
- “Transfers summary 90 maalmood.” → `transfers_summary` args `{ "from": "2025-12-01", "to": "2026-03-01" }`
- “Promotions summary 6 bilood.” → `promotions_summary` args `{ "from": "2025-09-01", "to": "2026-03-01" }`

### Finance
- “Expenses summary 30 maalmood group by category.” → `finance_expenses_summary` args `{ "from": "2026-02-01", "to": "2026-03-01", "groupBy": "category" }`
- “Unpaid students for 2026-03 (with amounts).” → `finance_unpaid_students_summary` args `{ "month": "2026-03", "includeAmounts": true, "limit": 50 }`

---

## Multilingual quick variants (Optional)

Ku tijaabi isla su’aalaha kor ku qoran adigoo ku qoraya:
- English: “Show my timetable for Monday.”
- Arabic: “أعطني جدول حصصي ليوم الاثنين.”

Nidaamka wuxuu ku jawaabi doonaa luqadda UI-ga (Accept-Language / locale).

---

# Expanded Prompt Sets (200+)

Qaybtan hoose waa “bulk” prompts si tijaabo degdeg ah loo sameeyo.

## Student — more

### Timetable (more)
- “Jadwalka Talaado ii saar.” → `student_timetable_self` args `{ "dayOfWeek": 2 }`
- “Jadwalka Khamiis ii saar.” → `student_timetable_self` args `{ "dayOfWeek": 4 }`
- “Jadwalka Jimce ii saar.” → `student_timetable_self` args `{ "dayOfWeek": 5 }`
- “Jadwalka Axad ii saar.” → `student_timetable_self` args `{ "dayOfWeek": 0 }`
- “Jadwalka Sabti ii saar.” → `student_timetable_self` args `{ "dayOfWeek": 6 }`
- “Miyaan leeyahay break maanta?” → `student_timetable_self` args `{}`
- “Casharka ugu horreeya Isniin waa maxay?” → `student_timetable_self` args `{ "dayOfWeek": 1 }`
- “Casharka ugu dambeeya Arbacada waa maxay?” → `student_timetable_self` args `{ "dayOfWeek": 3 }`

### Attendance (more)
- “Attendance-ka 3 maalmood ee ugu dambeeyay ii soo koob.” → `student_attendance_self_range_summary` args `{ "from": "2026-02-27", "to": "2026-03-01" }`
- “Attendance-ka 10 maalmood ii soo koob.” → `student_attendance_self_range_summary` args `{ "from": "2026-02-20", "to": "2026-03-01" }`
- “Attendance-ka 31 maalmood ii soo koob.” → `student_attendance_self_range_summary` args `{ "from": "2026-01-30", "to": "2026-03-01" }`
- “Imisa absent ayaan lahaa Feb 2026?” → `student_attendance_self_range_summary` args `{ "from": "2026-02-01", "to": "2026-02-28" }`
- “Imisa present ayaan lahaa Feb 2026?” → `student_attendance_self_range_summary` args `{ "from": "2026-02-01", "to": "2026-02-28" }`
- “Imisa late ayaan lahaa Feb 2026?” → `student_attendance_self_range_summary` args `{ "from": "2026-02-01", "to": "2026-02-28" }`
- “Attendance-kayga 1 ilaa 15 March ii soo koob.” → `student_attendance_self_range_summary` args `{ "from": "2026-03-01", "to": "2026-03-15" }`
- “Attendance-kayga 16 ilaa 31 March ii soo koob.” → `student_attendance_self_range_summary` args `{ "from": "2026-03-16", "to": "2026-03-31" }`

### Transcript (more)
- “Academic years-ka aan soo maray ii tax.” → `transcript_self_index` args `{}`
- “Fasallada aan soo maray ii tax (grade/shift/section).” → `transcript_self_index` args `{}`
- “Enrolment-kii ugu dambeeyay ii sheeg.” → `transcript_self_index` args `{}`
- “Enrolment-kii ugu horreeyay ii sheeg.” → `transcript_self_index` args `{}`

### Announcements (more)
- “2 announcements oo kaliya.” → `announcements_recent` args `{ "limit": 2 }`
- “15 announcements ii keen.” → `announcements_recent` args `{ "limit": 15 }`
- “Maxaa cusub oo fasalkeyga quseeya?” → `announcements_recent` args `{ "limit": 10 }`
- “Announcements-ka ugu dambeeya ee macalimiinta/ardayda la wadaago?” → `announcements_recent` args `{ "limit": 10 }`

## Teacher — more

### Assignments
- “Immisa fasal ayaan hayaa?” → `teacher_assignments` args `{}`
- “Fasalladayda ii tax (grade/shift/section).” → `teacher_assignments` args `{}`
- “Ma hayaa fasal shift-ka subax?” → `teacher_assignments` args `{}`
- “Ma hayaa fasal shift-ka galab?” → `teacher_assignments` args `{}`

### Roster
- “Roster ka keen fasalkeyga, 20 ugu horreeya.” → `teacher_class_roster` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 20 }`
- “Raadi arday roster-ka dhexdiisa (haddii magac la hayo).” → `teacher_class_roster` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 80 }`

### Timetable
- “Jadwalkayga Talaado.” → `teacher_timetable_self` args `{ "dayOfWeek": 2 }`
- “Jadwalkayga Khamiis.” → `teacher_timetable_self` args `{ "dayOfWeek": 4 }`
- “Jadwalkayga Jimce.” → `teacher_timetable_self` args `{ "dayOfWeek": 5 }`
- “Jadwalkayga Sabti.” → `teacher_timetable_self` args `{ "dayOfWeek": 6 }`
- “Casharrada aan anigu dhigayo usbuucan oo dhan.” → `teacher_timetable_self` args `{ "mineOnly": true }`
- “Fasalladayda jadwal ahaan (si aan u arko overlap).” → `teacher_timetable_self` args `{}`
- “Room-ka aan maanta ku jiro maxay yihiin?” → `teacher_timetable_self` args `{}`

### Attendance
- “Attendance-ka fasalka X Arbacada.” → `teacher_attendance_class_summary` args `{ "date": "2026-03-04", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance-ka fasalka X Khamiista.” → `teacher_attendance_class_summary` args `{ "date": "2026-03-05", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance-ka fasalka X Jimcaha.” → `teacher_attendance_class_summary` args `{ "date": "2026-03-06", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance-ka fasalka X period P1 maanta.” → `teacher_attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>", "periodCode": "P1" }`
- “Attendance-ka fasalka X period P3 maanta.” → `teacher_attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>", "periodCode": "P3" }`

### Announcements
- “Announcements 20-ka ugu dambeeya.” → `announcements_recent` args `{ "limit": 20 }`
- “Announcements-ka fasalladayda quseeya 5-da ugu dambeeya.” → `announcements_recent` args `{ "limit": 5 }`

## Staff — more

### Dashboard / permissions
- “Koobid dashboard: arday, macalin, fasallo.” → `dashboard_summary` args `{}`
- “Maxaan awoodaa inaan sameeyo? (permissions).” → `my_permissions` args `{}`
- “Ma haystaa permission transfers?” → `my_permissions` args `{}`
- “Ma haystaa permission finance?” → `my_permissions` args `{}`
- “Ma haystaa permission attendance?” → `my_permissions` args `{}`

### Students list / lookup
- “Raadi arday ID ‘STU-0001’.” → `students_list` args `{ "q": "STU-0001", "limit": 5 }`
- “Raadi arday magac ‘Ali’.” → `students_list` args `{ "q": "Ali", "limit": 20 }`
- “Raadi arday magac ‘Fatima’.” → `students_list` args `{ "q": "Fatima", "limit": 20 }`
- “Ardayda fasalka X 10 ugu horreeya.” → `students_list` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 10 }`
- “Ardayda fasalka X 30.” → `students_list` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 30 }`

### Teacher lookup
- “Raadi macalin ‘Hassan’.” → `teacher_profile` args `{ "q": "Hassan", "limit": 10 }`
- “Raadi macalin ‘Asha’.” → `teacher_profile` args `{ "q": "Asha", "limit": 10 }`
- “Raadi macalin ‘Said’.” → `teacher_profile` args `{ "q": "Said", "limit": 10 }`

### Attendance class summary
- “Attendance fasal X maanta, limit 40.” → `attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 40 }`
- “Attendance fasal X maanta period P2.” → `attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>", "periodCode": "P2" }`
- “Attendance fasal X shalay.” → `attendance_class_summary` args `{ "date": "2026-02-28", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance fasal X berrito (haddii la mark-gareeyay).” → `attendance_class_summary` args `{ "date": "2026-03-02", "gradeSectionId": "<GRADE_SECTION_ID>" }`

### Timetable
- “Jadwal fasal X (day 0).” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "dayOfWeek": 0 }`
- “Jadwal fasal X (day 6).” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "dayOfWeek": 6 }`
- “Jadwal fasal X, limit 50.” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 50 }`

### Announcements
- “Announcements recent 1.” → `announcements_recent` args `{ "limit": 1 }`
- “Announcements recent 8.” → `announcements_recent` args `{ "limit": 8 }`
- “Announcements count 7 maalmood.” → `announcements_summary` args `{ "from": "2026-02-23", "to": "2026-03-01" }`
- “Announcements count 30 maalmood.” → `announcements_summary` args `{ "from": "2026-02-01", "to": "2026-03-01" }`

### Transcript index
- “Transcript index for student q=‘Ahmed’ (haddii uu jiro).” → `transcript_student_index` args `{ "q": "Ahmed", "limit": 10 }`
- “Transcript index for student q=‘STU-1234’.” → `transcript_student_index` args `{ "q": "STU-1234" }`

### Transfers / promotions
- “Transfers summary 14 maalmood.” → `transfers_summary` args `{ "from": "2026-02-16", "to": "2026-03-01" }`
- “Transfers summary 60 maalmood.” → `transfers_summary` args `{ "from": "2026-01-01", "to": "2026-03-01" }`
- “Student transfer history q=‘Ali’.” → `student_transfer_history` args `{ "q": "Ali", "limit": 20 }`
- “Student transfer history q=‘STU-0007’.” → `student_transfer_history` args `{ "q": "STU-0007", "limit": 20 }`
- “Promotions summary last 30 days.” → `promotions_summary` args `{ "from": "2026-02-01", "to": "2026-03-01" }`
- “Promotions summary year-to-date.” → `promotions_summary` args `{ "from": "2026-01-01", "to": "2026-03-01" }`

### Security
- “Audit summary 7 days.” → `activity_summary` args `{ "from": "2026-02-23", "to": "2026-03-01" }`
- “Audit summary 90 days.” → `activity_summary` args `{ "from": "2025-12-01", "to": "2026-03-01" }`

### Finance
- “Expenses summary 1 day.” → `finance_expenses_summary` args `{ "from": "2026-03-01", "to": "2026-03-01", "groupBy": "category" }`
- “Expenses summary 7 days group by status.” → `finance_expenses_summary` args `{ "from": "2026-02-23", "to": "2026-03-01", "groupBy": "status" }`
- “Expenses summary 30 days group by source.” → `finance_expenses_summary` args `{ "from": "2026-02-01", "to": "2026-03-01", "groupBy": "source" }`
- “Unpaid students month=2026-01 (no amounts).” → `finance_unpaid_students_summary` args `{ "month": "2026-01", "limit": 20, "includeAmounts": false }`
- “Unpaid students month=2026-02 (with amounts).” → `finance_unpaid_students_summary` args `{ "month": "2026-02", "limit": 20, "includeAmounts": true }`
- “Unpaid students month=2026-03 (limit 50).” → `finance_unpaid_students_summary` args `{ "month": "2026-03", "limit": 50, "includeAmounts": false }`

## Admin — more

### Students list
- “Students list q=‘Abdi’.” → `students_list` args `{ "q": "Abdi", "limit": 20 }`
- “Students list q=‘STU-0100’.” → `students_list` args `{ "q": "STU-0100", "limit": 5 }`
- “Students list for class X (limit 50).” → `students_list` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "limit": 50 }`

### Teacher lookup
- “Teacher profile q=‘Yusuf’.” → `teacher_profile` args `{ "q": "Yusuf", "limit": 20 }`
- “Teacher profile q=‘Maryan’.” → `teacher_profile` args `{ "q": "Maryan", "limit": 20 }`

### Attendance
- “Attendance class X today.” → `attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>" }`
- “Attendance class X (period P4).” → `attendance_class_summary` args `{ "date": "2026-03-01", "gradeSectionId": "<GRADE_SECTION_ID>", "periodCode": "P4" }`

### Announcements
- “Announcements recent 20.” → `announcements_recent` args `{ "limit": 20 }`
- “Announcements count last 365 days.” → `announcements_summary` args `{ "from": "2025-03-01", "to": "2026-03-01" }`

### Timetable
- “Timetable class X dayOfWeek=2.” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "dayOfWeek": 2 }`
- “Timetable class X dayOfWeek=4.” → `timetable_class_slots` args `{ "gradeSectionId": "<GRADE_SECTION_ID>", "dayOfWeek": 4 }`

### Transcript
- “Transcript index student q=‘Fatima’.” → `transcript_student_index` args `{ "q": "Fatima", "limit": 10 }`
- “Transcript index student q=‘STU-2222’.” → `transcript_student_index` args `{ "q": "STU-2222" }`

### Transfers/promotions/security
- “Transfers summary last 30 days.” → `transfers_summary` args `{ "from": "2026-02-01", "to": "2026-03-01" }`
- “Promotions summary last 90 days.” → `promotions_summary` args `{ "from": "2025-12-01", "to": "2026-03-01" }`
- “Activity summary last 30 days.” → `activity_summary` args `{ "from": "2026-02-01", "to": "2026-03-01" }`
- “Logins today.” → `logins_today` args `{}`

### Finance
- “Finance expenses summary last 7 days.” → `finance_expenses_summary` args `{ "from": "2026-02-23", "to": "2026-03-01", "groupBy": "category" }`
- “Finance expenses summary last 90 days.” → `finance_expenses_summary` args `{ "from": "2025-12-01", "to": "2026-03-01", "groupBy": "category" }`
- “Finance unpaid students 2026-03 (with amounts, limit 10).” → `finance_unpaid_students_summary` args `{ "month": "2026-03", "includeAmounts": true, "limit": 10 }`
- “Finance unpaid students 2026-03 for gradeSectionId (with amounts).” → `finance_unpaid_students_summary` args `{ "month": "2026-03", "gradeSectionId": "<GRADE_SECTION_ID>", "includeAmounts": true, "limit": 50 }`
