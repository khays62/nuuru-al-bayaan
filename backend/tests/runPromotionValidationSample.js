// Sample test harness (not full Jest suite) to validate promotion average gating.
// Usage: `node tests/runPromotionValidationSample.js`
// It spins up an in-memory MongoDB, seeds minimal data, runs previewPromotion, and prints results.
console.log('Validation script start');
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import AcademicYear from '../models/AcademicYear.js';
import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';
import Subject from '../models/Subject.js';
import GradeSection from '../models/GradeSection.js';
import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import ExamType from '../models/ExamType.js';
import Exam from '../models/Exam.js';
import ExamScore from '../models/ExamScore.js';
import { previewPromotion, executePromotion } from '../controllers/promotionController.js';

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; }
  };
}

async function seed() {
  const ay = await AcademicYear.create({ yearName: '2024-2025' });
  const grade1 = await Grade.create({ gradeName: 'Level 1' });
  const grade2 = await Grade.create({ gradeName: 'Level 2' });
  const shift = await Shift.create({ shiftName: 'Morning' });
  const subjA = await Subject.create({ subjectName: 'Math', subjectCode: 'MATH', grades: [grade1._id, grade2._id] });
  const subjB = await Subject.create({ subjectName: 'Science', subjectCode: 'SCI', grades: [grade1._id, grade2._id] });
  const gs1 = await GradeSection.create({ grade: grade1._id, shift: shift._id, section: 'A', subjects: [subjA._id, subjB._id] });
  // Student A (below average): Math (Mid 40, Final 50 => 46), Science (Mid 20, Final 30 => 26) overall ~36
  // Student B (above average): Math (Mid 60, Final 80 => 74), Science (Mid 55, Final 70 => 64) overall 69
  const studentA = await Student.create({ studentId: 'S001', fullName: 'Ahmed Below', gender: 'Male', dob: new Date('2015-01-01'), guardianName: 'Parent A', contactNumber: '111', admissionDate: new Date() });
  const studentB = await Student.create({ studentId: 'S002', fullName: 'Barni Above', gender: 'Female', dob: new Date('2015-02-02'), guardianName: 'Parent B', contactNumber: '222', admissionDate: new Date() });
  const enrA = await Enrollment.create({ student: studentA._id, gradeSection: gs1._id, academicYear: ay._id, grade: grade1._id, shift: shift._id, sequenceInYear: 1, status: 'active', joinedAt: new Date() });
  const enrB = await Enrollment.create({ student: studentB._id, gradeSection: gs1._id, academicYear: ay._id, grade: grade1._id, shift: shift._id, sequenceInYear: 1, status: 'active', joinedAt: new Date() });
  // Exam Types
  const midType = await ExamType.create({ typeName: 'Mid-term' });
  const finalType = await ExamType.create({ typeName: 'Final' });
  // Exams for GradeSection gs1 AY ay
  const midExam = await Exam.create({ examType: midType._id, academicYear: ay._id, gradeSection: gs1._id });
  const finalExam = await Exam.create({ examType: finalType._id, academicYear: ay._id, gradeSection: gs1._id });
  // Scores Student A
  await ExamScore.create({ student: studentA._id, exam: midExam._id, subject: subjA._id, scoreObtained: 40 });
  await ExamScore.create({ student: studentA._id, exam: finalExam._id, subject: subjA._id, scoreObtained: 50 });
  await ExamScore.create({ student: studentA._id, exam: midExam._id, subject: subjB._id, scoreObtained: 20 });
  await ExamScore.create({ student: studentA._id, exam: finalExam._id, subject: subjB._id, scoreObtained: 30 });
  // Scores Student B
  await ExamScore.create({ student: studentB._id, exam: midExam._id, subject: subjA._id, scoreObtained: 60 });
  await ExamScore.create({ student: studentB._id, exam: finalExam._id, subject: subjA._id, scoreObtained: 80 });
  await ExamScore.create({ student: studentB._id, exam: midExam._id, subject: subjB._id, scoreObtained: 55 });
  await ExamScore.create({ student: studentB._id, exam: finalExam._id, subject: subjB._id, scoreObtained: 70 });
  return { studentA, studentB };
}

async function run() {
  process.env.PROMOTION_MIN_AVG = '60';
  console.log('Creating in-memory Mongo...');
  const mongod = await MongoMemoryServer.create();
  console.log('Mongo created');
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'testdb' });
  console.log('Connected');
  const { studentA, studentB } = await seed();
  console.log('Seed complete');

  // Prepare mock request for previewPromotion (year-end so next grade exists)
  const req = { query: { timing: 'year-end', studentIds: [studentA._id.toString(), studentB._id.toString()] } };
  const res = mockRes();
  await previewPromotion(req, res);
  console.log('Status Code:', res.statusCode);
  console.log('Response Summary:', res.body.summary);
  for (const item of res.body.items) {
    console.log(`Student ${item.fullName} -> action=${item.action} errors=${item.errors}`);
  }

  // Expectation preview
  const below = res.body.items.find(i => i.fullName.includes('Ahmed'));
  const above = res.body.items.find(i => i.fullName.includes('Barni'));
  const okPreview = below && above && below.action === 'stay' && below.errors.includes('BELOW_MIN_AVG') && above.action === 'promote';
  console.log('Preview Validation Pass:', okPreview);

  // Execute promotion for promotable student(s)
  const promotableIds = res.body.items.filter(i => i.action === 'promote').map(i => i.studentId).filter(Boolean);
  const execReq = { body: { timing: 'year-end', studentIds: promotableIds, autoCreate: true }, user: { _id: new mongoose.Types.ObjectId() } };
  const execRes = mockRes();
  await executePromotion(execReq, execRes);
  console.log('Execute status:', execRes.statusCode);
  console.log('Execute summary:', execRes.body?.summary);
  // Verify next AY and GS creation
  const nextAY = await AcademicYear.findOne({ yearName: '2025-2026' }).lean();
  const grade2 = await Grade.findOne({ gradeName: 'Level 2' }).lean();
  const createdGS = await GradeSection.findOne({ grade: grade2?._id, shift: (await Shift.findOne({ shiftName: 'Morning' }))._id, section: 'A' }).lean();
  console.log('Next AY exists:', !!nextAY);
  console.log('Next GS exists:', !!createdGS);
  const promotedEnrollment = await Enrollment.findOne({ student: studentB._id, grade: grade2?._id, status: 'active', sequenceInYear: 1 }).lean();
  console.log('Promoted enrollment exists:', !!promotedEnrollment);
  const okExecute = !!nextAY && !!createdGS && !!promotedEnrollment;
  console.log('Execute Validation Pass:', okExecute);

  await mongoose.disconnect();
  await mongod.stop();
}

run().catch(err => { console.error(err); process.exit(1); });
