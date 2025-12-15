import express from 'express';
import { listSlots, createSlot, createSlotsBulk, updateSlot, swapSlots, deleteSlot } from '../controllers/timetableController.js';

const router = express.Router();

router.get('/slots', listSlots);
router.post('/slots', createSlot);
router.post('/slots/bulk', createSlotsBulk);
router.post('/slots/swap', swapSlots);
router.patch('/slots/:id', updateSlot);
router.delete('/slots/:id', deleteSlot);

export default router;
