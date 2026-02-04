import express from 'express';

import { protect } from '../middleware/authMiddleware.js';
import { getDashboardSummary } from '../controllers/dashboardController.js';

const router = express.Router();

// Dashboard is for admin/staff only. We keep behavior consistent with the app:
// - Unauthenticated users are rejected by protect
// - Authenticated but non-admin/staff get a 404 to avoid role probing
router.get('/summary', protect, getDashboardSummary);

export default router;
