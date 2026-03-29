// Performance sanity test for promotion preview & execute
// Usage: `node backend/scripts/promotion/runPromotionPerfSample.js [N]` where N=number of students (default 50)
console.log('Perf script start');
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

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function seed(count) {
  const ay = await AcademicYear.create({ yearName: '2024-2025' });
  const grade1 = await Grade.create({ gradeName: 'Level 1' });
  const grade2 = await Grade.create({ gradeName: 'Level 2' });
  const shift = await Shift.create({ shiftName: 'Morning' });
  // Subjects shared across both grades
  const subjA = await Subject.create({ subjectName: 'Math', subjectCode: 'MATH', grades: [grade1._id, grade2._id] });
  const subjB = await Subject.create({ subjectName: 'Science', subjectCode: 'SCI', grades: [grade1._id, grade2._id] });
  const subjC = await Subject.create({ subjectName: 'English', subjectCode: 'ENG', grades: [grade1._id, grade2._id] });
  // GradeSection for Level 1 (source)
  const gs1 = await GradeSection.create({ grade: grade1._id, shift: shift._id, section: 'A', subjects: [subjA._id, subjB._id, subjC._id] });
  // Exam types + exams
  const midType = await ExamType.create({ typeName: 'Mid-term' });
  const finalType = await ExamType.create({ typeName: 'Final' });
  const midExam = await Exam.create({ examType: midType._id, academicYear: ay._id, gradeSection: gs1._id });
  const finalExam = await Exam.create({ examType: finalType._id, academicYear: ay._id, gradeSection: gs1._id });

  const students = [];
  for (let i = 0; i < count; i++) {
    const s = await Student.create({ studentId: `ST${(i+1).toString().padStart(3,'0')}`, fullName: `Student ${i+1}`, gender: i % 2 === 0 ? 'Male' : 'Female', dob: new Date('2015-01-01'), guardianName: 'Guardian', contactNumber: '000', admissionDate: new Date() });
    await Enrollment.create({ student: s._id, gradeSection: gs1._id, academicYear: ay._id, grade: grade1._id, shift: shift._id, sequenceInYear: 1, status: 'active', joinedAt: new Date() });
    students.push(s);
    // Random scores: generate distribution so that ~50% below threshold
    for (const subj of [subjA, subjB, subjC]) {
      const midScore = randInt(20, 85); // varied
      const finalScore = randInt(25, 90);
      await ExamScore.create({ student: s._id, exam: midExam._id, subject: subj._id, scoreObtained: midScore });
      await ExamScore.create({ student: s._id, exam: finalExam._id, subject: subj._id, scoreObtained: finalScore });
    }
  }
  return { students };
}

async function time(label, fn) {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1e6;
  console.log(`${label}: ${ms.toFixed(2)} ms`);
  return { ms, result };
}

async function run() {
  const N = parseInt(process.argv[2], 10) || 50;
  process.env.PROMOTION_MIN_AVG = '60';
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'perfdb' });
  console.log(`Seeding ${N} students...`);
  const { students } = await seed(N);

  // Preview timing (year-end)
  console.log('Starting preview...');
  const previewReq = { query: { timing: 'year-end', studentIds: students.map(s => s._id.toString()) } };
  const previewRes = mockRes();
  const { ms: previewMs } = await time('previewPromotion', () => previewPromotion(previewReq, previewRes));
  const promotableCount = previewRes.body?.summary?.promotable;
  const stayCount = previewRes.body?.items?.filter(i => i.action === 'stay').length;
  console.log(`Promotable: ${promotableCount} | Stay (below avg): ${stayCount}`);

  // Execute timing (promote subset of promotable ones only)
  console.log('Starting execute...');
  const promotableIds = previewRes.body.items.filter(i => i.action === 'promote').map(i => i.studentId).filter(Boolean);
  const execReq = { body: { timing: 'year-end', studentIds: promotableIds, autoCreate: true }, user: { _id: new mongoose.Types.ObjectId() } };
  const execRes = mockRes();
  const { ms: executeMs } = await time('executePromotion', () => executePromotion(execReq, execRes));
  console.log(`Execute summary:`, execRes.body?.summary);

  console.log('--- Performance Summary ---');
  console.log(`Students: ${N}`);
  console.log(`Preview time: ${previewMs.toFixed(2)} ms (${(previewMs/N).toFixed(2)} ms/student)`);
  console.log(`Execute time: ${executeMs.toFixed(2)} ms (${(executeMs/(promotableIds.length||1)).toFixed(2)} ms/promoted student)`);

  await mongoose.disconnect();
  await mongod.stop();
}

run().catch(e => { console.error(e); process.exit(1); });
