// import express from 'express';
// import { listCohorts, createCohort, updateCohort, deleteCohort } from '../controllers/cohortController.js';

// const router = express.Router();

// router
// .route('/')
//   .get(
//     protect,
//     checkPermission("cohorts", "view"),
//     listCohorts
//     )
//   .post(
//     protect,
//     checkPermission("cohorts", "add"),
//     createCohort
//     );


// router
// .route('/:id')
//   .put(updateCohort)
//   .delete(deleteCohort);

// export default router;


import express from 'express';
import { listCohorts, createCohort, updateCohort, deleteCohort, getAvailableCohortsForPromotion, getCohortTimeline } from '../controllers/cohortController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

// Routes for listing and creating cohorts
router
  .route('/')
  .get(
    protect,
    checkPermission('cohorts', 'view'),
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
    checkPermission('cohorts', 'view'),
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
    checkPermission('cohorts', 'view'),
    getCohortTimeline
  )
  

//   router.get('/available', getAvailableCohortsForPromotion);
// router.get('/:id/timeline', getCohortTimeline);

// router.route('/:id')
//   .put(updateCohort)
//   .delete(deleteCohort);

export default router;
