# Diagrams (Mermaid)

Fiiro: Ku fur VS Code oo leh Mermaid preview ama isticmaal markdown viewer taageera Mermaid.

## 1) Data Flow Diagram (DFD – Level 0)
```mermaid
flowchart LR
  U[User]
  FE[Frontend]
  BE[Backend API]
  DB[(MongoDB)]

  U --> FE
  FE --> BE
  BE --> DB

  %% Lookups
  G[Grades]:::lk
  AY[Academic Years]:::lk
  SH[Shifts]:::lk
  BE <---> G
  BE <---> AY
  BE <---> SH

  %% Entities
  ST[Students]:::en
  EN[Enrollments]:::en
  GS[Grade Sections]:::en
  CO[Cohorts]:::en
  SB[Subjects]:::en
  TC[Teachers]:::en
  TT[Timetable]:::en
  AT[Attendance]:::en
  EX[Exams]:::en
  SC[Exam Scores]:::en
  TR[Transfers]:::en
  BE <---> ST
  BE <---> EN
  BE <---> GS
  BE <---> CO
  BE <---> SB
  BE <---> TC
  BE <---> TT
  BE <---> AT
  BE <---> EX
  BE <---> SC
  BE <---> TR

  classDef lk fill:#eef,stroke:#88a;
  classDef en fill:#efe,stroke:#8a8;
```

## 2) ERD (Simplified)
```mermaid
erDiagram
  STUDENT ||--o{ ENROLLMENT : has
  GRADE_SECTION ||--o{ ENROLLMENT : receives
  ACADEMIC_YEAR ||--o{ ENROLLMENT : occurs_in
  GRADE ||--o{ GRADE_SECTION : organizes
  SHIFT ||--o{ GRADE_SECTION : schedules
  GRADE ||--o{ SUBJECT : includes
  EXAM_TYPE ||--o{ EXAM : defines
  ACADEMIC_YEAR ||--o{ EXAM : in_year
  GRADE_SECTION ||--o{ EXAM : for_section
  EXAM ||--o{ EXAM_SCORE : records
  STUDENT ||--o{ EXAM_SCORE : attempts
  COHORT ||--o{ ENROLLMENT : groups
  STUDENT ||--o{ TRANSFER_LOG : moved

  STUDENT {
    string _id PK
    string fullName
    date dob
    string status
  }
  ENROLLMENT {
    string _id PK
    string studentId FK
    string gradeSectionId FK
    string academicYearId FK
    string gradeId FK
    string shiftId FK
    string cohortId FK
    string status
    date joinedAt
    date leftAt
  }
  GRADE_SECTION {
    string _id PK
    string gradeId FK
    string shiftId FK
    string section
  }
  SUBJECT {
    string _id PK
    string subjectName
    string subjectCode
  }
  GRADE {
    string _id PK
    string gradeName
  }
  ACADEMIC_YEAR {
    string _id PK
    string yearName
  }
  SHIFT {
    string _id PK
    string shiftName
  }
  EXAM_TYPE {
    string _id PK
    string typeName
  }
  EXAM {
    string _id PK
    string examTypeId FK
    string academicYearId FK
    string gradeSectionId FK
    number templateVersion
  }
  EXAM_SCORE {
    string _id PK
    string studentId FK
    string examId FK
    string subjectId FK
    number scoreObtained
  }
```

## 3) Sequence: Reassign Enrollment
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Students Page)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Click "Transfer/Reassign"
  FE->>API: GET /api/students/:id (prefill latest enrollment)
  API->>DB: findOne Enrollment (latest) + populate
  DB-->>API: latestEnrollment
  API-->>FE: latestEnrollment
  U->>FE: Select Target Grade/Shift/Section (optional: Target AY)
  FE->>API: GET /api/grades/sections?grade=...&shift=...
  API-->>FE: section options
  FE->>API: PATCH /api/transfers/:id { gradeSectionId, targetAcademicYear? }
  API->>DB: validate capacity + update Enrollment + create TransferLog
  DB-->>API: OK
  API-->>FE: { message: 'Transferred' }
  FE->>FE: Refresh table + toast success
```

## 4) Sequence: Students Filtering
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Students Page)
  participant API as Backend API
  participant DB as MongoDB

  note over FE: Load static lookups on mount
  FE->>API: GET /api/lookups/academic-years
  API->>DB: find AcademicYears
  DB-->>API: years
  API-->>FE: years list

  FE->>API: GET /api/lookups/grades
  API->>DB: find Grades
  DB-->>API: grades
  API-->>FE: grades list

  FE->>API: GET /api/lookups/shifts
  API->>DB: find Shifts
  DB-->>API: shifts
  API-->>FE: shifts list

  U->>FE: Select Academic Year
  U->>FE: Select Grade
  U->>FE: Select Shift
  FE->>API: GET /api/grades/sections?grade=...&shift=...
  API->>DB: find GradeSections by parents
  DB-->>API: sections
  API-->>FE: section options

  note over FE: Section dropdown enabled once parents chosen

  U->>FE: Apply filters (any combination)
  FE->>API: GET /api/students?academicYear=...&grade=...&shift=...&gradeSectionId=...
  API->>DB: Aggregate students with active enrollments
  DB-->>API: filtered students
  API-->>FE: paginated results
  FE->>FE: Render table, preserve sort only
```

## 5) Sequence: Exam Scoring & Summary
```mermaid
sequenceDiagram
  participant U as Teacher
  participant FE as Frontend (Exam Management)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Select AY, Grade, Shift, Section, Subject
  FE->>API: GET /api/exams/grid?academicYearId=&gradeSectionId=&subjectId=&templateVersion=
  API->>DB: aggregate enrolled students + exam type for section
  DB-->>API: grid
  API-->>FE: { ok, data: grid }

  U->>FE: Enter scores
  loop for each student
    FE->>API: PUT /api/exams/score { studentId, examId, subjectId, scoreObtained }
    API->>DB: upsert ExamScore (unique by student+exam+subject)
    DB-->>API: OK
    API-->>FE: { ok: true }
  end

  U->>FE: View summary
  FE->>API: GET /api/exams/summary?academicYearId=&gradeSectionId=&subjectId=&templateVersion=
  API->>DB: aggregate scores
  DB-->>API: summary
  API-->>FE: { ok, data: summary }
```
## 6) Sequence: Transcript Generation
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Transcript Page)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Select Student + AY (optional)
  FE->>API: GET /api/exams/transcript?studentId=&academicYearId=
  API->>DB: aggregate Student + Enrollments + ExamScores by AY/Subjects
  DB-->>API: transcript data
  API-->>FE: { ok, data: transcript }
  FE->>FE: Render printable transcript (header/footer)
```
