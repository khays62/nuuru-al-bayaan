// Seed sample data for promotion testing
// Run: node backend/seed/seedPromotionSample.js
import mongoose from 'mongoose';
import { dbURL } from '../config/config.js';
import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';
import GradeSection from '../models/GradeSection.js';
import Subject from '../models/Subject.js';
import AcademicYear from '../models/AcademicYear.js';
import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import ExamType from '../models/ExamType.js';
import Exam from '../models/Exam.js';
import ExamScore from '../models/ExamScore.js';
import Cohort from '../models/Cohort.js';

async function run() {
  const mongoUri = dbURL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) { console.error('No DB URI'); process.exit(1); }
  await mongoose.connect(mongoUri);
  console.log('[promo-seed] Connected');

  // Lookup base docs
  const grade = await Grade.findOne({ gradeName: 'level one' });
  const shift = await Shift.findOne({ shiftName: 'morning' });
  if (!grade || !shift) { console.error('Missing grade or shift'); process.exit(1); }

  // AY (take current or create specific)
  let ay = await AcademicYear.findOne({ yearName: '2024-2025' });
  if (!ay) ay = await AcademicYear.create({ yearName: '2024-2025' });

  // Cohort (requires startAcademicYear per model)
  let cohort = await Cohort.findOne({ name: 'Cohort A1' });
  if (!cohort) cohort = await Cohort.create({ name: 'Cohort A1', startAcademicYear: ay._id });

  // Subjects for grade
  const subjNames = ['Arabic', 'Math', 'Science'];
  const subjects = [];
  for (const n of subjNames) {
    let s = await Subject.findOne({ subjectName: n });
    if (!s) {
      const code = n.toLowerCase().replace(/[^a-z0-9]+/g,'_') + '_' + Date.now().toString().slice(-4);
      s = await Subject.create({ subjectName: n, subjectCode: code, grades: [grade._id] });
    }
    // Assign a unique subjectCode if missing (legacy rows with null)
    if (!s.subjectCode) {
      s.subjectCode = n.toUpperCase().slice(0,4) + '_' + Math.random().toString(16).slice(2,6);
      await s.save();
    }
    else if (!s.grades.map(g=>String(g)).includes(String(grade._id))) {
      s.grades.push(grade._id); await s.save();
    }
    subjects.push(s);
  }

  // GradeSection
  let gs = await GradeSection.findOne({ grade: grade._id, shift: shift._id, section: 'A' });
  if (!gs) gs = await GradeSection.create({ grade: grade._id, shift: shift._id, section: 'A', subjects: subjects.map(s=>s._id), capacity: 50 });

  // Students + Enrollments
  const sampleStudents = [
    { fullName: 'Student Alpha', gender: 'Male', dob: new Date('2015-01-01'), guardianName: 'Parent Alpha', contactNumber: '111', address: 'Address 1', admissionDate: new Date(), cohort },
    { fullName: 'Student Beta', gender: 'Female', dob: new Date('2015-02-02'), guardianName: 'Parent Beta', contactNumber: '222', address: 'Address 2', admissionDate: new Date(), cohort },
    { fullName: 'Student Gamma', gender: 'Male', dob: new Date('2015-03-03'), guardianName: 'Parent Gamma', contactNumber: '333', address: 'Address 3', admissionDate: new Date(), cohort }
  ];

  const createdStudents = [];
  for (const st of sampleStudents) {
    let existing = await Student.findOne({ fullName: st.fullName });
    if (!existing) existing = await Student.create({
      fullName: st.fullName,
      gender: st.gender,
      dob: st.dob,
      guardianName: st.guardianName,
      contactNumber: st.contactNumber,
      address: st.address,
      admissionDate: st.admissionDate,
      status: 'Active'
    });
    createdStudents.push(existing);
    // Ensure enrollment
    let enr = await Enrollment.findOne({ student: existing._id, academicYear: ay._id, gradeSection: gs._id });
    if (!enr) {
      enr = await Enrollment.create({
        student: existing._id,
        gradeSection: gs._id,
        academicYear: ay._id,
        grade: grade._id,
        shift: shift._id,
        cohort: cohort._id,
        status: 'active',
        sequenceInYear: 1,
        joinedAt: new Date()
      });
    }
    // Student code simplistic: use first 2 letters + index
    if (!existing.studentId) {
      existing.studentId = 'ST' + String(createdStudents.length).padStart(3,'0');
      await existing.save();
    }
  }

  // Exam types & exams
  let examTypes = await ExamType.find({ isActive: true }).lean();
  if (!examTypes.length) examTypes = await ExamType.find({ templateVersion: 1 }).lean();
  const version = Number(examTypes?.[0]?.templateVersion || 1);
  for (const t of examTypes) {
    let exam = await Exam.findOne({ examType: t._id, academicYear: ay._id, gradeSection: gs._id, templateVersion: version });
    if (!exam) await Exam.create({ examType: t._id, academicYear: ay._id, gradeSection: gs._id, templateVersion: version });
  }
  const exams = await Exam.find({ academicYear: ay._id, gradeSection: gs._id }).populate('examType').lean();
  const midExam = exams.find(e => /mid/i.test(e.examType.typeName));
  const finalExam = exams.find(e => /final/i.test(e.examType.typeName));

  // Scores: Alpha has mid+final >70, Beta only mid 85, Gamma final 90
  const subjIds = subjects.map(s=>s._id);
  for (const st of createdStudents) {
    for (const subj of subjIds) {
      if (midExam && st.fullName !== 'Student Gamma') {
        await ExamScore.findOneAndUpdate(
          { student: st._id, exam: midExam._id, subject: subj },
          { $set: { scoreObtained: st.fullName === 'Student Beta' ? 85 : 78 } },
          { upsert: true }
        );
      }
      if (finalExam && st.fullName !== 'Student Beta') {
        await ExamScore.findOneAndUpdate(
          { student: st._id, exam: finalExam._id, subject: subj },
          { $set: { scoreObtained: st.fullName === 'Student Gamma' ? 90 : 82 } },
          { upsert: true }
        );
      }
    }
  }

  console.log('[promo-seed] Students:', createdStudents.map(s => ({ fullName: s.fullName, code: s.studentId, _id: s._id })) );
  console.log('[promo-seed] Done');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
