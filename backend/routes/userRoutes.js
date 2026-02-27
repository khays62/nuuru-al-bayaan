import express from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserById,
  getUserAuditLogs,
  checkUsernameAvailability
} from "../controllers/userController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { uploadUserPhoto as uploadUserPhotoMw, USER_PHOTO_MAX_BYTES } from '../middleware/uploadUserPhoto.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const userBodySchema = z.object({
  fullName: z.string().trim().min(1).max(128).optional(),
  username: z.string().trim().min(1).max(64),
  email: z.string().trim().email().max(128).optional().or(z.literal('')).optional(),
  phone: z.string().trim().max(32).optional().or(z.literal('')).optional(),
  phone2: z.string().trim().max(32).optional().or(z.literal('')).optional(),
  isSomali: z.union([z.boolean(), z.string()]).optional(),
  nationality: z.string().trim().max(64).optional().or(z.literal('')).optional(),
  residenceRegionId: z.string().trim().max(64).optional().or(z.literal('')).optional(),
  residenceDistrictId: z.string().trim().max(64).optional().or(z.literal('')).optional(),
  residenceNeighborhood: z.string().trim().max(128).optional().or(z.literal('')).optional(),
  salary: z.coerce.number().min(0).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  // Zod v4: record() expects (keySchema, valueSchema). One-arg form causes `_zod` crashes.
  // Multipart form-data can only send strings; allow JSON string and parse in controller.
  permissions: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  password: z.string().min(6).max(256).optional(),
}).strip();

function maybeUploadUserPhoto(req, res, next) {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (!ct.startsWith('multipart/form-data')) return next();
  return uploadUserPhotoMw.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: `Photo too large. Max ${USER_PHOTO_MAX_BYTES} bytes.` });
    }
    if (err?.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ message: 'Invalid photo file type. Use JPG/PNG/WEBP.' });
    }
    return res.status(400).json({ message: err?.message || 'Photo upload failed.' });
  });
}

router.post(
  "/",
  maybeUploadUserPhoto,
  validate({ body: userBodySchema.extend({ password: z.string().min(6).max(256) }) }),
  createUser
);

router.get(
  "/",
  validate({
    query: z.object({
      search: z.string().trim().max(64).optional(),
      role: z.enum(['admin', 'staff']).optional(),
      status: z.enum(['active', 'inactive']).optional(),
      includeTeachers: z.enum(['true', 'false', '1', '0']).optional(),
      sortBy: z.enum(['createdAt', 'updatedAt', 'fullName', 'username', 'email', 'role', 'status']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }).strip(),
  }),
  getUsers
);

router.get(
  '/check-username',
  validate({
    query: z.object({
      username: z.string().trim().min(1).max(64),
      excludeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    }).strip(),
  }),
  checkUsernameAvailability
);

router.put(
  "/:id",
  maybeUploadUserPhoto,
  validate({ params: z.object({ id: objectIdSchema }).strip(), body: userBodySchema }),
  updateUser
);
router.delete(
  "/:id",
  validate({ params: z.object({ id: objectIdSchema }).strip() }),
  deleteUser
);
router.patch(
  "/:id/toggle",
  validate({ params: z.object({ id: objectIdSchema }).strip() }),
  toggleUserStatus
); // ✅ matches frontend call now
router.get(
  "/:id",
  validate({ params: z.object({ id: objectIdSchema }).strip() }),
  getUserById
);

router.get(
  "/:id/logs",
  validate({
    params: z.object({ id: objectIdSchema }).strip(),
    query: z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().optional() }).strip().optional(),
  }),
  getUserAuditLogs
);

export default router;
