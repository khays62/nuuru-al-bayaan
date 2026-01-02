import express from 'express';
import { listTeachers, createTeacher, updateTeacher, deleteTeacher, getAssignments, addAssignment, removeAssignment, getRoster } from '../controllers/teacherController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

router.get('/', protect, checkModuleAnyPermission('teachers'), listTeachers);
router.post('/', protect, checkPermission('teachers', 'add'), createTeacher);
router.patch('/:id', protect, checkPermission('teachers', 'edit'), updateTeacher);
router.put('/:id', protect, checkPermission('teachers', 'edit'), updateTeacher);
router.delete('/:id', protect, checkPermission('teachers', 'delete'), deleteTeacher);

router.get('/:id/assignments', protect, checkModuleAnyPermission('teachers'), getAssignments);
router.post('/:id/assignments', protect, checkPermission('teachers', 'assign'), addAssignment);
router.delete('/:id/assignments/:assignmentId', protect, checkPermission('teachers', 'assign'), removeAssignment);
router.get('/:id/roster', protect, checkModuleAnyPermission('teachers'), getRoster);

export default router;
