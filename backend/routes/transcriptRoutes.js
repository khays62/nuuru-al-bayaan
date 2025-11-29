import express from 'express';
import { getFullTranscript, getOverallSummary, getClassOverallRanks } from '../controllers/transcriptController.js';

const router = express.Router();

// New transcript routes (optionally used by frontend);
// Keeps compatibility by also exposing full transcript under /api/transcripts
router.get('/students/:id/full-transcript', getFullTranscript);
router.get('/students/:id/overall-summary', getOverallSummary);
router.get('/classes/:academicYearId/:gradeSectionId/overall-ranks', getClassOverallRanks);

export default router;
