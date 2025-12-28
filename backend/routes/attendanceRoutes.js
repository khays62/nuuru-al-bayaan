import express from 'express';
import { markAttendanceBulk, getAttendance, getAttendanceReportSummary, getAttendanceReportDetails, getAttendanceReportStudentRange } from '../controllers/attendanceController.js';

const router = express.Router();

router.post('/mark', markAttendanceBulk);
router.get('/', getAttendance);
router.get('/reports/summary', getAttendanceReportSummary);
router.get('/reports/details', getAttendanceReportDetails);
router.get('/reports/student-range', getAttendanceReportStudentRange);

export default router;
