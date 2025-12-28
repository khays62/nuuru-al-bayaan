import express from 'express';
import { listTransferCandidates, performTransfer, listAllTransferLogs } from '../controllers/transferController.js';

const router = express.Router();

// Candidates listing (active students + active enrollments only)
router.get('/candidates', listTransferCandidates);

// Perform transfer (wrapper → studentController.transferEnrollment)
router.patch('/:id', performTransfer);

// Global logs listing
router.get('/logs', listAllTransferLogs);

export default router;
