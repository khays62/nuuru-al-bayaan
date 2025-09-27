# Data Models

## Student
- studentId: String (unique)
- fullName: String (required)
- gender: "Male" | "Female"
- dob: Date (required)
- guardianName: String (required)
- contactNumber: String (required)
- address: String (optional)
- admissionDate: Date (required)
- status: "Active" | "Inactive"
- timestamps

Indexes:
- unique: studentId
- text: fullName, studentId

## Enrollment
- student: ObjectId(ref Student)
- gradeSection: ObjectId(ref GradeSection)
- academicYear: ObjectId(ref AcademicYear)
- grade: ObjectId(ref Grade)
- shift: ObjectId(ref Shift)
- status: "active" | "transferred" | "promoted" | "graduated" | "withdrawn"
- joinedAt: Date
- leftAt: Date?
- timestamps

Indexes:
- unique: (student, academicYear)
- (gradeSection, status)
- (student, createdAt)

## GradeSection
- grade: ObjectId(ref Grade)
- academicYear: ObjectId(ref AcademicYear)
- shift: ObjectId(ref Shift)
- section: String/Number (identifier)

## Subject
- subjectName
- subjectCode (unique)
- grades: [ObjectId(ref Grade)]

## Grade
- gradeName (e.g. "Form 1")

## AcademicYear
- yearName (e.g. "2024/2025")

## Shift
- shiftName (e.g. Morning)
