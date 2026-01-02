import express from 'express';
import { getExamTypes, ensureExams, getExamGrid, upsertScore, getSummary, getTranscript, hasScores } from '../controllers/examController.js';

import { protect } from "../middleware/authMiddleware.js";
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";
import { allowStudentSelfOr } from '../middleware/studentSelf.js';

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
	allowStudentSelfOr(checkAnyPermission([
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
	]), { query: 'studentId' }),
	getTranscript
);

export default router;
