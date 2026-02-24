import express from 'express';
import {
	getExamTypes,
	ensureExams,
	getExamGrid,
	upsertScore,
	importExamScores,
	getSummary,
	getTranscript,
	hasScores,
	getExamTemplateVersions,
	getExamTemplateDetail,
	setExamTemplateTotal,
	createExamTemplateComponent,
	updateExamTemplateComponent,
	deleteExamTemplateComponent,
	deleteExamTemplateVersion,
	cloneExamTemplateVersion,
	setActiveExamTemplateVersion
} from '../controllers/examController.js';

import { protect } from "../middleware/authMiddleware.js";
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";
import { allowStudentSelfOr } from '../middleware/studentSelf.js';
import { allowTeacher, teacherOr, requireTeacherAssignment } from '../middleware/teacherScope.js';

const router = express.Router();

router.get(
	'/types',
	protect,
	allowTeacher(checkAnyPermission([
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
	])),
	getExamTypes
);

router.get(
	'/template/versions',
	protect,
	allowTeacher(checkAnyPermission([
		{ module: 'exams', action: 'view' },
		{ module: 'exams', action: 'input' }
	])),
	getExamTemplateVersions
);

router.get(
	'/template/detail',
	protect,
	allowTeacher(checkAnyPermission([
		{ module: 'exams', action: 'view' },
		{ module: 'exams', action: 'input' }
	])),
	getExamTemplateDetail
);

router.put(
	'/template/total',
	protect,
	checkPermission('exams', 'input'),
	setExamTemplateTotal
);

router.post(
	'/template/component',
	protect,
	checkPermission('exams', 'input'),
	createExamTemplateComponent
);

router.put(
	'/template/component/:id',
	protect,
	checkPermission('exams', 'input'),
	updateExamTemplateComponent
);

router.delete(
	'/template/component/:id',
	protect,
	checkPermission('exams', 'input'),
	deleteExamTemplateComponent
);

router.delete(
	'/template/version/:templateVersion',
	protect,
	checkPermission('exams', 'input'),
	deleteExamTemplateVersion
);

router.post(
	'/template/clone',
	protect,
	checkPermission('exams', 'input'),
	cloneExamTemplateVersion
);
router.put(
	'/template/active',
	protect,
	checkPermission('exams', 'input'),
	setActiveExamTemplateVersion
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
	teacherOr(
		checkAnyPermission([
			{ module: 'exams', action: 'view' },
			{ module: 'exams', action: 'input' }
		]),
		requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectKeys: ['subjectId'], subjectOptional: false })
	),
	getExamGrid
);

router.put(
	'/score',
	protect,
	allowTeacher(checkPermission("exams", "input")),
	upsertScore
);

router.post(
	'/scores/import',
	protect,
	teacherOr(
		checkPermission('exams', 'input'),
		requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectKeys: ['subjectId'], subjectOptional: false })
	),
	importExamScores
);

router.get(
	'/summary',
	protect,
	teacherOr(
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
		requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectKeys: ['subjectId'], subjectOptional: true })
	),
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
