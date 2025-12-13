import express from 'express';
import { listTeachers, createTeacher, updateTeacher, deleteTeacher, getAssignments, addAssignment, removeAssignment, getRoster } from '../controllers/teacherController.js';

const router = express.Router();

router.get('/', listTeachers);
router.post('/', createTeacher);
router.patch('/:id', updateTeacher);
router.put('/:id', updateTeacher);
router.delete('/:id', deleteTeacher);
router.get('/:id/assignments', getAssignments);
router.post('/:id/assignments', addAssignment);
router.delete('/:id/assignments/:assignmentId', removeAssignment);
router.get('/:id/roster', getRoster);

export default router;
