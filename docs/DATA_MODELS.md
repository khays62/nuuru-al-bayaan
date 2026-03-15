# Data Models (MongoDB/Mongoose)

Hoos waxaa ku taxan schemas iyo indexes sida ay hadda ugu jiraan backend-ka (`backend/models/*`).

## Student
- studentId: String (unique via partial index) — waxaa la siiyaa kadib marka Enrollment la sameeyo (controller ayaa generate-gareeya)
- fullName: String (required)
- motherName: String (default '')
- gender: 'Male' | 'Female' (required)
- dob: Date (required)
- birthPlace: String (default '')
- guardianName: String (required)
- guardianRelationship: 'Father' | 'Mother' | 'Guardian' | 'Other' (default: 'Guardian')
- contactNumber: String (required)
- guardianPhone1: String (default '')
- guardianPhone2: String (default '')
- guardianEmail: String (default '')
- studentPhone: String (default '')
- studentEmail: String (default '')
- photo: { url, path, mimeType, size, uploadedAt }
- transfer: { isTransfer, previousSchoolName, transferReason }
- notes: String (default '')
- medical: { allergies, medicalConditions, disabilityFlags[], bloodGroup }
- idDocument: { idType, idNumber, issuedBy, expiresAt }
- address: String (optional)
- isSomali: Boolean
- residenceRegionId/residenceDistrictId/residenceNeighborhood: String
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
- order: Number (optional, unique, sparse) — DB-driven ordering (e.g., 1..10)
- timestamps

## AcademicYear
- yearName: String (required, unique)
- timestamps

## Shift
- shiftName: String (required, unique)
- timestamps

## ExamType
- typeName: String (required)
- templateVersion: Number (default: 1)
- maxScore: Number (default: 100)
- templateTotal: Number (default: 100)
- order: Number (default: 0)
- isActive: Boolean (default: true)
- timestamps

Indexes:
- unique: (templateVersion, typeName)
- (templateVersion, order)

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

## Counter

Generic counter collection used for sequential IDs per key.

- key: String (required, unique)
- seq: Number (default 0)

## Admin (legacy)

Legacy admin account model (still referenced by some security flows like `AuthLockEvent`).

- username: String (required, unique)
- password: String (required)
- tokenVersion: Number (default 0)
- role: 'admin' | 'staff' | 'teacher' | 'student' (default: 'admin')
- failedLoginAttempts: Number (default 0)
- lockUntil: Date | null
- loginCooldownLevel: Number (default 0)
- timestamps

## User (Auth/RBAC)

Nidaamku wuxuu adeegsadaa `User` si loogu maamulo accounts (admin/staff/teacher/student) iyo permissions (RBAC).

Qodobo muhiim ah (kooban):
- username: String (unique)
- email: String (unique, sparse)
- phone: String (unique, sparse)
- phone2: String (default '')
- staffCode: String (unique, sparse) — internal code (e.g., ST-000001)
- salary: Number (default 0)
- unit/jobTitle: String
- nationality/isSomali/residenceRegionId/residenceDistrictId/residenceNeighborhood
- photo: { url, path, mimeType, size, uploadedAt }
- password: String (hashed)
- tokenVersion: Number — invalidate JWTs hore
- teacherRef: ObjectId(ref Teacher) (optional)
- studentRef: ObjectId(ref Student) (optional)
- mustChangePassword: Boolean (default: false)
- role: 'admin' | 'staff' | 'teacher' | 'student'
- permissions: object (modules: students/teachers/transfers/subjects/grades/exams/cohorts/results/transcript/promotions/timetable/attendance/...)
- failedLoginAttempts: Number, lockUntil: Date, loginCooldownLevel: Number
- announcementsLastSeenAt: Date (default null) — unread count tracking
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
- employeeId: String (unique, sparse) — internal staff code
- teacherId: String (required, unique, index)
- email: String (unique, sparse)
- phone: String (unique, sparse)
- phone2: String (default '')
- gender: 'Male' | 'Female' | ''
- dob: Date
- nationality: String
- isSomali/residenceRegionId/residenceDistrictId/residenceNeighborhood
- hireDate: Date
- employmentType: 'full-time' | 'part-time' | 'contract' | ''
- salary: Number (default 0)
- specialization/qualification: String
- yearsOfExperience: Number
- notes: String
- photo: { url, path, mimeType, size, uploadedAt }
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

