import mongoose from 'mongoose';
import ExamType from '../models/ExamType.js';
import Exam from '../models/Exam.js';
import ExamScore from '../models/ExamScore.js';
import GradeSection from '../models/GradeSection.js';
import Enrollment from '../models/Enrollment.js';
import Student from '../models/Student.js';
import Subject from '../models/Subject.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import { publishRealtime } from '../utils/realtimeBus.js';

const isId = (id) => mongoose.isValidObjectId(id);

const parseTemplateVersion = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
};

async function getActiveTemplateVersion() {
  const active = await ExamType.findOne({ isActive: true }).sort({ templateVersion: -1 }).select('templateVersion').lean();
  if (active?.templateVersion) return Number(active.templateVersion);
  // Fallback if DB was seeded before versioning
  const any = await ExamType.findOne({}).sort({ templateVersion: -1 }).select('templateVersion').lean();
  return Number(any?.templateVersion || 1);
}

async function resolveTemplateVersion(requestedVersion) {
  const parsed = parseTemplateVersion(requestedVersion);
  if (parsed) return parsed;
  return await getActiveTemplateVersion();
}

async function resolveTemplateVersionForContext({ academicYearId, gradeSectionId, studentId, requestedVersion }) {
  const parsed = parseTemplateVersion(requestedVersion);
  if (parsed) return parsed;

  const ayOk = isId(academicYearId);
  const gsOk = isId(gradeSectionId);
  const stOk = !studentId ? false : isId(studentId);
  if (!ayOk || !gsOk) return await getActiveTemplateVersion();

  const ay = new mongoose.Types.ObjectId(academicYearId);
  const gs = new mongoose.Types.ObjectId(gradeSectionId);

  // 1) For a specific student, prefer the templateVersion that student actually has scores under.
  if (stOk) {
    const sid = new mongoose.Types.ObjectId(studentId);
    const agg = await ExamScore.aggregate([
      { $match: { student: sid } },
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'examDoc' } },
      { $unwind: '$examDoc' },
      { $match: { 'examDoc.academicYear': ay, 'examDoc.gradeSection': gs } },
      { $group: { _id: '$examDoc.templateVersion', scoreCount: { $sum: 1 } } },
      { $sort: { scoreCount: -1, _id: -1 } },
      { $limit: 1 }
    ]);
    if (agg?.[0]?._id) return Number(agg[0]._id);
  }

  // 2) For a class context, prefer the templateVersion with the most saved scores.
  const classAgg = await Exam.aggregate([
    { $match: { academicYear: ay, gradeSection: gs } },
    { $lookup: { from: 'examscores', localField: '_id', foreignField: 'exam', as: 'scores' } },
    { $addFields: { scoreCount: { $size: '$scores' } } },
    { $group: { _id: '$templateVersion', scoreCount: { $sum: '$scoreCount' }, examsCount: { $sum: 1 } } },
    { $sort: { scoreCount: -1, examsCount: -1, _id: -1 } },
    { $limit: 1 }
  ]);
  if (classAgg?.[0]?._id) return Number(classAgg[0]._id);

  // 3) If there are exams but no scores, use the latest templateVersion present for that AY+Section.
  const anyExam = await Exam.findOne({ academicYear: ay, gradeSection: gs }).sort({ templateVersion: -1 }).select('templateVersion').lean();
  if (anyExam?.templateVersion) return Number(anyExam.templateVersion);

  // 4) Ultimate fallback: active
  return await getActiveTemplateVersion();
}

async function getTemplateComponents(version) {
  // Prefer filtering by version (explicit), and keep stable order.
  const comps = await ExamType.find({ templateVersion: version })
    .select('_id typeName maxScore templateTotal order templateVersion isActive')
    .sort({ order: 1, typeName: 1 })
    .lean();
  return comps;
}

async function getScoreStateForTemplateVersion(version) {
  // Determine whether this template version has any saved ExamScores, and which components (examTypeIds) have scores.
  const exams = await Exam.find({ templateVersion: version }).select('_id examType').lean();
  const examIds = exams.map(e => e._id);
  if (!examIds.length) return { hasAnyScores: false, examTypeIdsWithScores: new Set() };

  const scoredExamIds = await ExamScore.aggregate([
    { $match: { exam: { $in: examIds } } },
    { $group: { _id: '$exam' } }
  ]);
  if (!scoredExamIds.length) return { hasAnyScores: false, examTypeIdsWithScores: new Set() };

  const scoredSet = new Set(scoredExamIds.map(r => String(r._id)));
  const examTypeIdsWithScores = new Set();
  for (const ex of exams) {
    if (scoredSet.has(String(ex._id))) {
      examTypeIdsWithScores.add(String(ex.examType));
    }
  }
  return { hasAnyScores: examTypeIdsWithScores.size > 0, examTypeIdsWithScores };
}

function validateComponentPayload(body = {}) {
  const typeName = String(body.typeName || '').trim();
  const maxScore = Number(body.maxScore);
  const order = Number(body.order);
  if (!typeName) return { ok: false, message: 'typeName is required' };
  if (!Number.isFinite(maxScore) || maxScore <= 0) return { ok: false, message: 'maxScore must be > 0' };
  if (!Number.isFinite(order) || order <= 0) return { ok: false, message: 'order must be > 0' };
  return { ok: true, typeName, maxScore, order };
}

async function computeTemplateTotals(version) {
  const comps = await getTemplateComponents(version);
  const sumMaxScore = comps.reduce((a, c) => a + (Number(c.maxScore) || 0), 0);
  const templateTotal = Number(comps?.[0]?.templateTotal || 100);
  const isActive = comps.some(c => c.isActive);
  return { comps, sumMaxScore, templateTotal, isActive };
}

