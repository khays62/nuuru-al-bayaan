import express from 'express';
import { listCohorts, createCohort, updateCohort, deleteCohort } from '../controllers/cohortController.js';

const router = express.Router();

router.route('/')
  .get(listCohorts)
  .post(createCohort);

router.route('/:id')
  .put(updateCohort)
  .delete(deleteCohort);

export default router;
