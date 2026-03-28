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

---

## dbdiagram.io (DBML) — Full System (All Models)

Qaybtan waa “ready to paste” DBML oo aad gelin karto dbdiagram.io.

Fiirooyin muhiim ah:
- MongoDB ObjectId waxaa DBML loogu matalay `varchar`.
- Mongo arrays/subdocs (tusaale `Announcement.audienceGradeSections[]`, `GradeSection.subjects[]`, `FeeInvoice.items[]`) dbdiagram ma taageero si native ah, sidaa darteed waxaan u matalnay:
	- **Synthetic join tables** (tusaale `announcement_grade_sections`, `grade_section_subjects`), ama
	- `json`/`text` columns haddii ay yihiin subdocs arrays (tusaale `fee_invoice_items_json`).

```dbml
// Nuuru Al-Bayaan — Full System (All Models)
// Note: MongoDB ObjectId -> string (varchar) in this diagram.
// Some fields are polymorphic in Mongo (e.g., AuthLockEvent/AiChatThread principal), so kept as plain strings.

Enum user_role {
	admin
	staff
	teacher
	student
}

Enum announcement_audience_type {
	all
	gradeSections
}

Enum finance_category_type {
	fee
	expense
	donation
	paymentMethod
}

Enum fee_type_mode {
	charge
	waive
	discount
}

Enum fee_status {
	unpaid
	partial
	paid
}

Enum fee_invoice_status {
	Unpaid
	Partial
	Paid
	Overdue
	Cancelled
}

Enum fee_transaction_type {
	Payment
	Credit
	Hormaris
	Refund
}

Enum fee_transaction_status {
	Completed
	Reversed
}

Enum expense_source {
	manual
	payroll
	system
}

Enum payroll_status {
	Draft
	Approved
	Paid
}

Enum library_audience {
	public
	level
}

Enum library_kind {
	pdf
	link
}

Enum finance_appointment_status {
	Pending
	Completed
	Missed
	Cancelled
}

Enum account_type {
	Bank
	Cash
	"Mobile Money"
}

Table users {
	id varchar [pk] // ObjectId
	full_name varchar [null]
	username varchar [unique]
	email varchar [unique, null]
	phone varchar [unique, null]
	phone2 varchar [null]

	role user_role
	teacher_ref_id varchar [null]
	student_ref_id varchar [null]

	staff_code varchar [unique, null] // internal staff code
	salary decimal [null]
	must_change_password boolean [null]

	token_version int
	failed_login_attempts int [null]
	lock_until datetime [null]
	login_cooldown_level int [null]

	announcements_last_seen_at datetime [null]
	status varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table admins {
	id varchar [pk] // ObjectId
	username varchar
	role varchar [note: "legacy admin model"]
	token_version int [null]
	lock_until datetime [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table students {
	id varchar [pk] // ObjectId
	student_id varchar [null] // generated ID
	full_name varchar
	gender varchar [null]
	dob date [null]
	guardian_name varchar [null]
	contact_number varchar [null]
	admission_date date [null]
	status varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table teachers {
	id varchar [pk] // ObjectId
	teacher_id varchar [null]
	full_name varchar
	email varchar [null]
	phone varchar [null]
	status varchar [null]
	last_academic_year_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table academic_years {
	id varchar [pk] // ObjectId
	year_name varchar
	created_at datetime [null]
	updated_at datetime [null]
}

Table grades {
	id varchar [pk] // ObjectId
	grade_name varchar
	"order" int [null]
}

Table shifts {
	id varchar [pk] // ObjectId
	shift_name varchar
}

Table grade_sections {
	id varchar [pk] // ObjectId
	grade_id varchar
	shift_id varchar
	section varchar
	capacity int [null]
}

Table cohorts {
	id varchar [pk] // ObjectId
	name varchar
	start_academic_year_id varchar [null]
	status varchar [null] // active/archived
}

Table enrollments {
	id varchar [pk] // ObjectId
	student_id varchar
	grade_section_id varchar
	academic_year_id varchar
	grade_id varchar
	shift_id varchar
	cohort_id varchar [null]
	sequence_in_year int [null] // 1|2
	status varchar [null]
	joined_at date [null]
	left_at date [null]
	created_at datetime [null]
	updated_at datetime [null]

	Indexes {
		(student_id, academic_year_id, sequence_in_year) [unique]
	}
}

Table subjects {
	id varchar [pk] // ObjectId
	subject_name varchar
	subject_code varchar [null]
}

// Synthetic join table for GradeSection.subjects[]
Table grade_section_subjects {
	id varchar [pk] // synthetic
	grade_section_id varchar
	subject_id varchar

	Indexes {
		(grade_section_id, subject_id) [unique]
	}
}

// Synthetic join table for Subject.grades[]
Table subject_grades {
	id varchar [pk] // synthetic
	subject_id varchar
	grade_id varchar

	Indexes {
		(subject_id, grade_id) [unique]
	}
}

Table teacher_assignments {
	id varchar [pk] // ObjectId
	teacher_id varchar
	grade_section_id varchar
	subject_id varchar
	role varchar [null] // main/assistant

	Indexes {
		(teacher_id, grade_section_id, subject_id) [unique]
	}
}

Table timetables {
	id varchar [pk] // ObjectId
	grade_section_id varchar
	is_break boolean [null]
	subject_id varchar [null]
	teacher_id varchar [null]
	day_of_week int [null] // 0..6
	start_time varchar [null] // HH:MM
	end_time varchar [null]
	room varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table lesson_plans {
	id varchar [pk] // ObjectId
	teacher_id varchar
	academic_year_id varchar
	grade_section_id varchar
	subject_id varchar
	date date [null]
	topic varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table exam_types {
	id varchar [pk] // ObjectId
	type_name varchar
	template_version int [null]
	max_score int [null]
	template_total int [null]
	"order" int [null]
	is_active boolean [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table exams {
	id varchar [pk] // ObjectId
	exam_type_id varchar
	academic_year_id varchar
	grade_section_id varchar
	template_version int [null]
	created_at datetime [null]
	updated_at datetime [null]

	Indexes {
		(exam_type_id, academic_year_id, grade_section_id, template_version) [unique]
	}
}

Table exam_scores {
	id varchar [pk] // ObjectId
	student_id varchar
	exam_id varchar
	subject_id varchar
	score_obtained int [null]
	created_at datetime [null]
	updated_at datetime [null]

	Indexes {
		(student_id, exam_id, subject_id) [unique]
	}
}

Table attendance_records {
	id varchar [pk] // ObjectId
	date date
	grade_section_id varchar
	period_code varchar [null]
	student_id varchar
	status varchar [null]
	marked_by_teacher_id varchar [null]
	marked_by_user_id varchar [null]
	marked_by_role varchar [null]
	updated_by_user_id varchar [null]
	updated_by_role varchar [null]
	remarks varchar [null]
	created_at datetime [null]
	updated_at datetime [null]

	Indexes {
		(grade_section_id, date)
	}
}

Table attendance_audit_logs {
	id varchar [pk] // ObjectId
	date date
	grade_section_id varchar
	period_code varchar [null]
	student_id varchar
	old_status varchar [null]
	new_status varchar [null]
	marked_by_teacher_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table announcements {
	id varchar [pk] // ObjectId
	title varchar
	body text
	author varchar [null]
	role user_role [null]
	audience_type announcement_audience_type
	created_by_user_id varchar [null]
	date datetime [null]
	updated_by varchar [null]
	updated_by_role varchar [null]
	updated_at datetime [null]
}

// Synthetic join table for Announcement.audienceGradeSections[]
Table announcement_grade_sections {
	id varchar [pk] // synthetic
	announcement_id varchar
	grade_section_id varchar

	Indexes {
		(announcement_id, grade_section_id) [unique]
	}
}

Table audit_logs {
	id varchar [pk] // ObjectId
	user_id varchar
	action varchar
	description varchar [null]
	aggregate_key varchar [null]
	metadata_json json [null]
	ip varchar [null]
	device varchar [null]
	timestamp datetime [null]
}

Table auth_lock_events {
	id varchar [pk] // ObjectId
	principal_model varchar [note: "User/Admin/Unknown"]
	principal_id varchar [null]
	username varchar [null]
	full_name varchar [null]
	role varchar [null]
	lock_until datetime [null]
	ip varchar [null]
	user_agent varchar [null]
	occurrences int [null]
	first_seen_at datetime [null]
	last_seen_at datetime [null]
	is_read boolean [null]
	resolved_at datetime [null]
	resolved_by varchar [null]
	resolution varchar [null]
}

Table activity_notifications {
	id varchar [pk] // ObjectId
	category varchar
	action varchar
	title varchar
	message text [null]
	actor_user_id varchar [null]
	actor_name varchar [null]
	actor_role varchar [null]
	class_label varchar [null]
	subject_label varchar [null]
	metadata_json json [null]
	aggregate_key varchar [null]
	is_read boolean
	resolved_at datetime [null]
	resolved_by_user_id varchar [null]
	created_at datetime
}

Table privacy_settings {
	id varchar [pk] // ObjectId
	singleton_key varchar [unique]
	login_protection_json json [null]
	password_policy_json json [null]
	session_policy_json json [null]
	student_dashboard_json json [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table ai_chat_threads {
	id varchar [pk] // ObjectId
	principal_model varchar
	principal_id varchar
	locale varchar [null]
	active_thread_id varchar [null]
	threads_json json [null]
	messages_json json [null]
	created_at datetime [null]
	updated_at datetime [null]

	Indexes {
		(principal_model, principal_id) [unique]
	}
}

Table transfer_logs {
	id varchar [pk] // ObjectId
	student_id varchar
	from_grade_section_id varchar
	to_grade_section_id varchar
	by_user_id varchar [null]
	date datetime [null]
	reverted boolean [null]
	revert_of_id varchar [null]
	reason varchar [null]
	notes varchar [null]

	Indexes {
		(student_id, date)
	}
}

Table counters {
	id varchar [pk] // ObjectId
	key varchar
	seq int

	Indexes {
		(key) [unique]
	}
}

// ------------------------
// Library
// ------------------------

Table library_resources {
	id varchar [pk] // ObjectId
	title varchar
	description text [null]
	category varchar [null]

	audience library_audience
	grade_id varchar [null]
	subject_id varchar [null]

	kind library_kind
	link_url varchar [null]

	file_url varchar [null]
	file_path varchar [null]
	file_mime_type varchar [null]
	file_size int [null]
	file_original_name varchar [null]
	file_uploaded_at datetime [null]

	created_by_user_id varchar [null]
	created_by_role varchar [null]
	created_by_name varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

// ------------------------
// Finance
// ------------------------

Table finance_categories {
	id varchar [pk] // ObjectId
	name varchar [unique]
	type finance_category_type
	description text [null]
	fee_type varchar [null]
	default_amount decimal [null]
	applicable_levels_json json [null]
	is_optional boolean [null]
	budget decimal [null]
	status varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table fee_types {
	id varchar [pk] // ObjectId
	code varchar [unique]
	name varchar
	mode fee_type_mode
	discount_percent int [null]
	status varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table accounts {
	id varchar [pk] // ObjectId
	name varchar [unique]
	type account_type
	institution varchar
	branch varchar [null]
	account_number varchar
	balance decimal
	currency varchar [null]
	status varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

// Legacy/monthly fee structure (per gradeSection)
Table fee_structures {
	id varchar [pk] // ObjectId
	grade_section_id varchar
	monthly_fee decimal
	created_at datetime [null]
	updated_at datetime [null]
}

// Legacy Fee (simple)
Table fees {
	id varchar [pk] // ObjectId
	student_id varchar
	grade_section_id varchar
	academic_year_id varchar
	amount decimal
	paid_amount decimal [null]
	balance decimal [null]
	status fee_status
	created_by_user_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

// Legacy fee payments linked to fees
Table fee_payments {
	id varchar [pk] // ObjectId
	fee_id varchar
	amount decimal
	payment_method varchar [null]
	reference varchar [null]
	received_by_user_id varchar [null]
	paid_at datetime [null]
	created_at datetime [null]
	updated_at datetime [null]
}

// Newer invoice-based billing (monthly/term)
Table fee_invoices {
	id varchar [pk] // ObjectId
	student_id varchar
	class_grade_section_id varchar [null]
	academic_year_id varchar [null]
	billing_month varchar [null] // YYYY-MM
	title varchar
	fee_invoice_items_json json [null] // items[] subdocs
	fee_invoice_discounts_json json [null] // discounts[] subdocs
	is_waived boolean [null]
	waiver_reason varchar [null]
	is_hormaris boolean [null]
	amount decimal
	paid_amount decimal [null]
	balance decimal [null]
	due_date date [null]
	status fee_invoice_status
	created_by_user_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]

	Indexes {
		(student_id, academic_year_id, billing_month)
	}
}

Table fee_transactions {
	id varchar [pk] // ObjectId
	invoice_id varchar [null]
	transaction_type fee_transaction_type
	target_month varchar [null]
	student_id varchar
	account_id varchar [null]
	amount decimal
	method varchar
	reference varchar [null]
	date datetime [null]
	recorded_by_user_id varchar [null]
	status fee_transaction_status
	remarks text [null]
	payment_group varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

// StudentFee + PaymentLog are legacy monthly buckets
Table student_fees {
	id varchar [pk] // ObjectId
	student_id varchar
	grade_section_id varchar
	month varchar
	amount decimal
	status varchar [null]
	paid_at datetime [null]
	paid_by_user_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]

	Indexes {
		(student_id, month) [unique]
	}
}

Table payment_logs {
	id varchar [pk] // ObjectId
	student_fee_id varchar [null]
	amount decimal [null]
	method varchar [null]
	received_by_user_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table finance_appointments {
	id varchar [pk] // ObjectId
	appointment_id varchar [unique]
	academic_year_id varchar
	student_id varchar
	class_grade_section_id varchar
	amount_type_id varchar
	expected_amount decimal
	appointment_date date
	appointment_time varchar
	appointment_date_time datetime
	payment_method varchar
	notes text [null]
	status finance_appointment_status
	created_by_user_id varchar [null]
	completed_at datetime [null]
	receipt_fee_transaction_id varchar [null]
	paid_amount decimal [null]
	history_json json [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table expenses {
	id varchar [pk] // ObjectId
	title varchar
	category varchar
	category_ref_id varchar [null]
	amount decimal
	date datetime [null]
	description text [null]
	approved_by_user_id varchar [null]
	created_by_user_id varchar [null]
	account_id varchar [null]
	source expense_source
	payroll_ref_id varchar [null]
	over_budget boolean [null]
	status varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table payrolls {
	id varchar [pk] // ObjectId
	staff_user_id varchar
	academic_year_id varchar [null]
	month varchar
	basic_salary decimal
	allowances_json json [null]
	deductions_json json [null]
	commission decimal [null]
	decrease decimal [null]
	correction decimal [null]
	send_number varchar [null]
	description text [null]
	paid_amount decimal [null]
	payment_splits_json json [null]
	net_salary decimal
	payment_date datetime [null]
	status payroll_status
	payment_method varchar [null]
	reference varchar [null]
	account_id varchar [null]
	processed_by_user_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table donors {
	id varchar [pk] // ObjectId
	name varchar
	email varchar [null]
	phone varchar [null]
	type varchar [null]
	address varchar [null]
	notes text [null]
	status varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

Table donations {
	id varchar [pk] // ObjectId
	donor_id varchar
	amount decimal
	currency varchar [null]
	date datetime
	project_finance_category_id varchar
	account_id varchar
	method varchar
	reference varchar [null]
	notes text [null]
	recorded_by_user_id varchar [null]
	created_at datetime [null]
	updated_at datetime [null]
}

/* Relationships */
Ref: users.student_ref_id > students.id
Ref: users.teacher_ref_id > teachers.id

Ref: teachers.last_academic_year_id > academic_years.id
Ref: cohorts.start_academic_year_id > academic_years.id

Ref: grade_sections.grade_id > grades.id
Ref: grade_sections.shift_id > shifts.id

Ref: enrollments.student_id > students.id
Ref: enrollments.grade_section_id > grade_sections.id
Ref: enrollments.academic_year_id > academic_years.id
Ref: enrollments.grade_id > grades.id
Ref: enrollments.shift_id > shifts.id
Ref: enrollments.cohort_id > cohorts.id

Ref: grade_section_subjects.grade_section_id > grade_sections.id
Ref: grade_section_subjects.subject_id > subjects.id

Ref: subject_grades.subject_id > subjects.id
Ref: subject_grades.grade_id > grades.id

Ref: teacher_assignments.teacher_id > teachers.id
Ref: teacher_assignments.grade_section_id > grade_sections.id
Ref: teacher_assignments.subject_id > subjects.id

Ref: timetables.grade_section_id > grade_sections.id
Ref: timetables.subject_id > subjects.id
Ref: timetables.teacher_id > teachers.id

Ref: lesson_plans.teacher_id > teachers.id
Ref: lesson_plans.academic_year_id > academic_years.id
Ref: lesson_plans.grade_section_id > grade_sections.id
Ref: lesson_plans.subject_id > subjects.id

Ref: exams.exam_type_id > exam_types.id
Ref: exams.academic_year_id > academic_years.id
Ref: exams.grade_section_id > grade_sections.id

Ref: exam_scores.student_id > students.id
Ref: exam_scores.exam_id > exams.id
Ref: exam_scores.subject_id > subjects.id

Ref: attendance_records.grade_section_id > grade_sections.id
Ref: attendance_records.student_id > students.id
Ref: attendance_records.marked_by_teacher_id > teachers.id
Ref: attendance_records.marked_by_user_id > users.id
Ref: attendance_records.updated_by_user_id > users.id

Ref: attendance_audit_logs.grade_section_id > grade_sections.id
Ref: attendance_audit_logs.student_id > students.id
Ref: attendance_audit_logs.marked_by_teacher_id > teachers.id

Ref: announcements.created_by_user_id > users.id
Ref: announcement_grade_sections.announcement_id > announcements.id
Ref: announcement_grade_sections.grade_section_id > grade_sections.id

Ref: audit_logs.user_id > users.id

Ref: transfer_logs.student_id > students.id
Ref: transfer_logs.from_grade_section_id > grade_sections.id
Ref: transfer_logs.to_grade_section_id > grade_sections.id
Ref: transfer_logs.by_user_id > users.id
Ref: transfer_logs.revert_of_id > transfer_logs.id

// Library
Ref: library_resources.grade_id > grades.id
Ref: library_resources.subject_id > subjects.id
Ref: library_resources.created_by_user_id > users.id

// Finance
Ref: fee_structures.grade_section_id > grade_sections.id

Ref: fees.student_id > students.id
Ref: fees.grade_section_id > grade_sections.id
Ref: fees.academic_year_id > academic_years.id
Ref: fees.created_by_user_id > users.id

Ref: fee_payments.fee_id > fees.id
Ref: fee_payments.received_by_user_id > users.id

Ref: fee_invoices.student_id > students.id
Ref: fee_invoices.class_grade_section_id > grade_sections.id
Ref: fee_invoices.academic_year_id > academic_years.id
Ref: fee_invoices.created_by_user_id > users.id

Ref: fee_transactions.invoice_id > fee_invoices.id
Ref: fee_transactions.student_id > students.id
Ref: fee_transactions.account_id > accounts.id
Ref: fee_transactions.recorded_by_user_id > users.id

Ref: student_fees.student_id > students.id
Ref: student_fees.grade_section_id > grade_sections.id
Ref: student_fees.paid_by_user_id > users.id

Ref: payment_logs.student_fee_id > student_fees.id
Ref: payment_logs.received_by_user_id > users.id

Ref: finance_appointments.academic_year_id > academic_years.id
Ref: finance_appointments.student_id > students.id
Ref: finance_appointments.class_grade_section_id > grade_sections.id
Ref: finance_appointments.amount_type_id > finance_categories.id
Ref: finance_appointments.created_by_user_id > users.id
Ref: finance_appointments.receipt_fee_transaction_id > fee_transactions.id

Ref: expenses.category_ref_id > finance_categories.id
Ref: expenses.approved_by_user_id > users.id
Ref: expenses.created_by_user_id > users.id
Ref: expenses.account_id > accounts.id
Ref: expenses.payroll_ref_id > payrolls.id

Ref: payrolls.staff_user_id > users.id
Ref: payrolls.academic_year_id > academic_years.id
Ref: payrolls.account_id > accounts.id
Ref: payrolls.processed_by_user_id > users.id

Ref: donations.donor_id > donors.id
Ref: donations.project_finance_category_id > finance_categories.id
Ref: donations.account_id > accounts.id
Ref: donations.recorded_by_user_id > users.id

// Notifications
Ref: activity_notifications.actor_user_id > users.id
Ref: activity_notifications.resolved_by_user_id > users.id
```
