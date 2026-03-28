import multer from 'multer';

export const USER_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const storage = multer.memoryStorage();

export const uploadUserPhoto = multer({
  storage,
  limits: { fileSize: USER_PHOTO_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(String(file?.mimetype || ''))) {
      const err = new Error('Invalid file type');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err, false);
    }
    return cb(null, true);
  },
});

export const userUploadsPaths = {};
