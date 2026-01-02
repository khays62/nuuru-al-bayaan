import express from 'express';
import {
	markAttendanceBulk,
	getAttendance,
	getAttendanceReportSummary,
	getAttendanceReportDetails,
	getAttendanceReportStudentRange,
	getStudentSelfAttendance,
	getStudentAttendanceSelfForStudentId
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

router.use(protect);

const canViewStudentRangeReport = (req, res, next) => {
	// Students are allowed to read *their own* attendance timeline (controller enforces scope).
	if (req.user?.role === 'student') return next();
	return checkAnyPermission([
		{ module: 'attendanceReports', action: 'view' },
		{ module: 'attendanceReports', action: 'print' },
		{ module: 'attendanceReports', action: 'download' },
		// Backward compatibility
		{ module: 'attendance', action: 'view' },
		{ module: 'attendance', action: 'edit' },
		{ module: 'attendance', action: 'print' },
		{ module: 'attendance', action: 'download' },
	])(req, res, next);
};

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
	canViewStudentRangeReport,
	getAttendanceReportStudentRange
);

// Staff/Admin view: show a specific student's attendance in the same shape as the student portal
router.get(
	'/student/:id/self',
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
	getStudentAttendanceSelfForStudentId
);

// Student self view (read-only): show only attendance that was taken/saved
router.get('/student/self', (req, res, next) => {
	if (req.user?.role === 'student') return next();
	return res.status(403).json({ message: 'Access denied' });
}, getStudentSelfAttendance);

export default router;
