import express from 'express';
import { getExamTypes, ensureExams, getExamGrid, upsertScore, getSummary, getTranscript } from '../controllers/examController.js';

const router = express.Router();

router.get('/types', getExamTypes);
router.post('/ensure', ensureExams);
router.get('/grid', getExamGrid);
router.put('/score', upsertScore);
router.get('/summary', getSummary);
router.get('/transcript', getTranscript);

export default router;
