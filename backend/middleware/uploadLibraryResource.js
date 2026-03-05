import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

export const libraryUploadsPaths = {
  uploadsRoot: UPLOADS_ROOT,
  libraryDir: LIBRARY_UPLOADS_DIR,
};
