import express from 'express';
import { getStudents, addStudent, getStudentProfile, getStudentHistory, getStudentTransfers, deactivateStudent, reactivateStudent, updateStudent, getLatestTransfer, setEnrollmentActiveFlag, changeStudentPassword, resetStudentPassword, uploadStudentPhoto } from '../controllers/studentController.js';
import { getFullTranscript } from '../controllers/transcriptController.js';

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { checkAnyPermission, checkPermission } from "../middleware/checkPermission.js";
import { allowStudentSelfOr } from '../middleware/studentSelf.js';
import { requireStudentDashboardAccess, requireStudentDashboardAccessAny } from '../middleware/studentDashboardPolicy.js';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { uploadStudentPhoto as uploadStudentPhotoMw, STUDENT_PHOTO_MAX_BYTES } from '../middleware/uploadStudentPhoto.js';

const router = express.Router();

const isMultipart = (req) => {
    try {
        return Boolean(req.is && req.is('multipart/form-data'));
    } catch {
        return false;
    }
};

const coerceBoolean = (value) => {
    if (typeof value === 'boolean') return value;
    if (value == null) return value;
    const s = String(value).trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
    return value;
};

const tryParseJsonObject = (value) => {
    if (value == null) return value;
    if (typeof value === 'object') return value;
    const s = String(value).trim();
    if (!s) return value;
    if (!(s.startsWith('{') || s.startsWith('['))) return value;
    try {
        return JSON.parse(s);
    } catch {
        return value;
    }
};

const normalizeStudentMultipartBody = (req, res, next) => {
    if (!isMultipart(req)) return next();

    const body = req.body || {};

    // JSON-like nested fields
    body.transfer = tryParseJsonObject(body.transfer);
    body.medical = tryParseJsonObject(body.medical);
    body.idDocument = tryParseJsonObject(body.idDocument);

    // Boolean-like fields
    if (Object.prototype.hasOwnProperty.call(body, 'isSomali')) {
        body.isSomali = coerceBoolean(body.isSomali);
    }
    if (body.transfer && typeof body.transfer === 'object' && Object.prototype.hasOwnProperty.call(body.transfer, 'isTransfer')) {
        body.transfer.isTransfer = coerceBoolean(body.transfer.isTransfer);
    }

    req.body = body;
    return next();
};

const cleanupUploadedFileOnError = (req, res, next) => {
    // Remote-only uploads use memory storage; nothing to cleanup on disk.
    return next();
};

const maybeUploadStudentPhoto = (req, res, next) => {
    if (!isMultipart(req)) return next();
    return uploadStudentPhotoMw.single('photo')(req, res, (err) => {
        if (!err) return next();
        const code = String(err?.code || '').toUpperCase();
        if (code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: req.t('students.photo.tooLarge', { mb: Math.floor(STUDENT_PHOTO_MAX_BYTES / (1024 * 1024)) }, 'Photo is too large.'),
            });
        }
        if (String(err?.code || '') === 'INVALID_FILE_TYPE') {
            return res.status(400).json({
                success: false,
                message: req.t('students.photo.invalidType', null, 'Invalid image type. Only JPG, PNG, or WEBP are allowed.'),
            });
        }
        return res.status(400).json({
            success: false,
            message: req.t('students.photo.uploadFailed', null, 'Failed to upload photo.'),
        });
    });
};

