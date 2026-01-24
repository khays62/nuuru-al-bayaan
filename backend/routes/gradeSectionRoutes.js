import express from 'express';
import {
  listGradeSections,
  getGradeSection,
  createGradeSection,
  updateGradeSection,
  deleteGradeSection,
  resyncGradeSectionCohort
} from '../controllers/gradeSectionController.js';

import { protect } from "../middleware/authMiddleware.js";
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";
import { allowTeacher } from '../middleware/teacherScope.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

// /api/grades/sections
router.get(
  '/sections',
  protect,
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).max(100000).optional(),
      // UI supports selecting "All" rows; allow a large but bounded limit.
      limit: z.coerce.number().int().min(1).max(10000).optional(),
      search: z.string().trim().max(64).optional(),
      grade: objectId.optional(),
      shift: objectId.optional(),
      section: z.string().trim().max(8).optional(),
      sort: z.string().trim().max(32).optional(),
    }).strip(),
  }),
  allowTeacher(checkAnyPermission([
    { module: "grades", action: "view" },
    { module: "students", action: "view" },
    { module: "students", action: "add" },
    { module: "students", action: "edit" },
    { module: "students", action: "delete" },
    { module: "students", action: "transfer" },
    { module: "students", action: "deactivate" },
    { module: "students", action: "reactivate" },
    { module: "students", action: "download" }
  ])),
  listGradeSections
);

router.get(
  '/sections/:id',
  protect,
  validate({ params: z.object({ id: objectId }).strip() }),
  allowTeacher(checkAnyPermission([
    { module: "grades", action: "view" },
    { module: "students", action: "view" },
    { module: "students", action: "add" },
    { module: "students", action: "edit" },
    { module: "students", action: "delete" },
    { module: "students", action: "transfer" },
    { module: "students", action: "deactivate" },
    { module: "students", action: "reactivate" },
    { module: "students", action: "download" }
  ])),
  getGradeSection
);

router.post(
  '/sections',
  protect,
  checkPermission("grades", "add"),
  createGradeSection
);

router.put(
  '/sections/:id',
  protect,
  validate({ params: z.object({ id: objectId }).strip() }),
  checkPermission("grades", "edit"),
  updateGradeSection
);

router.delete(
  '/sections/:id',
  protect,
  validate({ params: z.object({ id: objectId }).strip() }),
  checkPermission("grades", "delete"),
  deleteGradeSection
);

router.post(
  '/sections/:id/resync-cohort',
  protect,
  validate({ params: z.object({ id: objectId }).strip() }),
  checkPermission("grades", "edit"),
  resyncGradeSectionCohort
);

export default router;
