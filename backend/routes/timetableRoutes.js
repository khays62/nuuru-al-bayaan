import express from 'express';
import { listSlots, createSlot, createSlotsBulk, updateSlot, swapSlots, deleteSlot } from '../controllers/timetableController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission, checkPermission } from '../middleware/checkPermission.js';
import { requireStudentDashboardAccess } from '../middleware/studentDashboardPolicy.js';

const router = express.Router();

router.use(protect);

const canReadSlots = (req, res, next) => {
	// Students are allowed to read *their own* timetable slots (controller enforces scope).
	if (req.user?.role === 'student') return next();
	// Teachers are allowed to read *their own* timetable slots (controller enforces scope).
	if (req.user?.role === 'teacher') return next();
	return checkAnyPermission([
		{ module: 'timetable', action: 'view' },
		{ module: 'timetable', action: 'add' },
		{ module: 'timetable', action: 'edit' },
		{ module: 'timetable', action: 'delete' },
		{ module: 'attendance', action: 'view' },
		{ module: 'attendance', action: 'edit' },
	])(req, res, next);
};

// Attendance page needs to read timetable slots to determine periods.
// Allow access if user has timetable access OR attendance access.
router.get(
	'/slots',
	requireStudentDashboardAccess('timetable'),
	canReadSlots,
	listSlots
);
router.post('/slots', checkPermission('timetable', 'add'), createSlot);
router.post('/slots/bulk', checkPermission('timetable', 'add'), createSlotsBulk);
router.post('/slots/swap', checkPermission('timetable', 'edit'), swapSlots);
router.patch('/slots/:id', checkPermission('timetable', 'edit'), updateSlot);
router.delete('/slots/:id', checkPermission('timetable', 'delete'), deleteSlot);

export default router;
