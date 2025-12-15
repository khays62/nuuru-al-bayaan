import mongoose from 'mongoose';
import GradeSection from '../models/GradeSection.js';
import Subject from '../models/Subject.js';
import AcademicYear from '../models/AcademicYear.js';
import Shift from '../models/Shift.js';
import Grade from '../models/Grade.js';
import Enrollment from '../models/Enrollment.js';
import Cohort from '../models/Cohort.js';

// Enforce: For the same (grade, academicYear), all sections/shifts must share ONE cohort value
async function assertGroupCohortUniformity({ grade, academicYear, cohort, excludeId }) {
  const groupFilter = { grade: new mongoose.Types.ObjectId(grade), academicYear: new mongoose.Types.ObjectId(academicYear) };
  if (excludeId) groupFilter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };

  // If trying to CLEAR cohort while others have a value -> block
  if (!cohort) {
    const otherHasCohort = await GradeSection.exists({ ...groupFilter, cohort: { $ne: null } });
    if (otherHasCohort) {
      const one = await GradeSection.findOne({ ...groupFilter, cohort: { $ne: null } }).populate('cohort', 'name').lean();
      const msg = `This grade and academic year already use cohort "${one?.cohort?.name || one?.cohort || ''}". All sections must use the same cohort.`;
      const err = new Error(msg);
      err.status = 409;
      err.code = 'COHORT_CONFLICT_CLEAR';
      err.details = { existingCohort: one?.cohort?._id || one?.cohort };
      throw err;
    }
    return; // allowed to be empty only if none in the group have cohort
  }

  // If trying to SET cohort but group already has a different cohort -> block
  const conflict = await GradeSection.findOne({
    ...groupFilter,
    $and: [ { cohort: { $ne: null } }, { cohort: { $ne: new mongoose.Types.ObjectId(cohort) } } ]
  }).populate('cohort', 'name').lean();
  if (conflict) {
    const msg = `This grade and academic year already use cohort "${conflict.cohort?.name || conflict.cohort}". All sections must use the same cohort.`;
    const err = new Error(msg);
    err.status = 409;
    err.code = 'COHORT_CONFLICT_SAME_GRADE_AY';
    err.details = { existingCohort: conflict.cohort?._id || conflict.cohort };
    throw err;
  }
}

function buildSort(sortParam) {
  if (!sortParam) return { createdAt: -1 };
  const [field, dirStr] = sortParam.split(':');
  const dir = dirStr === 'asc' ? 1 : -1;
  if (field === 'gradeName') return { 'grade.gradeName': dir };
  return { [field]: dir };
}

