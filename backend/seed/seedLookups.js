// Clean seed script (only AcademicYear & Shift). Run with: node backend/seed/seedLookups.js
import mongoose from 'mongoose';
import AcademicYear from '../models/AcademicYear.js';
import Shift from '../models/Shift.js';
import { dbURL } from '../config/config.js';

const ACADEMIC_YEARS = [
  '2023/2024',
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028'
];

const SHIFTS = ['Morning','Evening'];

async function seed() {
  const mongoUri = dbURL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('[seed] No dbURL / MONGO_URI found');
    process.exit(1);
  }
  console.log('[seed] Connecting ->', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('[seed] Connected');

  for (const year of ACADEMIC_YEARS) {
    const exists = await AcademicYear.findOne({ yearName: year });
    if (!exists) { await AcademicYear.create({ yearName: year }); console.log('Added AcademicYear:', year); } else { console.log('AcademicYear exists:', year); }
  }

  for (const sh of SHIFTS) {
    const exists = await Shift.findOne({ shiftName: sh });
    if (!exists) { await Shift.create({ shiftName: sh }); console.log('Added Shift:', sh); } else { console.log('Shift exists:', sh); }
  }

  console.log('[seed] Done');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e=>{ console.error('[seed] Failed', e); process.exit(1); });
