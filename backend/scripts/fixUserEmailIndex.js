import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';

dotenv.config();

async function main() {
  await connectDB();

  const col = mongoose.connection.db.collection('users');
  const indexes = await col.indexes();
  const emailIx = indexes.find((ix) => ix.name === 'email_1');

  if (emailIx) {
    if (emailIx.unique && !emailIx.sparse) {
      await col.dropIndex('email_1');
      console.log('Dropped legacy email_1 (non-sparse unique)');
    } else {
      console.log('email_1 index exists and looks OK:', { unique: !!emailIx.unique, sparse: !!emailIx.sparse });
    }
  } else {
    console.log('No email_1 index found (OK)');
  }

  // Ensure sparse unique index exists
  await col.createIndex({ email: 1 }, { unique: true, sparse: true, name: 'email_1' });
  console.log('Ensured email_1 is unique+sparse');

  await mongoose.disconnect();
  console.log('Done');
}

main().catch(async (err) => {
  console.error('fixUserEmailIndex failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
