# Diagrams (Mermaid)

Fiiro:
- Ku fur VS Code oo leh Mermaid preview, ama isticmaal Markdown viewer taageera Mermaid.
- Diagrams-kan waxaa lagu saleeyay *code-ka dhab ah* ee hadda jira (`backend/models/*` iyo routes/controllers).

## 1) System Data Flow (DFD – Level 0)

```mermaid
graph LR
  U[User]
  FE[Frontend]
  API[Backend API]
  DB[(MongoDB)]

  U --> FE
  FE --> API
  API --> DB

  FE -.-> API
  API -.-> FE

  D1[Students + Enrollment]
  D2[Grades + GradeSections]
  D3[Subjects]
  D4[Teachers + Assignments]
  D5[Timetable + Lesson Plans]
  D6[Attendance]
  D7[Exams + Scores]
  D8[Transfers]
  D9[Announcements]
  D10[Security + Audit]
  D11[Finance + Payroll]
  D12[Library]
  D13[AI Assistant]

  API --> D1
  API --> D2
  API --> D3
  API --> D4
  API --> D5
  API --> D6
  API --> D7
  API --> D8
  API --> D9
  API --> D10
  API --> D11
  API --> D12
  API --> D13
```

Qeexid: User = Admin / Staff / Teacher / Student.

## 2) ERD – Core Academic Models (Roster/Enrollment)

```mermaid
erDiagram
  STUDENT ||--o{ ENROLLMENT : has
  ACADEMIC_YEAR ||--o{ ENROLLMENT : in_year
  GRADE_SECTION ||--o{ ENROLLMENT : roster
  GRADE ||--o{ GRADE_SECTION : has
  SHIFT ||--o{ GRADE_SECTION : has
  COHORT ||--o{ ENROLLMENT : groups

  %% Denormalized: Enrollment stores grade + shift for fast filtering
  GRADE ||--o{ ENROLLMENT : snapshot
  SHIFT ||--o{ ENROLLMENT : snapshot

  %% Many-to-many (via arrays)
  GRADE_SECTION }o--o{ SUBJECT : offers
  SUBJECT }o--o{ GRADE : mapped_to

  STUDENT {
    string _id PK
    string studentId "generated after enrollment"
    string fullName
    string gender
    date dob
    string guardianName
    string contactNumber
    date admissionDate
    string status
  }

  ENROLLMENT {
    string _id PK
    string student FK
    string gradeSection FK
    string academicYear FK
    string grade FK
    string shift FK
    string cohort FK
    int sequenceInYear "1|2"
    string status "active/inactive/transferred/promoted/..."
    date joinedAt
    date leftAt
  }

  GRADE_SECTION {
    string _id PK
    string grade FK
    string shift FK
    string section
    int capacity
  }

  GRADE {
    string _id PK
    string gradeName
  }

  SHIFT {
    string _id PK
    string shiftName
  }

  ACADEMIC_YEAR {
    string _id PK
    string yearName
  }

  SUBJECT {
    string _id PK
    string subjectName
    string subjectCode
  }

  COHORT {
    string _id PK
    string name
    string startAcademicYear FK
    string status "active/archived"
  }
```

## 2b) ERD – Transfers + Counters (IDs)

```mermaid
erDiagram
  STUDENT ||--o{ TRANSFER_LOG : moved
  USER o|--o{ TRANSFER_LOG : byUser
  GRADE_SECTION ||--o{ TRANSFER_LOG : fromSection
  GRADE_SECTION ||--o{ TRANSFER_LOG : toSection

  STUDENT {
    string _id PK
  }

  USER {
    string _id PK
  }

  GRADE_SECTION {
    string _id PK
  }

  TRANSFER_LOG {
    string _id PK
    string student FK
    string fromGradeSection FK
    string toGradeSection FK
    string byUser FK
    date date
    bool reverted
    string revertOf
    string reason
    string notes
  }

  COUNTER {
    string _id PK
    string key
    int seq
  }
```

## 7b) ERD – Full System (All Models)

