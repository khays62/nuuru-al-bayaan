import multer from 'multer';

export const TEACHER_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const storage = multer.memoryStorage();

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

export const teacherUploadsPaths = {};
