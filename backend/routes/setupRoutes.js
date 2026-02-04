import express from 'express';
import { z } from 'zod';

import {
  listGrades,
  createGrade,
  updateGrade,
  deleteGrade,
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  listAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
} from '../controllers/setupController.js';

import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// All setup endpoints are admin-only.
// Defense-in-depth: return 404 for non-admin (and unauthenticated) to reduce route discovery.
router.use((req, res, next) => {
  protect(req, res, (err) => {
    if (err) return next(err);
    if (!req.user) {
      return res.status(404).json({ message: 'Not found' });
    }

    const role = String(req.user?.role || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(404).json({ message: 'Not found' });
    }

    return next();
  });
});

// Grades
router.get('/grades', listGrades);
router.post(
  '/grades',
  validate({
    body: z
      .object({
        gradeName: z.string().trim().min(1).max(64),
        order: z.coerce.number().int().min(1),
      })
      .strict(),
  }),
  createGrade
);
router.put(
  '/grades/:id',
  validate({
    params: z.object({ id: objectId }).strict(),
    body: z
      .object({
        gradeName: z.string().trim().min(1).max(64),
        order: z.coerce.number().int().min(1),
      })
      .strict(),
  }),
  updateGrade
);
router.delete(
  '/grades/:id',
  validate({ params: z.object({ id: objectId }).strict() }),
  deleteGrade
);

// Shifts
router.get('/shifts', listShifts);
router.post(
  '/shifts',
  validate({
    body: z
      .object({
        shiftName: z.string().trim().min(1).max(64),
      })
      .strict(),
  }),
  createShift
);
router.put(
  '/shifts/:id',
  validate({
    params: z.object({ id: objectId }).strict(),
    body: z
      .object({
        shiftName: z.string().trim().min(1).max(64),
      })
      .strict(),
  }),
  updateShift
);
router.delete(
  '/shifts/:id',
  validate({ params: z.object({ id: objectId }).strict() }),
  deleteShift
);

// Academic Years
router.get('/academic-years', listAcademicYears);
router.post(
  '/academic-years',
  validate({
    body: z
      .object({
        yearName: z.string().trim().min(1).max(32),
      })
      .strict(),
  }),
  createAcademicYear
);
router.put(
  '/academic-years/:id',
  validate({
    params: z.object({ id: objectId }).strict(),
    body: z
      .object({
        yearName: z.string().trim().min(1).max(32),
      })
      .strict(),
  }),
  updateAcademicYear
);
router.delete(
  '/academic-years/:id',
  validate({ params: z.object({ id: objectId }).strict() }),
  deleteAcademicYear
);

export default router;