```mermaid
erDiagram
  %% -----------------------------
  %% Auth / Accounts / Security
  %% -----------------------------
  USER o|--|| STUDENT : studentRef
  USER o|--|| TEACHER : teacherRef

  USER ||--o{ AUDIT_LOG : emits

  %% Auth lock alerts can reference either User or Admin (or Unknown)
  USER o|--o{ AUTH_LOCK_EVENT : principal
  ADMIN o|--o{ AUTH_LOCK_EVENT : principal
  USER o|--o{ AUTH_LOCK_EVENT : resolvedBy
  ADMIN o|--o{ AUTH_LOCK_EVENT : resolvedBy

  %% Activity notifications (internal)
  USER o|--o{ ACTIVITY_NOTIFICATION : actorUserId
  USER o|--o{ ACTIVITY_NOTIFICATION : resolvedBy

  %% -----------------------------
  %% Core Academic
  %% -----------------------------
  STUDENT ||--o{ ENROLLMENT : has
  ACADEMIC_YEAR ||--o{ ENROLLMENT : inYear
  GRADE_SECTION ||--o{ ENROLLMENT : roster
  COHORT o|--o{ ENROLLMENT : cohort
  GRADE ||--o{ GRADE_SECTION : has
  SHIFT ||--o{ GRADE_SECTION : has

  %% Many-to-many (via arrays)
  GRADE_SECTION }o--o{ SUBJECT : offers
  SUBJECT }o--o{ GRADE : mapped

  TEACHER ||--o{ TEACHER_ASSIGNMENT : teaches
  GRADE_SECTION ||--o{ TEACHER_ASSIGNMENT : inSection
  SUBJECT ||--o{ TEACHER_ASSIGNMENT : forSubject

  GRADE_SECTION ||--o{ TIMETABLE : timetable
  SUBJECT o|--o{ TIMETABLE : subject
  TEACHER o|--o{ TIMETABLE : teacher

  TEACHER ||--o{ LESSON_PLAN : writes
  ACADEMIC_YEAR ||--o{ LESSON_PLAN : inYear
  GRADE_SECTION ||--o{ LESSON_PLAN : forSection
  SUBJECT ||--o{ LESSON_PLAN : forSubject

  EXAM_TYPE ||--o{ EXAM : defines
  ACADEMIC_YEAR ||--o{ EXAM : inYear
  GRADE_SECTION ||--o{ EXAM : forSection
  EXAM ||--o{ EXAM_SCORE : has
  STUDENT ||--o{ EXAM_SCORE : student
  SUBJECT ||--o{ EXAM_SCORE : subject

  GRADE_SECTION ||--o{ ATTENDANCE_RECORD : has
  STUDENT ||--o{ ATTENDANCE_RECORD : student
  TEACHER o|--o{ ATTENDANCE_RECORD : markedBy
  USER o|--o{ ATTENDANCE_RECORD : markedByUser

  GRADE_SECTION ||--o{ ATTENDANCE_AUDIT_LOG : has
  STUDENT ||--o{ ATTENDANCE_AUDIT_LOG : student
  TEACHER o|--o{ ATTENDANCE_AUDIT_LOG : markedBy

  STUDENT ||--o{ TRANSFER_LOG : moved
  USER o|--o{ TRANSFER_LOG : byUser
  GRADE_SECTION ||--o{ TRANSFER_LOG : fromSection
  GRADE_SECTION ||--o{ TRANSFER_LOG : toSection

  %% Announcements
  USER o|--o{ ANNOUNCEMENT : createdById
  GRADE_SECTION o|--o{ ANNOUNCEMENT : audience

  %% -----------------------------
  %% Library
  %% -----------------------------
  USER o|--o{ LIBRARY_RESOURCE : createdBy
  GRADE o|--o{ LIBRARY_RESOURCE : grade_scope
  SUBJECT o|--o{ LIBRARY_RESOURCE : subject_scope

  %% -----------------------------
  %% Finance
  %% -----------------------------
  FINANCE_CATEGORY ||--o{ FEE_INVOICE : items_category_embedded
  FINANCE_CATEGORY o|--o{ EXPENSE : categoryRef
  FINANCE_CATEGORY o|--o{ DONATION : project
  FINANCE_CATEGORY o|--o{ FINANCE_APPOINTMENT : amountType

  ACCOUNT o|--o{ FEE_TRANSACTION : received_to
  ACCOUNT o|--o{ EXPENSE : spent_from
  ACCOUNT o|--o{ PAYROLL : paid_from
  ACCOUNT o|--o{ DONATION : received_to

  STUDENT ||--o{ FEE : fee_ledger
  STUDENT ||--o{ STUDENT_FEE : monthly_charges
  STUDENT ||--o{ FEE_INVOICE : invoices
  STUDENT ||--o{ FEE_TRANSACTION : transactions
  STUDENT ||--o{ FINANCE_APPOINTMENT : appointments

  GRADE_SECTION o|--o{ FEE : for_section
  ACADEMIC_YEAR o|--o{ FEE : in_year

  FEE ||--o{ FEE_PAYMENT : payments_legacy
  STUDENT_FEE ||--o{ PAYMENT_LOG : payments_legacy

  FEE_INVOICE ||--o{ FEE_TRANSACTION : payments

  USER o|--o{ FEE_INVOICE : createdBy
  USER o|--o{ FEE_PAYMENT : receivedBy
  USER o|--o{ FEE_TRANSACTION : recordedBy
  USER o|--o{ EXPENSE : createdBy
  USER o|--o{ EXPENSE : approvedBy
  USER o|--o{ PAYROLL : processedBy
  USER o|--o{ PAYROLL : staff
  USER o|--o{ DONATION : recordedBy
  USER o|--o{ FINANCE_APPOINTMENT : createdBy

  DONOR ||--o{ DONATION : gives

  %% -----------------------------
  %% AI + Settings
  %% -----------------------------
  %% AiChatThread is polymorphic: (principalModel, principalId) can point to User/Student/Teacher/Admin.
  %% PrivacySettings is a singleton config document.

  USER {
    string _id PK
    string role
    string teacherRef
    string studentRef
  }

  ADMIN {
    string _id PK
    string username
  }

  STUDENT {
    string _id PK
    string studentId
  }

  TEACHER {
    string _id PK
    string teacherId
  }

  ENROLLMENT {
    string _id PK
    string student FK
    string gradeSection FK
    string academicYear FK
    string cohort FK
  }

  ACADEMIC_YEAR {
    string _id PK
    string yearName
  }

  GRADE {
    string _id PK
    string gradeName
  }

  SHIFT {
    string _id PK
    string shiftName
  }

  GRADE_SECTION {
    string _id PK
    string grade FK
    string shift FK
    string section
  }

  COHORT {
    string _id PK
    string name
  }

  SUBJECT {
    string _id PK
    string subjectName
  }

  TEACHER_ASSIGNMENT {
    string _id PK
    string teacher FK
    string gradeSection FK
    string subject FK
  }

  TIMETABLE {
    string _id PK
    string gradeSection FK
    string subject FK
    string teacher FK
  }

  LESSON_PLAN {
    string _id PK
    string teacher FK
    string academicYear FK
    string gradeSection FK
    string subject FK
  }

  EXAM_TYPE {
    string _id PK
    string typeName
  }

  EXAM {
    string _id PK
    string examType FK
    string academicYear FK
    string gradeSection FK
  }

  EXAM_SCORE {
    string _id PK
    string student FK
    string exam FK
    string subject FK
  }

  ATTENDANCE_RECORD {
    string _id PK
    string gradeSection FK
    string student FK
    string markedBy FK
    string markedByUser FK
  }

  ATTENDANCE_AUDIT_LOG {
    string _id PK
    string gradeSection FK
    string student FK
    string markedBy FK
  }

  TRANSFER_LOG {
    string _id PK
    string student FK
    string fromGradeSection FK
    string toGradeSection FK
    string byUser FK
    string revertOf
  }

  ANNOUNCEMENT {
    string _id PK
    string createdById FK
    string audienceType
  }

  AUDIT_LOG {
    string _id PK
    string user FK
    string action
  }

  AUTH_LOCK_EVENT {
    string _id PK
    string principalModel
    string principalId
    string resolvedBy
  }

  ACTIVITY_NOTIFICATION {
    string _id PK
    string category
    string action
    bool isRead
    date createdAt
  }

  PRIVACY_SETTINGS {
    string _id PK
    string singletonKey
  }

  AI_CHAT_THREAD {
    string _id PK
    string principalModel
    string principalId
    string locale
  }

  LIBRARY_RESOURCE {
    string _id PK
    string title
    string audience
    string grade FK
    string subject FK
    string kind
    string createdById FK
  }

  FINANCE_CATEGORY {
    string _id PK
    string name
    string type
    string status
  }

  FEE_TYPE {
    string _id PK
    string code
    string status
  }

  ACCOUNT {
    string _id PK
    string name
    string type
    string status
  }

  FEE_STRUCTURE {
    string _id PK
    string gradeSection FK
    int monthlyFee
  }

  FEE {
    string _id PK
    string student FK
    string gradeSection FK
    string academicYear FK
    int amount
    string status
  }

  STUDENT_FEE {
    string _id PK
    string student FK
    string gradeSection FK
    string month
    int amount
    string status
  }

  PAYMENT_LOG {
    string _id PK
    string studentFee FK
    int amount
    string method
    string receivedBy FK
  }

  FEE_INVOICE {
    string _id PK
    string student FK
    string academicYear FK
    string billingMonth
    int amount
    int paidAmount
    int balance
    string status
  }

  FEE_TRANSACTION {
    string _id PK
    string invoice FK
    string student FK
    string account FK
    int amount
    string status
  }

  FEE_PAYMENT {
    string _id PK
    string fee FK
    int amount
    string paymentMethod
    string receivedBy FK
  }

  EXPENSE {
    string _id PK
    string categoryRef FK
    string account FK
    string createdBy FK
    int amount
    string source
  }

  PAYROLL {
    string _id PK
    string staff FK
    string account FK
    string month
    int netSalary
    string status
  }

  DONOR {
    string _id PK
    string name
    string status
  }

  DONATION {
    string _id PK
    string donor FK
    string project FK
    string account FK
    int amount
  }

  FINANCE_APPOINTMENT {
    string _id PK
    string appointmentId
    string student FK
    string class FK
    string amountType FK
    string receipt FK
    string status
  }

  COUNTER {
    string _id PK
    string key
    int seq
  }
```

