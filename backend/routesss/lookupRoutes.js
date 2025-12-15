import express from 'express';
import { 
    getAcademicYears, 
    getGrades, 
    getShifts, 
    getExamTypes
} from '../controllersss/lookupController.js';

const router = express.Router();

// Lookups routes
router.get('/academic-years', getAcademicYears);
router.get('/grades', getGrades);
router.get('/shifts', getShifts);
router.get('/exam-types', getExamTypes);
// Deprecated: classes lookup replaced by /api/grades/sections endpoints

export default router;

