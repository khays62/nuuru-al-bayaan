import express from "express";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
  streamAnnouncements,
  getAnnouncementsUnreadCount,
  markAnnouncementsRead,
} from "../controllers/announcementController.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// Read: any authenticated user
router.get("/", protect, getAnnouncements);

// Unread notifications (per-user)
router.get('/unread-count', protect, getAnnouncementsUnreadCount);
router.post('/mark-read', protect, markAnnouncementsRead);

// Realtime stream (SSE)
router.get('/stream', protect, streamAnnouncements);

// Write: permission-gated
router.post(
  "/",
  protect,
  (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin' || role === 'teacher') return next();
    return checkPermission('announcements', 'add')(req, res, next);
  },
  createAnnouncement
);
router.put(
  "/:id",
  protect,
  (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin') return next();
    if (role === 'teacher') {
      // Controller will enforce ownership; allow teachers through.
      req.audit = { module: 'announcements', action: 'edit' };
      return next();
    }
    return checkPermission('announcements', 'edit')(req, res, next);
  },
  updateAnnouncement
);

router.delete(
  "/:id",
  protect,
  (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'admin') return next();
    if (role === 'teacher') {
      // Controller will enforce ownership; allow teachers through.
      req.audit = { module: 'announcements', action: 'delete' };
      return next();
    }
    return checkPermission('announcements', 'delete')(req, res, next);
  },
  deleteAnnouncement
);

export default router;
