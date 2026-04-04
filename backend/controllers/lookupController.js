import AcademicYear from '../models/AcademicYear.js';
import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';
import ExamType from '../models/ExamType.js';

// Academic Years
export const getAcademicYears = async (req, res) => {
    try {
        const role = String(req.user?.role || '').toLowerCase();
        if (role === 'admin') {
            const years = await AcademicYear.find().sort({ yearName: -1 });
            return res.json(years);
        }

        const latest = await AcademicYear.findOne({}).sort({ createdAt: -1 }).select('yearName').lean();
        return res.json(latest ? [latest] : []);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching academic years', error: error.message });
    }
};

// Grades
export const getGrades = async (_req, res) => {
    try {
        const grades = await Grade.find().lean();
        grades.sort((a, b) => {
            const ao = Number.isInteger(a?.order) ? a.order : Number.MAX_SAFE_INTEGER;
            const bo = Number.isInteger(b?.order) ? b.order : Number.MAX_SAFE_INTEGER;
            if (ao !== bo) return ao - bo;
            return String(a?.gradeName || '').localeCompare(String(b?.gradeName || ''), undefined, { sensitivity: 'base' });
        });
        res.json(grades);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching grades', error: error.message });
    }
};

// Shifts
export const getShifts = async (_req, res) => {
    try {
        const shifts = await Shift.find().sort({ shiftName: 1 });
        res.json(shifts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching shifts', error: error.message });
    }
};

// Exam Types
export const getExamTypes = async (_req, res) => {
    try {
        const types = await ExamType.find().sort({ typeName: 1 });
        res.json(types);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching exam types', error: error.message });
    }
};

// @desc    Soo qaad dhammaan fasallada si loogu isticmaalo dropdowns
// @route   GET /api/lookups/classes
// @access  Public
// Removed legacy classes lookup: use /api/grades/sections instead

