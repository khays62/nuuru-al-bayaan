// Seed script: Lookups (ExamType, Grade, Shift, AcademicYear)
// Run with: node backend/seed/seedLookups.js
import mongoose from 'mongoose';
import ExamType from '../models/ExamType.js';
import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';
import AcademicYear from '../models/AcademicYear.js';
import { dbURL } from '../config/config.js';

// Exam Types (English UI)
const EXAM_TYPES = ['Mid-term', 'Final'];

// Grades (Arabic): مستوى الأول → مستوى العاشر
const ARABIC_GRADES = [
  'level one',
  'level two',
  'level three',
  'level four',
  'level five',
  'level six',
  'level seven',
  'level eight',
  'level nine',
  'level ten',
];

// Shifts (Arabic)
const SHIFTS = ['evening', 'morning'];

// Academic Years (dynamic around current year)
function generateAcademicYears() {
  const now = new Date();
  // Academic year starts around Aug/Sep. If month >= 7 (Aug=7 zero-based?), use current year as start
  // JS months: 0=Jan ... 11=Dec. Treat Aug (7) as threshold.
  const month = now.getMonth();
  const base = month >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const list = [
    (base - 1) + '-' + base,
    base + '-' + (base + 1),
    (base + 1) + '-' + (base + 2),
  ];
  return list;
}

async function seedExamTypes() {
  for (let i = 0; i < EXAM_TYPES.length; i++) {
    const t = EXAM_TYPES[i];
    const exists = await ExamType.findOne({ typeName: t, templateVersion: 1 });
    if (!exists) {
      const name = String(t || '').toLowerCase();
      const maxScore = name.includes('mid') ? 40 : (name.includes('final') ? 60 : 100);
      const templateTotal = 100;
      const order = i + 1;
      await ExamType.create({ typeName: t, templateVersion: 1, maxScore, templateTotal, order, isActive: true });
      console.log('[seed] Added ExamType:', t);
    } else {
      console.log('[seed] ExamType exists:', t);
    }
  }
}

async function seedGrades() {
  for (const name of ARABIC_GRADES) {
    const exists = await Grade.findOne({ gradeName: name });
    if (!exists) {
      await Grade.create({ gradeName: name });
      console.log('[seed] Added Grade:', name);
    } else {
      console.log('[seed] Grade exists:', name);
    }
  }
}

async function seedShifts() {
  for (const name of SHIFTS) {
    const exists = await Shift.findOne({ shiftName: name });
    if (!exists) {
      await Shift.create({ shiftName: name });
      console.log('[seed] Added Shift:', name);
    } else {
      console.log('[seed] Shift exists:', name);
    }
  }
}

async function seedAcademicYears() {
  const years = generateAcademicYears();
  for (const y of years) {
    const exists = await AcademicYear.findOne({ yearName: y });
    if (!exists) {
      await AcademicYear.create({ yearName: y });
      console.log('[seed] Added AcademicYear:', y);
    } else {
      console.log('[seed] AcademicYear exists:', y);
    }
  }
}

async function seed() {
  const mongoUri = dbURL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('[seed] No dbURL / MONGO_URI found');
    process.exit(1);
  }
  console.log('[seed] Connecting ->', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('[seed] Connected');

  await seedExamTypes();
  await seedGrades();
  await seedShifts();
  await seedAcademicYears();

  console.log('[seed] Done');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error('[seed] Failed', e);
  process.exit(1);
});