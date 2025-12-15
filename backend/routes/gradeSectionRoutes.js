// import express from 'express';
// import {
//   listGradeSections,
//   getGradeSection,
//   createGradeSection,
//   updateGradeSection,
//   deleteGradeSection,
//   resyncGradeSectionCohort
// } from '../controllers/gradeSectionController.js';

// const router = express.Router();

// // /api/grades/sections
// router.get('/sections', listGradeSections);
// router.get('/sections/:id', getGradeSection);
// router.post('/sections', createGradeSection);
// router.put('/sections/:id', updateGradeSection);
// router.delete('/sections/:id', deleteGradeSection);
// router.post('/sections/:id/resync-cohort', resyncGradeSectionCohort);

// export default router;


import express from 'express';
import {
  listGradeSections,
  getGradeSection,
  createGradeSection,
  updateGradeSection,
  deleteGradeSection,
  resyncGradeSectionCohort
} from '../controllers/gradeSectionController.js';

import { protect } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

// /api/grades/sections
router.get(
  '/sections',
  protect,
  checkPermission("grades", "view"),
  listGradeSections
);

router.get(
  '/sections/:id',
  protect,
  checkPermission("grades", "view"),
  getGradeSection
);

router.post(
  '/sections',
  protect,
  checkPermission("grades", "add"),
  createGradeSection
);

router.put(
  '/sections/:id',
  protect,
  checkPermission("grades", "edit"),
  updateGradeSection
);

router.delete(
  '/sections/:id',
  protect,
  checkPermission("grades", "delete"),
  deleteGradeSection
);

router.post(
  '/sections/:id/resync-cohort',
  protect,
  checkPermission("grades", "edit"),
  resyncGradeSectionCohort
);

export default router;
