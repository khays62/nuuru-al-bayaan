import express from 'express';
import {
  listGradeSections,
  getGradeSection,
  createGradeSection,
  updateGradeSection,
  deleteGradeSection,
  resyncGradeSectionCohort
} from '../controllersss/gradeSectionController.js';

const router = express.Router();

// /api/grades/sections
router.get('/sections', listGradeSections);
router.get('/sections/:id', getGradeSection);
router.post('/sections', createGradeSection);
router.put('/sections/:id', updateGradeSection);
router.delete('/sections/:id', deleteGradeSection);
router.post('/sections/:id/resync-cohort', resyncGradeSectionCohort);

export default router;
