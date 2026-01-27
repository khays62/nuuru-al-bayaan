import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import {
  getAuthLockUnreadCount,
  listAuthLockEvents,
  markAuthLockEventRead,
  markAllAuthLockEventsRead,
  clearAuthLockEvent,
  resetPasswordAndUnlock,
  unlockUserLogin,
  deactivateUserAccount,
  activateUserAccount,
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

router.patch('/auth-locks/read-all', checkPermission('security', 'view'), markAllAuthLockEventsRead);

router.post(
  '/auth-locks/:id/clear',
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  checkPermission('security', 'view'),
  clearAuthLockEvent
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
  '/users/:id/unlock',
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  checkPermission('security', 'edit'),
  unlockUserLogin
);

router.post(
  '/users/:id/deactivate',
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  checkPermission('security', 'edit'),
  deactivateUserAccount
);

router.post(
  '/users/:id/activate',
  validate({ params: z.object({ id: z.string().min(1) }).strip() }),
  checkPermission('security', 'edit'),
  activateUserAccount
);

export default router;
