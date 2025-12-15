// import express from 'express';
// import { getSubjects, addSubject, updateSubject, deleteSubject } from '../controllers/subjectController.js';

// const router = express.Router();

// // Setup the routes for getting all subjects and adding a new one
// router.route('/')
//     .get(getSubjects)
//     .post(addSubject);

// router.route('/:id')
//     .put(updateSubject)
//     .delete(deleteSubject);

// export default router;


import express from 'express';
import { 
  getSubjects, 
  addSubject, 
  updateSubject, 
  deleteSubject 
} from '../controllers/subjectController.js';

import { protect } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

router
  .route('/')
  .get(
    protect,
    checkPermission("subjects", "view"),
    getSubjects
  )
  .post(
    protect,
    checkPermission("subjects", "add"),
    addSubject
  );

router
  .route('/:id')
  .put(
    protect,
    checkPermission("subjects", "edit"),
    updateSubject
  )
  .delete(
    protect,
    checkPermission("subjects", "delete"),
    deleteSubject
  );

export default router;
