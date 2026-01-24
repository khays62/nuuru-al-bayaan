import express from "express";
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementController.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// Read: any authenticated user
router.get("/", protect, getAnnouncements);

// Write: permission-gated
router.post("/", protect, checkPermission('announcements', 'add'), createAnnouncement);
router.put("/:id", protect, checkPermission('announcements', 'edit'), updateAnnouncement);
router.delete("/:id", protect, checkPermission('announcements', 'delete'), deleteAnnouncement);

export default router;
