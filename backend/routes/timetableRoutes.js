import express from 'express';
import { listSlots, createSlot, createSlotsBulk, updateSlot, swapSlots, deleteSlot } from '../controllers/timetableController.js';
import { protect } from '../middleware/authMiddleware.js';
import { checkModuleAnyPermission, checkPermission } from '../middleware/checkPermission.js';

const router = express.Router();

router.use(protect);

router.get('/slots', checkModuleAnyPermission('timetable'), listSlots);
router.post('/slots', checkPermission('timetable', 'add'), createSlot);
router.post('/slots/bulk', checkPermission('timetable', 'add'), createSlotsBulk);
router.post('/slots/swap', checkPermission('timetable', 'edit'), swapSlots);
router.patch('/slots/:id', checkPermission('timetable', 'edit'), updateSlot);
router.delete('/slots/:id', checkPermission('timetable', 'delete'), deleteSlot);

export default router;
