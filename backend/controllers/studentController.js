// This controller manages all core CRUD operations for students in the database.
import mongoose from 'mongoose'; // file touch to retrigger nodemon
import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import GradeSection from '../models/GradeSection.js';
import Counter from '../models/Counter.js';
import bcrypt from 'bcryptjs';
import TeacherAssignment from '../models/TeacherAssignment.js';
import User from '../models/User.js';
import { getDefaultInitialPassword } from '../utils/defaultPasswords.js';
import { parsePagination } from '../utils/pagination.js';
import { publishRealtime } from '../utils/realtimeBus.js';
import { normalizeSomaliaPhone, isValidSomaliaPhone } from '../utils/phoneSomalia.js';
import { isValidSomaliaDistrictId, isValidSomaliaRegionId } from '../utils/somaliaAdminDivisions.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { writeAuditLog } from '../services/auditService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const collapseWs = (v) => String(v || '').replace(/\s+/g, ' ').trim();

const toTitleCaseWords = (value) => {
    const s = collapseWs(value);
    if (!s) return '';
    return s
        .split(' ')
        .filter(Boolean)
        .map((w) => {
            const word = String(w || '');
            if (!word) return '';
            const first = word[0].toUpperCase();
            const rest = word.slice(1).toLowerCase();
            return `${first}${rest}`;
        })
        .join(' ');
};

const countWords = (value) => {
    const s = collapseWs(value);
    if (!s) return 0;
    return s.split(' ').filter(Boolean).length;
};

const isValidEmailBasic = (value) => {
    const s = String(value || '').trim();
    if (!s) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

const parseDateOnlyOrThrow = (value, fieldName) => {
    const raw = String(value ?? '').trim();
    if (!raw) throw new Error(`${fieldName} is required`);
    // Prefer date-only normalization for YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = new Date(`${raw}T00:00:00.000Z`);
        if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${fieldName}`);
        return d;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${fieldName}`);
    // Normalize to UTC midnight of that date to reduce time drift
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const dayRangeUtc = (dateValue) => {
    const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
};

const normalizeDisabilityFlags = (value) => {
    if (Array.isArray(value)) return value.map((x) => collapseWs(x)).filter(Boolean);
    const s = String(value || '').trim();
    if (!s) return [];
    return s
        .split(',')
        .map((x) => collapseWs(x))
        .filter(Boolean);
};

const normalizeBloodGroup = (value) => {
    const s = String(value || '').trim().toUpperCase();
    if (!s) return '';
    const allowed = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
    return allowed.has(s) ? s : '';
};

const normalizeStudentStatusToUserStatus = (studentStatus) => {
    const s = String(studentStatus || '').trim().toLowerCase();
    return s === 'active' ? 'active' : 'inactive';
};

const normalizeStudentStatusToModel = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    if (lower === 'active') return 'Active';
    if (lower === 'inactive') return 'Inactive';
    // allow exact enum values too
    if (raw === 'Active' || raw === 'Inactive') return raw;
    return raw;
};

