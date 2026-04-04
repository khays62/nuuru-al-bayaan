import express from 'express';
import { 
    getAcademicYears, 
    getGrades, 
    getShifts, 
    getExamTypes
} from '../controllers/lookupController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Lookups routes
router.get('/academic-years', protect, getAcademicYears);
router.get('/grades', getGrades);
router.get('/shifts', getShifts);
router.get('/exam-types', getExamTypes);
// Deprecated: classes lookup replaced by /api/grades/sections endpoints

export default router;

