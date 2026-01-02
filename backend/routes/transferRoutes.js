import express from 'express';
import { listTransferCandidates, performTransfer, listAllTransferLogs } from '../controllers/transferController.js';

import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission } from '../middleware/checkPermission.js';

const router = express.Router();

router.use(protect);

// Candidates listing (active students + active enrollments only)
router.get(
	'/candidates',
	checkAnyPermission([
		{ module: 'transfers', action: 'view' },
		{ module: 'transfers', action: 'transfer' },
		// Backward compatibility
		{ module: 'students', action: 'transfer' },
	]),
	listTransferCandidates
);

// Perform transfer (wrapper → studentController.transferEnrollment)
router.patch(
	'/:id',
	checkAnyPermission([
		{ module: 'transfers', action: 'transfer' },
		// Backward compatibility
		{ module: 'students', action: 'transfer' },
	]),
	performTransfer
);

// Global logs listing
router.get(
	'/logs',
	checkAnyPermission([
		{ module: 'transfers', action: 'view' },
		{ module: 'transfers', action: 'transfer' },
		// Backward compatibility
		{ module: 'students', action: 'transfer' },
	]),
	listAllTransferLogs
);

export default router;
