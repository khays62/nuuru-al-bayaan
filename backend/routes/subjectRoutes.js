import express from 'express';
import { 
  getSubjects, 
  addSubject, 
  updateSubject, 
  deleteSubject 
} from '../controllers/subjectController.js';

import { protect } from "../middleware/authMiddleware.js";
import { checkModuleAnyPermission, checkPermission } from "../middleware/checkPermission.js";

const router = express.Router();

router
  .route('/')
  .get(
    protect,
    // Timetable UI needs subjects list for scheduling even when staff only has timetable.view
    (req, res, next) => {
      const mod = (m) => req.user?.permissions?.[m];
      const toObj = (p) => (typeof p?.toObject === 'function' ? p.toObject() : p);
      const hasAny = (p) => Object.entries(toObj(p) || {}).some(([k, v]) => k !== 'full' && v === true) || toObj(p)?.full === true;

      if (req.user?.role === 'admin') return next();
      if (hasAny(mod('subjects')) || hasAny(mod('timetable'))) return next();
      return res.status(403).json({ message: 'You do not have permission to access subjects' });
    },
    getSubjects
  )
  .post(
    protect,
    checkPermission("subjects", "add"),
    addSubject
  );

router
  .route('/:id')
  .put(
    protect,
    checkPermission("subjects", "edit"),
    updateSubject
  )
  .delete(
    protect,
    checkPermission("subjects", "delete"),
    deleteSubject
  );

export default router;
