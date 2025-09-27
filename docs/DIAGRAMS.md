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
  SB[Subjects]:::en
  BE <---> ST
  BE <---> EN
  BE <---> GS
  BE <---> SB

  classDef lk fill:#eef,stroke:#88a;
  classDef en fill:#efe,stroke:#8a8;
```

## 2) ERD (Simplified)
```mermaid
erDiagram
  STUDENT ||--o{ ENROLLMENT : has
  GRADE_SECTION ||--o{ ENROLLMENT : receives
  ACADEMIC_YEAR ||--o{ GRADE_SECTION : groups
  GRADE ||--o{ GRADE_SECTION : organizes
  SHIFT ||--o{ GRADE_SECTION : schedules
  GRADE ||--o{ SUBJECT : includes

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
    string status
    date joinedAt
    date leftAt
  }
  GRADE_SECTION {
    string _id PK
    string gradeId FK
    string academicYearId FK
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
```

## 3) Sequence: Reassign Enrollment
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Students Page)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Click "Reassign"
  FE->>API: GET /students/:id (prefill AY/Grade/Shift)
  API->>DB: findOne Enrollment (latest) + populate
  DB-->>API: enrollment
  API-->>FE: latestEnrollment
  U->>FE: Select AY, Grade, Shift, Section
  FE->>API: PATCH /students/:id/enrollment/reassign {gradeSectionId}
  API->>DB: validate & update enrollment (same AY)
  DB-->>API: OK
  API-->>FE: { message: 'Enrollment reassigned' }
  FE->>FE: Refresh table + toast success
```

## 4) Sequence: Students Filtering
```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend (Students Page)
  participant API as Backend API
  participant DB as MongoDB

  U->>FE: Select Academic Year
  FE->>API: GET /api/grades?academicYear=... (optional)
  API->>DB: find Grades
  DB-->>API: grades
  API-->>FE: grades list

  U->>FE: Select Grade
  FE->>API: GET /api/shifts?grade=... (optional)
  API->>DB: find Shifts
  DB-->>API: shifts
  API-->>FE: shifts list

  U->>FE: Select Shift
  FE->>API: GET /api/grade-sections?academicYear=...&grade=...&shift=...
  API->>DB: find GradeSections by parents
  DB-->>API: sections
  API-->>FE: section options

  note over FE: Section dropdown enabled once parents chosen

  U->>FE: (Any combination of AY/Grade/Shift/Section)
  FE->>API: GET /api/students?academicYear=...&grade=...&shift=...&gradeSectionId=...
  API->>DB: Aggregate students with active enrollments
  DB-->>API: filtered students
  API-->>FE: paginated results
  FE->>FE: Render table, preserve sort only
```