## 3) ERD – Teachers, Assignments, Timetable, Lesson Plans

```mermaid
erDiagram
  TEACHER ||--o{ TEACHER_ASSIGNMENT : teaches
  GRADE_SECTION ||--o{ TEACHER_ASSIGNMENT : assigned_in
  SUBJECT ||--o{ TEACHER_ASSIGNMENT : for_subject

  GRADE_SECTION ||--o{ TIMETABLE : has
  SUBJECT ||--o{ TIMETABLE : scheduled
  TEACHER ||--o{ TIMETABLE : scheduled

  TEACHER ||--o{ LESSON_PLAN : writes
  ACADEMIC_YEAR ||--o{ LESSON_PLAN : in_year
  GRADE_SECTION ||--o{ LESSON_PLAN : for_section
  SUBJECT ||--o{ LESSON_PLAN : for_subject

  TEACHER {
    string _id PK
    string teacherId
    string fullName
    string email
    string phone
    string status
    string lastAcademicYear FK
  }

  TEACHER_ASSIGNMENT {
    string _id PK
    string teacher FK
    string gradeSection FK
    string subject FK
    string role "main/assistant"
  }

  TIMETABLE {
    string _id PK
    string gradeSection FK
    bool isBreak
    string subject FK
    string teacher FK
    int dayOfWeek "0..6"
    string startTime "HH:MM"
    string endTime
    string room
  }

  LESSON_PLAN {
    string _id PK
    string teacher FK
    string academicYear FK
    string gradeSection FK
    string subject FK
    date date
    string topic
  }
```

