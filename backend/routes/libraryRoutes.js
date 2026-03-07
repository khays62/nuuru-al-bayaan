import express from 'express';

import { protect } from '../middleware/authMiddleware.js';
import { checkPermission } from '../middleware/checkPermission.js';
import { uploadLibraryResource, LIBRARY_FILE_MAX_BYTES, validateLibraryUploadSignature } from '../middleware/uploadLibraryResource.js';
import { createLibraryResource, deleteLibraryResource, listLibraryResources } from '../controllers/libraryController.js';

const router = express.Router();

router.use(protect);

// Read: any authenticated user (student/staff/teacher/admin)
router.get('/', listLibraryResources);

// Write: admin + teacher always; staff requires library.add
router.post(
  '/',
  (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'teacher') return next();
    return checkPermission('library', 'add')(req, res, next);
  },
  (req, res, next) => {
    const ct = String(req.headers['content-type'] || '').toLowerCase();
    if (!ct.startsWith('multipart/form-data')) return next();

    return uploadLibraryResource.single('file')(req, res, (err) => {
      if (!err) return next();
      if (err?.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: `File too large. Max ${Math.round(LIBRARY_FILE_MAX_BYTES / (1024 * 1024))}MB.` });
      }
      if (String(err?.code || '') === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ success: false, message: 'Invalid file type. Only PDF/DOC/DOCX/PPT/PPTX is allowed.' });
      }
      if (String(err?.code || '') === 'INVALID_FILE_SIGNATURE') {
        return res.status(400).json({ success: false, message: 'Invalid file content. Only PDF/DOC/DOCX/PPT/PPTX is allowed.' });
      }
      return res.status(400).json({ success: false, message: err?.message || 'Upload failed.' });
    });
  },
  validateLibraryUploadSignature,
  createLibraryResource
);

router.delete(
  '/:id',
  (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'teacher') return next();
    return checkPermission('library', 'delete')(req, res, next);
  },
  deleteLibraryResource
);

export default router;
