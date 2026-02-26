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
	uploadTeacherPhoto,
} from '../controllers/teacherController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { teacherOr, requireTeacherSelf } from '../middleware/teacherScope.js';
import { uploadTeacherPhoto as uploadTeacherPhotoMw, TEACHER_PHOTO_MAX_BYTES } from '../middleware/uploadTeacherPhoto.js';

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

// Staff/admin: upload teacher photo (optional feature)
router.post(
	'/:id/photo',
	protect,
	checkPermission('teachers', 'edit'),
	(req, res, next) => {
		uploadTeacherPhotoMw.single('photo')(req, res, (err) => {
			if (!err) return next();
			if (err?.code === 'LIMIT_FILE_SIZE') {
				return res.status(400).json({ message: `Photo too large (max ${Math.round(TEACHER_PHOTO_MAX_BYTES / (1024 * 1024))}MB).` });
			}
			if (err?.code === 'INVALID_FILE_TYPE') {
				return res.status(400).json({ message: 'Invalid photo type. Allowed: JPEG, PNG, WEBP.' });
			}
			return res.status(400).json({ message: err?.message || 'Failed to upload photo.' });
		});
	},
	uploadTeacherPhoto
);

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

// Teacher self OR admin/staff teacher profile
router.get(
	'/:id',
	protect,
	teacherOr(checkModuleAnyPermission('teachers'), requireTeacherSelf('id')),
	getTeacherProfile
);
router.get('/:id/logs', protect, checkModuleAnyPermission('teachers'), getTeacherAuditLogs);

export default router;
