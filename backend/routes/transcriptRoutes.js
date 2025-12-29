import express from 'express';
import { getFullTranscript, getOverallSummary, getClassOverallRanks } from '../controllers/transcriptController.js';
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkAnyPermission } from "../middleware/checkPermission.js";

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
  checkAnyPermission([
    { module: 'transcript', action: 'view' },
    { module: 'transcript', action: 'print' },
    { module: 'transcript', action: 'download' },
    { module: 'students', action: 'view' },
    { module: 'students', action: 'add' },
    { module: 'students', action: 'edit' },
    { module: 'students', action: 'delete' },
    { module: 'students', action: 'transfer' },
    { module: 'students', action: 'deactivate' },
    { module: 'students', action: 'reactivate' },
    { module: 'students', action: 'download' }
  ]),
  getFullTranscript
);

router.get(
  "/students/:id/overall-summary",
  protect,
  checkAnyPermission([
    { module: 'transcript', action: 'view' },
    { module: 'transcript', action: 'print' },
    { module: 'transcript', action: 'download' },
    { module: 'students', action: 'view' },
    { module: 'students', action: 'add' },
    { module: 'students', action: 'edit' },
    { module: 'students', action: 'delete' },
    { module: 'students', action: 'transfer' },
    { module: 'students', action: 'deactivate' },
    { module: 'students', action: 'reactivate' },
    { module: 'students', action: 'download' }
  ]),
  getOverallSummary
);

router.get(
  "/classes/:academicYearId/:gradeSectionId/overall-ranks",
  protect,
  checkAnyPermission([
    { module: 'transcript', action: 'view' },
    { module: 'transcript', action: 'print' },
    { module: 'transcript', action: 'download' }
  ]),
  getClassOverallRanks
);


export default router;
