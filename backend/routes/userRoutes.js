import express from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserById,
  getUserAuditLogs
} from "../controllers/userController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin'));

const userBodySchema = z.object({
  fullName: z.string().trim().min(1).max(128).optional(),
  username: z.string().trim().min(1).max(64),
  email: z.string().trim().email().max(128).optional().or(z.literal('')).optional(),
  phone: z.string().trim().max(32).optional().or(z.literal('')).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  // Zod v4: record() expects (keySchema, valueSchema). One-arg form causes `_zod` crashes.
  permissions: z.record(z.string(), z.unknown()).optional(),
  password: z.string().min(6).max(256).optional(),
}).strip();

router.post(
  "/",
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
      sortBy: z.enum(['createdAt', 'updatedAt', 'fullName', 'username', 'email', 'role', 'status']).optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }).strip(),
  }),
  getUsers
);

router.put(
  "/:id",
  validate({ params: z.object({ id: z.string().min(1) }).strip(), body: userBodySchema }),
  updateUser
);
router.delete(
  "/:id",
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  deleteUser
);
router.patch(
  "/:id/toggle",
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  toggleUserStatus
); // ✅ matches frontend call now
router.get(
  "/:id",
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  getUserById
);

router.get(
  "/:id/logs",
  validate({
    params: z.object({ id: z.string().min(1) }).strip(),
    query: z.object({ limit: z.coerce.number().optional() }).strip().optional(),
  }),
  getUserAuditLogs
);

export default router;
