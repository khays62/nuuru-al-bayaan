import express from 'express';
import { getStudents, addStudent, getStudentProfile, getStudentHistory, getStudentTransfers, deactivateStudent, reactivateStudent, updateStudent, getLatestTransfer, setEnrollmentActiveFlag, changeStudentPassword, resetStudentPassword } from '../controllers/studentController.js';
import { getFullTranscript } from '../controllers/transcriptController.js';

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";
import { allowStudentSelfOr } from '../middleware/studentSelf.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const listStudentsQuery = z.object({
    page: z.coerce.number().int().min(1).max(100000).optional(),
    // UI supports selecting "All" rows; allow a large but bounded limit.
    limit: z.coerce.number().int().min(1).max(10000).optional(),
    search: z.string().trim().max(64).optional(),
    gradeSectionId: objectId.optional(),
    classId: objectId.optional(),
    academicYear: objectId.optional(),
    grade: objectId.optional(),
    shift: objectId.optional(),
    status: z.string().trim().max(16).optional(),
    cohortId: objectId.optional(),
    enrollmentStatus: z.string().trim().max(16).optional(),
    includeClosed: z.string().trim().max(8).optional(),
    sort: z.string().trim().max(32).optional(),
}).strip();

const updateStudentBody = z.object({
    fullName: z.string().trim().min(1).max(128).optional(),
    gender: z.enum(['Male', 'Female']).optional(),
    dob: z.union([z.string().trim().min(4).max(32), z.date()]).optional(),
    guardianName: z.string().trim().min(1).max(128).optional(),
    contactNumber: z.string().trim().min(1).max(32).optional(),
    address: z.string().trim().max(256).optional(),
    admissionDate: z.union([z.string().trim().min(4).max(32), z.date()]).optional(),
    status: z.string().trim().max(16).optional(),
}).strip();

const canReadStudents = (req, res, next) => {
    // Teachers are allowed to read student rosters, but the controller enforces strict
    // scoping to assigned classes and active enrollments.
    if (req.user?.role === 'teacher') return next();
    return checkAnyPermission([
        { module: "students", action: "view" },
        { module: "students", action: "add" },
        { module: "students", action: "edit" },
        { module: "students", action: "delete" },
        { module: "students", action: "transfer" },
        { module: "students", action: "deactivate" },
        { module: "students", action: "reactivate" },
        { module: "students", action: "download" }
    ])(req, res, next);
};

// Waxaan habaynaynaa routes-ka
router.route('/')
        .get(
            protect,
            canReadStudents,
            validate({ query: listStudentsQuery }),
            getStudents
        )   // Marka la sameeyo GET /api/students
        .post(
            protect,
            checkPermission("students", "add"),
            addStudent
        );  // Marka la sameeyo POST /api/students

// Student self: change password
router.put(
    '/change-password',
    protect,
    authorizeRoles('student'),
    changeStudentPassword
);

// Staff/admin: reset student password (students.resetPassword OR security.resetPassword)
router.patch(
    '/:id/reset-password',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    checkAnyPermission([
        { module: 'students', action: 'resetPassword' },
        { module: 'security', action: 'resetPassword' },
    ]),
    resetStudentPassword
);

// Profile + History
router.get(
    '/:id',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    allowStudentSelfOr(canReadStudents),
    getStudentProfile
); // GET /api/students/:id

router.patch(
    '/:id',
    protect,
    validate({ params: z.object({ id: objectId }).strip(), body: updateStudentBody }),
    checkPermission("students", "edit"),
    updateStudent
); // PATCH /api/students/:id (update basic fields)

router.get(
    '/:id/history',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    allowStudentSelfOr(canReadStudents),
    getStudentHistory
); // GET /api/students/:id/history

router.get(
    '/:id/transfers',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    allowStudentSelfOr(canReadStudents),
    getStudentTransfers
); // GET /api/students/:id/transfers

router.get(
    '/:id/latest-transfer',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    allowStudentSelfOr(canReadStudents),
    getLatestTransfer
); // GET /api/students/:id/latest-transfer

router.get(
    '/:id/full-transcript',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    allowStudentSelfOr(canReadStudents),
    getFullTranscript
); // GET /api/students/:id/full-transcript

router.patch(
    '/:id/deactivate',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    checkAnyPermission([
        { module: 'students', action: 'deactivate' },
        { module: 'security', action: 'deactivate' },
    ]),
    deactivateStudent
); // PATCH /api/students/:id/deactivate

router.patch(
    '/:id/reactivate',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    checkAnyPermission([
        { module: 'students', action: 'reactivate' },
        { module: 'security', action: 'activate' },
    ]),
    reactivateStudent
); // PATCH /api/students/:id/reactivate
// New transfer endpoint
// Transfer routes moved to /api/transfers
// Toggle latest enrollment active/inactive (temporary lock)
router.patch(
    '/:id/enrollment/active',
    protect,
    checkPermission("students", "edit"),
    setEnrollmentActiveFlag
);
// Backward compatibility: temporarily support old path by calling transfer handler
// Legacy reassign route removed

export default router;