## AttendanceAuditLog
- date: Date (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- periodCode: String (required)
- student: ObjectId(ref Student) (required)
- oldStatus: status enum | null
- newStatus: status enum (required)
- markedBy: ObjectId(ref Teacher) (optional)
- timestamps

Indexes:
- (gradeSection, date, periodCode, student, createdAt: -1)
- (markedBy, createdAt: -1)

## LessonPlan
- teacher: ObjectId(ref Teacher) (required)
- academicYear: ObjectId(ref AcademicYear) (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- subject: ObjectId(ref Subject) (required)
- date: Date (required)
- topic: String (required)
- objectives/materials/notes: String
- timestamps

Indexes:
- (teacher, academicYear, gradeSection, subject, date)

## Announcement
- title: String (required)
- body: String (required)
- author: String
- role: String
- audienceType: 'all' | 'gradeSections' (default: 'all')
- audienceGradeSections: [ObjectId(ref GradeSection)]
- createdById: ObjectId(ref User) | null
- updatedBy/updatedByRole: String | null
- updatedAt: Date | null
- date: Date (default now)

## AuditLog
- user: ObjectId(ref User) (required)
- action: String (required)
- description: String
- aggregateKey: String
- metadata: Mixed
- ip: String
- device: String
- timestamp: Date (default now)

Indexes:
- (user, action, aggregateKey, timestamp: -1)

## AuthLockEvent
- principalModel: 'User' | 'Admin' | 'Unknown' (required)
- principalId: ObjectId | null (required unless principalModel='Unknown')
- username/fullName/role: String
- lockUntil: Date | null
- ip/userAgent: String
- occurrences: Number
- firstSeenAt/lastSeenAt: Date
- isRead: Boolean
- resolvedAt: Date | null
- resolvedBy: ObjectId | null
- resolution: String

Indexes:
- (resolvedAt, isRead, lastSeenAt: -1)
- (principalModel, principalId, resolvedAt)

## ActivityNotification
- category/action/title: String (required)
- message: String
- actorUserId: ObjectId | null
- actorName/actorRole: String
- classLabel/subjectLabel: String
- metadata: Mixed
- aggregateKey: String
- isRead: Boolean
- resolvedAt: Date | null
- resolvedBy: ObjectId | null
- createdAt: Date (default now)

Indexes:
- (resolvedAt, isRead, createdAt: -1)
- (category, action, createdAt: -1)
- (actorUserId, category, action, aggregateKey, createdAt: -1)

## PrivacySettings
- singletonKey: String (unique, default: 'privacy-policy')
- loginProtection: { enabled, stageOneAttempts/cooldown, stageTwoAttempts/cooldown, stageThreeAttempts/cooldown, lockoutSeconds, maxIdentifierLength, maxPasswordLength }
- passwordPolicy: { minLength, maxLength, requireUppercase/Lowercase/Number/Symbol }
- sessionPolicy: { idleTimeoutMinutes }
- studentDashboard: { profile, enrollments, transcript, attendance, timetable, finance, library, transfers }
- timestamps

## AiChatThread
- principalModel: String (required)
- principalId: ObjectId (required)
- locale: String (default: 'en')
- activeThreadId: ObjectId | null
- threads: [{ title, deletedAt, messages[{ role, content }]}]
- messages: [legacy messages[{ role, content }]]
- timestamps

Indexes:
- unique: (principalModel, principalId)

## LibraryResource
- title: String (required)
- description: String
- category: String
- audience: 'public' | 'level'
- grade: ObjectId(ref Grade) | null
- subject: ObjectId(ref Subject) | null
- kind: 'pdf' | 'link'
- linkUrl: String (required when kind='link')
- file: { url, path, mimeType, size, originalName, uploadedAt } (required when kind='pdf')
- createdById: ObjectId(ref User)
- createdByRole/createdByName: String
- timestamps

Indexes:
- (createdAt: -1)
- text: title, description, category

## FinanceCategory
- name: String (required, unique)
- type: 'fee' | 'expense' | 'donation' | 'paymentMethod'
- description: String
- feeType: String (default: 'Standard')
- defaultAmount: Number
- applicableLevels: [String]
- isOptional: Boolean
- budget: Number
- status: 'active' | 'inactive'
- timestamps

## FeeType
- code: String (required, unique, lowercase)
- name: String (required)
- mode: 'charge' | 'waive' | 'discount'
- discountPercent: Number (0..100)
- status: 'active' | 'inactive'
- timestamps

Indexes:
- (status, code)

## Account
- name: String (required, unique)
- type: 'Bank' | 'Cash' | 'Mobile Money'
- institution: String (default 'Unknown')
- branch: String (default 'Main')
- accountNumber: String (default 'N/A')
- balance: Number
- currency: String (default 'USD')
- status: 'active' | 'inactive'
- timestamps

## FeeStructure
- gradeSection: ObjectId(ref GradeSection) (required)
- monthlyFee: Number (required)
- timestamps

## Fee
- student: ObjectId(ref Student) (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- academicYear: ObjectId(ref AcademicYear) (required)
- amount/paidAmount/balance: Number
- status: 'unpaid' | 'partial' | 'paid'
- createdBy: ObjectId(ref User)
- timestamps

## StudentFee
- student: ObjectId(ref Student) (required)
- gradeSection: ObjectId(ref GradeSection) (required)
- month: String (required, e.g. '2025-12')
- amount: Number (required)
- status: 'paid' | 'unpaid'
- paidAt: Date
- paidBy: ObjectId(ref User)
- timestamps

Indexes:
- unique: (student, month)

## FeeInvoice
- student: ObjectId(ref Student) (required)
- class: ObjectId(ref GradeSection) — snapshot
- academicYear: ObjectId(ref AcademicYear)
- billingMonth: String (e.g. '2026-01')
- title: String (required)
- items: [{ name, amount, category: ObjectId(ref FinanceCategory) }]
- discounts: [{ name, type: 'percentage'|'fixed', value, amountOff }]
- isWaived/waiverReason: Boolean/String
- isHormaris: Boolean
- amount/paidAmount/balance: Number
- dueDate: Date
- status: 'Unpaid' | 'Partial' | 'Paid' | 'Overdue' | 'Cancelled'
- createdBy: ObjectId(ref User)
- timestamps

Indexes:
- (student, academicYear, billingMonth)

## FeeTransaction
- invoice: ObjectId(ref FeeInvoice) | null
- transactionType: 'Payment' | 'Credit' | 'Hormaris' | 'Refund'
- targetMonth: String
- student: ObjectId(ref Student) (required)
- account: ObjectId(ref Account) | null
- amount: Number
- method: String
- reference: String
- date: Date
- recordedBy: ObjectId(ref User)
- status: 'Completed' | 'Reversed'
- remarks: String
- paymentGroup: ObjectId (indexed)
- timestamps

## FeePayment (legacy)
- fee: ObjectId(ref Fee) (required)
- amount: Number (required)
- paymentMethod: 'cash' | 'mobile' | 'bank'
- reference: String
- receivedBy: ObjectId(ref User)
- paidAt: Date
- timestamps

## PaymentLog (legacy)
- studentFee: ObjectId(ref StudentFee)
- amount: Number
- method: 'cash' | 'mobile' | 'bank'
- receivedBy: ObjectId(ref User)
- timestamps

## Expense
- title: String (required)
- category: String (required)
- categoryRef: ObjectId(ref FinanceCategory)
- amount: Number (required)
- date: Date
- description: String
- approvedBy/createdBy: ObjectId(ref User)
- account: ObjectId(ref Account)
- source: 'manual' | 'payroll' | 'system'
- payrollRef: ObjectId(ref Payroll)
- overBudget: Boolean
- status: 'Pending' | 'Approved' | 'Rejected'
- timestamps

Indexes:
- (categoryRef, date: -1)
- (category, date: -1)

## Payroll
- staff: ObjectId(ref User) (required)
- academicYear: ObjectId(ref AcademicYear)
- month: String (YYYY-MM)
- basicSalary: Number
- allowances: [{ title, amount }]
- deductions: [{ academicYear?, title, amount }]
- commission/decrease/correction: Number
- sendNumber/description: String
- paidAmount: Number
- paymentSplits: [{ account: ObjectId(ref Account), amount, date }]
- netSalary: Number
- paymentDate: Date
- status: 'Draft' | 'Approved' | 'Paid'
- paymentMethod/reference: String
- account: ObjectId(ref Account)
- processedBy: ObjectId(ref User)
- timestamps

## Donor
- name: String (required)
- email/phone: String
- type: 'Individual' | 'Organization' | 'Government'
- address/notes: String
- status: 'active' | 'inactive'
- timestamps

## Donation
- donor: ObjectId(ref Donor) (required)
- amount: Number
- currency: String
- date: Date
- project: ObjectId(ref FinanceCategory) (required)
- account: ObjectId(ref Account) (required)
- method: 'Cash' | 'Bank Transfer' | 'Check' | 'Mobile Money'
- reference/notes: String
- recordedBy: ObjectId(ref User)
- timestamps

## FinanceAppointment
- appointmentId: String (required, unique)
- academicYear: ObjectId(ref AcademicYear) (required)
- student: ObjectId(ref Student) (required)
- class: ObjectId(ref GradeSection) (required)
- amountType: ObjectId(ref FinanceCategory) (required)
- expectedAmount: Number
- appointmentDate: Date
- appointmentTime: String
- appointmentDateTime: Date (indexed)
- paymentMethod: String
- notes: String
- status: 'Pending' | 'Completed' | 'Missed' | 'Cancelled' (indexed)
- createdBy: ObjectId(ref User)
- completedAt: Date
- receipt: ObjectId(ref FeeTransaction)
- paidAmount: Number
- history: [{ action, fromStatus, toStatus, notes, by, at }]
- timestamps

Indexes:
- unique: appointmentId
- (student, amountType, status)