## 4) ERD – Exams & Scores (Results/Transcript)

```mermaid
erDiagram
  EXAM_TYPE ||--o{ EXAM : defines
  ACADEMIC_YEAR ||--o{ EXAM : in_year
  GRADE_SECTION ||--o{ EXAM : for_section

  EXAM ||--o{ EXAM_SCORE : has
  STUDENT ||--o{ EXAM_SCORE : receives
  SUBJECT ||--o{ EXAM_SCORE : for_subject

  EXAM_TYPE {
    string _id PK
    string typeName
    int templateVersion
    int maxScore
    int templateTotal
    int order
    bool isActive
  }

  EXAM {
    string _id PK
    string examType FK
    string academicYear FK
    string gradeSection FK
    int templateVersion
  }

  EXAM_SCORE {
    string _id PK
    string student FK
    string exam FK
    string subject FK
    int scoreObtained
  }
```

## 5) ERD – Attendance + Audit

```mermaid
erDiagram
  GRADE_SECTION ||--o{ ATTENDANCE_RECORD : has
  STUDENT ||--o{ ATTENDANCE_RECORD : tracked
  TEACHER ||--o{ ATTENDANCE_RECORD : markedBy
  USER ||--o{ ATTENDANCE_RECORD : actor

  GRADE_SECTION ||--o{ ATTENDANCE_AUDIT_LOG : has
  STUDENT ||--o{ ATTENDANCE_AUDIT_LOG : tracked
  TEACHER ||--o{ ATTENDANCE_AUDIT_LOG : markedBy

  ATTENDANCE_RECORD {
    string _id PK
    date date
    string gradeSection FK
    string periodCode
    string student FK
    string status
    string markedBy FK
    string markedByUser FK
    string markedByRole
    string updatedByUser FK
    string updatedByRole
    string remarks
  }

  ATTENDANCE_AUDIT_LOG {
    string _id PK
    date date
    string gradeSection FK
    string periodCode
    string student FK
    string oldStatus
    string newStatus
    string markedBy FK
  }
```

