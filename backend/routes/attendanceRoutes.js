import express from 'express';
import { markAttendanceBulk, getAttendance, getAttendanceReportSummary, getAttendanceReportDetails, getAttendanceReportStudentRange } from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

router.use(protect);

router.post('/mark', checkPermission('attendance', 'edit'), markAttendanceBulk);
router.get('/', checkModuleAnyPermission('attendance'), getAttendance);

// Reports: allow dedicated attendanceReports module OR attendance module (backward compatibility)
router.get(
	'/reports/summary',
	checkAnyPermission([
		{ module: 'attendanceReports', action: 'view' },
		{ module: 'attendanceReports', action: 'print' },
		{ module: 'attendanceReports', action: 'download' },
		// Backward compatibility
		{ module: 'attendance', action: 'view' },
		{ module: 'attendance', action: 'edit' },
		{ module: 'attendance', action: 'print' },
		{ module: 'attendance', action: 'download' },
	]),
	getAttendanceReportSummary
);

router.get(
	'/reports/details',
	checkAnyPermission([
		{ module: 'attendanceReports', action: 'view' },
		{ module: 'attendanceReports', action: 'print' },
		{ module: 'attendanceReports', action: 'download' },
		// Backward compatibility
		{ module: 'attendance', action: 'view' },
		{ module: 'attendance', action: 'edit' },
		{ module: 'attendance', action: 'print' },
		{ module: 'attendance', action: 'download' },
	]),
	getAttendanceReportDetails
);

router.get(
	'/reports/student-range',
	checkAnyPermission([
		{ module: 'attendanceReports', action: 'view' },
		{ module: 'attendanceReports', action: 'print' },
		{ module: 'attendanceReports', action: 'download' },
		// Backward compatibility
		{ module: 'attendance', action: 'view' },
		{ module: 'attendance', action: 'edit' },
		{ module: 'attendance', action: 'print' },
		{ module: 'attendance', action: 'download' },
	]),
	getAttendanceReportStudentRange
);

export default router;
