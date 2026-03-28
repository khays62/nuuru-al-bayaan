import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { isRemoteUploadsEnabled, putLocalFileToRemote } from '../services/uploadStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRoot = path.resolve(__dirname, '..');
const uploadsRoot = path.join(backendRoot, 'uploads');

// Ensure env is loaded when running as a standalone script.
dotenv.config({ path: path.join(backendRoot, '.env') });

function toPosix(p) {
  return String(p || '').split(path.sep).join('/');
}

function guessContentType(absPath) {
  const ext = path.extname(String(absPath || '')).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.doc') return 'application/msword';
  if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === '.ppt') return 'application/vnd.ms-powerpoint';
  if (ext === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  return '';
}

async function listFilesRecursive(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await listFilesRecursive(abs));
    } else if (e.isFile()) {
      out.push(abs);
    }
  }
  return out;
}

async function pruneEmptyDirs(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    await pruneEmptyDirs(path.join(dir, e.name));
  }

  try {
    const after = await fs.readdir(dir);
    if (after.length === 0) {
      await fs.rmdir(dir);
    }
  } catch {
    // ignore
  }
}

async function main() {
  if (!isRemoteUploadsEnabled()) {
    console.error('[migrate] UPLOADS_DRIVER must be set to b2 to run migration.');
    process.exit(1);
  }

  try {
    await fs.access(uploadsRoot);
  } catch {
    console.log('[migrate] No backend/uploads directory found. Nothing to migrate.');
    return;
  }

  const files = await listFilesRecursive(uploadsRoot);
  if (!files.length) {
    console.log('[migrate] No local upload files found. Nothing to migrate.');
    return;
  }

  let okCount = 0;
  let errCount = 0;
  let totalBytes = 0;

  for (const absPath of files) {
    const stat = await fs.stat(absPath);
    const relFromUploads = path.relative(uploadsRoot, absPath);
    const key = toPosix(path.posix.join('uploads', toPosix(relFromUploads)));
    const contentType = guessContentType(absPath);

    try {
      await putLocalFileToRemote({
        absPath,
        key,
        contentType,
      });
      await fs.unlink(absPath);
      okCount += 1;
      totalBytes += Number(stat.size || 0);
      process.stdout.write(`[migrate] OK  ${key} (${stat.size} bytes)\n`);
    } catch (e) {
      errCount += 1;
      process.stdout.write(`[migrate] ERR ${key} :: ${e?.message || e}\n`);
    }
  }

  // Remove empty dirs (best-effort)
  await pruneEmptyDirs(uploadsRoot);

  console.log(`[migrate] Done. Uploaded+deleted local: ${okCount}. Errors: ${errCount}. Bytes: ${totalBytes}.`);
  if (errCount) process.exitCode = 2;
}

main().catch((e) => {
  console.error('[migrate] Fatal:', e);
  process.exit(1);
});
