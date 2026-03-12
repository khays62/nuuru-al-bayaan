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
import { requireStudentDashboardAccess } from '../middleware/studentDashboardPolicy.js';
import { teacherOr, requireTeacherAssignment } from '../middleware/teacherScope.js';

const router = express.Router();

router.use(protect);

const canViewStudentRangeReport = (req, res, next) => {
	// Students are allowed to read *their own* attendance timeline (controller enforces scope).
	if (req.user?.role === 'student') return next();
	// Teachers are allowed within their assigned class scope.
	if (req.user?.role === 'teacher') {
		return requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectOptional: true })(req, res, next);
	}
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

router.post(
	'/mark',
	teacherOr(
		checkPermission('attendance', 'edit'),
		requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectOptional: true })
	),
	markAttendanceBulk
);
router.get(
	'/',
	teacherOr(
		checkModuleAnyPermission('attendance'),
		requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectOptional: true })
	),
	getAttendance
);

// Reports: allow dedicated attendanceReports module OR attendance module (backward compatibility)
router.get(
	'/reports/summary',
	teacherOr(
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
		requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectOptional: true })
	),
	getAttendanceReportSummary
);

router.get(
	'/reports/details',
	teacherOr(
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
		requireTeacherAssignment({ gradeSectionKeys: ['gradeSectionId'], subjectOptional: true })
	),
	getAttendanceReportDetails
);

router.get(
	'/reports/student-range',
	requireStudentDashboardAccess('attendance'),
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
router.get('/student/self', requireStudentDashboardAccess('attendance'), (req, res, next) => {
	if (req.user?.role === 'student') return next();
	return res.status(403).json({ message: 'Access denied' });
}, getStudentSelfAttendance);

export default router;
