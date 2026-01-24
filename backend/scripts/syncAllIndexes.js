import dotenv from 'dotenv';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import { ensureIndexes } from '../utils/indexMaintenance.js';

dotenv.config();

async function main() {
  await connectDB();
  await ensureIndexes();
  await mongoose.disconnect();
  console.log('Index sync complete');
}

main().catch(async (err) => {
  console.error('Index sync failed:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
