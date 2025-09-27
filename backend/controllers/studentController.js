// This controller manages all core CRUD operations for students in the database.
import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Enrollment from '../models/Enrollment.js';
import GradeSection from '../models/GradeSection.js';

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
            sort
        } = req.query;

        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
        const skip = (pageNum - 1) * limitNum;

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
    const enrollmentMatch = { status: 'active' }; // only active enrollment considered as "current"
    const sectionId = gradeSectionId || req.query.classId; // legacy fallback
    if (sectionId && mongoose.isValidObjectId(sectionId)) enrollmentMatch.gradeSection = new mongoose.Types.ObjectId(sectionId);
        if (academicYear && mongoose.isValidObjectId(academicYear)) enrollmentMatch.academicYear = new mongoose.Types.ObjectId(academicYear);
    if (grade && mongoose.isValidObjectId(grade)) enrollmentMatch.grade = new mongoose.Types.ObjectId(grade);
    if (shift && mongoose.isValidObjectId(shift)) enrollmentMatch.shift = new mongoose.Types.ObjectId(shift);

        const studentMatch = {};
        if (status) studentMatch.status = status; // Active / Inactive
        let searchStage = [];
        if (search) {
            const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
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
            ...(status ? [{ $match: { 'student.status': status } }] : []),
            // Apply search on computed fields
            ...searchStage,
            // Join gradeSection (latest.gradeSection) from gradesections collection
            { $lookup: { from: 'gradesections', localField: 'latest.gradeSection', foreignField: '_id', as: 'class' } },
            { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
            // Join related grade / shift / academicYear for display
            { $lookup: { from: 'grades', localField: 'class.grade', foreignField: '_id', as: 'grade' } },
            { $lookup: { from: 'shifts', localField: 'class.shift', foreignField: '_id', as: 'shift' } },
            { $lookup: { from: 'academicyears', localField: 'class.academicYear', foreignField: '_id', as: 'ay' } },
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
    const { gradeSectionId, fullName, gender, dob, guardianName, contactNumber, address, admissionDate } = req.body;
    if (!gradeSectionId || !fullName || !gender || !dob || !guardianName || !contactNumber || !admissionDate) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    try {
        const cls = await GradeSection.findById(gradeSectionId).populate(['academicYear', 'grade', 'shift']);
    if (!cls) return res.status(404).json({ message: 'Section not found.' });

    // Guard 1: Do not allow the same person to be enrolled twice in the same academic year
    // Simple definition of "same person": fullName (case-insensitive, trimmed) + dob
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
        const nameRegex = new RegExp(`^${escapeRegex(fullName.trim())}$`, 'i');
        const existingPerson = await Student.findOne({ fullName: nameRegex, dob: new Date(dob) });
        if (existingPerson) {
            // If there is an enrollment for this academic year already -> 409
            const dupEnroll = await Enrollment.findOne({ student: existingPerson._id, academicYear: cls.academicYear._id });
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
            const student = await Student.create([{ fullName, gender, dob, guardianName, contactNumber, address, admissionDate }], { session });
            const studentDoc = student[0];

            // Check duplicate enrollment same academicYear (in case of rare race conditions)
            const existing = await Enrollment.findOne({ student: studentDoc._id, academicYear: cls.academicYear._id }).session(session);
            if (existing) {
                await session.abortTransaction();
                return res.status(409).json({ message: 'This student is already enrolled for the selected academic year.' });
            }

            const enrollment = await Enrollment.create([{
                student: studentDoc._id,
                gradeSection: cls._id,
                academicYear: cls.academicYear._id,
                grade: cls.grade._id,
                shift: cls.shift._id,
                status: 'active',
                joinedAt: admissionDate
            }], { session });

            await session.commitTransaction();
            session.endSession();

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
            { path: 'gradeSection', model: 'GradeSection', populate: [{ path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' }, { path: 'academicYear', select: 'yearName' }] },
            { path: 'grade', select: 'gradeName' },
            { path: 'shift', select: 'shiftName' },
            { path: 'academicYear', select: 'yearName' }
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

// @desc    Get enrollments history (paginated)
// @route   GET /api/students/:id/history
export const getStudentHistory = async (req, res) => {
    try {
        const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const { page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        const [rows, total] = await Promise.all([
            Enrollment.find({ student: id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate([
                    { path: 'gradeSection', model: 'GradeSection', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
                    { path: 'academicYear', select: 'yearName' },
                    { path: 'grade', select: 'gradeName' },
                    { path: 'shift', select: 'shiftName' }
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
        const allowed = ['fullName', 'gender', 'dob', 'guardianName', 'contactNumber', 'address', 'admissionDate', 'status'];
        const updates = {};
        for (const key of allowed) {
            if (key in req.body && req.body[key] !== undefined && req.body[key] !== null) {
                updates[key] = req.body[key];
            }
        }
    if (Object.keys(updates).length === 0) return res.status(400).json({ message: 'No updates provided.' });
        // Prevent invalid status value
        if (updates.status && !['Active', 'Inactive'].includes(updates.status)) {
            return res.status(400).json({ message: 'Invalid status.' });
        }
        // Fetch current to validate potential duplicates on name+dob changes
        const current = await Student.findById(id);
    if (!current) return res.status(404).json({ message: 'Student not found' });

        // If name or dob is being changed, ensure no other student has same fullName+dob
        if (updates.fullName || updates.dob) {
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const targetName = (updates.fullName ? String(updates.fullName) : current.fullName).trim();
            const targetDob = updates.dob ? new Date(updates.dob) : current.dob;
            const nameRegex = new RegExp(`^${escapeRegex(targetName)}$`, 'i');
            const clash = await Student.findOne({ _id: { $ne: id }, fullName: nameRegex, dob: targetDob });
            if (clash) {
                return res.status(409).json({ message: 'Another student already has this Full Name and DOB.' });
            }
        }

        const student = await Student.findByIdAndUpdate(id, { $set: updates }, { new: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Student updated', student });
    } catch (err) {
        console.error('Update student error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Reassign latest enrollment to a different Grade Section (same academic year)
// @route   PATCH /api/students/:id/enrollment/reassign
export const reassignEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        const { gradeSectionId, enrollmentId } = req.body || {};
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        if (!mongoose.isValidObjectId(gradeSectionId)) return res.status(400).json({ message: 'Invalid gradeSectionId' });

        // Fetch target section with its AY/grade/shift
        const target = await GradeSection.findById(gradeSectionId).populate(['academicYear', 'grade', 'shift']);
        if (!target) return res.status(404).json({ message: 'Target section not found' });

        // Resolve which enrollment to update: explicit or latest
        let enrollment;
        if (enrollmentId) {
            if (!mongoose.isValidObjectId(enrollmentId)) return res.status(400).json({ message: 'Invalid enrollmentId' });
            enrollment = await Enrollment.findOne({ _id: enrollmentId, student: id });
        } else {
            enrollment = await Enrollment.findOne({ student: id }).sort({ createdAt: -1 });
        }
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        // Business rule: only allow reassignment if status is active
        if (enrollment.status !== 'active') {
            return res.status(400).json({ message: 'Only active enrollments can be reassigned' });
        }

        // Academic year must match to avoid breaking per-year constraints
        if (String(enrollment.academicYear) !== String(target.academicYear._id)) {
            return res.status(400).json({ message: 'Target section must be in the same academic year' });
        }

        // No-op if same section
        if (String(enrollment.gradeSection) === String(target._id)) {
            return res.json({ message: 'No changes: already in this section', enrollment });
        }

        // Perform atomic update: move to target section and sync grade/shift
        enrollment.gradeSection = target._id;
        enrollment.grade = target.grade._id;
        enrollment.shift = target.shift._id;
        await enrollment.save();

        return res.json({ message: 'Enrollment reassigned', enrollment });
    } catch (err) {
        console.error('Reassign enrollment error', err);
        return res.status(500).json({ message: 'Server Error' });
    }
};

