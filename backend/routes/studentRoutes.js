import express from 'express';
import { getStudents, addStudent, getStudentProfile, getStudentHistory, getStudentTransfers, deactivateStudent, reactivateStudent, updateStudent, getLatestTransfer, setEnrollmentActiveFlag, changeStudentPassword, resetStudentPassword } from '../controllers/studentController.js';
import { getFullTranscript } from '../controllers/transcriptController.js';

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";
import { allowStudentSelfOr } from '../middleware/studentSelf.js';

const router = express.Router();

const canReadStudents = checkAnyPermission([
    { module: "students", action: "view" },
    { module: "students", action: "add" },
    { module: "students", action: "edit" },
    { module: "students", action: "delete" },
    { module: "students", action: "transfer" },
    { module: "students", action: "deactivate" },
    { module: "students", action: "reactivate" },
    { module: "students", action: "download" }
]);

// Waxaan habaynaynaa routes-ka
router.route('/')
        .get(
            protect,
            canReadStudents,
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

// Staff/admin: reset student password (requires students:resetPassword; students:edit also allowed)
router.patch(
    '/:id/reset-password',
    protect,
    checkAnyPermission([
        { module: 'students', action: 'resetPassword' },
        { module: 'students', action: 'edit' },
    ]),
    resetStudentPassword
);

// Profile + History
router.get(
    '/:id',
    protect,
    allowStudentSelfOr(canReadStudents),
    getStudentProfile
); // GET /api/students/:id

router.patch(
    '/:id',
    protect,
    checkPermission("students", "edit"),
    updateStudent
); // PATCH /api/students/:id (update basic fields)

router.get(
    '/:id/history',
    protect,
    allowStudentSelfOr(canReadStudents),
    getStudentHistory
); // GET /api/students/:id/history

router.get(
    '/:id/transfers',
    protect,
    allowStudentSelfOr(canReadStudents),
    getStudentTransfers
); // GET /api/students/:id/transfers

router.get(
    '/:id/latest-transfer',
    protect,
    allowStudentSelfOr(canReadStudents),
    getLatestTransfer
); // GET /api/students/:id/latest-transfer

router.get(
    '/:id/full-transcript',
    protect,
    allowStudentSelfOr(canReadStudents),
    getFullTranscript
); // GET /api/students/:id/full-transcript

router.patch(
    '/:id/deactivate',
    protect,
    checkPermission("students", "deactivate"),
    deactivateStudent
); // PATCH /api/students/:id/deactivate

router.patch(
    '/:id/reactivate',
    protect,
    checkPermission("students", "reactivate"),
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

