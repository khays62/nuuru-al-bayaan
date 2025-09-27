import express from 'express';
import { getStudents, addStudent, getStudentProfile, getStudentHistory, deactivateStudent, reactivateStudent, updateStudent, reassignEnrollment } from '../controllers/studentController.js';

const router = express.Router();

// Waxaan habaynaynaa routes-ka
router.route('/')
    .get(getStudents)   // Marka la sameeyo GET /api/students
    .post(addStudent);  // Marka la sameeyo POST /api/students

// Profile + History
router.get('/:id', getStudentProfile); // GET /api/students/:id
router.patch('/:id', updateStudent); // PATCH /api/students/:id (update basic fields)
router.get('/:id/history', getStudentHistory); // GET /api/students/:id/history
router.patch('/:id/deactivate', deactivateStudent); // PATCH /api/students/:id/deactivate
router.patch('/:id/reactivate', reactivateStudent); // PATCH /api/students/:id/reactivate
router.patch('/:id/enrollment/reassign', reassignEnrollment); // PATCH /api/students/:id/enrollment/reassign

export default router;

