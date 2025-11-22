import express from 'express';
import { listCohorts, createCohort, updateCohort, deleteCohort, getAvailableCohortsForPromotion } from '../controllers/cohortController.js';

const router = express.Router();

router.route('/')
  .get(listCohorts)
  .post(createCohort);

// Must be defined before '/:id' to avoid treating 'available' as an id
router.get('/available', getAvailableCohortsForPromotion);

router.route('/:id')
  .put(updateCohort)
  .delete(deleteCohort);

export default router;