// GET /api/grades/sections
export const listGradeSections = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', grade, academicYear, shift, section, cohort, sort } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const sortObj = buildSort(sort);

    const match = {};
    if (grade) match.grade = new mongoose.Types.ObjectId(grade);
    if (academicYear) match.academicYear = new mongoose.Types.ObjectId(academicYear);
  if (shift) match.shift = new mongoose.Types.ObjectId(shift);
  if (section) match.section = section;
  if (cohort) match.cohort = new mongoose.Types.ObjectId(cohort);

    const pipeline = [
      { $match: match },
      { $lookup: { from: 'grades', localField: 'grade', foreignField: '_id', as: 'grade' } },
      { $unwind: '$grade' },
      { $lookup: { from: 'academicyears', localField: 'academicYear', foreignField: '_id', as: 'academicYear' } },
      { $unwind: '$academicYear' },
      { $lookup: { from: 'shifts', localField: 'shift', foreignField: '_id', as: 'shift' } },
      { $unwind: '$shift' },
      { $lookup: { from: 'cohorts', localField: 'cohort', foreignField: '_id', as: 'cohort' } },
    ];
    if (search) {
      pipeline.push({ $match: { $or: [
        { 'grade.gradeName': { $regex: search, $options: 'i' } },
        { section: { $regex: search, $options: 'i' } }
      ] } });
    }
    pipeline.push({ $sort: sortObj });
    pipeline.push(
      {
        $facet: {
          data: [ { $skip: skip }, { $limit: limitNum } ],
          totalCount: [ { $count: 'count' } ]
        }
      }
    );

  const result = await GradeSection.aggregate(pipeline);
    const data = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;
    const totalPages = Math.max(Math.ceil(total / limitNum), 1);

    // shape: populate-like response for frontend
    res.json({
      data: data.map(doc => ({
        _id: doc._id,
        section: doc.section,
        grade: { _id: doc.grade._id, gradeName: doc.grade.gradeName },
        academicYear: { _id: doc.academicYear._id, yearName: doc.academicYear.yearName },
        shift: { _id: doc.shift._id, shiftName: doc.shift.shiftName },
        cohort: (Array.isArray(doc.cohort) && doc.cohort.length) ? { _id: doc.cohort[0]._id, name: doc.cohort[0].name } : undefined,
        subjects: doc.subjects || [],
        capacity: doc.capacity || undefined,
        fee: doc.fee || undefined,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      meta: { page: pageNum, limit: limitNum, total, totalPages, sortBy: (sort||'createdAt:desc').split(':')[0], sortDir: (sort||'createdAt:desc').split(':')[1] || 'desc' }
    });
  } catch (err) {
    console.error('List grade sections error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/grades/sections/:id
export const getGradeSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
  const cls = await GradeSection.findById(id)
      .populate('grade', 'gradeName')
      .populate('academicYear', 'yearName')
      .populate('shift', 'shiftName')
    .populate('subjects', 'subjectName')
    .populate('cohort', 'name');
    if (!cls) return res.status(404).json({ message: 'Not found' });
    res.json(cls);
  } catch (err) {
    console.error('Get grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/grades/sections
export const createGradeSection = async (req, res) => {
  try {
  let { grade, academicYear, shift, section, subjects = [], capacity, cohort, fee } = req.body;
    if (!grade || !academicYear || !fee || !shift) return res.status(400).json({ message: 'grade, academicYear, shift are required' });

    const [gradeDoc, yearDoc, shiftDoc] = await Promise.all([
      Grade.findById(grade),
      AcademicYear.findById(academicYear),
      Shift.findById(shift)
      
    ]);
    if (!gradeDoc) return res.status(400).json({ message: 'Invalid grade' });
    if (!yearDoc) return res.status(400).json({ message: 'Invalid academicYear' });
    if (!shiftDoc) return res.status(400).json({ message: 'Invalid shift' });

  // Default section if empty
  if (!section || String(section).trim() === '') section = '1';

    // Optional cohort validation
    if (cohort !== undefined && cohort !== null && cohort !== '') {
      if (!mongoose.isValidObjectId(cohort)) return res.status(400).json({ message: 'Invalid cohort' });
      const cohortDoc = await Cohort.findById(cohort).lean();
      if (!cohortDoc) return res.status(400).json({ message: 'Invalid cohort' });
    } else {
      cohort = undefined; // ensure not set on create when empty
    }

    // Group-level uniqueness: for same (grade, AY), cohort must be uniform
    try {
      await assertGroupCohortUniformity({ grade, academicYear, cohort });
    } catch (e) {
      const status = e.status || 409;
      return res.status(status).json({ message: e.message, code: e.code, details: e.details });
    }

    // Subjects validation: ensure they belong to this grade
    if (subjects.length) {
      const subjectDocs = await Subject.find({ _id: { $in: subjects } });
      const foundIds = subjectDocs.map(s => s._id.toString());
      const missing = subjects.filter(id => !foundIds.includes(id));
      if (missing.length) return res.status(400).json({ message: 'Some subjects not found', missing });
      const valid = [];
      const removed = [];
      for (const s of subjectDocs) {
        const grades = (s.grades || []).map(g => g.toString());
        if (grades.includes(grade.toString())) valid.push(s._id); else removed.push(s.subjectName || s._id.toString());
      }
      subjects = valid;
      if (removed.length) req._removedSubjects = removed;
    }

  let created;
    try {
  created = await GradeSection.create({ section, capacity, fee, grade, academicYear, shift, subjects, cohort });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Section already exists for this Grade/Year/Shift/Section' });
      throw err;
    }

  const populated = await GradeSection.findById(created._id)
      .populate('grade', 'gradeName')
      .populate('academicYear', 'yearName')
      .populate('shift', 'shiftName')
    .populate('subjects', 'subjectName')
    .populate('cohort', 'name');

    res.status(201).json({ data: populated, removedSubjects: req._removedSubjects || [] });
  } catch (err) {
    console.error('Create grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/grades/sections/:id
export const updateGradeSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
  let { grade, academicYear, shift, section, subjects = [], capacity, fee, cohort } = req.body;
  const cls = await GradeSection.findById(id);
    if (!cls) return res.status(404).json({ message: 'Not found' });

    // Guard: structural lock if enrollments exist
  const enrollmentExists = await Enrollment.exists({ gradeSection: id });
    const structuralRequested = {
      grade: grade !== undefined && grade.toString() !== cls.grade.toString(),
      academicYear: academicYear !== undefined && academicYear.toString() !== cls.academicYear.toString(),
      shift: shift !== undefined && shift.toString() !== cls.shift.toString()
    };
    if (enrollmentExists && (structuralRequested.grade || structuralRequested.academicYear || structuralRequested.shift)) {
      return res.status(409).json({
        message: 'Cannot modify grade, academicYear or shift after students have been enrolled in this section.',
        code: 'CLASS_STRUCTURAL_LOCKED',
        blocked: Object.keys(structuralRequested).filter(k => structuralRequested[k])
      });
    }

    if (academicYear) {
      const yearDoc = await AcademicYear.findById(academicYear);
      if (!yearDoc) return res.status(400).json({ message: 'Invalid academicYear' });
    }
    if (shift) {
      const shiftDoc = await Shift.findById(shift);
      if (!shiftDoc) return res.status(400).json({ message: 'Invalid shift' });
    }

  const gradeChanged = grade && grade.toString() !== cls.grade.toString();
  const prevCohortId = cls.cohort ? cls.cohort.toString() : '';
  let cohortChanged = false;
    let removedSubjects = [];

    if (subjects && subjects.length) {
      const subjectDocs = await Subject.find({ _id: { $in: subjects } });
      const foundIds = subjectDocs.map(s => s._id.toString());
      const missing = subjects.filter(id => !foundIds.includes(id));
      if (missing.length) return res.status(400).json({ message: 'Some subjects not found', missing });
      const valid = [];
      for (const s of subjectDocs) {
        const grades = (s.grades || []).map(g => g.toString());
        const targetGrade = grade ? grade.toString() : cls.grade.toString();
        if (grades.includes(targetGrade)) valid.push(s._id); else removedSubjects.push(s.subjectName || s._id.toString());
      }
      subjects = valid;
    }

    if (gradeChanged && (!subjects || !subjects.length)) {
      if (cls.subjects && cls.subjects.length) {
        const subjectDocs = await Subject.find({ _id: { $in: cls.subjects } });
        const valid = [];
        for (const s of subjectDocs) {
          const grades = (s.grades || []).map(g => g.toString());
          if (grades.includes(grade.toString())) valid.push(s._id); else removedSubjects.push(s.subjectName || s._id.toString());
        }
        subjects = valid;
      }
    }

  // Cohort: allow change anytime; validation and group uniformity
  if (cohort !== undefined) {
      if (cohort === null || cohort === '') {
        // Group uniformity check before clearing
        try {
          await assertGroupCohortUniformity({ grade: cls.grade, academicYear: cls.academicYear, cohort: null, excludeId: id });
        } catch (e) {
          return res.status(e.status || 409).json({ message: e.message, code: e.code, details: e.details });
        }
        cls.cohort = undefined;
        cohortChanged = prevCohortId !== '';
      } else {
        if (!mongoose.isValidObjectId(cohort)) return res.status(400).json({ message: 'Invalid cohort' });
        const cohortDoc = await Cohort.findById(cohort).lean();
        if (!cohortDoc) return res.status(400).json({ message: 'Invalid cohort' });
        // Group uniformity check before setting
        try {
          await assertGroupCohortUniformity({ grade: cls.grade, academicYear: cls.academicYear, cohort, excludeId: id });
        } catch (e) {
          return res.status(e.status || 409).json({ message: e.message, code: e.code, details: e.details });
        }
        cls.cohort = cohort;
        cohortChanged = prevCohortId !== cohort.toString();
      }
    }

  if (capacity !== undefined) cls.capacity = capacity; // allowed
  if (fee !== undefined) cls.fee = fee; // allowed
  let sectionChanged = false;
  if (section !== undefined && String(section).trim() !== '') { cls.section = section; sectionChanged = true; }
    if (grade !== undefined && !enrollmentExists) cls.grade = grade;
    if (academicYear !== undefined && !enrollmentExists) cls.academicYear = academicYear;
    if (shift !== undefined && !enrollmentExists) cls.shift = shift;
    // Before applying subject changes, compute which subjects are being removed
    let removedCandidateIds = [];
    if (subjects !== undefined) {
      const prev = (cls.subjects || []).map(id => id.toString());
      const next = (subjects || []).map(id => id.toString());
      removedCandidateIds = prev.filter(id => !next.includes(id));

      // Guard: prevent removing subjects that already have scores recorded for this class & AY
      if (removedCandidateIds.length) {
        try {
          const Exam = (await import('../models/Exam.js')).default;
          const ExamScore = (await import('../models/ExamScore.js')).default;
          const exams = await Exam.find({ gradeSection: cls._id, academicYear: cls.academicYear }).select('_id').lean();
          const examIds = exams.map(e => e._id);
          if (examIds.length) {
            const count = await ExamScore.countDocuments({ exam: { $in: examIds }, subject: { $in: removedCandidateIds } });
            if (count > 0) {
              const subDocs = await Subject.find({ _id: { $in: removedCandidateIds } }).select('subjectName').lean();
              const blockedSubjects = subDocs.map(s => ({ _id: s._id, subjectName: s.subjectName }));
              return res.status(409).json({
                message: 'Cannot remove subjects that already have recorded scores in this class.',
                code: 'SUBJECTS_HAVE_SCORES',
                blockedSubjects
              });
            }
          }
        } catch (guardErr) {
          console.error('Subject removal guard error', guardErr);
          return res.status(500).json({ message: 'Server error' });
        }
      }

      cls.subjects = subjects;
    }

    // className removed from schema; labels are computed on the fly from grade+section on the client.

    try {
      await cls.save();
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Section already exists for this Grade/Year/Shift/Section' });
      throw err;
    }

  const populated = await GradeSection.findById(cls._id)
      .populate('grade', 'gradeName')
      .populate('academicYear', 'yearName')
      .populate('shift', 'shiftName')
      .populate('subjects', 'subjectName')
      .populate('cohort', 'name');

    const resyncNeeded = !!enrollmentExists && !!cohortChanged;
    res.json({ data: populated, removedSubjects, resyncNeeded });
  } catch (err) {
    console.error('Update grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/grades/sections/:id/resync-cohort
export const resyncGradeSectionCohort = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const cls = await GradeSection.findById(id).select('cohort');
    if (!cls) return res.status(404).json({ message: 'Not found' });
    const targetCohort = cls.cohort || null;
    const result = await Enrollment.updateMany(
      { gradeSection: id, status: 'active' },
      { $set: { cohort: targetCohort } }
    );
    res.json({ ok: true, matched: result.matchedCount ?? result.n, modified: result.modifiedCount ?? result.nModified, cohort: targetCohort });
  } catch (err) {
    console.error('Resync cohort error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/grades/sections/:id
export const deleteGradeSection = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const cls = await GradeSection.findById(id);
  if (!cls) return res.status(404).json({ message: 'Not found' });

  const activeCount = await Enrollment.countDocuments({ gradeSection: id, status: 'active' });
    if (activeCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete section while active students are enrolled',
        code: 'CLASS_HAS_ACTIVE_ENROLLMENTS',
        activeCount
      });
    }

  await GradeSection.deleteOne({ _id: id });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete grade section error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
