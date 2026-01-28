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
router.post("/", protect, checkPermission('announcements', 'add'), createAnnouncement);
router.put("/:id", protect, checkPermission('announcements', 'edit'), updateAnnouncement);
router.delete("/:id", protect, checkPermission('announcements', 'delete'), deleteAnnouncement);

export default router;
