# Data Models (MongoDB/Mongoose)

Hoos waxaa ku taxan schemas iyo indexes sida ay hadda ugu jiraan backend-ka (`backend/models/*`).

## Student
- studentId: String (unique, index) — auto-generated: `STU-<YEAR>-0001`
- fullName: String (required)
- gender: 'Male' | 'Female' (required)
- dob: Date (required)
- guardianName: String (required)
- contactNumber: String (required)
- address: String (optional)
- admissionDate: Date (required)
- status: 'Active' | 'Inactive' (default: 'Active')
- timestamps

Indexes:
- unique: studentId
- text: fullName, studentId (search)

## Enrollment
- student: ObjectId(ref Student) (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- academicYear: ObjectId(ref AcademicYear) (required)
- grade: ObjectId(ref Grade) (required)
- shift: ObjectId(ref Shift) (required)
- sequenceInYear: 1 | 2 (default: 1) — mid-year dalacsiin gudaha isla AY
- status: 'active' | 'inactive' | 'transferred' | 'promoted' | 'graduated' | 'withdrawn' (default: 'active')
- joinedAt: Date (required)
- leftAt: Date (optional)
- timestamps

Indexes:
- unique: (student, academicYear, sequenceInYear)
- (gradeSection, status)
- (student, createdAt: -1)

## GradeSection
- section: String (required, default '1')
- capacity: Number (optional)
- grade: ObjectId(ref Grade) (required)
- academicYear: ObjectId(ref AcademicYear) (required)
- shift: ObjectId(ref Shift) (required)
- subjects: [ObjectId(ref Subject)]
- timestamps

Indexes:
- unique: (grade, academicYear, shift, section)
- Collection name: 'gradesections'

## Subject
- subjectName: String (required)
- subjectCode: String (unique, index)
- grades: [ObjectId(ref Grade)]
- timestamps

Indexes:
- subjectName: 1 (secondary for search)

## Grade
- gradeName: String (required, unique)
- timestamps

## AcademicYear
- yearName: String (required, unique)
- timestamps

## Shift
- shiftName: String (required, unique)
- timestamps

## ExamType
- typeName: String (required, unique)
- timestamps

## Exam
- examType: ObjectId(ref ExamType) (required)
- academicYear: ObjectId(ref AcademicYear) (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- timestamps

Indexes:
- unique: (examType, academicYear, gradeSection)

## ExamScore
- student: ObjectId(ref Student) (required)
- exam: ObjectId(ref Exam) (required)
- subject: ObjectId(ref Subject) (required)
- scoreObtained: Number (required)
- timestamps

Indexes:
- unique: (student, exam, subject)

## TransferLog
- student: ObjectId(ref Student) (required)
- fromGradeSection: ObjectId(ref GradeSection) (required)
- toGradeSection: ObjectId(ref GradeSection) (required)
- byUser: ObjectId(ref User) (optional)
- date: Date (default: now)
- reason: String (optional)
- notes: String (optional)
- reverted: Boolean (default: false)
- revertOf: ObjectId(ref TransferLog) (optional)
- timestamps

Indexes:
- (student, date: -1)

## User (placeholder)
- Model jira, laakiin auth/RBAC weli lama dhaqaajin; tixraac `USER_MANAGEMENT.md` mustaqbalka.
