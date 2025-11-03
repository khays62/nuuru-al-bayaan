// Promotion Routes
import express from 'express';
import { previewPromotion, executePromotion } from '../controllers/promotionController.js';

const router = express.Router();

// GET /api/promotions/preview
router.get('/preview', previewPromotion);

// POST /api/promotions/execute
router.post('/execute', executePromotion);

export default router;
