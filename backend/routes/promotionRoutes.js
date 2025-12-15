// Promotion Routes
import express from 'express';
import { previewPromotion, executePromotion } from '../controllers/promotionController.js';
import { checkPermission } from '../middleware/checkPermission.js';
import ProtectedRoute from '../../frontend/src/components/ProtectedRoute.jsx';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/promotions/preview
router.get(
  '/', 
  protect,
  checkPermission("promotions", "view"),
  previewPromotion
  
  );
router.get(
  '/preview', 
  protect,
  checkPermission("promotions", "preview"),
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