const validateUpdateStudentBodyIfJson = (req, res, next) => {
    if (isMultipart(req)) return next();
    return validate({ body: updateStudentBody })(req, res, next);
};

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
    motherName: z.string().trim().min(1).max(128).optional(),
    gender: z.enum(['Male', 'Female']).optional(),
    dob: z.union([z.string().trim().min(4).max(32), z.date()]).optional(),
    birthPlace: z.string().trim().min(1).max(128).optional(),
    guardianName: z.string().trim().min(1).max(128).optional(),
    guardianRelationship: z.enum(['Father', 'Mother', 'Guardian', 'Other']).optional(),

    // Back-compat + canonical guardian contacts
    contactNumber: z.string().trim().min(1).max(32).optional(),
    guardianPhone1: z.string().trim().min(1).max(32).optional(),
    guardianPhone2: z.string().trim().max(32).optional(),
    guardianEmail: z.string().trim().max(128).optional(),
    studentPhone: z.string().trim().max(32).optional(),
    studentEmail: z.string().trim().max(128).optional(),

    transfer: z.object({
        isTransfer: z.boolean().optional(),
        previousSchoolName: z.string().trim().max(128).optional(),
        transferReason: z.string().trim().max(256).optional(),
    }).optional(),

    notes: z.string().trim().max(2000).optional(),

    medical: z.object({
        allergies: z.string().trim().max(512).optional(),
        medicalConditions: z.string().trim().max(512).optional(),
        disabilityFlags: z.union([
            z.array(z.string().trim().max(64)).max(32),
            z.string().trim().max(512),
        ]).optional(),
        bloodGroup: z.string().trim().max(8).optional(),
    }).optional(),

    idDocument: z.object({
        idType: z.string().trim().max(64).optional(),
        idNumber: z.string().trim().max(64).optional(),
        issuedBy: z.string().trim().max(64).optional(),
        expiresAt: z.union([z.string().trim().max(32), z.date(), z.null()]).optional(),
    }).optional(),

    address: z.string().trim().max(256).optional(),
    admissionDate: z.union([z.string().trim().min(4).max(32), z.date()]).optional(),
    status: z.string().trim().max(16).optional(),

    isSomali: z.boolean().optional(),
    residenceRegionId: z.string().trim().max(64).optional(),
    residenceDistrictId: z.string().trim().max(64).optional(),
    residenceNeighborhood: z.string().trim().max(128).optional(),
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
            maybeUploadStudentPhoto,
            cleanupUploadedFileOnError,
            normalizeStudentMultipartBody,
            addStudent
        );  // Marka la sameeyo POST /api/students

// Student self: change password
router.put(
    '/change-password',
    protect,
    authorizeRoles('student'),
    requireStudentDashboardAccess('profile'),
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
    requireStudentDashboardAccess('profile'),
    allowStudentSelfOr(canReadStudents),
    getStudentProfile
); // GET /api/students/:id

router.patch(
    '/:id',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    checkPermission("students", "edit"),
    maybeUploadStudentPhoto,
    cleanupUploadedFileOnError,
    normalizeStudentMultipartBody,
    validateUpdateStudentBodyIfJson,
    updateStudent
); // PATCH /api/students/:id (update basic fields)

// Staff/admin: upload student photo (optional feature)
router.post(
    '/:id/photo',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    checkPermission('students', 'edit'),
    (req, res, next) => {
        uploadStudentPhotoMw.single('photo')(req, res, (err) => {
            if (!err) return next();
            const code = String(err?.code || '').toUpperCase();
            if (code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: req.t('students.photo.tooLarge', { mb: Math.floor(STUDENT_PHOTO_MAX_BYTES / (1024 * 1024)) }, 'Photo is too large.'),
                });
            }
            if (String(err?.code || '') === 'INVALID_FILE_TYPE') {
                return res.status(400).json({
                    success: false,
                    message: req.t('students.photo.invalidType', null, 'Invalid image type. Only JPG, PNG, or WEBP are allowed.'),
                });
            }
            return res.status(400).json({
                success: false,
                message: req.t('students.photo.uploadFailed', null, 'Failed to upload photo.'),
            });
        });
    },
    uploadStudentPhoto
);

router.get(
    '/:id/history',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    requireStudentDashboardAccessAny(['enrollments', 'transcript', 'timetable']),
    allowStudentSelfOr(canReadStudents),
    getStudentHistory
); // GET /api/students/:id/history

router.get(
    '/:id/transfers',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    requireStudentDashboardAccess('transfers'),
    allowStudentSelfOr(canReadStudents),
    getStudentTransfers
); // GET /api/students/:id/transfers

router.get(
    '/:id/latest-transfer',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    requireStudentDashboardAccess('transfers'),
    allowStudentSelfOr(canReadStudents),
    getLatestTransfer
); // GET /api/students/:id/latest-transfer

router.get(
    '/:id/full-transcript',
    protect,
    validate({ params: z.object({ id: objectId }).strip() }),
    requireStudentDashboardAccess('transcript'),
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

