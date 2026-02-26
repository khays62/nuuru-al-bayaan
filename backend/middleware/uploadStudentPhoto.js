import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const STUDENT_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'students');

export const STUDENT_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function ensureDirs() {
  try {
    fs.mkdirSync(STUDENT_UPLOADS_DIR, { recursive: true });
  } catch {
    // ignore; multer will fail later if it can't write
  }
}

function safeExt(mimetype) {
  if (mimetype === 'image/jpeg') return '.jpg';
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  return '';
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    ensureDirs();
    cb(null, STUDENT_UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const id = String(req.params?.id || 'student').replace(/[^a-zA-Z0-9_-]/g, '');
    const ts = Date.now();
    const ext = safeExt(file.mimetype) || path.extname(file.originalname || '') || '';
    cb(null, `${id}-${ts}${ext}`);
  },
});

export const uploadStudentPhoto = multer({
  storage,
  limits: { fileSize: STUDENT_PHOTO_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(String(file?.mimetype || ''))) {
      const err = new Error('Invalid file type');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    return cb(null, true);
  },
});

export const studentUploadsPaths = {
  uploadsRoot: UPLOADS_ROOT,
  studentsDir: STUDENT_UPLOADS_DIR,
};