// @desc    List students including details of their current section
// @route   GET /api/students
// @access  Private (mustaqbalka)
export const getStudents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            gradeSectionId,
            academicYear,
            grade,
            shift,
            status,
            cohortId,
            enrollmentStatus,
            includeClosed,
            sort
        } = req.query;

        const { pageNum, limitNum, skip } = parsePagination({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });

        // Sorting: default createdAt desc on student creation time
        let sortField = 'studentCreatedAt';
        let sortDir = -1;
        if (sort) {
            const [f, d] = sort.split(':');
            const allowed = ['fullName', 'studentId', 'admissionDate', 'createdAt'];
            if (allowed.includes(f)) {
                if (f === 'createdAt') sortField = 'studentCreatedAt';
                else sortField = f;
                sortDir = d === 'asc' ? 1 : -1;
            }
        }

        // Build match for search + filters (we operate on enrollment pipeline + joined student)
        // Default: only active/inactive enrollments
        let enrollmentStatuses = ['active','inactive'];
        if (String(includeClosed).toLowerCase() === '1' || String(includeClosed).toLowerCase() === 'true') {
            enrollmentStatuses = ['active','inactive','promoted','graduated','transferred','withdrawn'];
        }
        if (enrollmentStatus && enrollmentStatus !== 'all') {
            // Allow precise filtering by enrollment.status
            enrollmentStatuses = [enrollmentStatus];
        }

        const enrollmentMatch = { status: { $in: enrollmentStatuses } };
        const sectionId = gradeSectionId || req.query.classId; // legacy fallback
        if (sectionId && mongoose.isValidObjectId(sectionId)) enrollmentMatch.gradeSection = new mongoose.Types.ObjectId(sectionId);
        if (academicYear && mongoose.isValidObjectId(academicYear)) enrollmentMatch.academicYear = new mongoose.Types.ObjectId(academicYear);
        if (grade && mongoose.isValidObjectId(grade)) enrollmentMatch.grade = new mongoose.Types.ObjectId(grade);
        if (shift && mongoose.isValidObjectId(shift)) enrollmentMatch.shift = new mongoose.Types.ObjectId(shift);
        if (cohortId && mongoose.isValidObjectId(cohortId)) enrollmentMatch.cohort = new mongoose.Types.ObjectId(cohortId);

        const studentMatch = {};
        if (status) studentMatch.status = normalizeStudentStatusToModel(status); // Active / Inactive

        // Teacher-safe scope: teacher can only list ACTIVE roster for an assigned class.
        if (req.user?.role === 'teacher') {
            const teacherId = req.user?.teacherRef;
            if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
                return res.status(403).json({ message: 'Teacher account is missing teacherRef' });
            }
            if (!sectionId || !mongoose.isValidObjectId(sectionId)) {
                return res.status(400).json({ message: 'gradeSectionId is required' });
            }
            const ok = await TeacherAssignment.exists({ teacher: teacherId, gradeSection: sectionId });
            if (!ok) return res.status(403).json({ message: 'Not assigned to this class' });

            enrollmentMatch.gradeSection = new mongoose.Types.ObjectId(sectionId);
            enrollmentMatch.status = { $in: ['active'] };
            // Student.status is capitalized in the model: 'Active'/'Inactive'
            studentMatch.status = 'Active';
        }

        const effectiveStudentStatus = studentMatch.status || status;
        let searchStage = [];
        if (search) {
            const safeQ = String(search).trim().slice(0, 64);
            const regex = new RegExp(safeQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            searchStage = [
                { $match: { $or: [ { 'student.fullName': { $regex: regex } }, { 'student.studentId': { $regex: regex } } ] } }
            ];
        }

        const pipeline = [
            { $match: enrollmentMatch },
            // We only want the latest active enrollment per student for the filters above; ensure we group afterwards.
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$student',
                    latest: { $first: '$$ROOT' }
                }
            },
            // Optionally require at least one graduated enrollment when enrollmentStatus='graduated'
            ...(enrollmentStatus === 'graduated' ? [
                { $lookup: { from: 'enrollments', localField: '_id', foreignField: 'student', as: 'allEnrs' } },
                { $match: { 'allEnrs.status': 'graduated' } },
                { $project: { allEnrs: 0 } }
            ] : []),
            // Join student doc
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'student'
                }
            },
            { $unwind: '$student' },
            // Filter by student status if provided
                ...(effectiveStudentStatus ? [{ $match: { 'student.status': effectiveStudentStatus } }] : []),
            // Apply search on computed fields
            ...searchStage,
            // Join gradeSection (latest.gradeSection) from gradesections collection
            { $lookup: { from: 'gradesections', localField: 'latest.gradeSection', foreignField: '_id', as: 'class' } },
            { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
            // Join cohort for display-id build on list view (optional if null)
            { $lookup: { from: 'cohorts', localField: 'latest.cohort', foreignField: '_id', as: 'cohort' } },
            { $unwind: { path: '$cohort', preserveNullAndEmptyArrays: true } },
            // Join related grade / shift / academicYear for display (AY from enrollment)
            { $lookup: { from: 'grades', localField: 'class.grade', foreignField: '_id', as: 'grade' } },
            { $lookup: { from: 'shifts', localField: 'class.shift', foreignField: '_id', as: 'shift' } },
            { $lookup: { from: 'academicyears', localField: 'latest.academicYear', foreignField: '_id', as: 'ay' } },
            { $addFields: {
                grade: { $arrayElemAt: ['$grade.gradeName', 0] },
                shift: { $arrayElemAt: ['$shift.shiftName', 0] },
                academicYear: { $arrayElemAt: ['$ay.yearName', 0] }
            } },
            // Build human-friendly composed label: GradeName - Sec X (Year - Shift)
            { $addFields: {
                gradeLabel: {
                    $cond: [
                        { $ifNull: ['$class._id', false] },
                        {
                            $concat: [
                                { $ifNull: ['$grade', 'Grade'] },
                                ' - Sec ', { $ifNull: ['$class.section', '1'] },
                                { $cond: [
                                    { $or: [ { $ifNull: ['$academicYear', false] }, { $ifNull: ['$shift', false] } ] },
                                    { $concat: [ ' (', { $ifNull: ['$academicYear', ''] },
                                        { $cond: [ { $and: [ { $ifNull: ['$academicYear', false] }, { $ifNull: ['$shift', false] } ] }, ' - ', '' ] },
                                        { $ifNull: ['$shift', ''] }, ')' ] },
                                    ''
                                ] }
                            ]
                        },
                        null
                    ]
                }
            } },
            { $project: {
                _id: '$student._id',
                studentId: '$student.studentId',
                fullName: '$student.fullName',
                gender: '$student.gender',
                admissionDate: '$student.admissionDate',
                status: '$student.status',
                gradeDisplay: '$gradeLabel',
                section: '$class.section',
                cohort: '$cohort.name',
                contactNumber: '$student.contactNumber',
                gradeSectionId: '$class._id',
                grade: 1,
                shift: 1,
                academicYear: 1,
                studentCreatedAt: '$student.createdAt'
            } },
            // Sorting dynamic
            { $sort: { [sortField]: sortDir, _id: 1 } },
            // Facet for pagination and total
            { $facet: {
                meta: [ { $count: 'total' } ],
                data: [ { $skip: skip }, { $limit: limitNum } ]
            } },
            { $unwind: { path: '$meta', preserveNullAndEmptyArrays: true } },
            { $addFields: { total: { $ifNull: ['$meta.total', 0] } } },
            { $project: { meta: 0 } }
        ];

        const result = await Enrollment.aggregate(pipeline);
        const aggregated = result[0] || { data: [], total: 0 };
        const totalPages = Math.ceil(aggregated.total / limitNum) || 1;
        res.json({
            data: aggregated.data,
            meta: {
                page: pageNum,
                limit: limitNum,
                total: aggregated.total,
                totalPages,
                sortBy: sortField === 'studentCreatedAt' ? 'createdAt' : sortField,
                sortDir: sortDir === 1 ? 'asc' : 'desc'
            }
        });
    } catch (error) {
        console.error('List students error', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Ku dar arday cusub oo diiwaangeli
// @route   POST /api/students
// @access  Private (mustaqbalka)
export const addStudent = async (req, res) => {
    const {
        gradeSectionId,
        academicYearId,
        cohortId,
        fullName,
        motherName,
        gender,
        dob,
        birthPlace,
        guardianName,
        guardianRelationship,
        guardianPhone1,
        guardianPhone2,
        guardianEmail,
        studentPhone,
        studentEmail,
        transfer,
        medical,
        idDocument,
        notes,
        contactNumber,
        address,
        admissionDate,
        isSomali,
        residenceRegionId,
        residenceDistrictId,
        residenceNeighborhood,
    } = req.body;
    const effectiveGuardianPhone1 = String(guardianPhone1 ?? contactNumber ?? '').trim();
    if (!gradeSectionId || !academicYearId || !fullName || !motherName || !gender || !dob || !birthPlace || !guardianName || !effectiveGuardianPhone1 || !admissionDate) {
        return res.status(400).json({ message: 'Please fill in all required fields (including academicYearId).' });
    }
    // Policy: Cohort is required for new enrollment (admin chooses the active cohort for the AY)
    if (!cohortId) {
        return res.status(400).json({ message: 'Cohort is required.' });
    }

    try {
        const cls = await GradeSection.findById(gradeSectionId).populate(['grade', 'shift']);
    if (!cls) return res.status(404).json({ message: 'Section not found.' });
        // Validate AY and optional Cohort
        if (!mongoose.isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });
        // Validate Cohort (required per policy)
        let cohortDoc = null;
        if (!mongoose.isValidObjectId(cohortId)) return res.status(400).json({ message: 'Invalid cohortId' });
        const Cohort = (await import('../models/Cohort.js')).default;
        cohortDoc = await Cohort.findById(cohortId).lean();
        if (!cohortDoc) return res.status(400).json({ message: 'Invalid cohortId' });

        // Normalize names + date-only dob
        const normalizedFullName = toTitleCaseWords(fullName);
        const normalizedMotherName = toTitleCaseWords(motherName);
        const normalizedGuardianName = toTitleCaseWords(guardianName);
        const normalizedBirthPlace = collapseWs(birthPlace);
        let dobDate;
        let admissionDateParsed;
        try {
            dobDate = parseDateOnlyOrThrow(dob, 'dob');
            admissionDateParsed = parseDateOnlyOrThrow(admissionDate, 'admissionDate');
        } catch (e) {
            return res.status(400).json({ message: String(e?.message || 'Invalid dates') });
        }

        if (!normalizedFullName) return res.status(400).json({ message: 'Full Name is required.' });
        if (countWords(normalizedFullName) !== 4) return res.status(400).json({ message: 'Full Name must contain exactly 4 names.' });
        if (!normalizedMotherName) return res.status(400).json({ message: 'Mother Name is required.' });
        if (countWords(normalizedMotherName) !== 4) return res.status(400).json({ message: 'Mother Name must contain exactly 4 names.' });
        if (!normalizedBirthPlace) return res.status(400).json({ message: 'Birth place is required.' });
        if (!normalizedGuardianName) return res.status(400).json({ message: 'Guardian name is required.' });
        if (countWords(normalizedGuardianName) !== 4) return res.status(400).json({ message: 'Guardian name must contain exactly 4 names.' });

        const rel = String(guardianRelationship || '').trim();
        const allowedRelationships = new Set(['Father', 'Mother', 'Guardian', 'Other']);
        const normalizedRelationship = rel && allowedRelationships.has(rel) ? rel : '';
        if (!normalizedRelationship) {
            return res.status(400).json({ message: 'Guardian relationship is required.' });
        }

        // Validate/normalize Somalia phones
        if (!isValidSomaliaPhone(effectiveGuardianPhone1)) {
            return res.status(400).json({ message: 'Invalid Somalia phone number.' });
        }
        const normalizedGuardianPhone1 = normalizeSomaliaPhone(effectiveGuardianPhone1);
        const rawGuardianPhone2 = String(guardianPhone2 || '').trim();
        const rawStudentPhone = String(studentPhone || '').trim();
        const normalizedGuardianPhone2 = rawGuardianPhone2 ? normalizeSomaliaPhone(rawGuardianPhone2) : '';
        const normalizedStudentPhone = rawStudentPhone ? normalizeSomaliaPhone(rawStudentPhone) : '';
        if (rawGuardianPhone2 && !isValidSomaliaPhone(rawGuardianPhone2)) {
            return res.status(400).json({ message: 'Invalid Somalia phone number (guardian phone 2).' });
        }
        if (rawStudentPhone && !isValidSomaliaPhone(rawStudentPhone)) {
            return res.status(400).json({ message: 'Invalid Somalia phone number (student phone).' });
        }

        const normalizedGuardianEmail = String(guardianEmail || '').trim().toLowerCase();
        const normalizedStudentEmail = String(studentEmail || '').trim().toLowerCase();
        if (!isValidEmailBasic(normalizedGuardianEmail)) return res.status(400).json({ message: 'Invalid guardian email.' });
        if (!isValidEmailBasic(normalizedStudentEmail)) return res.status(400).json({ message: 'Invalid student email.' });

        // Structured residence validation (only when any structured field is provided).
        const hasStructuredResidence =
            Object.prototype.hasOwnProperty.call(req.body || {}, 'isSomali') ||
            Object.prototype.hasOwnProperty.call(req.body || {}, 'residenceRegionId') ||
            Object.prototype.hasOwnProperty.call(req.body || {}, 'residenceDistrictId') ||
            Object.prototype.hasOwnProperty.call(req.body || {}, 'residenceNeighborhood');

        const effectiveIsSomali = hasStructuredResidence ? (isSomali !== false) : true;
        const effectiveNeighborhood = String(hasStructuredResidence ? (residenceNeighborhood ?? '') : (address ?? '')).trim();
        const effectiveRegionId = String(residenceRegionId ?? '').trim();
        const effectiveDistrictId = String(residenceDistrictId ?? '').trim();

        if (hasStructuredResidence) {
            if (!effectiveNeighborhood) return res.status(400).json({ message: 'Neighborhood is required.' });
            if (effectiveIsSomali) {
                if (!effectiveRegionId || !isValidSomaliaRegionId(effectiveRegionId)) {
                    return res.status(400).json({ message: 'Invalid region.' });
                }
                if (!effectiveDistrictId || !isValidSomaliaDistrictId(effectiveRegionId, effectiveDistrictId)) {
                    return res.status(400).json({ message: 'Invalid district.' });
                }
            }
        }

        // Transfer validation (profile-level, optional)
        const tObj = (transfer && typeof transfer === 'object') ? transfer : {};
        const isTransferFlag = Boolean(tObj.isTransfer);
        const prevSchool = collapseWs(tObj.previousSchoolName);
        const transferReason = collapseWs(tObj.transferReason);
        if (isTransferFlag && !prevSchool) {
            return res.status(400).json({ message: 'Previous school name is required for transfer students.' });
        }

        // Medical + ID doc normalization
        const mObj = (medical && typeof medical === 'object') ? medical : {};
        const allergies = collapseWs(mObj.allergies);
        const medicalConditions = collapseWs(mObj.medicalConditions);
        const disabilityFlags = normalizeDisabilityFlags(mObj.disabilityFlags);
        const bloodGroup = normalizeBloodGroup(mObj.bloodGroup);

        const idObj = (idDocument && typeof idDocument === 'object') ? idDocument : {};
        const idType = collapseWs(idObj.idType);
        const idNumber = collapseWs(idObj.idNumber);
        const issuedBy = collapseWs(idObj.issuedBy);
        let expiresAt = null;
        if (idObj.expiresAt) {
            try {
                expiresAt = parseDateOnlyOrThrow(idObj.expiresAt, 'idDocument.expiresAt');
            } catch {
                return res.status(400).json({ message: 'Invalid id document expiry date.' });
            }
        }
        const anyIdProvided = Boolean(idType || idNumber || issuedBy || expiresAt);
        if (anyIdProvided && (!idType || !idNumber)) {
            return res.status(400).json({ message: 'idType and idNumber are required when providing ID document details.' });
        }

        // Guard 1: prevent creating a duplicate person record
        // Definition of "same person": fullName + dob + motherName (case-insensitive, whitespace-insensitive)
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nameTokens = collapseWs(normalizedFullName).split(' ').filter(Boolean).map(escapeRegex);
        const namePattern = nameTokens.join('\\s+');
        const nameRegex = new RegExp(`^${namePattern}$`, 'i');

        const motherTokens = collapseWs(normalizedMotherName).split(' ').filter(Boolean).map(escapeRegex);
        const motherPattern = motherTokens.join('\\s+');
        const motherRegex = new RegExp(`^${motherPattern}$`, 'i');

        const { start: dobStart, end: dobEnd } = dayRangeUtc(dobDate);
        const existingPerson = await Student.findOne({
            fullName: nameRegex,
            motherName: motherRegex,
            dob: { $gte: dobStart, $lt: dobEnd }
        });
        if (existingPerson) {
            // If there is an enrollment for this academic year already -> 409
            const dupEnroll = await Enrollment.findOne({ student: existingPerson._id, academicYear: academicYearId });
            if (dupEnroll) {
                return res.status(409).json({ message: 'This student is already enrolled for the selected academic year.' });
            }
            // If not in this academic year but student exists in system, avoid creating duplicate persons.
            return res.status(409).json({
                message: 'This person already exists in the system. Please use “Enroll existing student” instead of creating a new record.'
            });
        }

        // Transaction si aan u helno atomicity
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            // NOTE: avoid Student.create([{...}]) here because it uses insertMany and bypasses pre('save') hooks.
            // We need pre('save') to hash the default password.
            const studentDoc = new Student({
                fullName: normalizedFullName,
                motherName: normalizedMotherName,
                gender,
                dob: dobDate,
                birthPlace: normalizedBirthPlace,
                guardianName: normalizedGuardianName,
                guardianRelationship: normalizedRelationship,
                // Back-compat: keep both contactNumber and guardianPhone1 in sync
                contactNumber: normalizedGuardianPhone1 || String(effectiveGuardianPhone1 || '').trim(),
                guardianPhone1: normalizedGuardianPhone1 || String(effectiveGuardianPhone1 || '').trim(),
                guardianPhone2: normalizedGuardianPhone2,
                guardianEmail: normalizedGuardianEmail,
                studentPhone: normalizedStudentPhone,
                studentEmail: normalizedStudentEmail,
                transfer: { isTransfer: isTransferFlag, previousSchoolName: prevSchool, transferReason },
                notes: collapseWs(notes),
                medical: { allergies, medicalConditions, disabilityFlags, bloodGroup },
                idDocument: { idType, idNumber, issuedBy, expiresAt },
                address: String(address || effectiveNeighborhood || '').trim(),
                isSomali: effectiveIsSomali,
                residenceRegionId: effectiveIsSomali ? effectiveRegionId : '',
                residenceDistrictId: effectiveIsSomali ? effectiveDistrictId : '',
                residenceNeighborhood: effectiveNeighborhood,
                admissionDate: admissionDateParsed,
            });
            await studentDoc.save({ session });

            // Check duplicate enrollment same academicYear (in case of rare race conditions)
            const existing = await Enrollment.findOne({ student: studentDoc._id, academicYear: academicYearId }).session(session);
            if (existing) {
                await session.abortTransaction();
                return res.status(409).json({ message: 'This student is already enrolled for the selected academic year.' });
            }

            const enrollment = await Enrollment.create([{
                student: studentDoc._id,
                gradeSection: cls._id,
                academicYear: academicYearId,
                grade: cls.grade._id,
                shift: cls.shift._id,
                cohort: cohortDoc?._id || undefined,
                status: 'active',
                joinedAt: admissionDateParsed
            }], { session });

            // After creating enrollment, generate cohort-coded Student ID if cohort exists
            try {
                if (cohortDoc?._id) {
                    // Global continuous sequence (not tied to section/GS)
                    const sectionCode = String(cls.section || '1').toUpperCase();
                    const key = 'stu-code:global';
                    const ctr = await Counter.findOneAndUpdate(
                        { key },
                        { $inc: { seq: 1 } },
                        { new: true, upsert: true, session }
                    );
                    const seq = String(ctr.seq).padStart(2, '0');
                    // Prefix: first two letters of cohort name, default 'DU'
                    // Number: first digits found in cohort name (e.g., 'dufcada 1aad' -> '1')
                    let cName = '';
                    try {
                        const Cohort = (await import('../models/Cohort.js')).default;
                        const c = await Cohort.findById(cohortDoc._id).select('name').lean();
                        cName = c?.name || '';
                    } catch {}
                    const prefix = (cName.match(/[A-Za-z]/g) || []).join('').slice(0,2).toUpperCase() || 'DU';
                    const numMatch = (cName.match(/\d+/) || [ '' ])[0];
                    const code = `${prefix}${numMatch}S${sectionCode}${seq}`;
                    // Update studentId to cohort-coded form
                    studentDoc.studentId = code;
                    await studentDoc.save({ session });
                }
            } catch (idErr) {
                // Non-fatal: keep default studentId if coding fails
                console.warn('Cohort-coded studentId generation warning:', idErr);
            }

            // Create linked login account in User collection (studentId-only login)
            try {
                const DEFAULT_STUDENT_PASSWORD = getDefaultInitialPassword();
                const sid = String(studentDoc.studentId || '').trim();
                if (sid) {
                    const conflict = await User.exists({ username: sid }).session(session);
                    if (conflict) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(409).json({ message: 'Student login already exists (username conflict).' });
                    }

                    const hashed = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);
                    await User.create([{
                        fullName: studentDoc.fullName,
                        username: sid,
                        password: hashed,
                        role: 'student',
                        studentRef: studentDoc._id,
                        mustChangePassword: true,
                        status: normalizeStudentStatusToUserStatus(studentDoc.status),
                    }], { session });
                } else {
                    // Keep behavior backward compatible: allow student creation even if studentId generation fails.
                    // But log a warning so admin can fix data.
                    console.warn('Student created without studentId; skipping User login creation. student _id=', String(studentDoc._id));
                }
            } catch (userErr) {
                // Treat user creation failure as fatal to avoid creating a Student without a login.
                await session.abortTransaction();
                session.endSession();
                console.error('Create student User login failed:', userErr);
                if (String(userErr?.message || '').includes('DEFAULT_INITIAL_PASSWORD')) {
                    return res.status(500).json({ message: 'Missing DEFAULT_INITIAL_PASSWORD (set it in backend/.env)' });
                }
                return res.status(500).json({ message: 'Failed to create student login account' });
            }

            await session.commitTransaction();
            session.endSession();

            publishRealtime({ type: 'students:changed', id: String(studentDoc._id), ts: Date.now() });
            publishRealtime({ type: 'users:changed', ts: Date.now() });

            return res.status(201).json({ student: studentDoc, enrollment: enrollment[0] });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            console.error(err);
            if (err.code === 11000) {
                return res.status(409).json({ message: 'Unique constraint violation (studentId or enrollment).' });
            }
            return res.status(500).json({ message: 'Server Error' });
        }
    } catch (error) {
        console.error(error);
    return res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get student profile and latest enrollment
// @route   GET /api/students/:id
export const getStudentProfile = async (req, res) => {
    try {
        const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });

        const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

        // Find latest active (preferred) enrollment; fallback latest any status
        const latest = await Enrollment.findOne({ student: id }).sort({ createdAt: -1 }).populate([
            { path: 'gradeSection', model: 'GradeSection', populate: [{ path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' }] },
            { path: 'grade', select: 'gradeName' },
            { path: 'shift', select: 'shiftName' },
            { path: 'academicYear', select: 'yearName' },
            { path: 'cohort', select: 'name' }
        ]);

        const totalYears = await Enrollment.countDocuments({ student: id });

        res.json({
            student,
            latestEnrollment: latest,
            stats: { totalYears, activeStatus: student.status }
        });
    } catch (err) {
        console.error('Get student profile error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Student self: change own password
// @route   PUT /api/students/change-password
export const changeStudentPassword = async (req, res) => {
    try {
        if (req.user?.role !== 'student') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const studentProfileId = req.user?.studentRef || req.user?._id;
        const userAccountId = req.user?.studentRef ? req.user?._id : null;

        const DEFAULT_STUDENT_PASSWORD = getDefaultInitialPassword();
        const body = req.body || {};
        const currentPassword = body.currentPassword ?? body.oldPassword ?? '';
        const newPassword = body.newPassword ?? '';
        const curr = String(currentPassword || '').trim();
        const next = String(newPassword || '').trim();
        if (!next) {
            return res.status(400).json({ message: 'newPassword is required' });
        }

        if (next.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const [student, userAccount] = await Promise.all([
            Student.findById(studentProfileId).select('_id').lean(),
            userAccountId ? User.findById(userAccountId).select('password mustChangePassword') : Promise.resolve(null)
        ]);
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // CUTOVER: password source of truth is the User account.
        const storedPassword = (userAccount?.password || '');
        const looksHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');

        // If old/current password is not provided, allow ONLY when the account is still on the default password.
        if (!curr) {
            const isDefault = looksHashed
                ? await bcrypt.compare(DEFAULT_STUDENT_PASSWORD, storedPassword)
                : String(storedPassword) === DEFAULT_STUDENT_PASSWORD;
            if (!isDefault) {
                return res.status(400).json({ message: 'currentPassword is required' });
            }
        } else {
            const ok = looksHashed
                ? await bcrypt.compare(curr, storedPassword)
                : curr === String(storedPassword);
            if (!ok) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
        }

        if (userAccount) {
            const hashed = await bcrypt.hash(next, 10);
            await User.updateOne(
                { _id: userAccountId },
                { $set: { password: hashed, mustChangePassword: false, failedLoginAttempts: 0, lockUntil: null } }
            );
        } else {
            // If we reach here, the student is missing a linked User account.
            // Treat this as a migration inconsistency.
            return res.status(409).json({ message: 'Student login account is missing. Contact admin to re-run migration.' });
        }

        return res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        console.error('Change student password error', err);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Staff/admin: reset a student's password (does not reveal existing password)
// @route   PATCH /api/students/:id/reset-password
export const resetStudentPassword = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });

        const student = await Student.findById(id).select('_id').lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const DEFAULT_STUDENT_PASSWORD = getDefaultInitialPassword();

        // CUTOVER: reset the linked User account password (primary).
        const userAccount = await User.findOne({ studentRef: id }).select('_id').lean();
        if (userAccount?._id) {
            const hashed = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 10);
            await User.updateOne(
                { _id: userAccount._id },
                { $set: { password: hashed, mustChangePassword: true, failedLoginAttempts: 0, lockUntil: null, loginCooldownLevel: 0 } }
            );
        } else {
            return res.status(409).json({ message: 'Student login account is missing. Contact admin to re-run migration.' });
        }

        req.skipAuditTrail = true;
        await writeAuditLog({
            userId: req.user?._id,
            action: 'students.resetPassword',
            description: `target=${String(userAccount._id)} student=${String(student._id)} role=student source=student-route`,
            req,
        });

        publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
        publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
        publishRealtime({ type: 'users:changed', ts: Date.now() });

        return res.json({
            success: true,
            message: 'Password reset to default. Student must change it after login.',
        });
    } catch (err) {
        console.error('Reset student password error', err);
        return res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get enrollments history (paginated)
// @route   GET /api/students/:id/history
export const getStudentHistory = async (req, res) => {
    try {
        const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const { page = 1, limit = 10 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination({ page, limit }, { defaultPage: 1, defaultLimit: 10, maxLimit: 100 });

        const [rows, total] = await Promise.all([
            Enrollment.find({ student: id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate([
                    { path: 'gradeSection', model: 'GradeSection', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
                    { path: 'academicYear', select: 'yearName' },
                    { path: 'grade', select: 'gradeName' },
                    { path: 'shift', select: 'shiftName' },
                    { path: 'cohort', select: 'name' }
                ]),
            Enrollment.countDocuments({ student: id })
        ]);

        const totalPages = Math.ceil(total / limitNum) || 1;
        res.json({
            data: rows,
            meta: { page: pageNum, limit: limitNum, total, totalPages }
        });
    } catch (err) {
        console.error('Get student history error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get transfer logs (audit) for a student (paginated)
// @route   GET /api/students/:id/transfers
// Notes:
//  - Populate ga 'byUser' waxa la kicinayaa oo keliya haddii User model la diiwaan galiyay (otherwise missing schema → error).
//  - Waxa la soo celiyaa logs sorted by latest (date desc) oo wata from/to gradeSection + metadata.
export const getStudentTransfers = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const { page = 1, limit = 20 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination({ page, limit }, { defaultPage: 1, defaultLimit: 20, maxLimit: 100 });

        const TransferLog = (await import('../models/TransferLog.js')).default;
        // Determine if User model is registered (some deployments may not have User schema loaded yet)
        const userModelRegistered = !!mongoose.models.User;
        // GradeSection is AY-agnostic now: populate only grade, shift, section
        const populatePaths = [
            { path: 'fromGradeSection', select: 'section grade shift', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
            { path: 'toGradeSection', select: 'section grade shift', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] }
        ];
        if (userModelRegistered) {
            populatePaths.push({ path: 'byUser', select: 'fullName email' });
        }
        const query = TransferLog.find({ student: id })
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum);
        populatePaths.forEach(p => query.populate(p));
        const [rows, total] = await Promise.all([
            query.lean(),
            TransferLog.countDocuments({ student: id })
        ]);

        const totalPages = Math.ceil(total / limitNum) || 1;
        res.json({ data: rows, meta: { page: pageNum, limit: limitNum, total, totalPages } });
    } catch (err) {
        console.error('Get student transfers error', err);
        // Production: ha muujin faahfaahin (security) – khalad guud
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Deactivate (soft-delete) student -> status = Inactive
// @route   PATCH /api/students/:id/deactivate
export const deactivateStudent = async (req, res) => {
    try {
        const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.status === 'Inactive') return res.status(200).json({ message: 'Already deactivated', student });
        student.status = 'Inactive';
        await student.save();

        // Cutover: students authenticate via User accounts. Ensure login is blocked and active sessions are invalidated.
        try {
            await User.updateOne(
                { studentRef: id },
                { $set: { status: 'inactive' }, $inc: { tokenVersion: 1 } }
            );
        } catch {
            // non-blocking
        }
        // Policy update (2025-10-15): Also set latest enrollment to 'inactive' (soft lock)
        // Somali: Marka ardayga la deactive gareeyo, enrollment-kiisii ugu dambeeyay haddii uu 'active' yahay
        // waxa loo rogaa 'inactive' si loo joojiyo dhaqdhaqaaqyada sida transfer/promote inta uu maqanyahay.
        // Lama taabto enrollments kuwa terminal-ka ah: transferred/promoted/graduated/withdrawn.
        try {
            const latestEnrollment = await Enrollment.findOne({ student: id }).sort({ createdAt: -1 });
            if (latestEnrollment && !['transferred','promoted','graduated','withdrawn'].includes(latestEnrollment.status)) {
                if (latestEnrollment.status === 'active') {
                    latestEnrollment.status = 'inactive';
                    await latestEnrollment.save();
                }
            }
        } catch (enrErr) {
            // Best-effort only; don’t fail student deactivation if enrollment toggle fails
            console.warn('deactivateStudent enrollment toggle warning:', enrErr);
        }
        req.skipAuditTrail = true;
        await writeAuditLog({
            userId: req.user?._id,
            action: 'students.deactivate',
            description: `target=${String(id)} type=student status=inactive`,
            req,
        });
        publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
        publishRealtime({ type: 'users:changed', ts: Date.now() });
        publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
        res.json({ message: 'Student deactivated', student });
    } catch (err) {
        console.error('Deactivate student error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reactivate student -> status = Active
// @route   PATCH /api/students/:id/reactivate
export const reactivateStudent = async (req, res) => {
    try {
        const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.status === 'Active') return res.status(200).json({ message: 'Already active', student });
        student.status = 'Active';
        await student.save();

        // Cutover: students authenticate via User accounts.
        // Allow login again and invalidate any stale tokens.
        try {
            await User.updateOne(
                { studentRef: id },
                { $set: { status: 'active' }, $inc: { tokenVersion: 1 } }
            );
        } catch {
            // non-blocking
        }
        // Policy update (2025-10-15): If latest enrollment is 'inactive', flip it back to 'active'.
        // Somali: Marka ardayga dib loo hawlgeliyo, enrollment-kii ugu dambeeyay haddii uu 'inactive' yahay
        // waxaa loo celinayaa 'active'. Lama beddelo haddii uu yahay terminal state ama horeyba 'active' u ahaa.
        try {
            const latestEnrollment = await Enrollment.findOne({ student: id }).sort({ createdAt: -1 });
            if (latestEnrollment && !['transferred','promoted','graduated','withdrawn'].includes(latestEnrollment.status)) {
                if (latestEnrollment.status === 'inactive') {
                    latestEnrollment.status = 'active';
                    await latestEnrollment.save();
                }
            }
        } catch (enrErr) {
            console.warn('reactivateStudent enrollment toggle warning:', enrErr);
        }
        req.skipAuditTrail = true;
        await writeAuditLog({
            userId: req.user?._id,
            action: 'students.reactivate',
            description: `target=${String(id)} type=student status=active`,
            req,
        });
        publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
        publishRealtime({ type: 'users:changed', ts: Date.now() });
        publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });
        res.json({ message: 'Student reactivated', student });
    } catch (err) {
        console.error('Reactivate student error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update student basic fields
// @route   PATCH /api/students/:id
export const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const allowed = [
            'fullName',
            'motherName',
            'gender',
            'dob',
            'birthPlace',
            'guardianName',
            'guardianRelationship',
            'contactNumber',
            'guardianPhone1',
            'guardianPhone2',
            'guardianEmail',
            'studentPhone',
            'studentEmail',
            'transfer',
            'medical',
            'idDocument',
            'notes',
            'address',
            'admissionDate',
            'status',
            'isSomali',
            'residenceRegionId',
            'residenceDistrictId',
            'residenceNeighborhood',
        ];
        const updates = {};
        for (const key of allowed) {
            if (key in req.body && req.body[key] !== undefined && req.body[key] !== null) {
                updates[key] = req.body[key];
            }
        }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No updates provided.' });
        // Prevent invalid status value
        if (updates.status) {
            updates.status = normalizeStudentStatusToModel(updates.status);
        }
        if (updates.status && !['Active', 'Inactive'].includes(updates.status)) {
            return res.status(400).json({ message: 'Invalid status.' });
        }
        // Fetch current to validate potential duplicates on name+dob changes
        const current = await Student.findById(id);
    if (!current) return res.status(404).json({ message: 'Student not found' });

        // Normalize title-cased names / key strings
        if ('fullName' in updates) {
            updates.fullName = toTitleCaseWords(updates.fullName);
            if (!updates.fullName) return res.status(400).json({ message: 'Full Name is required.' });
        }
        if ('motherName' in updates) {
            updates.motherName = toTitleCaseWords(updates.motherName);
            if (!updates.motherName) return res.status(400).json({ message: 'Mother Name is required.' });
        }
        if ('guardianName' in updates) {
            updates.guardianName = toTitleCaseWords(updates.guardianName);
            if (!updates.guardianName) return res.status(400).json({ message: 'Guardian name is required.' });
        }
        if ('birthPlace' in updates) {
            updates.birthPlace = collapseWs(updates.birthPlace);
            if (!updates.birthPlace) return res.status(400).json({ message: 'Birth place is required.' });
        }

        if ('guardianRelationship' in updates) {
            const rel = String(updates.guardianRelationship || '').trim();
            const allowedRelationships = new Set(['Father', 'Mother', 'Guardian', 'Other']);
            if (!rel || !allowedRelationships.has(rel)) {
                return res.status(400).json({ message: 'Invalid guardian relationship.' });
            }
            updates.guardianRelationship = rel;
        }

        // Normalize/validate DOB + admissionDate if provided (date-only)
        if ('dob' in updates) {
            try {
                updates.dob = parseDateOnlyOrThrow(updates.dob, 'dob');
            } catch (e) {
                return res.status(400).json({ message: String(e?.message || 'Invalid dob') });
            }
        }
        if ('admissionDate' in updates) {
            try {
                updates.admissionDate = parseDateOnlyOrThrow(updates.admissionDate, 'admissionDate');
            } catch (e) {
                return res.status(400).json({ message: String(e?.message || 'Invalid admissionDate') });
            }
        }

        // Phones: keep guardianPhone1 and legacy contactNumber in sync
        const hasGuardianPhone1 = Object.prototype.hasOwnProperty.call(updates, 'guardianPhone1');
        const hasLegacyContact = Object.prototype.hasOwnProperty.call(updates, 'contactNumber');
        if (hasGuardianPhone1 || hasLegacyContact) {
            const raw = String(hasGuardianPhone1 ? updates.guardianPhone1 : updates.contactNumber || '').trim();
            if (!raw) return res.status(400).json({ message: 'Guardian phone is required.' });
            if (!isValidSomaliaPhone(raw)) return res.status(400).json({ message: 'Invalid Somalia phone number.' });
            const normalized = normalizeSomaliaPhone(raw) || raw;
            updates.guardianPhone1 = normalized;
            updates.contactNumber = normalized;
        }
        if ('guardianPhone2' in updates) {
            const raw = String(updates.guardianPhone2 || '').trim();
            if (!raw) updates.guardianPhone2 = '';
            else {
                if (!isValidSomaliaPhone(raw)) return res.status(400).json({ message: 'Invalid Somalia phone number (guardian phone 2).' });
                updates.guardianPhone2 = normalizeSomaliaPhone(raw) || raw;
            }
        }
        if ('studentPhone' in updates) {
            const raw = String(updates.studentPhone || '').trim();
            if (!raw) updates.studentPhone = '';
            else {
                if (!isValidSomaliaPhone(raw)) return res.status(400).json({ message: 'Invalid Somalia phone number (student phone).' });
                updates.studentPhone = normalizeSomaliaPhone(raw) || raw;
            }
        }

        // Emails
        if ('guardianEmail' in updates) {
            const em = String(updates.guardianEmail || '').trim().toLowerCase();
            if (!isValidEmailBasic(em)) return res.status(400).json({ message: 'Invalid guardian email.' });
            updates.guardianEmail = em;
        }
        if ('studentEmail' in updates) {
            const em = String(updates.studentEmail || '').trim().toLowerCase();
            if (!isValidEmailBasic(em)) return res.status(400).json({ message: 'Invalid student email.' });
            updates.studentEmail = em;
        }

        // Transfer/medical/idDocument: merge with current, normalize, validate
        if ('transfer' in updates) {
            const incoming = (updates.transfer && typeof updates.transfer === 'object') ? updates.transfer : {};
            const base = (current.transfer && typeof current.transfer === 'object') ? current.transfer.toObject?.() || current.transfer : {};
            const next = { ...base, ...incoming };
            const isTransferFlag = Boolean(next.isTransfer);
            const prevSchool = collapseWs(next.previousSchoolName);
            const transferReason = collapseWs(next.transferReason);
            if (isTransferFlag && !prevSchool) return res.status(400).json({ message: 'Previous school name is required for transfer students.' });
            updates.transfer = { isTransfer: isTransferFlag, previousSchoolName: prevSchool, transferReason };
        }
        if ('medical' in updates) {
            const incoming = (updates.medical && typeof updates.medical === 'object') ? updates.medical : {};
            const base = (current.medical && typeof current.medical === 'object') ? current.medical.toObject?.() || current.medical : {};
            const next = { ...base, ...incoming };
            updates.medical = {
                allergies: collapseWs(next.allergies),
                medicalConditions: collapseWs(next.medicalConditions),
                disabilityFlags: normalizeDisabilityFlags(next.disabilityFlags),
                bloodGroup: normalizeBloodGroup(next.bloodGroup),
            };
        }
        if ('idDocument' in updates) {
            const incoming = (updates.idDocument && typeof updates.idDocument === 'object') ? updates.idDocument : {};
            const base = (current.idDocument && typeof current.idDocument === 'object') ? current.idDocument.toObject?.() || current.idDocument : {};
            const next = { ...base, ...incoming };
            const idType = collapseWs(next.idType);
            const idNumber = collapseWs(next.idNumber);
            const issuedBy = collapseWs(next.issuedBy);
            let expiresAt = next.expiresAt || null;
            if (expiresAt) {
                try {
                    expiresAt = parseDateOnlyOrThrow(expiresAt, 'idDocument.expiresAt');
                } catch {
                    return res.status(400).json({ message: 'Invalid id document expiry date.' });
                }
            }
            const anyIdProvided = Boolean(idType || idNumber || issuedBy || expiresAt);
            if (anyIdProvided && (!idType || !idNumber)) {
                return res.status(400).json({ message: 'idType and idNumber are required when providing ID document details.' });
            }
            updates.idDocument = { idType, idNumber, issuedBy, expiresAt: expiresAt || null };
        }
        if ('notes' in updates) {
            updates.notes = collapseWs(updates.notes);
        }

        // Validate structured residence only when any of those fields are being updated.
        const updatingResidence =
            ('isSomali' in updates) ||
            ('residenceRegionId' in updates) ||
            ('residenceDistrictId' in updates) ||
            ('residenceNeighborhood' in updates);

        if (updatingResidence) {
            const nextIsSomali = ('isSomali' in updates) ? (updates.isSomali !== false) : (current.isSomali !== false);
            const nextNeighborhood = String(('residenceNeighborhood' in updates) ? updates.residenceNeighborhood : (current.residenceNeighborhood || '')).trim();
            const nextRegionId = String(('residenceRegionId' in updates) ? updates.residenceRegionId : (current.residenceRegionId || '')).trim();
            const nextDistrictId = String(('residenceDistrictId' in updates) ? updates.residenceDistrictId : (current.residenceDistrictId || '')).trim();

            if (!nextNeighborhood) return res.status(400).json({ message: 'Neighborhood is required.' });
            updates.isSomali = nextIsSomali;
            updates.residenceNeighborhood = nextNeighborhood;

            if (nextIsSomali) {
                if (!nextRegionId || !isValidSomaliaRegionId(nextRegionId)) return res.status(400).json({ message: 'Invalid region.' });
                if (!nextDistrictId || !isValidSomaliaDistrictId(nextRegionId, nextDistrictId)) return res.status(400).json({ message: 'Invalid district.' });
                updates.residenceRegionId = nextRegionId;
                updates.residenceDistrictId = nextDistrictId;
            } else {
                updates.residenceRegionId = '';
                updates.residenceDistrictId = '';
            }
            // Back-compat legacy address string
            updates.address = nextNeighborhood;
        }

        // If name or dob is being changed, ensure no other student has same fullName+dob (date-only)
        if (updates.fullName || updates.dob) {
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const targetName = (updates.fullName ? String(updates.fullName) : current.fullName).trim();
            const targetDob = updates.dob ? updates.dob : current.dob;
            const nameTokens = collapseWs(targetName).split(' ').filter(Boolean).map(escapeRegex);
            const namePattern = nameTokens.join('\\s+');
            const nameRegex = new RegExp(`^${namePattern}$`, 'i');
            const { start: dobStart, end: dobEnd } = dayRangeUtc(targetDob);
            const clash = await Student.findOne({ _id: { $ne: id }, fullName: nameRegex, dob: { $gte: dobStart, $lt: dobEnd } });
            if (clash) {
                return res.status(409).json({ message: 'Another student already has this Full Name and DOB.' });
            }
        }

        const student = await Student.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });

        // Keep linked login account (User) consistent when applicable.
        try {
            const userUpdate = {};
            const userInc = {};

            if (updates.fullName) userUpdate.fullName = updates.fullName;
            if (updates.status) {
                userUpdate.status = normalizeStudentStatusToUserStatus(updates.status);
                // Invalidate tokens so other sessions logout quickly when status changes.
                userInc.tokenVersion = 1;
            }

            if (Object.keys(userUpdate).length > 0 || Object.keys(userInc).length > 0) {
                await User.updateOne(
                    { studentRef: id },
                    {
                        ...(Object.keys(userUpdate).length > 0 ? { $set: userUpdate } : {}),
                        ...(Object.keys(userInc).length > 0 ? { $inc: userInc } : {}),
                    }
                );
            }
        } catch {
            // non-blocking
        }

        publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });
        if (updates.status || updates.fullName) publishRealtime({ type: 'users:changed', ts: Date.now() });
        if (updates.status) publishRealtime({ type: 'security:authLocksChanged', ts: Date.now() });

        res.json({ message: 'Student updated', student });
    } catch (err) {
        console.error('Update student error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Upload / replace student photo
// @route   POST /api/students/:id/photo   (multipart/form-data: photo)
export const uploadStudentPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });

        const file = req.file;
        if (!file) {
            return res.status(400).json({
                message: req.t('students.photo.missing', null, 'Photo file is required.'),
            });
        }

        const student = await Student.findById(id);
        if (!student) {
            // Clean up orphan file
            try { await fs.unlink(file.path); } catch { /* ignore */ }
            return res.status(404).json({ message: 'Student not found' });
        }

        const nextRelPath = path.posix.join('uploads', 'students', String(file.filename || ''));
        const nextUrl = `/${path.posix.join('api', 'uploads', 'students', String(file.filename || ''))}`;

        const prevPath = String(student?.photo?.path || '').trim();
        if (prevPath && prevPath.startsWith('uploads/students/')) {
            const absPrev = path.join(__dirname, '..', prevPath);
            try {
                // Delete the previous file (best-effort)
                await fs.unlink(absPrev);
            } catch {
                // ignore
            }
        }

        student.photo = {
            url: nextUrl,
            path: nextRelPath,
            mimeType: String(file.mimetype || ''),
            size: Number(file.size || 0),
            uploadedAt: new Date(),
        };
        await student.save();

        publishRealtime({ type: 'students:changed', id: String(id), ts: Date.now() });

        return res.status(200).json({
            message: req.t('students.photo.uploaded', null, 'Photo uploaded successfully.'),
            photo: student.photo,
            student,
        });
    } catch (err) {
        console.error('uploadStudentPhoto error', err);
        return res.status(500).json({ message: 'Server Error' });
    }
};


// @desc    Toggle latest enrollment active/inactive (without closing leftAt)
// @route   PATCH /api/students/:id/enrollment/active   body: { active: boolean }
export const setEnrollmentActiveFlag = async (req, res) => {
    try {
        const { id } = req.params;
        const { active } = req.body || {};
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        if (typeof active !== 'boolean') return res.status(400).json({ message: 'active flag is required (boolean)' });
        const enrollment = await Enrollment.findOne({ student: id }).sort({ createdAt: -1 });
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
        // Prevent toggling terminal states
        if (['transferred','promoted','graduated','withdrawn'].includes(enrollment.status)) {
            return res.status(400).json({ message: 'Cannot change status of a closed enrollment' });
        }
        enrollment.status = active ? 'active' : 'inactive';
        await enrollment.save();
        res.json({ message: 'Enrollment status updated', enrollment });
    } catch (err) {
        console.error('setEnrollmentActiveFlag error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Aggregated full transcript across all enrollments (multi-year)
// @route   GET /api/students/:id/full-transcript
// Sharaxaad (Somali): Endpoint-kan wuxuu soo celiyaa transcript kasta oo enrollment ah (sanad / section) + transfers + summary guud.
// Waxa uu ka hortagayaa MissingSchemaError marka User model aan la load gareyn adigoo hubinaya mongoose.models.User ka hor populate byUser.
// getFullTranscript moved to transcriptController to reduce studentController weight

// @desc    Get latest transfer log (single) for a student (optimized badge use)
// @route   GET /api/students/:id/latest-transfer
export const getLatestTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const TransferLog = (await import('../models/TransferLog.js')).default;
        const userModelRegistered = !!mongoose.models.User;
        const populatePaths = [
            { path: 'fromGradeSection', select: 'section grade shift', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
            { path: 'toGradeSection', select: 'section grade shift', populate: [ { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] }
        ];
        if (userModelRegistered) populatePaths.push({ path: 'byUser', select: 'fullName email' });
        let logQuery = TransferLog.findOne({ student: id }).sort({ date: -1, createdAt: -1 });
        populatePaths.forEach(p => logQuery.populate(p));
        const log = await logQuery.lean();
        res.json({ latest: log });
    } catch (err) {
        console.error('getLatestTransfer error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