## 6) ERD – Auth/Security + Audit Logs

```mermaid
erDiagram
  %% Accounts
  USER o|--|| STUDENT : studentRef
  USER o|--|| TEACHER : teacherRef

  USER ||--o{ AUDIT_LOG : emits

  %% Auth lock alerts can reference either User or Admin (or Unknown)
  USER o|--o{ AUTH_LOCK_EVENT : principal
  ADMIN o|--o{ AUTH_LOCK_EVENT : principal
  USER o|--o{ AUTH_LOCK_EVENT : resolvedBy
  ADMIN o|--o{ AUTH_LOCK_EVENT : resolvedBy

  USER {
    string _id PK
    string username
    string email
    string phone
    string role "admin/staff/teacher/student"
    string teacherRef FK
    string studentRef FK
    int tokenVersion
    date announcementsLastSeenAt
    string status
  }

  ADMIN {
    string _id PK
    string username
    string role "admin (legacy)"
    int tokenVersion
    date lockUntil
  }

  AUDIT_LOG {
    string _id PK
    string user FK
    string action
    string description
    string ip
    string device
    date timestamp
  }

  AUTH_LOCK_EVENT {
    string _id PK
    string principalModel "User/Admin/Unknown"
    string principalId
    string username
    string role
    date lockUntil
    bool isRead
    date resolvedAt
    string resolvedBy
  }
```

## 7) ERD – Announcements (Scoped + Unread)

```mermaid
erDiagram
  USER o|--o{ ANNOUNCEMENT : createdById
  GRADE_SECTION o|--o{ ANNOUNCEMENT : audience

  ANNOUNCEMENT {
    string _id PK
    string title
    string body
    string author
    string role
    string audienceType "all|gradeSections"
    string createdById FK
    date date
    string updatedBy
    string updatedByRole
    date updatedAt
  }
```

