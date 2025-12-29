import express from 'express';
import { listCohorts, createCohort, updateCohort, deleteCohort, getAvailableCohortsForPromotion, getCohortTimeline } from '../controllers/cohortController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

// Routes for listing and creating cohorts
router
  .route('/')
  .get(
    protect,
    checkAnyPermission([
      { module: 'cohorts', action: 'view' },
      { module: 'students', action: 'view' },
      { module: 'students', action: 'add' },
      { module: 'students', action: 'edit' },
      { module: 'students', action: 'delete' },
      { module: 'students', action: 'transfer' },
      { module: 'students', action: 'deactivate' },
      { module: 'students', action: 'reactivate' },
      { module: 'students', action: 'download' }
    ]),
    listCohorts
  )
  .post(
    protect,
    checkPermission('cohorts', 'add'),
    createCohort
  );

  router
  .route('/available')
  .get(
    protect,
    checkAnyPermission([
      { module: 'cohorts', action: 'view' },
      { module: 'students', action: 'view' },
      { module: 'students', action: 'add' },
      { module: 'students', action: 'edit' },
      { module: 'students', action: 'delete' },
      { module: 'students', action: 'transfer' },
      { module: 'students', action: 'deactivate' },
      { module: 'students', action: 'reactivate' },
      { module: 'students', action: 'download' }
    ]),
    getAvailableCohortsForPromotion
  )

// Routes for updating and deleting a specific cohort by ID
router
  .route('/:id')
  .put(
    protect,
    checkPermission('cohorts', 'edit'),
    updateCohort
  )
  .delete(
    protect,
    checkPermission('cohorts', 'delete'),
    deleteCohort
  );

router
  .route('/:id/timeline')
  .get(
    protect,
    checkAnyPermission([
      { module: 'cohorts', action: 'view' },
      { module: 'students', action: 'view' },
      { module: 'students', action: 'add' },
      { module: 'students', action: 'edit' },
      { module: 'students', action: 'delete' },
      { module: 'students', action: 'transfer' },
      { module: 'students', action: 'deactivate' },
      { module: 'students', action: 'reactivate' },
      { module: 'students', action: 'download' }
    ]),
    getCohortTimeline
  )
  

export default router;

