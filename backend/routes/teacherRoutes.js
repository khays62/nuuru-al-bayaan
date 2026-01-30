import express from 'express';
import {
	listTeachers,
	createTeacher,
	updateTeacher,
	deleteTeacher,
	deactivateTeacher,
	reactivateTeacher,
	getAssignments,
	addAssignment,
	removeAssignment,
	getRoster,
	createTeacherLoginUser,
	resetTeacherPassword,
	getTeacherProfile,
	getTeacherAuditLogs,
} from '../controllers/teacherController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { teacherOr, requireTeacherSelf } from '../middleware/teacherScope.js';

const router = express.Router();

router.get('/', protect, checkModuleAnyPermission('teachers'), listTeachers);
router.post('/', protect, checkPermission('teachers', 'add'), createTeacher);
router.post('/:id/create-login', protect, checkPermission('teachers', 'edit'), createTeacherLoginUser);
router.patch('/:id', protect, checkPermission('teachers', 'edit'), updateTeacher);
router.put('/:id', protect, checkPermission('teachers', 'edit'), updateTeacher);
router.patch(
	'/:id/deactivate',
	protect,
	checkAnyPermission([
		{ module: 'teachers', action: 'deactivate' },
		{ module: 'security', action: 'deactivate' },
	]),
	deactivateTeacher
);
router.patch(
	'/:id/reactivate',
	protect,
	checkAnyPermission([
		{ module: 'teachers', action: 'reactivate' },
		{ module: 'security', action: 'activate' },
	]),
	reactivateTeacher
);
router.patch(
	'/:id/reset-password',
	protect,
	checkAnyPermission([
		{ module: 'teachers', action: 'resetPassword' },
		{ module: 'security', action: 'resetPassword' },
	]),
	resetTeacherPassword
);
router.delete('/:id', protect, checkPermission('teachers', 'delete'), deleteTeacher);

router.get(
	'/:id/assignments',
	protect,
	teacherOr(checkModuleAnyPermission('teachers'), requireTeacherSelf('id')),
	getAssignments
);
router.post('/:id/assignments', protect, checkPermission('teachers', 'assign'), addAssignment);
router.delete('/:id/assignments/:assignmentId', protect, checkPermission('teachers', 'assign'), removeAssignment);
router.get(
	'/:id/roster',
	protect,
	teacherOr(checkModuleAnyPermission('teachers'), requireTeacherSelf('id')),
	getRoster
);

// Admin/staff teacher profile + audit history (teachers should not access)
router.get('/:id', protect, checkModuleAnyPermission('teachers'), getTeacherProfile);
router.get('/:id/logs', protect, checkModuleAnyPermission('teachers'), getTeacherAuditLogs);

export default router;
