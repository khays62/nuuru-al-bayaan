// Seed script: ExamType only (Mid-term, Final)
// Run with: node backend/seed/seedLookups.js
import mongoose from 'mongoose';
import ExamType from '../models/ExamType.js';
import { dbURL } from '../config/config.js';

const EXAM_TYPES = ['Mid-term', 'Final'];

async function seed() {
  const mongoUri = dbURL || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('[seed] No dbURL / MONGO_URI found');
    process.exit(1);
  }
  console.log('[seed] Connecting ->', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('[seed] Connected');

  for (const t of EXAM_TYPES) {
    const exists = await ExamType.findOne({ typeName: t });
    if (!exists) { await ExamType.create({ typeName: t }); console.log('Added ExamType:', t); } else { console.log('ExamType exists:', t); }
  }

  console.log('[seed] Done');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(e=>{ console.error('[seed] Failed', e); process.exit(1); });