## 8) Sequence – Transfer/Reassign Enrollment

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Transfers/Students)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Open Transfers
  FE->>API: GET /api/transfers/candidates
  API->>DB: query Students + active Enrollment
  DB-->>API: candidates
  API-->>FE: candidates

  U->>FE: Choose student + new Grade/Shift/Section
  FE->>API: GET /api/grades/sections?grade=...&shift=...
  API->>DB: find GradeSections
  DB-->>API: sections
  API-->>FE: section options

  FE->>API: PATCH /api/transfers/:id { gradeSectionId, targetAcademicYear?, reason?, notes? }
  API->>DB: update Enrollment + create TransferLog
  DB-->>API: OK
  API-->>FE: { message }
  FE->>FE: refresh list + toast
```

## 9) Sequence – Students Filtering (Lookups + Roster)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Students Page)
  participant API as Backend API
  participant DB as MongoDB

  note over FE: Load lookups on mount
  FE->>API: GET /api/lookups/academic-years
  API->>DB: find AcademicYear
  DB-->>API: years
  API-->>FE: years

  FE->>API: GET /api/lookups/grades
  API->>DB: find Grade
  DB-->>API: grades
  API-->>FE: grades

  FE->>API: GET /api/lookups/shifts
  API->>DB: find Shift
  DB-->>API: shifts
  API-->>FE: shifts

  U->>FE: Select Grade + Shift
  FE->>API: GET /api/grades/sections?grade=...&shift=...
  API->>DB: find GradeSection
  DB-->>API: sections
  API-->>FE: sections

  U->>FE: Apply filters
  FE->>API: GET /api/students?academicYearId=&gradeSectionId=&status=
  API->>DB: aggregate Student + Enrollment
  DB-->>API: results
  API-->>FE: results
```

## 10) Sequence – Exam Grid, Scoring, Summary

```mermaid
sequenceDiagram
  participant U as Teacher
  participant FE as Frontend (Exams)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Select AY + GradeSection + Subject + templateVersion
  FE->>API: GET /api/exams/grid?academicYearId=&gradeSectionId=&subjectId=&templateVersion=
  API->>DB: aggregate Enrollment + Exam + ExamScores
  DB-->>API: grid
  API-->>FE: grid

  loop each score edit
    FE->>API: PUT /api/exams/score { studentId, examId, subjectId, scoreObtained }
    API->>DB: upsert ExamScore (student+exam+subject unique)
    DB-->>API: OK
    API-->>FE: OK
  end

  FE->>API: GET /api/exams/summary?academicYearId=&gradeSectionId=&subjectId=&templateVersion=
  API->>DB: aggregate summary
  DB-->>API: summary
  API-->>FE: summary
```

## 11) Sequence – Transcript Generation

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Transcript)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Select Student + AY(optional)
  FE->>API: GET /api/exams/transcript?studentId=&academicYearId=
  API->>DB: aggregate Student + Enrollment + ExamScore
  DB-->>API: transcript
  API-->>FE: transcript
  FE->>FE: render printable transcript
```

## 12) Sequence – Announcements (Realtime + Unread)

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Announcements + Sidebar)
  participant API as Backend API
  participant DB as MongoDB

  note over FE: On login (navbar) open SSE stream
  FE-->>API: GET /api/announcements/stream (SSE)
  API-->>FE: event: hello/ping

  note over FE: Badge polling
  FE->>API: GET /api/announcements/unread-count
  API->>DB: count visible announcements newer than User.announcementsLastSeenAt
  DB-->>API: count
  API-->>FE: { count }

  U->>FE: Open Announcements page
  FE->>API: POST /api/announcements/mark-read
  API->>DB: update User.announcementsLastSeenAt
  DB-->>API: OK
  API-->>FE: { success: true }

  opt Create announcement
    U->>FE: Post announcement
    FE->>API: POST /api/announcements
    API->>DB: insert Announcement (scoped by role)
    DB-->>API: created
    API-->>FE: created
    API-->>FE: SSE event: created
  end

  opt Update/Delete announcement
    FE->>API: PUT/DELETE /api/announcements/:id
    API->>DB: update/delete (ownership rules enforced)
    DB-->>API: OK
    API-->>FE: OK
    API-->>FE: SSE event: updated/deleted
  end
```

