// This file acts as our temporary, in-memory database.
// All components will fetch their data from here, making the app feel real and interconnected.

// Basic Lookup Data
export const mockGrades = [
    { id: 1, name: 'مستوى الأول' },
    { id: 2, name: 'مستوى الثاني' },
    { id: 3, name: 'مستوى الثالث' },
    { id: 4, name: 'مستوى الرابع' },
    { id: 5, name: 'مستوى الخامس' },
    { id: 6, name: 'مستوى السادس' },
];

export const mockAcademicYears = [
    { id: 1, name: '2024/2025' },
    { id: 2, name: '2025/2026' },
];

export const mockShifts = [
    { id: 1, name: 'Galab' },
    { id: 2, name: 'Subax' },
];

// Core Data
export const mockSubjects = [
    { id: 1, subjectName: 'Fiqi', subjectCode: 'FIQ101', grades: ['مستوى الأول', 'مستوى الثاني'] },
    { id: 2, subjectName: 'Tafsiir', subjectCode: 'TAF201', grades: ['مستوى الثالث'] },
    { id: 3, subjectName: 'Qur\'aan', subjectCode: 'QUR101', grades: ['مستوى الأول', 'مستوى الثاني', 'مستوى الثالث'] },
    { id: 4, subjectName: 'Xadiis', subjectCode: 'XAD301', grades: ['مستوى الثالث', 'مستوى الرابع'] },
];

export const mockClasses = [
    { id: 1, className: 'Class 5 - Galab', gradeId: 5, academicYearId: 2, shiftId: 1, studentCount: 2, capacity: 30, subjectIds: [1, 2, 4] },
    { id: 2, className: 'Class 4 - Subax', gradeId: 4, academicYearId: 2, shiftId: 2, studentCount: 1, capacity: 25, subjectIds: [4] },
    { id: 3, className: 'Class 6 - Galab', gradeId: 6, academicYearId: 1, shiftId: 1, studentCount: 0, capacity: 30, subjectIds: [] },
];

export const mockStudents = [
    { id: 101, fullName: 'Axmed Cali Nuur', gender: 'Male', classId: 1, grade: 'مستوى الخامس', status: 'Active', contact: '+25261000001', admissionDate: '2023-09-01' },
    { id: 102, fullName: 'Faadumo Xasan Jaamac', gender: 'Female', classId: 1, grade: 'مستوى الخامس', status: 'Active', contact: '+25261000002', admissionDate: '2023-09-02' },
    { id: 103, fullName: 'Cumar Maxamed Cismaan', gender: 'Male', classId: 2, grade: 'مستوى الرابع', status: 'On Hold', contact: '+25261000003', admissionDate: '2022-08-15' },
];
