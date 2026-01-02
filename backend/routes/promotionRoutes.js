// Promotion Routes
import express from 'express';
import { previewPromotion, executePromotion } from '../controllers/promotionController.js';
import { checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/promotions/preview
router.get(
	'/preview',
	protect,
	checkModuleAnyPermission('promotions'),
	previewPromotion
);

// POST /api/promotions/execute
router.post(
	'/execute',
	protect,
	checkPermission("promotions", "promote"),
	executePromotion
);

export default router;