## 13) ERD – Library (Resources + Audience)

```mermaid
erDiagram
  USER o|--o{ LIBRARY_RESOURCE : createdBy
  GRADE o|--o{ LIBRARY_RESOURCE : grade_scope
  SUBJECT o|--o{ LIBRARY_RESOURCE : subject_scope

  LIBRARY_RESOURCE {
    string _id PK
    string title
    string description
    string category
    string audience "public|level"
    string grade FK
    string subject FK
    string kind "pdf|link"
    string linkUrl
    string file.url
    string file.path
    string createdById FK
    date createdAt
  }
```

## 14) ERD – Finance (Invoices/Transactions/Expenses/Payroll)

```mermaid
erDiagram
  STUDENT ||--o{ FEE_INVOICE : billed
  FINANCE_CATEGORY o|--o{ FEE_INVOICE_ITEM : categorized
  FEE_INVOICE ||--o{ FEE_TRANSACTION : paid_by
  ACCOUNT o|--o{ FEE_TRANSACTION : received_to

  ACCOUNT o|--o{ EXPENSE : spent_from
  FINANCE_CATEGORY o|--o{ EXPENSE : categoryRef

  USER o|--o{ PAYROLL : staff
  ACCOUNT o|--o{ PAYROLL : paid_from

  DONOR ||--o{ DONATION : gives
  FINANCE_CATEGORY o|--o{ DONATION : project
  ACCOUNT o|--o{ DONATION : received_to

  STUDENT ||--o{ FINANCE_APPOINTMENT : schedules
  FINANCE_CATEGORY o|--o{ FINANCE_APPOINTMENT : amountType
  FEE_TRANSACTION o|--o{ FINANCE_APPOINTMENT : receipt

  FEE_INVOICE {
    string _id PK
    string student FK
    string academicYear FK
    string billingMonth
    string title
    int amount
    int paidAmount
    int balance
    string status
    date dueDate
  }

  FEE_INVOICE_ITEM {
    string name
    int amount
    string category FK
  }

  FEE_TRANSACTION {
    string _id PK
    string invoice FK
    string student FK
    string account FK
    string transactionType
    string targetMonth
    int amount
    string method
    string status
    string paymentGroup
    date date
  }

  ACCOUNT {
    string _id PK
    string name
    string type
    string institution
    string accountNumber
    int balance
    string status
  }

  FINANCE_CATEGORY {
    string _id PK
    string name
    string type "fee|expense|donation|paymentMethod"
    string status
  }

  EXPENSE {
    string _id PK
    string title
    string category
    string categoryRef FK
    int amount
    string source
    string payrollRef FK
    date date
  }

  PAYROLL {
    string _id PK
    string staff FK
    string month
    int basicSalary
    int netSalary
    string status
    string account FK
    date paymentDate
  }

  DONOR {
    string _id PK
    string name
    string type
    string status
  }

  DONATION {
    string _id PK
    string donor FK
    int amount
    string project FK
    string account FK
    string method
    date date
  }

  FINANCE_APPOINTMENT {
    string _id PK
    string appointmentId
    string student FK
    string class FK
    string amountType FK
    int expectedAmount
    date appointmentDateTime
    string status
    string receipt FK
  }
```

## 15) ERD – AI + Security Settings

```mermaid
erDiagram
  PRIVACY_SETTINGS {
    string _id PK
    string singletonKey "unique"
  }

  AI_CHAT_THREAD {
    string _id PK
    string principalModel
    string principalId
    string locale
    string activeThreadId
  }

  ACTIVITY_NOTIFICATION {
    string _id PK
    string category
    string action
    string title
    bool isRead
    date resolvedAt
    date createdAt
  }

  AUTH_LOCK_EVENT {
    string _id PK
    string principalModel
    string principalId
    string username
    date lockUntil
    bool isRead
    date resolvedAt
  }
```
