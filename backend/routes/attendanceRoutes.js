import express from 'express';
import { markAttendanceBulk, getAttendance, getAttendanceReportSummary, getAttendanceReportDetails } from '../controllers/attendanceController.js';

const router = express.Router();

router.post('/mark', markAttendanceBulk);
router.get('/', getAttendance);
router.get('/reports/summary', getAttendanceReportSummary);
router.get('/reports/details', getAttendanceReportDetails);

export default router;
