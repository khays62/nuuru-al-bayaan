import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const TEACHER_UPLOADS_DIR = path.join(UPLOADS_ROOT, 'teachers');

export const TEACHER_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function ensureDirs() {
  try {
    fs.mkdirSync(TEACHER_UPLOADS_DIR, { recursive: true });
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
    cb(null, TEACHER_UPLOADS_DIR);
  },
  filename(req, file, cb) {
    const id = String(req.params?.id || 'teacher').replace(/[^a-zA-Z0-9_-]/g, '');
    const ts = Date.now();
    const ext = safeExt(file.mimetype) || path.extname(file.originalname || '') || '';
    cb(null, `${id}-${ts}${ext}`);
  },
});

export const uploadTeacherPhoto = multer({
  storage,
  limits: { fileSize: TEACHER_PHOTO_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(String(file?.mimetype || ''))) {
      const err = new Error('Invalid file type');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    return cb(null, true);
  },
});

export const teacherUploadsPaths = {
  uploadsRoot: UPLOADS_ROOT,
  teachersDir: TEACHER_UPLOADS_DIR,
};
