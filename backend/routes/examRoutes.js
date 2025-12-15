// import express from 'express';
// import { getExamTypes, ensureExams, getExamGrid, upsertScore, getSummary, getTranscript, hasScores } from '../controllers/examController.js';
// import { protect } from "../middleware/authMiddleware.js";
// import { authorizeRoles } from "../middleware/roleMiddleware.js";
// const router = express.Router();

// router.get('/types', getExamTypes);
// router.get('/has-scores', hasScores);
// router.post('/ensure', ensureExams);
// router.get('/grid', getExamGrid);
// router.put('/score', upsertScore);
// router.get('/summary', getSummary);
// router.get('/transcript', getTranscript);
// router.get("/subjects", protect, authorizeRoles("admin", "exam_office"), (req, res) => {
//   // return subjects
//   res.json({ ok: true, message: "Subjects for exam office" });
// });

// router.get("/students", protect, authorizeRoles("admin", "registration_office"), (req, res) => {
//   res.json({ ok: true, message: "Students (registration office)" });
// });
// export default router;



import express from 'express';
import {
  getExamTypes,
  ensureExams,
  getExamGrid,
  upsertScore,
  getSummary,
  getTranscript,
  hasScores
} from '../controllers/examController.js';

import { protect } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

router.get(
  '/types',
  protect,
  checkPermission("exams", "view"),
  getExamTypes
);

router.get(
  '/has-scores',
  protect,
  checkPermission("exams", "view"),
  hasScores
);

router.post(
  '/ensure',
  protect,
  checkPermission("exams", "add"),
  ensureExams
);

router.get(
  '/grid',
  protect,
  checkPermission("exams", "view"),
  getExamGrid
);

router.put(
  '/score',
  protect,
  checkPermission("exams", "edit"),
  upsertScore
);

router.get(
  '/summary',
  protect,
  checkPermission("exams", "view"),
  getSummary
);

router.get(
  '/transcript',
  protect,
  checkPermission("exams", "view"),
  getTranscript
);

// Example: Only certain roles can see subjects
router.get(
  "/subjects",
  protect,
  checkPermission("exams", "view"),
  (req, res) => {
    res.json({ ok: true, message: "Subjects for exam office" });
  }
);

// Example: Only registration office can view students
router.get(
  "/students",
  protect,
  checkPermission("exams", "view"),
  (req, res) => {
    res.json({ ok: true, message: "Students (registration office)" });
  }
);

export default router;




// import express from "express";
// import { protect } from "../middleware/authMiddleware.js";
// import { authorizeRoles } from "../middleware/roleMiddleware.js";

// const router = express.Router();

// router.get("/subjects", protect, authorizeRoles("admin", "exam_office"), (req, res) => {
//   // return subjects
//   res.json({ ok: true, message: "Subjects for exam office" });
// });

// router.get("/students", protect, authorizeRoles("admin", "registration_office"), (req, res) => {
//   res.json({ ok: true, message: "Students (registration office)" });
// });

// export default router;
