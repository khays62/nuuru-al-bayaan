import multer from 'multer';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const LIBRARY_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'library');

export const LIBRARY_FILE_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function ensureDirs() {
  try {
    fs.mkdirSync(LIBRARY_UPLOADS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function safeExt(mimetype) {
  if (mimetype === 'application/pdf') return '.pdf';
  if (mimetype === 'application/msword') return '.doc';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (mimetype === 'application/vnd.ms-powerpoint') return '.ppt';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return '.pptx';
  return '';
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureDirs();
    cb(null, LIBRARY_UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const actor = String(req.user?._id || req.user?.username || 'library').replace(/[^a-zA-Z0-9_-]/g, '');
    const ts = Date.now();
    const ext = safeExt(file.mimetype) || path.extname(file.originalname || '') || '.pdf';
    cb(null, `${actor}-${ts}${ext}`);
  },
});

export const uploadLibraryResource = multer({
  storage,
  limits: { fileSize: LIBRARY_FILE_MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(String(file?.mimetype || ''))) {
      const err = new Error('Invalid file type');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    return cb(null, true);
  },
});

function startsWithBytes(buf, bytes) {
  try {
    if (!buf || !Buffer.isBuffer(buf)) return false;
    if (!Array.isArray(bytes) || bytes.length === 0) return false;
    if (buf.length < bytes.length) return false;
    for (let i = 0; i < bytes.length; i += 1) {
      if (buf[i] !== bytes[i]) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function readHeaderBytes(filePath, length) {
  const handle = await fsPromises.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buf, 0, length, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    try { await handle.close(); } catch { /* ignore */ }
  }
}

// Extra hardening: validate file magic bytes after upload.
// Prevents clients from faking mimetype for non-PDF/DOC/DOCX.
export async function validateLibraryUploadSignature(req, res, next) {
  const file = req.file;
  if (!file?.path || !file?.mimetype) return next();

  const mimetype = String(file.mimetype || '');
  const p = String(file.path || '');

  try {
    const header = await readHeaderBytes(p, 16);

    // PDF: %PDF-
    if (mimetype === 'application/pdf') {
      const ok = header.length >= 5 && header.toString('ascii', 0, 5) === '%PDF-';
      if (!ok) {
        const err = new Error('Invalid file signature');
        err.code = 'INVALID_FILE_SIGNATURE';
        throw err;
      }
      return next();
    }

    // DOC (legacy OLE compound): D0 CF 11 E0 A1 B1 1A E1
    if (mimetype === 'application/msword') {
      const ok = startsWithBytes(header, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
      if (!ok) {
        const err = new Error('Invalid file signature');
        err.code = 'INVALID_FILE_SIGNATURE';
        throw err;
      }
      return next();
    }

    // PPT (legacy OLE compound): D0 CF 11 E0 A1 B1 1A E1
    if (mimetype === 'application/vnd.ms-powerpoint') {
      const ok = startsWithBytes(header, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
      if (!ok) {
        const err = new Error('Invalid file signature');
        err.code = 'INVALID_FILE_SIGNATURE';
        throw err;
      }
      return next();
    }

    // DOCX (zip): PK\x03\x04
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const ok = startsWithBytes(header, [0x50, 0x4B, 0x03, 0x04]);
      if (!ok) {
        const err = new Error('Invalid file signature');
        err.code = 'INVALID_FILE_SIGNATURE';
        throw err;
      }
      return next();
    }

    // PPTX (zip): PK\x03\x04
    if (mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      const ok = startsWithBytes(header, [0x50, 0x4B, 0x03, 0x04]);
      if (!ok) {
        const err = new Error('Invalid file signature');
        err.code = 'INVALID_FILE_SIGNATURE';
        throw err;
      }
      return next();
    }

    // If it passed multer mime allowlist, but isn't recognized here, allow.
    return next();
  } catch (err) {
    try { await fsPromises.unlink(p); } catch { /* ignore */ }
    return next(err);
  }
}

export const libraryUploadsPaths = {
  uploadsRoot: UPLOADS_ROOT,
  libraryDir: LIBRARY_UPLOADS_DIR,
};
