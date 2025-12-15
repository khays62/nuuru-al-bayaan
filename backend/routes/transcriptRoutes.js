import express from 'express';
import { getFullTranscript, getOverallSummary, getClassOverallRanks } from '../controllers/transcriptController.js';
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// New transcript routes (optionally used by frontend);
// Keeps compatibility by also exposing full transcript under /api/transcripts
// router.get('/students/:id/full-transcript', getFullTranscript);
// router.get('/students/:id/overall-summary', getOverallSummary);
// router.get('/classes/:academicYearId/:gradeSectionId/overall-ranks', getClassOverallRanks);

// Student academic routes
router.get(
  "/students/:id/full-transcript",
  protect,
  checkPermission("students", "view"),
  getFullTranscript
);

router.get(
  "/students/:id/overall-summary",
  protect,
  checkPermission("students", "view"),
  getOverallSummary
);

router.get(
  "/classes/:academicYearId/:gradeSectionId/overall-ranks",
  protect,
  checkPermission("classes", "view"),
  getClassOverallRanks
);


export default router;
