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
        // Include both 'active' and 'inactive' so deactivated students still appear in the list
    const enrollmentMatch = { status: { $in: ['active','inactive'] } };
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
        const pageNum = Math.max(parseInt(page) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
        const skip = (pageNum - 1) * limitNum;

        const TransferLog = (await import('../models/TransferLog.js')).default;
        // Determine if User model is registered (some deployments may not have User schema loaded yet)
        const userModelRegistered = !!mongoose.models.User;
        const populatePaths = [
            { path: 'fromGradeSection', select: 'section academicYear grade shift', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
            { path: 'toGradeSection', select: 'section academicYear grade shift', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] }
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

// @desc    Transfer latest enrollment to a different GradeSection (Same Academic Year only)
// @route   PATCH /api/students/:id/enrollment/transfer  (compat: /reassign)
// Notes:
//  - Validates: active enrollment, target exists, same AcademicYear, capacity check.
//  - Updates enrollment fields: gradeSection, grade, shift.
//  - Exam scores relinking (Somali): Haddii AY + Grade isku mid yihiin → ExamScore exam IDs waxaa loo waafajiyaa target section exam-yadiisa iyadoo lagu isticmaalayo examType mapping (EnsureExams).
//  - Audit logging: TransferLog la abuuraa; haddii falka uu yahay dib-u-noqosho (B→A marka hore A→B la sameeyay), log-ga cusub waxa uu helaa revertOf, labadana waxa la calaamadeeyaa reverted=true.
export const transferEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        const { gradeSectionId, enrollmentId } = req.body || {};
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        if (!mongoose.isValidObjectId(gradeSectionId)) return res.status(400).json({ message: 'Invalid gradeSectionId' });

        // Fetch target section with its AY/grade/shift
        const target = await GradeSection.findById(gradeSectionId).populate(['academicYear', 'grade', 'shift']);
        if (!target) return res.status(404).json({ message: 'Target section not found' });

        // Validation: Section capacity
        if (typeof target.capacity === 'number' && target.capacity > 0) {
            const currentCount = await Enrollment.countDocuments({ gradeSection: target._id, status: 'active' });
            if (currentCount >= target.capacity) {
                return res.status(409).json({ message: 'Target section is full. Cannot transfer.' });
            }
        }

        // Resolve which enrollment to update: explicit or latest
        let enrollment;
        if (enrollmentId) {
            if (!mongoose.isValidObjectId(enrollmentId)) return res.status(400).json({ message: 'Invalid enrollmentId' });
            enrollment = await Enrollment.findOne({ _id: enrollmentId, student: id });
        } else {
            enrollment = await Enrollment.findOne({ student: id }).sort({ createdAt: -1 });
        }
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        // Business rule: only allow transfer if status is active (Somali): enrollment waa inuu ahaadaa 'active'
        if (enrollment.status !== 'active') {
            return res.status(400).json({ message: 'Only active enrollments can be transferred' });
        }

        // Academic year must match to avoid breaking per-year constraints
        if (String(enrollment.academicYear) !== String(target.academicYear._id)) {
            return res.status(400).json({ message: 'Target section must be in the same academic year. For cross-year transfer, create a new enrollment.' });
        }

        // No-op if same section
        if (String(enrollment.gradeSection) === String(target._id)) {
            return res.json({ message: 'No changes: already in this section', enrollment });
        }

        // Perform atomic update: move to target section and sync grade/shift
        const sourceSectionId = enrollment.gradeSection; // keep old for migration
        const sourceGradeId = enrollment.grade;
        enrollment.gradeSection = target._id;
        enrollment.grade = target.grade._id;
        enrollment.shift = target.shift._id;
        await enrollment.save();

        // Exam scores migration (same AY + same Grade):
        // If exams are created per gradeSection, we relink student's scores from source section's exams
        // to target section's corresponding exams (matched by examType).
        try {
            if (String(sourceSectionId) !== String(target._id) && String(enrollment.academicYear) === String(target.academicYear._id) && String(sourceGradeId) === String(target.grade._id)) {
                const Exam = (await import('../models/Exam.js')).default;
                const ExamType = (await import('../models/ExamType.js')).default;
                const ExamScore = (await import('../models/ExamScore.js')).default;

                // Ensure all exam types exist in target section for this AY
                const types = await ExamType.find({}).select('_id').lean();
                const ensureOps = types.map(t => (
                    Exam.updateOne(
                        { examType: t._id, academicYear: target.academicYear._id, gradeSection: target._id },
                        { $setOnInsert: { examType: t._id, academicYear: target.academicYear._id, gradeSection: target._id } },
                        { upsert: true }
                    )
                ));
                await Promise.all(ensureOps);

                // Fetch exams per section in same AY (after ensure)
                const sourceExams = await Exam.find({ academicYear: target.academicYear._id, gradeSection: sourceSectionId }).select('_id examType').lean();
                const targetExams = await Exam.find({ academicYear: target.academicYear._id, gradeSection: target._id }).select('_id examType').lean();

                // Map examType -> targetExamId
                const targetByType = new Map(targetExams.map(e => [String(e.examType), String(e._id)]));

                // For each source examType that exists in target, relink student's scores
                for (const se of sourceExams) {
                    const tgtExamId = targetByType.get(String(se.examType));
                    if (!tgtExamId) continue;
                    await ExamScore.updateMany(
                        { student: enrollment.student, exam: se._id },
                        { $set: { exam: tgtExamId } }
                    );
                }
            }
        } catch (migErr) {
            // Do not fail transfer if migration fails; just log
            console.warn('Exam score migration warning:', migErr);
        }

        // Write audit log (best-effort) with revert detection
        let transferLogDoc = null;
        try {
            const TransferLog = (await import('../models/TransferLog.js')).default;
            // Check last transfer to detect a revert (e.g., A->B then B->A)
            const last = await TransferLog.findOne({ student: enrollment.student }).sort({ date: -1, createdAt: -1 }).lean();
            if (last && String(last.fromGradeSection) === String(target._id) && String(last.toGradeSection) === String(sourceSectionId) && !last.reverted) {
                // This action returns the student to prior section; mark revert pair
                const created = await TransferLog.create({
                    student: enrollment.student,
                    fromGradeSection: sourceSectionId,
                    toGradeSection: target._id,
                    byUser: req.user?._id || null,
                    date: new Date(),
                    reason: req.body?.reason || undefined,
                    reverted: true,
                    revertOf: last._id
                });
                // Mark the last log as reverted too (symmetric info)
                await TransferLog.updateOne({ _id: last._id }, { $set: { reverted: true } });
                transferLogDoc = created;
            } else {
                transferLogDoc = await TransferLog.create({
                    student: enrollment.student,
                    fromGradeSection: sourceSectionId,
                    toGradeSection: target._id,
                    byUser: req.user?._id || null,
                    date: new Date(),
                    reason: req.body?.reason || undefined
                });
            }
        } catch (logErr) {
            console.warn('Transfer log write warning:', logErr);
        }

        return res.json({ message: 'Enrollment transferred', enrollment, transferLog: transferLogDoc });
    } catch (err) {
        console.error('Transfer enrollment error', err);
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
export const getFullTranscript = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const student = await Student.findById(id).select('fullName studentId').lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Fetch all enrollments (oldest first for chronological display)
        const enrollments = await Enrollment.find({ student: id })
            .sort({ joinedAt: 1, createdAt: 1 })
            .populate([
                { path: 'gradeSection', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
                { path: 'academicYear', select: 'yearName' },
                { path: 'grade', select: 'gradeName' },
                { path: 'shift', select: 'shiftName' }
            ])
            .lean();

        // Bring in transfers (no pagination) for context
        const TransferLog = (await import('../models/TransferLog.js')).default;
        const userModelRegisteredFT = !!mongoose.models.User;
        let transfersQuery = TransferLog.find({ student: id })
            .sort({ date: 1, createdAt: 1 })
            .populate({ path: 'fromGradeSection', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] })
            .populate({ path: 'toGradeSection', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] });
        if (userModelRegisteredFT) {
            transfersQuery = transfersQuery.populate({ path: 'byUser', select: 'fullName email' });
        }
        const transfers = await transfersQuery.lean();

        // Helper to build transcript for one enrollment using existing logic (inline adaptation of getTranscript)
        const Exam = (await import('../models/Exam.js')).default;
        const ExamType = (await import('../models/ExamType.js')).default;
        const ExamScore = (await import('../models/ExamScore.js')).default;
        const GradeSection = (await import('../models/GradeSection.js')).default;
        const Subject = (await import('../models/Subject.js')).default;

        const enrollmentTranscripts = [];
        for (const enr of enrollments) {
            const academicYearId = String(enr.academicYear?._id || enr.academicYear);
            const gradeSectionId = String(enr.gradeSection?._id || enr.gradeSection);
            if (!academicYearId || !gradeSectionId) continue;
            // Exams for this AY + section
            const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId }).select('_id examType').lean();
            if (!exams.length) {
                enrollmentTranscripts.push({ enrollmentId: enr._id, transcript: { examTypes: [], subjects: [], rows: [], overall: { total: 0, average: 0 } } });
                continue;
            }
            const examTypeIds = [...new Set(exams.map(e => String(e.examType)))];
            const examTypesDocs = await ExamType.find({ _id: { $in: examTypeIds } }).select('typeName').lean();
            const examTypeNameMap = Object.fromEntries(examTypesDocs.map(t => [String(t._id), t.typeName]));
            const examTypes = examTypeIds.map(eid => ({ _id: eid, typeName: examTypeNameMap[eid] || 'Exam' })).sort((a,b)=> (a.typeName||'').localeCompare(b.typeName||''));
            const examIds = exams.map(e => e._id);
            const gsDoc = await GradeSection.findById(gradeSectionId).select('subjects').lean();
            const subjectIds = (gsDoc?.subjects || []).map(sid => new mongoose.Types.ObjectId(sid));
            if (!subjectIds.length) {
                enrollmentTranscripts.push({ enrollmentId: enr._id, transcript: { examTypes, subjects: [], rows: [], overall: { total: 0, average: 0 } } });
                continue;
            }
            const subjectDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
            const subjectNameMap = Object.fromEntries(subjectDocs.map(s => [String(s._id), s.subjectName]));
            const subjects = subjectIds.map(sid => ({ _id: sid, subjectName: subjectNameMap[String(sid)] || 'Subject' }));
            const scores = await ExamScore.find({ student: id, exam: { $in: examIds }, subject: { $in: subjectIds } }).select('subject exam scoreObtained').lean();
            const examIdToTypeId = Object.fromEntries(exams.map(e => [String(e._id), String(e.examType)]));
            const rows = subjects.map(su => {
                const subjectIdStr = String(su._id);
                const perMap = {};
                for (const et of examTypes) perMap[String(et._id)] = 0;
                for (const sc of scores) {
                    if (String(sc.subject) !== subjectIdStr) continue;
                    const etId = examIdToTypeId[String(sc.exam)];
                    if (!etId) continue;
                    perMap[etId] += Number(sc.scoreObtained || 0);
                }
                const perExamList = examTypes.map(et => ({ examTypeId: et._id, typeName: et.typeName, score: Number(perMap[String(et._id)] || 0) }));
                const total = perExamList.reduce((a,b)=> a + (b.score||0), 0);
                const average = subjects.length ? total : 0;
                return { subjectId: su._id, subjectName: su.subjectName, exams: perExamList, total, average };
            });
            const overallTotal = rows.reduce((a,b)=> a + (b.total||0), 0);
            const overallAverage = subjects.length ? (overallTotal / subjects.length) : 0;
            enrollmentTranscripts.push({ enrollmentId: enr._id, transcript: { examTypes, subjects, rows, overall: { total: overallTotal, average: overallAverage } } });
        }

        // Merge transcripts back into enrollment objects
        const transcriptByEnrollment = new Map(enrollmentTranscripts.map(et => [String(et.enrollmentId), et.transcript]));
        const enrichedEnrollments = enrollments.map(en => ({
            enrollmentId: en._id,
            academicYear: en.academicYear?.yearName ? { _id: en.academicYear._id, yearName: en.academicYear.yearName } : en.academicYear,
            gradeSection: en.gradeSection && en.gradeSection.section ? {
                _id: en.gradeSection._id,
                section: en.gradeSection.section,
                grade: en.gradeSection.grade?.gradeName || en.grade?.gradeName,
                shift: en.gradeSection.shift?.shiftName || en.shift?.shiftName
            } : en.gradeSection,
            joinedAt: en.joinedAt,
            leftAt: en.leftAt,
            status: en.status,
            transcript: transcriptByEnrollment.get(String(en._id)) || { examTypes: [], subjects: [], rows: [], overall: { total:0, average:0 } }
        }));

        // Simple cumulative summary (sum totals across enrollments)
        let cumulativeTotal = 0; let cumulativeSubjects = new Set();
        enrichedEnrollments.forEach(en => {
            cumulativeTotal += en.transcript.overall.total || 0;
            (en.transcript.subjects || []).forEach(s => cumulativeSubjects.add(String(s._id)));
        });
        const cumulativeAverage = enrichedEnrollments.length ? (cumulativeTotal / (cumulativeSubjects.size || 1)) : 0;

        res.json({
            student,
            enrollments: enrichedEnrollments,
            transfers,
            summary: {
                enrollmentCount: enrichedEnrollments.length,
                distinctSubjects: cumulativeSubjects.size,
                cumulativeTotal,
                cumulativeAverage
            }
        });
    } catch (err) {
        console.error('getFullTranscript error', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get latest transfer log (single) for a student (optimized badge use)
// @route   GET /api/students/:id/latest-transfer
export const getLatestTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID' });
        const TransferLog = (await import('../models/TransferLog.js')).default;
        const userModelRegistered = !!mongoose.models.User;
        const populatePaths = [
            { path: 'fromGradeSection', select: 'section academicYear grade shift', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] },
            { path: 'toGradeSection', select: 'section academicYear grade shift', populate: [ { path: 'academicYear', select: 'yearName' }, { path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' } ] }
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