export const getExamTypes = async (req, res) => {
  try {
    const allVersions = String(req.query?.allVersions || '').toLowerCase();
    if (allVersions === '1' || allVersions === 'true') {
      const types = await ExamType.find({}).sort({ templateVersion: -1, order: 1, typeName: 1 }).lean();
      return res.json(types);
    }

    const version = await resolveTemplateVersionForContext({
      academicYearId: req.query?.academicYearId,
      gradeSectionId: req.query?.gradeSectionId,
      requestedVersion: req.query?.templateVersion,
    });
    const types = await getTemplateComponents(version);
    res.json(types);
  } catch (err) {
    console.error('getExamTypes error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/exams/template/versions
// Response: { activeVersion, versions: [{ templateVersion, isActive, total, componentsCount }] }
export const getExamTemplateVersions = async (req, res) => {
  try {
    const activeVersion = await getActiveTemplateVersion();
    const agg = await ExamType.aggregate([
      {
        $group: {
          _id: '$templateVersion',
          componentsCount: { $sum: 1 },
          total: { $sum: '$maxScore' },
          hasActive: { $max: { $cond: ['$isActive', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const versions = agg.map(v => ({
      templateVersion: v._id,
      isActive: Boolean(v.hasActive) && Number(v._id) === Number(activeVersion),
      total: Number(v.total || 0),
      componentsCount: Number(v.componentsCount || 0)
    }));
    res.json({ activeVersion, versions });
  } catch (err) {
    console.error('getExamTemplateVersions error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/exams/template/detail
// Query: templateVersion?
// Response: { templateVersion, isActive, templateTotal, sumMaxScore, components: [] }
export const getExamTemplateDetail = async (req, res) => {
  try {
    const version = await resolveTemplateVersion(req.query?.templateVersion);
    const { comps, sumMaxScore, templateTotal, isActive } = await computeTemplateTotals(version);
    if (!comps.length) return res.status(404).json({ message: 'Template not found' });

    const scoreState = await getScoreStateForTemplateVersion(version);
    const components = comps.map(c => ({
      ...c,
      hasScores: scoreState.examTypeIdsWithScores.has(String(c._id))
    }));
    res.json({ templateVersion: version, isActive, templateTotal, sumMaxScore, hasScores: scoreState.hasAnyScores, components });
  } catch (err) {
    console.error('getExamTemplateDetail error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// PUT /api/exams/template/total
// Body: { templateVersion, templateTotal }
export const setExamTemplateTotal = async (req, res) => {
  try {
    const version = parseTemplateVersion(req.body?.templateVersion);
    const templateTotal = Number(req.body?.templateTotal);
    if (!version) return res.status(400).json({ message: 'templateVersion is required' });
    if (!Number.isFinite(templateTotal) || templateTotal <= 0) return res.status(400).json({ message: 'templateTotal must be > 0' });

    const exists = await ExamType.countDocuments({ templateVersion: version });
    if (!exists) return res.status(404).json({ message: 'Template not found' });

    const scoreState = await getScoreStateForTemplateVersion(version);
    if (scoreState.hasAnyScores) {
      return res.status(409).json({ message: 'This template already has saved scores and is locked. Total cannot be edited.' });
    }

    const detailBefore = await computeTemplateTotals(version);
    if (detailBefore.sumMaxScore > templateTotal) {
      return res.status(409).json({ message: `Total cannot be less than sum of max scores (${detailBefore.sumMaxScore})` });
    }

    await ExamType.updateMany({ templateVersion: version }, { $set: { templateTotal } });
    const detail = await computeTemplateTotals(version);
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.json({ templateVersion: version, templateTotal, sumMaxScore: detail.sumMaxScore, isActive: detail.isActive });
  } catch (err) {
    console.error('setExamTemplateTotal error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/exams/template/component
// Body: { templateVersion, typeName, maxScore, order }
export const createExamTemplateComponent = async (req, res) => {
  try {
    const version = parseTemplateVersion(req.body?.templateVersion);
    if (!version) return res.status(400).json({ message: 'templateVersion is required' });

    const exists = await ExamType.countDocuments({ templateVersion: version });
    if (!exists) return res.status(404).json({ message: 'Template not found' });

    // Guard: do NOT allow adding new columns to a version that already has saved scores.
    // Rationale: it changes the structure of historical data and implies backfilling scores.
    const scoreState = await getScoreStateForTemplateVersion(version);
    if (scoreState.hasAnyScores) {
      return res.status(409).json({ message: 'Cannot add a new column to this template because it already has saved scores. Please create a new template instead.' });
    }

    const validated = validateComponentPayload(req.body);
    if (!validated.ok) return res.status(400).json({ message: validated.message });

    const duplicateOrder = await ExamType.exists({ templateVersion: version, order: validated.order });
    if (duplicateOrder) return res.status(409).json({ message: 'Order must be unique within this template' });

    const templateTotal = Number(req.body?.templateTotal);
    // If caller passes templateTotal, apply it to all components; else keep existing.
    if (Number.isFinite(templateTotal) && templateTotal > 0) {
      await ExamType.updateMany({ templateVersion: version }, { $set: { templateTotal } });
    }
    const first = await ExamType.findOne({ templateVersion: version }).select('templateTotal').lean();
    const templateTotalEffective = Number(first?.templateTotal || 100);
    const detailBefore = await computeTemplateTotals(version);
    if (detailBefore.sumMaxScore + validated.maxScore > templateTotalEffective) {
      return res.status(409).json({ message: 'Sum of max scores cannot exceed the declared total' });
    }

    const created = await ExamType.create({
      templateVersion: version,
      typeName: validated.typeName,
      maxScore: validated.maxScore,
      order: validated.order,
      templateTotal: Number(first?.templateTotal || 100),
      isActive: false,
    });

    const detail = await computeTemplateTotals(version);
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.status(201).json({ component: created, sumMaxScore: detail.sumMaxScore, templateTotal: detail.templateTotal });
  } catch (err) {
    console.error('createExamTemplateComponent error', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate component name in this template' });
    res.status(500).json({ message: 'Server Error' });
  }
};

// DELETE /api/exams/template/component/:id
export const deleteExamTemplateComponent = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid component id' });

    const current = await ExamType.findById(id).select('_id templateVersion isActive').lean();
    if (!current) return res.status(404).json({ message: 'Component not found' });

    const remaining = await ExamType.countDocuments({ templateVersion: current.templateVersion });
    if (remaining <= 1) {
      return res.status(409).json({ message: 'Cannot delete the last column of a template. Delete the template instead.' });
    }

    const scoreState = await getScoreStateForTemplateVersion(current.templateVersion);
    if (scoreState.examTypeIdsWithScores.has(String(current._id))) {
      return res.status(409).json({ message: 'Cannot delete this column because it already has saved scores.' });
    }

    // Safe to delete: remove Exams for this component + version (scores are guaranteed none).
    await Exam.deleteMany({ examType: current._id, templateVersion: current.templateVersion });
    await ExamType.deleteOne({ _id: current._id });

    const detail = await computeTemplateTotals(current.templateVersion);
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.json({ message: 'Deleted', templateVersion: current.templateVersion, sumMaxScore: detail.sumMaxScore, templateTotal: detail.templateTotal });
  } catch (err) {
    console.error('deleteExamTemplateComponent error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// DELETE /api/exams/template/version/:templateVersion
export const deleteExamTemplateVersion = async (req, res) => {
  try {
    const version = parseTemplateVersion(req.params?.templateVersion);
    if (!version) return res.status(400).json({ message: 'Invalid templateVersion' });

    const exists = await ExamType.countDocuments({ templateVersion: version });
    if (!exists) return res.status(404).json({ message: 'Template not found' });

    const anyActive = await ExamType.exists({ templateVersion: version, isActive: true });
    if (anyActive) {
      return res.status(409).json({ message: 'Cannot delete the default (active) template. Set another template as default first.' });
    }

    const versions = await ExamType.distinct('templateVersion');
    if (Array.isArray(versions) && versions.length <= 1) {
      return res.status(409).json({ message: 'Cannot delete the last remaining template.' });
    }

    const scoreState = await getScoreStateForTemplateVersion(version);
    if (scoreState.hasAnyScores) {
      return res.status(409).json({ message: 'Cannot delete this template because it already has saved scores.' });
    }

    // Safe to delete: remove Exams for this version (scores are guaranteed none), then remove template components.
    await Exam.deleteMany({ templateVersion: version });
    await ExamType.deleteMany({ templateVersion: version });
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.json({ message: 'Deleted version', templateVersion: version });
  } catch (err) {
    console.error('deleteExamTemplateVersion error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// PUT /api/exams/template/component/:id
// Body: { typeName, maxScore, order }
export const updateExamTemplateComponent = async (req, res) => {
  try {
    const id = req.params?.id;
    if (!isId(id)) return res.status(400).json({ message: 'Invalid component id' });

    const current = await ExamType.findById(id).select('_id templateVersion typeName maxScore order templateTotal').lean();
    if (!current) return res.status(404).json({ message: 'Component not found' });

    const scoreState = await getScoreStateForTemplateVersion(current.templateVersion);
    if (scoreState.hasAnyScores) {
      return res.status(409).json({ message: 'This template already has saved scores and is locked. Columns cannot be edited.' });
    }

    const validated = validateComponentPayload({
      typeName: req.body?.typeName ?? current.typeName,
      maxScore: req.body?.maxScore ?? current.maxScore,
      order: req.body?.order ?? current.order,
    });
    if (!validated.ok) return res.status(400).json({ message: validated.message });

    const duplicateOrder = await ExamType.exists({ templateVersion: current.templateVersion, order: validated.order, _id: { $ne: current._id } });
    if (duplicateOrder) return res.status(409).json({ message: 'Order must be unique within this template' });

    // Prevent exceeding declared total
    const others = await ExamType.find({ templateVersion: current.templateVersion, _id: { $ne: current._id } }).select('maxScore').lean();
    const otherSum = (others || []).reduce((sum, r) => sum + (Number(r?.maxScore) || 0), 0);
    const total = Number(current.templateTotal || 100);
    if (otherSum + validated.maxScore > total) {
      return res.status(409).json({ message: 'Sum of max scores cannot exceed the declared total' });
    }

    // Safety: if lowering maxScore, ensure no existing score exceeds the new max.
    const newMax = validated.maxScore;
    if (Number.isFinite(newMax) && Number(newMax) < Number(current.maxScore)) {
      const exams = await Exam.find({ examType: current._id, templateVersion: current.templateVersion }).select('_id').lean();
      const examIds = exams.map(e => e._id);
      if (examIds.length) {
        const anyTooHigh = await ExamScore.exists({ exam: { $in: examIds }, scoreObtained: { $gt: newMax } });
        if (anyTooHigh) {
          return res.status(409).json({ message: 'Cannot lower maxScore below existing saved scores for this component' });
        }
      }
    }

    const updated = await ExamType.findByIdAndUpdate(
      id,
      { $set: { typeName: validated.typeName, maxScore: validated.maxScore, order: validated.order } },
      { new: true }
    ).lean();

    const detail = await computeTemplateTotals(current.templateVersion);
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.json({ component: updated, sumMaxScore: detail.sumMaxScore, templateTotal: detail.templateTotal });
  } catch (err) {
    console.error('updateExamTemplateComponent error', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate component name in this template' });
    res.status(500).json({ message: 'Server Error' });
  }
};

// POST /api/exams/template/clone
// Body: { fromVersion? }
// Response: { templateVersion, components }
export const cloneExamTemplateVersion = async (req, res) => {
  try {
    const fromVersion = await resolveTemplateVersion(req.body?.fromVersion);
    const baseComponents = await getTemplateComponents(fromVersion);
    if (!baseComponents.length) return res.status(404).json({ message: 'Base template not found' });

    const maxDoc = await ExamType.findOne({}).sort({ templateVersion: -1 }).select('templateVersion').lean();
    const nextVersion = Number(maxDoc?.templateVersion || 1) + 1;

    const docs = baseComponents.map((c) => ({
      typeName: c.typeName,
      templateVersion: nextVersion,
      maxScore: Number(c.maxScore || 0) || 0,
      templateTotal: Number(c.templateTotal || 100) || 100,
      order: Number(c.order || 0) || 0,
      isActive: false,
    }));

    const created = await ExamType.insertMany(docs, { ordered: true });
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.status(201).json({ templateVersion: nextVersion, components: created });
  } catch (err) {
    console.error('cloneExamTemplateVersion error', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate exam type in template version' });
    res.status(500).json({ message: 'Server Error' });
  }
};

// PUT /api/exams/template/active
// Body: { templateVersion }
export const setActiveExamTemplateVersion = async (req, res) => {
  try {
    const version = parseTemplateVersion(req.body?.templateVersion);
    if (!version) return res.status(400).json({ message: 'templateVersion is required' });

    const exists = await ExamType.countDocuments({ templateVersion: version });
    if (!exists) return res.status(404).json({ message: 'Template not found' });

    // Validate totals before allowing activation
    const detail = await computeTemplateTotals(version);
    if (detail.sumMaxScore !== detail.templateTotal) {
      return res.status(409).json({ message: `Cannot activate: sum of max scores (${detail.sumMaxScore}) must equal template total (${detail.templateTotal})` });
    }

    await ExamType.updateMany({ isActive: true }, { $set: { isActive: false } });
    await ExamType.updateMany({ templateVersion: version }, { $set: { isActive: true } });
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.json({ message: 'Active template updated', activeVersion: version });
  } catch (err) {
    console.error('setActiveExamTemplateVersion error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// GET /api/exams/has-scores
// Query: gradeSectionId (required), academicYearId? (optional filter), subjectIds? (comma-separated)
// Response: { map: { [subjectId]: boolean } }
export const hasScores = async (req, res) => {
  try {
    const { gradeSectionId, academicYearId, subjectIds, templateVersion } = req.query || {};
    if (!gradeSectionId || !mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'gradeSectionId is required' });
    }

    const version = await resolveTemplateVersion(templateVersion);

    // Validate grade section exists (helps avoid silent errors)
    const gs = await GradeSection.findById(gradeSectionId).select('_id subjects').lean();
    if (!gs) return res.status(404).json({ message: 'GradeSection not found' });

    // Determine subject list to check
    let subjectsToCheck = [];
    if (typeof subjectIds === 'string' && subjectIds.trim()) {
      subjectsToCheck = subjectIds.split(',').map(s => s.trim()).filter(s => mongoose.isValidObjectId(s));
    }
    if (!subjectsToCheck.length) {
      subjectsToCheck = (gs.subjects || []).map(s => String(s));
    }
    if (!subjectsToCheck.length) return res.json({ map: {} });

    // Exams for gradeSection (and optional AY)
    const examQuery = { gradeSection: gradeSectionId, templateVersion: version };
    if (academicYearId && mongoose.isValidObjectId(academicYearId)) examQuery.academicYear = academicYearId;
    const exams = await Exam.find(examQuery).select('_id').lean();
    const examIds = exams.map(e => e._id);
    if (!examIds.length) {
      // No exams → definitely no scores
      const emptyMap = Object.fromEntries(subjectsToCheck.map(id => [String(id), false]));
      return res.json({ map: emptyMap });
    }

    // Aggregate scores grouped by subject
    const agg = await ExamScore.aggregate([
      { $match: { exam: { $in: examIds }, subject: { $in: subjectsToCheck.map(id => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: '$subject', count: { $sum: 1 } } }
    ]);
    const withScores = new Set(agg.map(a => String(a._id)));
    const map = Object.fromEntries(subjectsToCheck.map(id => [String(id), withScores.has(String(id))]));
    res.json({ map });
  } catch (err) {
    console.error('hasScores error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const ensureExams = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId, templateVersion } = req.body;
    if (!isId(academicYearId) || !isId(gradeSectionId)) {
      return res.status(400).json({ message: 'academicYearId and gradeSectionId are required' });
    }

    const version = await resolveTemplateVersion(templateVersion);

    const types = await getTemplateComponents(version);
    const ops = types.map((t) => (
      Exam.updateOne(
        { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version },
        { $setOnInsert: { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version } },
        { upsert: true }
      )
    ));
    await Promise.all(ops);

    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version })
      .populate('examType', 'typeName maxScore order templateVersion')
      .lean();
    publishRealtime({ type: 'exams:changed', ts: Date.now() });
    res.json(exams.map(e => ({
      examId: e._id,
      examTypeId: e.examType?._id || e.examType,
      typeName: e.examType?.typeName,
      maxScore: e.examType?.maxScore,
      order: e.examType?.order,
      templateVersion: version,
    })));
  } catch (err) {
    console.error('ensureExams error', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate exam combination' });
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getExamGrid = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId, subjectId, enrollmentStatus, cohortId, templateVersion } = req.query;
    if (!isId(academicYearId) || !isId(gradeSectionId) || !isId(subjectId)) {
      return res.status(400).json({ message: 'academicYearId, gradeSectionId and subjectId are required' });
    }

    const version = await resolveTemplateVersion(templateVersion);

    // Ensure exams exist for the given AY + section
    const types = await getTemplateComponents(version);
    const ensureOps = types.map((t) => (
      Exam.updateOne(
        { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version },
        { $setOnInsert: { examType: t._id, academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version } },
        { upsert: true }
      )
    ));
    await Promise.all(ensureOps);

    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version })
      .populate('examType', 'typeName maxScore order templateVersion')
      .lean();
    const columns = exams
      .map(e => ({
        examId: e._id,
        examTypeId: e.examType?._id || e.examType,
        typeName: e.examType?.typeName,
        maxScore: e.examType?.maxScore,
        order: e.examType?.order,
        templateVersion: version,
      }))
      .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || String(a.typeName || '').localeCompare(String(b.typeName || '')));

    // Determine statuses to include based on filter (default active only)
    let statusFilter = ['active'];
    if (enrollmentStatus === 'all') {
      statusFilter = ['active','inactive','promoted','graduated','transferred','withdrawn'];
    } else if (enrollmentStatus && ['active','inactive','promoted','graduated','transferred','withdrawn'].includes(enrollmentStatus)) {
      statusFilter = [enrollmentStatus];
    }
    const enrQuery = { academicYear: academicYearId, gradeSection: gradeSectionId, status: { $in: statusFilter } };
    if (cohortId && isId(cohortId)) enrQuery.cohort = cohortId;
    const enrolls = await Enrollment.find(enrQuery).select('student').lean();
    const studentIds = [...new Set(enrolls.map(e => String(e.student)))];
    const studentsDocs = await Student.find({ _id: { $in: studentIds } }).select('fullName').lean();
    const students = studentsDocs
      .map(s => ({ studentId: s._id, fullName: s.fullName }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    const examIds = exams.map(e => e._id);
    const scores = await ExamScore.find({ subject: subjectId, exam: { $in: examIds }, student: { $in: studentIds } })
      .select('student exam subject scoreObtained')
      .lean();

    // Integrity guard: for the same AY+Section+Subject, a student must not have scores across multiple template versions.
    // Return locked studentIds that already have scores in other versions.
    let lockedStudents = [];
    let lockedStudentVersions = {};
    if (studentIds.length) {
      const otherExams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: { $ne: version } })
        .select('_id templateVersion')
        .lean();
      const otherExamIds = otherExams.map(e => e._id);
      if (otherExamIds.length) {
        const examIdToVersion = new Map(otherExams.map(e => [String(e._id), Number(e.templateVersion || 0)]));
        const locked = await ExamScore.aggregate([
          {
            $match: {
              subject: new mongoose.Types.ObjectId(subjectId),
              exam: { $in: otherExamIds },
              student: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }
            }
          },
          { $group: { _id: '$student', exams: { $addToSet: '$exam' } } }
        ]);

        lockedStudents = locked.map(r => String(r._id));
        lockedStudentVersions = Object.fromEntries(
          locked.map((r) => {
            const versions = Array.from(new Set(
              (r.exams || [])
                .map(exId => examIdToVersion.get(String(exId)))
                .filter(v => Number.isFinite(v) && v > 0)
            )).sort((a, b) => a - b);
            return [String(r._id), versions];
          })
        );
      }
    }

    res.json({ students, columns, scores, lockedStudents, lockedStudentVersions, templateVersion: version });
  } catch (err) {
    console.error('getExamGrid error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const upsertScore = async (req, res) => {
  try {
    const { studentId, examId, subjectId, scoreObtained } = req.body || {};
    if (!isId(studentId) || !isId(examId) || !isId(subjectId)) {
      return res.status(400).json({ message: 'studentId, examId, subjectId are required' });
    }
    const scoreNum = Number(scoreObtained);
    if (!Number.isFinite(scoreNum) || scoreNum < 0) {
      return res.status(400).json({ message: 'scoreObtained must be a valid number >= 0' });
    }

    const exam = await Exam.findById(examId).lean();
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Teacher scope: must be assigned to this class+subject.
    if (req.user?.role === 'teacher') {
      const teacherId = req.user?.teacherRef;
      if (!teacherId || !isId(teacherId)) {
        return res.status(403).json({ message: 'Teacher account is missing teacherRef' });
      }
      const has = await TeacherAssignment.exists({
        teacher: teacherId,
        gradeSection: exam.gradeSection,
        subject: subjectId,
      });
      if (!has) return res.status(403).json({ message: 'Not assigned to this class/subject' });
    }

    // Integrity guard: prevent saving scores for same student+subject across multiple template versions in same AY+Section.
    const otherExams = await Exam.find({
      academicYear: exam.academicYear,
      gradeSection: exam.gradeSection,
      templateVersion: { $ne: exam.templateVersion }
    }).select('_id templateVersion').lean();
    if (otherExams.length) {
      const otherExamIds = otherExams.map(e => e._id);
      const existsOther = await ExamScore.exists({ student: studentId, subject: subjectId, exam: { $in: otherExamIds } });
      if (existsOther) {
        const otherVersions = Array.from(new Set(otherExams.map(e => Number(e.templateVersion || 0)).filter(v => Number.isFinite(v) && v > 0))).sort((a, b) => a - b);
        return res.status(409).json({
          message: 'This student already has scores saved under another exam template version for this subject. Please switch to that version.',
          otherVersions
        });
      }
    }

    // Resolve maxScore for this exam component
    const examType = await ExamType.findById(exam.examType).select('maxScore').lean();
    const maxScore = Number(examType?.maxScore);
    const limit = Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100;
    if (scoreNum > limit) {
      return res.status(400).json({ message: `scoreObtained must be between 0 and ${limit}` });
    }

    // coherence: student must have an enrollment (any status) in same AY + section
    const enrollment = await Enrollment.findOne({ student: studentId, academicYear: exam.academicYear, gradeSection: exam.gradeSection }).lean();
    if (!enrollment) return res.status(409).json({ message: 'Student has no enrollment for this section/year' });

    const updated = await ExamScore.findOneAndUpdate(
      { student: studentId, exam: examId, subject: subjectId },
      { $set: { scoreObtained: scoreNum } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    // Scores affect Results + Transcript.
    publishRealtime({ type: 'results:changed', ts: Date.now() });
    publishRealtime({ type: 'transcript:changed', ts: Date.now() });
    res.json({ message: 'Saved', score: updated });
  } catch (err) {
    console.error('upsertScore error', err);
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate score combination' });
    res.status(500).json({ message: 'Server Error' });
  }
};

// Basic subject summary (rank per subject). Overall summary will be expanded on the Result page.
export const getSummary = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId, enrollmentStatus, cohortId, templateVersion } = req.query;
    if (!isId(academicYearId) || !isId(gradeSectionId)) {
      return res.status(400).json({ message: 'academicYearId and gradeSectionId are required' });
    }

    const version = await resolveTemplateVersionForContext({ academicYearId, gradeSectionId, requestedVersion: templateVersion });

    const mode = (req.query.mode || 'subject').toLowerCase();
    const subjectId = req.query.subjectId && isId(req.query.subjectId) ? req.query.subjectId : null;
    const examTypeId = req.query.examTypeId && isId(req.query.examTypeId) ? req.query.examTypeId : null;
    const topN = req.query.topN ? Math.max(parseInt(req.query.topN) || 0, 0) : 0;
    const bottomN = req.query.bottomN ? Math.max(parseInt(req.query.bottomN) || 0, 0) : 0;

    // Common set: exams
    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version }).select('_id examType').lean();
    const examIds = exams.map(e => e._id);
    if (!examIds.length) return res.json({ results: [], classAverage: 0, templateVersion: version });

    const examIdToTypeId = Object.fromEntries(exams.map(e => [String(e._id), String(e.examType)]));

    // Determine statuses (default active)
    let statusFilter = ['active'];
    if (enrollmentStatus === 'all') {
      statusFilter = ['active','inactive','promoted','graduated','transferred','withdrawn'];
    } else if (enrollmentStatus && ['active','inactive','promoted','graduated','transferred','withdrawn'].includes(enrollmentStatus)) {
      statusFilter = [enrollmentStatus];
    }
    const enrollQuery = { academicYear: academicYearId, gradeSection: gradeSectionId, status: { $in: statusFilter } };
    if (cohortId && isId(cohortId)) enrollQuery.cohort = cohortId;
    const enrolls = await Enrollment.find(enrollQuery).select('student').lean();
    const studentIds = [...new Set(enrolls.map(e => String(e.student)))];
    if (!studentIds.length) return res.json({ results: [], classAverage: 0, templateVersion: version });

    const studentsDocs = await Student.find({ _id: { $in: studentIds } }).select('fullName').lean();
    const nameMap = Object.fromEntries(studentsDocs.map(s => [String(s._id), s.fullName]));

  let pipelineMatch = { exam: { $in: examIds }, student: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) } };
  let denomPerStudent = null; // for averages per mode
  let subjectIdsForReport = [];

    if (mode === 'subject') {
      if (!subjectId) {
        return res.status(400).json({ message: 'subjectId is required for mode=subject' });
      }
      pipelineMatch = { ...pipelineMatch, subject: new mongoose.Types.ObjectId(subjectId) };
      // For breakdown columns, limit to just this subject
      subjectIdsForReport = [new mongoose.Types.ObjectId(subjectId)];
      // Average for subject mode will equal the subject total (weights sum to 100)
      denomPerStudent = { type: 'subjects', count: 1 };
    } else if (mode === 'overall') {
      // include all subjects assigned to this gradeSection
      const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
      const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      if (!subjectIds.length) return res.json({ results: [], classAverage: 0, subjects: [], templateVersion: version });
      pipelineMatch = { ...pipelineMatch, subject: { $in: subjectIds } };
      // denominator = number of subjects included (constant across students)
      var subjectsCount = subjectIds.length; // var so closure picks it below
      denomPerStudent = { type: 'subjects', count: subjectsCount };
      subjectIdsForReport = subjectIds;
  } else if (mode === 'examtype' || mode === 'exam-type') {
      if (!examTypeId) return res.status(400).json({ message: 'examTypeId is required for mode=examType' });
      const examIdsForType = exams.filter(e => String(e.examType) === String(examTypeId)).map(e => e._id);
      if (!examIdsForType.length) return res.json({ results: [], classAverage: 0, subjects: [], templateVersion: version });
      pipelineMatch = { ...pipelineMatch, exam: { $in: examIdsForType } };
      if (subjectId) {
        pipelineMatch = { ...pipelineMatch, subject: new mongoose.Types.ObjectId(subjectId) };
        subjectIdsForReport = [new mongoose.Types.ObjectId(subjectId)];
      } else {
        const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
        subjectIdsForReport = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      }
      // if subject provided, denom = 1 subject; else denom = number of subjects assigned
      if (subjectId) {
        denomPerStudent = { type: 'subjects', count: 1 };
      } else {
        const subjectsCount = subjectIdsForReport?.length || 0;
        denomPerStudent = { type: 'subjects', count: subjectsCount || 1 };
      }
    } else {
      // other modes handled after common guards below
    }

    // Handle special modes that need different pipelines early
    if (mode === 'trend') {
      // Trend: Mid vs Final totals per student (optionally per specific subject or across all assigned subjects)
      const types = await ExamType.find({ templateVersion: version }).select('_id typeName').lean();
      const midType = types.find(t => /mid/i.test(t.typeName || ''));
      const finalType = types.find(t => /final/i.test(t.typeName || ''));
      if (!midType || !finalType) return res.json({ results: [], classAverage: 0, templateVersion: version });
      const midExamIds = exams.filter(e => String(e.examType) === String(midType._id)).map(e => e._id);
      const finalExamIds = exams.filter(e => String(e.examType) === String(finalType._id)).map(e => e._id);
      if (!midExamIds.length && !finalExamIds.length) return res.json({ results: [], classAverage: 0, templateVersion: version });

      let subIds = [];
      if (subjectId) {
        subIds = [new mongoose.Types.ObjectId(subjectId)];
      } else {
        const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
        subIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      }
      if (!subIds.length) return res.json({ results: [], classAverage: 0, templateVersion: version });

      const baseMatch = { student: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }, subject: { $in: subIds } };
      const midAgg = await ExamScore.aggregate([
        { $match: { ...baseMatch, exam: { $in: midExamIds } } },
        { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
      ]);
      const finalAgg = await ExamScore.aggregate([
        { $match: { ...baseMatch, exam: { $in: finalExamIds } } },
        { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } }
      ]);
      const midMap = Object.fromEntries(midAgg.map(r => [String(r._id), r.total]));
      const finalMap = Object.fromEntries(finalAgg.map(r => [String(r._id), r.total]));

      let results = studentIds.map(sid => {
        const mid = Number(midMap[sid] || 0);
        const fin = Number(finalMap[sid] || 0);
        const delta = fin - mid;
        return { studentId: sid, fullName: nameMap[sid] || 'Student', mid, final: fin, delta };
      });
      results = results.sort((a, b) => b.delta - a.delta).map((r, i) => ({ ...r, rank: i + 1 }));
      const classAverage = results.length ? (results.reduce((a, b) => a + b.delta, 0) / results.length) : 0;
      return res.json({ results, classAverage, subjects: [] });
    }

    if (mode === 'difficulty') {
      // Difficulty: class average per subject (across assigned subjects), irrespective of exam type
      const gs = await (await import('../models/GradeSection.js')).default.findById(gradeSectionId).select('subjects').lean();
      const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
      if (!subjectIds.length) return res.json({ results: [], classAverage: 0, subjects: [], templateVersion: version });
      const baseMatch = { exam: { $in: examIds }, student: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) }, subject: { $in: subjectIds } };
      // First, per-student totals per subject
      const perStuSub = await ExamScore.aggregate([
        { $match: baseMatch },
        { $group: { _id: { student: '$student', subject: '$subject' }, total: { $sum: '$scoreObtained' } } }
      ]);
      // Then average per subject (mean across students who have scores)
      const perSubGroups = new Map(); // subjectId -> { sum, count }
      for (const row of perStuSub) {
        const sub = String(row._id.subject);
        const ent = perSubGroups.get(sub) || { sum: 0, count: 0 };
        ent.sum += Number(row.total || 0);
        ent.count += 1;
        perSubGroups.set(sub, ent);
      }
      const subDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
      const nameMapSub = Object.fromEntries(subDocs.map(s => [String(s._id), s.subjectName]));
      const subjects = subjectIds.map(id => {
        const key = String(id);
        const { sum = 0, count = 0 } = perSubGroups.get(key) || {};
        const average = count ? sum / count : 0;
        return { _id: id, subjectName: nameMapSub[key] || 'Subject', average, count };
      });
      // ClassAverage here could be mean of subject averages (optional); we keep it simple
      const classAverage = subjects.length ? (subjects.reduce((a, b) => a + b.average, 0) / subjects.length) : 0;
      return res.json({ results: [], classAverage, subjects });
    }

    // 1) Per-subject totals per student (default aggregation path)
    const perSubject = await ExamScore.aggregate([
      { $match: pipelineMatch },
      { $group: { _id: { student: '$student', subject: '$subject' }, total: { $sum: '$scoreObtained' } } }
    ]);

    // 2) Build subject meta (id + name) in stable order
    let subjectMeta = [];
    if (subjectIdsForReport && subjectIdsForReport.length) {
      const subDocs = await Subject.find({ _id: { $in: subjectIdsForReport } }).select('subjectName').lean();
      const nameMapSub = Object.fromEntries(subDocs.map(s => [String(s._id), s.subjectName]));
      subjectMeta = subjectIdsForReport.map(id => ({ _id: id, subjectName: nameMapSub[String(id)] || 'Subject' }));
    }

    // 3) Index per-subject totals
    const perMap = new Map(); // key: studentId -> Map(subjectId -> total)
    for (const row of perSubject) {
      const sid = String(row._id.student);
      const sub = String(row._id.subject);
      let inner = perMap.get(sid);
      if (!inner) { inner = new Map(); perMap.set(sid, inner); }
      inner.set(sub, row.total || 0);
    }

    // 4) Build scores grouped only by student (for totals)
    const scores = await ExamScore.aggregate([
      { $match: pipelineMatch },
      { $group: { _id: '$student', total: { $sum: '$scoreObtained' }, examCount: { $sum: 1 } } }
    ]);

    // 4b) For subject/overall modes, also build totals per template column (examType) per student.
    // This enables Results(subject) to show dynamic template columns (e.g. Assignment/Quiz/etc).
    let examTypeTotalsByStudent = null;
    if (mode === 'overall' || mode === 'subject') {
      const perStuExam = await ExamScore.aggregate([
        { $match: pipelineMatch },
        { $group: { _id: { student: '$student', exam: '$exam' }, total: { $sum: '$scoreObtained' } } }
      ]);
      examTypeTotalsByStudent = new Map();
      for (const row of perStuExam) {
        const sid = String(row?._id?.student);
        const examId = String(row?._id?.exam);
        const etId = examIdToTypeId[examId];
        if (!sid || !etId) continue;
        let inner = examTypeTotalsByStudent.get(sid);
        if (!inner) {
          inner = {};
          examTypeTotalsByStudent.set(sid, inner);
        }
        inner[etId] = Number(inner[etId] || 0) + Number(row.total || 0);
      }
    }

    // Build results
    let results = scores.map(s => {
      const sid = String(s._id);
      let avg = 0;
      if (denomPerStudent?.type === 'subjects') {
        const d = denomPerStudent.count || 1;
        avg = d ? (s.total / d) : 0;
      }
      // subjectScores array in the order of subjectMeta
      const subjectScores = subjectMeta.map(sm => ({ subjectId: sm._id, total: (perMap.get(sid)?.get(String(sm._id)) ?? 0) }));
      const examTypeTotals = examTypeTotalsByStudent?.get(sid) || undefined;
      return { studentId: s._id, fullName: nameMap[sid] || 'Student', total: s.total, average: avg, subjectScores, examTypeTotals };
    });

    // Sort by total desc and rank
    results.sort((a, b) => b.total - a.total);
    results = results.map((r, idx) => ({ ...r, rank: idx + 1 }));

    // Apply topN / bottomN slicing if provided
    if (topN > 0) {
      results = results.slice(0, topN);
    } else if (bottomN > 0) {
      // take the last N of the desc-sorted list, keep display ascending among those for clarity
      const lastN = results.slice(Math.max(results.length - bottomN, 0));
      results = lastN.sort((a, b) => a.total - b.total);
    }

  const classAverage = results.length ? (results.reduce((a, b) => a + (b.average || 0), 0) / results.length) : 0;
  res.json({ results, classAverage, subjects: subjectMeta, templateVersion: version });
  } catch (err) {
    console.error('getSummary error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Transcript: per-student, per-subject scores across exam types for a given AY + GradeSection
export const getTranscript = async (req, res) => {
  try {
    const { academicYearId, gradeSectionId, studentId, templateVersion } = req.query;
    if (!isId(academicYearId) || !isId(gradeSectionId) || !isId(studentId)) {
      return res.status(400).json({ message: 'academicYearId, gradeSectionId and studentId are required' });
    }

    const version = await resolveTemplateVersionForContext({ academicYearId, gradeSectionId, studentId, requestedVersion: templateVersion });

    // Validate student and optional enrollment coherence
    const student = await Student.findById(studentId).select('fullName studentId').lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Exams for this AY + section and their types
    const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version })
      .select('_id examType')
      .lean();
    if (!exams.length) return res.json({ student, examTypes: [], subjects: [], rows: [], overall: { total: 0, average: 0 }, templateVersion: version });

    const examTypeIds = [...new Set(exams.map(e => String(e.examType)))];
    const examTypesDocs = await ExamType.find({ _id: { $in: examTypeIds } }).select('typeName order maxScore').lean();
    const examTypeMap = Object.fromEntries(examTypesDocs.map(t => [String(t._id), { typeName: t.typeName, order: t.order, maxScore: t.maxScore }]));
    const examTypes = examTypeIds
      .map(id => ({ _id: id, typeName: examTypeMap[id]?.typeName || 'Exam', order: examTypeMap[id]?.order || 0, maxScore: examTypeMap[id]?.maxScore || 0 }))
      .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || (a.typeName || '').localeCompare(b.typeName || ''));

    const examIds = exams.map(e => e._id);

    // Subjects assigned to this gradeSection
    const GradeSection = (await import('../models/GradeSection.js')).default;
    const gs = await GradeSection.findById(gradeSectionId).select('subjects').lean();
    const subjectIds = (gs?.subjects || []).map(id => new mongoose.Types.ObjectId(id));
    if (!subjectIds.length) return res.json({ student, examTypes, subjects: [], rows: [], overall: { total: 0, average: 0 }, templateVersion: version });

    const subjectDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
    const subjectNameMap = Object.fromEntries(subjectDocs.map(s => [String(s._id), s.subjectName]));
    const subjects = subjectIds.map(id => ({ _id: id, subjectName: subjectNameMap[String(id)] || 'Subject' }));

    // Scores for this student across those exams and subjects
    const scores = await ExamScore.find({ student: studentId, exam: { $in: examIds }, subject: { $in: subjectIds } })
      .select('subject exam scoreObtained')
      .lean();

    // Map examId -> examTypeId
    const examIdToTypeId = Object.fromEntries(exams.map(e => [String(e._id), String(e.examType)]));

    // Build per subject per examType totals
    const rows = subjects.map(su => {
      const subjectIdStr = String(su._id);
      const examsMap = {};
      for (const et of examTypes) examsMap[String(et._id)] = 0; // initialize
      for (const sc of scores) {
        if (String(sc.subject) !== subjectIdStr) continue;
        const etId = examIdToTypeId[String(sc.exam)];
        if (!etId) continue;
        examsMap[etId] = (examsMap[etId] || 0) + Number(sc.scoreObtained || 0);
      }
      const perExamList = examTypes.map(et => ({ examTypeId: et._id, typeName: et.typeName, score: Number(examsMap[String(et._id)] || 0) }));
      const total = perExamList.reduce((a, b) => a + (b.score || 0), 0);
      const average = subjects.length ? total : 0; // subject average equals total (weights sum across exams to 100)
      return { subjectId: su._id, subjectName: su.subjectName, exams: perExamList, total, average };
    });

    const overallTotal = rows.reduce((a, b) => a + (b.total || 0), 0);
    const overallAverage = subjects.length ? (overallTotal / subjects.length) : 0;

    return res.json({ student, examTypes, subjects, rows, overall: { total: overallTotal, average: overallAverage }, templateVersion: version });
  } catch (err) {
    console.error('getTranscript error', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export default {
  getExamTypes,
  ensureExams,
  getExamGrid,
  upsertScore,
  getSummary,
  getTranscript,
};
