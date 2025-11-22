import mongoose from 'mongoose';
import Cohort from '../models/Cohort.js';
import Enrollment from '../models/Enrollment.js';
import GradeSection from '../models/GradeSection.js';

// Policy: Maximum number of cohorts allowed per Academic Year
const MAX_COHORTS_PER_ACADEMIC_YEAR = 2; // Mid-year + Year-end intakes

function parseSort(req) {
  const { sort, sortBy = 'createdAt', sortDir = 'desc' } = req.query || {};
  if (sort) {
    const [field, dirStr] = String(sort).split(':');
    return { [field || 'createdAt']: dirStr === 'asc' ? 1 : -1 };
  }
  return { [sortBy]: String(sortDir).toLowerCase() === 'asc' ? 1 : -1 };
}

function buildSearchFilter(q) {
  if (!q) return {};
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const safe = escapeRegExp(String(q).trim());
  return { name: { $regex: safe, $options: 'i' } };
}

// GET /api/cohorts
export const listCohorts = async (req, res) => {
  try {
    const { page = 1, limit = 10, q = '', status, startAcademicYear, ay } = req.query;
    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;
    const sort = parseSort(req);

    const filter = { ...buildSearchFilter(q) };
    if (status) filter.status = status;
    const ayId = ay || startAcademicYear;
    if (ayId) {
      if (!mongoose.isValidObjectId(ayId)) return res.status(400).json({ message: 'Invalid startAcademicYear' });
      filter.startAcademicYear = ayId;
    }

    // If sorting by AY label, use aggregation to sort by startAcademicYear.yearName
    const sortField = Object.keys(sort)[0];
    const sortDir = sort[sortField];
    if (['startAcademicYear', 'startAY', 'startYearName'].includes(sortField)) {
      const pipeline = [
        { $match: filter },
        { $lookup: { from: 'academicyears', localField: 'startAcademicYear', foreignField: '_id', as: 'startAcademicYear' } },
        { $unwind: '$startAcademicYear' },
        { $sort: { 'startAcademicYear.yearName': sortDir } },
        {
          $facet: {
            data: [ { $skip: skip }, { $limit: limitNum } ],
            totalCount: [ { $count: 'count' } ]
          }
        }
      ];
      const result = await Cohort.aggregate(pipeline);
      const data = result[0]?.data || [];
      const total = result[0]?.totalCount?.[0]?.count || 0;
      return res.json({
        data,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(Math.ceil(total / limitNum), 1),
          sortBy: sortField,
          sortDir: sortDir === 1 ? 'asc' : 'desc'
        }
      });
    }

    const [total, items] = await Promise.all([
      Cohort.countDocuments(filter),
      Cohort.find(filter)
        .populate('startAcademicYear', 'yearName')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      data: items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(Math.ceil(total / limitNum), 1),
        sortBy: Object.keys(sort)[0],
        sortDir: sort[Object.keys(sort)[0]] === 1 ? 'asc' : 'desc'
      }
    });
  } catch (err) {
    console.error('List cohorts error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/cohorts
export const createCohort = async (req, res) => {
  try {
    let { name, startAcademicYear, status = 'active' } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ message: 'name is required' });
    if (!startAcademicYear) return res.status(400).json({ message: 'startAcademicYear is required' });
    name = String(name).trim();
    const payload = { name, status };
    if (!mongoose.isValidObjectId(startAcademicYear)) return res.status(400).json({ message: 'Invalid startAcademicYear' });
    payload.startAcademicYear = startAcademicYear;

    // Enforce cohort count limit per academic year
    const existingCount = await Cohort.countDocuments({ startAcademicYear });
    if (existingCount >= MAX_COHORTS_PER_ACADEMIC_YEAR) {
      return res.status(409).json({
        message: `Maximum cohorts (${MAX_COHORTS_PER_ACADEMIC_YEAR}) already created for this Academic Year.`,
        code: 'COHORT_LIMIT_REACHED'
      });
    }
    let created;
    try {
      created = await Cohort.create(payload);
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: 'Cohort name already exists', code: 'DUPLICATE_COHORT_NAME' });
      throw err;
    }
    const populated = await Cohort.findById(created._id).populate('startAcademicYear', 'yearName');
    res.status(201).json(populated);
  } catch (err) {
    console.error('Create cohort error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/cohorts/:id
export const updateCohort = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const { name, startAcademicYear, status } = req.body || {};
    const doc = await Cohort.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    // If cohort already has enrollments, lock name & academic year (only status can change)
    const inUse = await Enrollment.countDocuments({ cohort: id });
    const locked = inUse > 0;

    if (name !== undefined) {
      if (locked && name !== doc.name) {
        return res.status(409).json({ message: 'Cannot change name; cohort already has enrollments.', code: 'COHORT_LOCKED_NAME' });
      }
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ message: 'name cannot be empty' });
      // check duplicate
      const dup = await Cohort.findOne({ name: trimmed, _id: { $ne: id } }).lean();
      if (dup) return res.status(409).json({ message: 'Cohort name already exists', code: 'DUPLICATE_COHORT_NAME' });
      doc.name = trimmed;
    }
    if (startAcademicYear !== undefined) {
      if (locked && String(startAcademicYear) !== String(doc.startAcademicYear)) {
        return res.status(409).json({ message: 'Cannot change academic year; cohort already has enrollments.', code: 'COHORT_LOCKED_YEAR' });
      }
      // do not allow clearing; it is required
      if (!startAcademicYear) return res.status(400).json({ message: 'startAcademicYear is required' });
      if (!mongoose.isValidObjectId(startAcademicYear)) return res.status(400).json({ message: 'Invalid startAcademicYear' });
      doc.startAcademicYear = startAcademicYear;
    }
    if (status !== undefined) {
      if (!['active', 'archived'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
      doc.status = status;
    }
    await doc.save();
    const populated = await Cohort.findById(doc._id).populate('startAcademicYear', 'yearName');
    res.json(populated);
  } catch (err) {
    console.error('Update cohort error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/cohorts/:id
export const deleteCohort = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const doc = await Cohort.findById(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    const enrCount = await Enrollment.countDocuments({ cohort: id });
    if (enrCount > 0) {
      return res.status(409).json({
        message: 'Cohort is in use by enrollments; cannot delete',
        code: 'COHORT_IN_USE',
        usage: { gradeSections: 0, enrollments: enrCount }
      });
    }

    await doc.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete cohort error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/cohorts/available
// Return cohorts that have at least one enrollment in the specified Academic Year + GradeSection
// or (Grade, Shift, Section) triple (fallback when gradeSectionId not supplied).
// Query params:
//   academicYear (required) ObjectId
//   gradeSectionId (preferred) OR grade + shift + section
//   status (optional) filter cohort.status
export const getAvailableCohortsForPromotion = async (req, res) => {
  try {
    const { academicYear, gradeSectionId, grade, shift, section, status } = req.query;
    if (!academicYear || !mongoose.isValidObjectId(academicYear)) {
      return res.status(400).json({ message: 'academicYear is required and must be a valid id' });
    }
    let gsIds = [];
    if (gradeSectionId) {
      if (!mongoose.isValidObjectId(gradeSectionId)) return res.status(400).json({ message: 'Invalid gradeSectionId' });
      gsIds = [gradeSectionId];
    } else if (grade && shift && section) {
      // Resolve GradeSection(s) by composite fields
      if (![grade, shift].every(id => mongoose.isValidObjectId(id))) {
        return res.status(400).json({ message: 'Invalid grade or shift id' });
      }
      const sections = await GradeSection.find({ grade: grade, shift: shift, section: section }).select('_id').lean();
      gsIds = sections.map(s => s._id);
      if (gsIds.length === 0) {
        return res.json({ data: [], meta: { total: 0 } });
      }
    } else {
      return res.status(400).json({ message: 'Provide gradeSectionId or grade+shift+section' });
    }

    const enrFilter = {
      academicYear: new mongoose.Types.ObjectId(academicYear),
      gradeSection: { $in: gsIds.map(id => new mongoose.Types.ObjectId(id)) },
      cohort: { $exists: true, $ne: null }
    };

    // Distinct cohort ids used in enrollments
    const cohortIds = await Enrollment.distinct('cohort', enrFilter);
    if (!cohortIds || cohortIds.length === 0) {
      return res.json({ data: [], meta: { total: 0 } });
    }

    const cFilter = { _id: { $in: cohortIds } };
    if (status) cFilter.status = status;
    const cohorts = await Cohort.find(cFilter).populate('startAcademicYear', 'yearName').sort({ name: 1 });
    res.json({ data: cohorts, meta: { total: cohorts.length } });
  } catch (err) {
    console.error('Get available cohorts error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
