# Data Models (MongoDB/Mongoose)

Hoos waxaa ku taxan schemas iyo indexes sida ay hadda ugu jiraan backend-ka (`backend/models/*`).

## Student
- studentId: String (unique via partial index) — waxaa la siiyaa kadib marka Enrollment la sameeyo (controller ayaa generate-gareeya)
- fullName: String (required)
- gender: 'Male' | 'Female' (required)
- dob: Date (required)
- guardianName: String (required)
- contactNumber: String (required)
- address: String (optional)
- admissionDate: Date (required)
- password: String (required) — stored hashed (bcrypt), default initial password
- role: String (default: 'student')
- failedLoginAttempts: Number (default: 0)
- lockUntil: Date (default: null)
- status: 'Active' | 'Inactive' (default: 'Active')
- timestamps

Indexes:
- unique (partial): studentId (kaliya marka uu yahay string aan madhnayn)
- text: fullName, studentId (search)

## Enrollment
- student: ObjectId(ref Student) (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- academicYear: ObjectId(ref AcademicYear) (required)
- grade: ObjectId(ref Grade) (required)
- shift: ObjectId(ref Shift) (required)
- cohort: ObjectId(ref Cohort) (optional) — denormalized (filter/warbixin)
- sequenceInYear: 1 | 2 (default: 1) — mid-year dalacsiin gudaha isla AY
- status: 'active' | 'inactive' | 'transferred' | 'promoted' | 'graduated' | 'withdrawn' (default: 'active')
- joinedAt: Date (required)
- leftAt: Date (optional)
- timestamps

Indexes:
- unique: (student, academicYear, sequenceInYear)
- (gradeSection, status)
- (cohort, status)
- (student, createdAt: -1)

## GradeSection
- section: String (required, default '1')
- capacity: Number (optional)
- grade: ObjectId(ref Grade) (required)
- shift: ObjectId(ref Shift) (required)
- subjects: [ObjectId(ref Subject)]
- timestamps

Indexes:
- unique: (grade, shift, section)
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
- templateVersion: Number (default: 1) — version-ka template-ka exam-ka (si scores loo kala saaro)
- timestamps

Indexes:
- unique: (examType, academicYear, gradeSection, templateVersion)

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
- toGradeSection: ObjectId(ref GradeSection) (optional)
- byUser: ObjectId(ref User) (optional)
- date: Date (default: now)
- reason: String (optional)
- notes: String (optional)
- reverted: Boolean (default: false)
- revertOf: ObjectId(ref TransferLog) (optional)
- timestamps

Indexes:
- (student, date: -1)

## User (Auth/RBAC)

Nidaamku wuxuu adeegsadaa `User` si loogu maamulo accounts (admin/staff/teacher/student) iyo permissions (RBAC).

Qodobo muhiim ah (kooban):
- username: String (unique)
- email: String (unique, sparse)
- phone: String (unique, sparse)
- password: String (hashed)
- tokenVersion: Number — invalidate JWTs hore
- teacherRef: ObjectId(ref Teacher) (optional)
- studentRef: ObjectId(ref Student) (optional)
- mustChangePassword: Boolean (default: false)
- role: 'admin' | 'staff' | 'teacher' | 'student'
- permissions: object (modules: students/teachers/transfers/subjects/grades/exams/cohorts/results/transcript/promotions/timetable/attendance/...)
- failedLoginAttempts: Number, lockUntil: Date, loginCooldownLevel: Number
- status: 'active' | 'inactive'
- timestamps

## Cohort
- name: String (required, unique)
- startAcademicYear: ObjectId(ref AcademicYear) (required)
- status: 'active' | 'archived' (default: 'active')
- timestamps

Indexes:
- unique: name
- (status)

## Teacher
- fullName: String (required, unique)
- teacherId: String (required, unique, index)
- email: String (unique, sparse)
- phone: String (unique, sparse)
- status: 'active' | 'inactive' (default: 'active')
- lastAcademicYear: ObjectId(ref AcademicYear) (optional)
- timestamps

## TeacherAssignment
- teacher: ObjectId(ref Teacher) (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- subject: ObjectId(ref Subject) (required)
- role: 'main' | 'assistant' (default: 'main')
- timestamps

Indexes:
- unique: (teacher, gradeSection, subject)

## Timetable
- gradeSection: ObjectId(ref GradeSection) (required)
- isBreak: Boolean (default: false)
- subject: ObjectId(ref Subject) (required if !isBreak)
- teacher: ObjectId(ref Teacher) (required if !isBreak)
- dayOfWeek: Number (0..6) (required)
- startTime: String (HH:MM) (required)
- endTime: String (required)
- room: String (optional)
- timestamps

Indexes:
- (teacher, dayOfWeek, startTime)
- (gradeSection, dayOfWeek, startTime)
- (gradeSection, dayOfWeek, startTime, endTime)

## AttendanceRecord
- date: Date (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- periodCode: String (optional)
- student: ObjectId(ref Student) (required)
- status: 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'medical' | 'family' | 'other' (required)
- markedBy: ObjectId(ref Teacher) (optional)
- markedByUser: ObjectId(ref User) (optional)
- markedByRole: 'admin' | 'staff' | 'teacher' | null (optional)
- updatedByUser: ObjectId(ref User) (optional)
- updatedByRole: 'admin' | 'staff' | 'teacher' | null (optional)
- remarks: String (default '')
- timestamps

Indexes:
- (gradeSection, date, periodCode, student)
