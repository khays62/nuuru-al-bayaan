// This controller handles all real database operations for subjects.
import Subject from '../models/Subject.js';
import GradeSection from '../models/GradeSection.js';
import { publishRealtime } from '../utils/realtimeBus.js';

// @desc    Get subjects with pagination, search, grade filter, sorting
// @route   GET /api/subjects
// @query   page=1&limit=10&search=math&grade=gradeId&sortBy=subjectName&sortDir=asc
export const getSubjects = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            grade = '',
            sortBy = 'createdAt',
            sortDir = 'desc'
        } = req.query;

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 10, 100); // cap

        const filter = {};
        if (search) {
            // Escape regex si user aanu u gelin character jebiya pattern (sida lone backslash) ama ReDoS fudud.
            const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const safe = escapeRegExp(search.trim());
            filter.$or = [
                { subjectName: { $regex: safe, $options: 'i' } },
                { subjectCode: { $regex: safe, $options: 'i' } }
            ];
        }
        if (grade) {
            filter.grades = grade; // subject that includes grade id
        }

        const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

        const total = await Subject.countDocuments(filter);
        const subjects = await Subject.find(filter)
            .populate('grades', 'gradeName')
            .sort(sort)
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);

        res.json({
            data: subjects,
            meta: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a new subject
// @route   POST /api/subjects
export const addSubject = async (req, res) => {
    let { subjectName, subjectCode, grades } = req.body;
    if (!subjectName || !grades || grades.length === 0) {
        return res.status(400).json({ message: 'Please provide subject name and at least one grade.' });
    }

    // Normalize
    subjectName = subjectName.trim();
    if (subjectCode) subjectCode = subjectCode.trim().toUpperCase();

    try {
        // Optional: auto-generate subjectCode if missing
        if (!subjectCode) {
            subjectCode = subjectName.substring(0,3).toUpperCase() + '101';
        }

        // Check duplicate code
        const existing = await Subject.findOne({ subjectCode });
        if (existing) {
            return res.status(409).json({ message: 'Subject code already exists', field: 'subjectCode' });
        }

        const newSubject = await Subject.create({
            subjectName,
            subjectCode,
            grades
        });

        publishRealtime({ type: 'subjects:changed', id: String(newSubject._id), ts: Date.now() });
        res.status(201).json(newSubject);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Duplicate subject code', field: 'subjectCode' });
        }
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update an existing subject
// @route   PUT /api/subjects/:id
export const updateSubject = async (req, res) => {
    const { id } = req.params;
    let { subjectName, subjectCode, grades } = req.body;

    try {
        const subject = await Subject.findById(id);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        if (subjectName) subject.subjectName = subjectName.trim();
        if (subjectCode) {
            subjectCode = subjectCode.trim().toUpperCase();
            // Check duplicate for other record
            const duplicate = await Subject.findOne({ subjectCode, _id: { $ne: id } });
            if (duplicate) {
                return res.status(409).json({ message: 'Subject code already exists', field: 'subjectCode' });
            }
            subject.subjectCode = subjectCode;
        }
        if (grades && Array.isArray(grades)) {
            const oldGradeIds = subject.grades.map(g => g.toString());
            const newGradeIds = grades.map(g => g.toString());
            const removed = oldGradeIds.filter(g => !newGradeIds.includes(g));
            if (removed.length) {
                const conflict = await GradeSection.findOne({ grade: { $in: removed }, subjects: subject._id }).lean();
                if (conflict) {
                    return res.status(409).json({
                        message: 'Cannot remove a grade because existing classes use this subject',
                        field: 'grades',
                        inUse: true
                    });
                }
            }
            subject.grades = grades;
        }

        const updated = await subject.save();
        await updated.populate('grades', 'gradeName');

        publishRealtime({ type: 'subjects:changed', id: String(updated._id), ts: Date.now() });
        res.json(updated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Duplicate subject code', field: 'subjectCode' });
        }
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a subject
// @route   DELETE /api/subjects/:id
export const deleteSubject = async (req, res) => {
    const { id } = req.params;
    try {
        const subject = await Subject.findById(id);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        // Guard: ha tirtirin haddii fasallo isticmaalayaan
    const usageCount = await GradeSection.countDocuments({ subjects: id });
        if (usageCount > 0) {
            return res.status(409).json({
                message: 'Subject is assigned to existing classes; cannot delete',
                inUse: true,
                usageCount
            });
        }
        await subject.deleteOne();

        publishRealtime({ type: 'subjects:changed', id: String(id), ts: Date.now() });
        res.json({ message: 'Subject removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};
