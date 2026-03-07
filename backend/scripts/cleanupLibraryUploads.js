// Cleanup script: remove orphaned files under uploads/library
// Default is dry-run.
// Usage:
//   node backend/scripts/cleanupLibraryUploads.js            (dry-run)
//   node backend/scripts/cleanupLibraryUploads.js --delete   (delete orphans)
//   node backend/scripts/cleanupLibraryUploads.js --delete --yes

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import connectDB from '../config/db.js';
import LibraryResource from '../models/LibraryResource.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function hasFlag(name) {
  try {
    return process.argv.includes(name);
  } catch {
    return false;
  }
}

async function main() {
  const doDelete = hasFlag('--delete');
  const yes = hasFlag('--yes');

  if (doDelete && !yes) {
    console.log('[library-cleanup] Refusing to delete without --yes');
    console.log('Run: node backend/scripts/cleanupLibraryUploads.js --delete --yes');
    process.exit(2);
  }

  await connectDB();

  const uploadsDir = path.resolve(__dirname, '..', 'uploads', 'library');

  let diskFiles = [];
  try {
    diskFiles = await fs.readdir(uploadsDir);
  } catch (err) {
    if (String(err?.code || '').toUpperCase() === 'ENOENT') {
      console.log('[library-cleanup] uploads/library does not exist. Nothing to do.');
      return;
    }
    throw err;
  }

  const resources = await LibraryResource.find({ kind: 'pdf', 'file.path': { $exists: true, $ne: '' } })
    .select('file.path')
    .lean();

  const usedRelPaths = new Set(
    resources
      .map((r) => String(r?.file?.path || '').trim())
      .filter(Boolean)
  );

  const orphans = [];
  for (const name of diskFiles) {
    const filename = String(name || '').trim();
    if (!filename) continue;

    const rel = path.posix.join('uploads', 'library', filename);
    if (!usedRelPaths.has(rel)) {
      orphans.push({ filename, rel, abs: path.join(uploadsDir, filename) });
    }
  }

  if (!orphans.length) {
    console.log('[library-cleanup] No orphan files found.');
    return;
  }

  console.log(`[library-cleanup] Orphan files found: ${orphans.length}`);

  if (!doDelete) {
    console.log('[library-cleanup] Dry-run (no deletions). Add --delete --yes to remove.');
    for (const o of orphans.slice(0, 25)) console.log(' -', o.rel);
    if (orphans.length > 25) console.log(` ... and ${orphans.length - 25} more`);
    return;
  }

  let deleted = 0;
  for (const o of orphans) {
    try {
      await fs.unlink(o.abs);
      deleted += 1;
    } catch {
      // ignore
    }
  }

  console.log(`[library-cleanup] Deleted orphan files: ${deleted}/${orphans.length}`);
}

main()
  .catch((err) => {
    console.error('[library-cleanup] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  });
