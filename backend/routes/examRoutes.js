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
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

router.get(
  '/types',
  protect,
  checkAnyPermission([
    { module: 'exams', action: 'view' },
    { module: 'results', action: 'view' },
    { module: 'results', action: 'print' },
    { module: 'results', action: 'download' },
    { module: 'transcript', action: 'view' },
    { module: 'students', action: 'view' },
    { module: 'students', action: 'add' },
    { module: 'students', action: 'edit' },
    { module: 'students', action: 'delete' },
    { module: 'students', action: 'transfer' },
    { module: 'students', action: 'deactivate' },
    { module: 'students', action: 'reactivate' },
    { module: 'students', action: 'download' }
  ]),
  getExamTypes
);

router.get(
  '/has-scores',
  protect,
  checkAnyPermission([
    { module: 'exams', action: 'view' },
    { module: 'results', action: 'view' },
    { module: 'results', action: 'print' },
    { module: 'results', action: 'download' },
    { module: 'transcript', action: 'view' },
    { module: 'students', action: 'view' },
    { module: 'students', action: 'add' },
    { module: 'students', action: 'edit' },
    { module: 'students', action: 'delete' },
    { module: 'students', action: 'transfer' },
    { module: 'students', action: 'deactivate' },
    { module: 'students', action: 'reactivate' },
    { module: 'students', action: 'download' }
  ]),
  hasScores
);

router.post(
  '/ensure',
  protect,
  checkPermission("exams", "input"),
  ensureExams
);

router.get(
  '/grid',
  protect,
  checkAnyPermission([
    { module: 'exams', action: 'view' },
    { module: 'exams', action: 'input' }
  ]),
  getExamGrid
);

router.put(
  '/score',
  protect,
  checkPermission("exams", "input"),
  upsertScore
);

router.get(
  '/summary',
  protect,
  checkAnyPermission([
    { module: 'exams', action: 'view' },
    { module: 'results', action: 'view' },
    { module: 'results', action: 'print' },
    { module: 'results', action: 'download' },
    { module: 'transcript', action: 'view' },
    { module: 'students', action: 'view' },
    { module: 'students', action: 'add' },
    { module: 'students', action: 'edit' },
    { module: 'students', action: 'delete' },
    { module: 'students', action: 'transfer' },
    { module: 'students', action: 'deactivate' },
    { module: 'students', action: 'reactivate' },
    { module: 'students', action: 'download' }
  ]),
  getSummary
);

router.get(
  '/transcript',
  protect,
  checkAnyPermission([
    { module: 'exams', action: 'view' },
    { module: 'transcript', action: 'view' },
    { module: 'students', action: 'view' },
    { module: 'students', action: 'add' },
    { module: 'students', action: 'edit' },
    { module: 'students', action: 'delete' },
    { module: 'students', action: 'transfer' },
    { module: 'students', action: 'deactivate' },
    { module: 'students', action: 'reactivate' },
    { module: 'students', action: 'download' }
  ]),
  getTranscript
);

// Example: Only certain roles can see subjects
router.get(
  "/subjects",
  protect,
  checkAnyPermission([
    { module: 'exams', action: 'view' },
    { module: 'exams', action: 'input' }
  ]),
  (req, res) => {
    res.json({ ok: true, message: "Subjects for exam office" });
  }
);

// Example: Only registration office can view students
router.get(
  "/students",
  protect,
  checkAnyPermission([
    { module: 'exams', action: 'view' },
    { module: 'exams', action: 'input' }
  ]),
  (req, res) => {
    res.json({ ok: true, message: "Students (registration office)" });
  }
);

export default router;
