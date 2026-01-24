import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  getAuthLockUnreadCount,
  listAuthLockEvents,
  markAuthLockEventRead,
  resetPasswordAndUnlock,
  lockUser24h,
} from '../controllers/securityController.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin', 'staff'));

router.get('/auth-locks/unread-count', checkPermission('security', 'view'), getAuthLockUnreadCount);
router.get(
  '/auth-locks',
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }).strip() }),
  checkPermission('security', 'view'),
  listAuthLockEvents
);
router.patch(
  '/auth-locks/:id/read',
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  checkPermission('security', 'view'),
  markAuthLockEventRead
);

router.post(
  '/users/:id/reset-password',
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  checkAnyPermission([
    { module: 'security', action: 'resetPassword' },
    { module: 'security', action: 'edit' },
  ]),
  resetPasswordAndUnlock
);

router.post(
  '/users/:id/lock-24h',
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  checkPermission('security', 'edit'),
  lockUser24h
);

export default router;
