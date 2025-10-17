import express from 'express';
import { getStudents, addStudent, getStudentProfile, getStudentHistory, getStudentTransfers, deactivateStudent, reactivateStudent, updateStudent, transferEnrollment, getFullTranscript, getLatestTransfer, setEnrollmentActiveFlag } from '../controllers/studentController.js';

const router = express.Router();

// Waxaan habaynaynaa routes-ka
router.route('/')
    .get(getStudents)   // Marka la sameeyo GET /api/students
    .post(addStudent);  // Marka la sameeyo POST /api/students

// Profile + History
router.get('/:id', getStudentProfile); // GET /api/students/:id
router.patch('/:id', updateStudent); // PATCH /api/students/:id (update basic fields)
router.get('/:id/history', getStudentHistory); // GET /api/students/:id/history
router.get('/:id/transfers', getStudentTransfers); // GET /api/students/:id/transfers
router.get('/:id/latest-transfer', getLatestTransfer); // GET /api/students/:id/latest-transfer
router.get('/:id/full-transcript', getFullTranscript); // GET /api/students/:id/full-transcript
router.patch('/:id/deactivate', deactivateStudent); // PATCH /api/students/:id/deactivate
router.patch('/:id/reactivate', reactivateStudent); // PATCH /api/students/:id/reactivate
// New transfer endpoint
router.patch('/:id/enrollment/transfer', transferEnrollment); // PATCH /api/students/:id/enrollment/transfer
// Toggle latest enrollment active/inactive (temporary lock)
router.patch('/:id/enrollment/active', setEnrollmentActiveFlag);
// Backward compatibility: temporarily support old path by calling transfer handler
router.patch('/:id/enrollment/reassign', transferEnrollment);

export default router;

