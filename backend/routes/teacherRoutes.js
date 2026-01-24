import express from 'express';
import { listTeachers, createTeacher, updateTeacher, deleteTeacher, getAssignments, addAssignment, removeAssignment, getRoster, createTeacherLoginUser } from '../controllers/teacherController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { teacherOr, requireTeacherSelf } from '../middleware/teacherScope.js';

const router = express.Router();

router.get('/', protect, checkModuleAnyPermission('teachers'), listTeachers);
router.post('/', protect, checkPermission('teachers', 'add'), createTeacher);
router.post('/:id/create-login', protect, checkPermission('teachers', 'edit'), createTeacherLoginUser);
router.patch('/:id', protect, checkPermission('teachers', 'edit'), updateTeacher);
router.put('/:id', protect, checkPermission('teachers', 'edit'), updateTeacher);
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

export default router;
