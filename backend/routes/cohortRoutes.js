import express from 'express';
import { listCohorts, createCohort, updateCohort, deleteCohort, getAvailableCohortsForPromotion, getCohortTimeline } from '../controllers/cohortController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { allowTeacher } from '../middleware/teacherScope.js';

const router = express.Router();

router
  .route('/')
  .get(
    protect,
    allowTeacher(checkAnyPermission([
      { module: 'cohorts', action: 'view' },
      { module: 'students', action: 'view' },
      { module: 'students', action: 'add' },
      { module: 'students', action: 'edit' },
      { module: 'students', action: 'delete' },
      { module: 'students', action: 'transfer' },
      { module: 'students', action: 'deactivate' },
      { module: 'students', action: 'reactivate' },
      { module: 'students', action: 'download' }
    ])),
    listCohorts
  )
  .post(
    protect,
    checkPermission('cohorts', 'add'),
    createCohort
  );

// Must be defined before '/:id' to avoid treating 'available' as an id
router
  .route('/available')
  .get(
    protect,
    allowTeacher(checkAnyPermission([
      { module: 'cohorts', action: 'view' },
      { module: 'students', action: 'view' },
      { module: 'students', action: 'add' },
      { module: 'students', action: 'edit' },
      { module: 'students', action: 'delete' },
      { module: 'students', action: 'transfer' },
      { module: 'students', action: 'deactivate' },
      { module: 'students', action: 'reactivate' },
      { module: 'students', action: 'download' }
    ])),
    getAvailableCohortsForPromotion
  );

router
  .route('/:id/timeline')
  .get(
    protect,
    allowTeacher(checkAnyPermission([
      { module: 'cohorts', action: 'view' },
      { module: 'students', action: 'view' },
      { module: 'students', action: 'add' },
      { module: 'students', action: 'edit' },
      { module: 'students', action: 'delete' },
      { module: 'students', action: 'transfer' },
      { module: 'students', action: 'deactivate' },
      { module: 'students', action: 'reactivate' },
      { module: 'students', action: 'download' }
    ])),
    getCohortTimeline
  );

router.route('/:id')
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

export default router;
