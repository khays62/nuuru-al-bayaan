import express from 'express';
import {
  listGradeSections,
  getGradeSection,
  createGradeSection,
  updateGradeSection,
  deleteGradeSection
} from '../controllers/gradeSectionController.js';

const router = express.Router();

// /api/grades/sections
router.get('/sections', listGradeSections);
router.get('/sections/:id', getGradeSection);
router.post('/sections', createGradeSection);
router.put('/sections/:id', updateGradeSection);
router.delete('/sections/:id', deleteGradeSection);

export default router;
