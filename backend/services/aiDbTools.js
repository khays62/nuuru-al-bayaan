import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import { z } from 'zod';

import { hasPermission } from '../middleware/checkPermission.js';

import Admin from '../models/Admin.js';
import User from '../models/User.js';
import AcademicYear from '../models/AcademicYear.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import Enrollment from '../models/Enrollment.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import Exam from '../models/Exam.js';
import ExamType from '../models/ExamType.js';
import ExamScore from '../models/ExamScore.js';
import GradeSection from '../models/GradeSection.js';
import Subject from '../models/Subject.js';
import Grade from '../models/Grade.js';
import Shift from '../models/Shift.js';

import AttendanceRecord from '../models/AttendanceRecord.js';
import TransferLog from '../models/TransferLog.js';
import AuditLog from '../models/AuditLog.js';
import Announcement from '../models/Announcement.js';
import Cohort from '../models/Cohort.js';

import Timetable from '../models/Timetable.js';
import Expense from '../models/Expense.js';
import FeeInvoice from '../models/FeeInvoice.js';
import FeeTransaction from '../models/FeeTransaction.js';
import Account from '../models/Account.js';
import Payroll from '../models/Payroll.js';
import Donation from '../models/Donation.js';
import Donor from '../models/Donor.js';
import FinanceCategory from '../models/FinanceCategory.js';
import LibraryResource from '../models/LibraryResource.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function loadPdfParse() {
  try {
    // Prefer require for CommonJS builds.
    // eslint-disable-next-line global-require
    return require('pdf-parse');
  } catch {
    // Fallback for ESM-only builds.
    const mod = await import('pdf-parse');
    return mod?.default || mod;
  }
}

class AiToolError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.name = 'AiToolError';
    this.status = status;
  }
}

const isRole = (user, role) => String(user?.role || '').toLowerCase() === String(role || '').toLowerCase();

const isStaffOrAdmin = (user) => {
  const r = String(user?.role || '').toLowerCase();
  return r === 'admin' || r === 'staff';
};

function staffCanReadLibrary(user) {
  if (isRole(user, 'admin')) return true;
  if (!isRole(user, 'staff')) return true;
  return hasPermission(user, 'library', 'view')
    || hasPermission(user, 'library', 'download')
    || hasPermission(user, 'library', 'full');
}

const MAX_RANGE_DAYS = Object.freeze({
  admin: 365,
  staff: 90,
  teacher: 31,
  student: 31,
});

const startOfDayUTC = (dt) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
const endOfDayUTC = (dt) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999));

function parseISODateOnly(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const dt = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function monthRangeUTC(now = new Date()) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = endOfDayUTC(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)));
  return { from, to };
}

function enforceMaxRangeDays({ user, from, to }) {
  const role = String(user?.role || '').toLowerCase();
  const maxDays = MAX_RANGE_DAYS[role] || 31;
  const ms = Number(to) - Number(from);
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days > maxDays) {
    throw new AiToolError(`Date range too large (max ${maxDays} days for role ${role})`, 400);
  }
}

function clampLimit(value, max = 50, fallback = 20) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(n)));
}

function staffHasAny(user, moduleName, actions = []) {
  if (isRole(user, 'admin')) return true;
  if (!isRole(user, 'staff')) return false;
  const list = Array.isArray(actions) && actions.length ? actions : ['view', 'add', 'edit', 'delete', 'full'];
  return list.some((a) => hasPermission(user, moduleName, a));
}

function staffHasAnyOfModules(user, modules, actions = []) {
  if (isRole(user, 'admin')) return true;
  if (!isRole(user, 'staff')) return false;
  const mods = Array.isArray(modules) ? modules : [];
  return mods.some((m) => staffHasAny(user, m, actions));
}

function requireAuthUser(user) {
  if (!user?._id) throw new AiToolError('Unauthorized', 401);
}

function requireRole(user, roles = []) {
  const r = String(user?.role || '').toLowerCase();
  const allow = new Set((Array.isArray(roles) ? roles : []).map((x) => String(x).toLowerCase()));
  if (!allow.has(r)) throw new AiToolError('Forbidden', 403);
}

function toId(value) {
  const s = String(value || '').trim();
  if (!s || !mongoose.isValidObjectId(s)) return null;
  return s;
}

async function resolveUserDisplay(principalId) {
  const id = toId(principalId);
  if (!id) return null;

  const [u, a] = await Promise.all([
    User.findById(id).select('fullName username email role status').lean(),
    Admin.findById(id).select('fullName username email role status').lean(),
  ]);

  const p = u || a;
  if (!p) return null;
  return {
    fullName: p.fullName || '',
    username: p.username || '',
    email: p.email || '',
    role: String(p.role || (a ? 'admin' : '')).toLowerCase(),
    status: p.status || '',
  };
}

async function teacherHasGradeSection(user, gradeSectionId) {
  const teacherId = toId(user.teacherRef);
  if (!teacherId) return false;
  const gsId = toId(gradeSectionId);
  if (!gsId) return false;
  const exists = await TeacherAssignment.exists({ teacher: teacherId, gradeSection: gsId });
  return Boolean(exists);
}

async function teacherHasAssignment(user, gradeSectionId, subjectId) {
  const teacherId = toId(user?.teacherRef);
  if (!teacherId) return false;
  const gsId = toId(gradeSectionId);
  const subId = toId(subjectId);
  if (!gsId || !subId) return false;
  const exists = await TeacherAssignment.exists({ teacher: teacherId, gradeSection: gsId, subject: subId });
  return Boolean(exists);
}

async function getActiveTemplateVersion() {
  const active = await ExamType.findOne({ isActive: true }).sort({ templateVersion: -1 }).select('templateVersion').lean();
  if (active?.templateVersion) return Number(active.templateVersion);
  const any = await ExamType.findOne({}).sort({ templateVersion: -1 }).select('templateVersion').lean();
  return Number(any?.templateVersion || 1);
}

function parseTemplateVersion(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

async function resolveTemplateVersionForContext({ academicYearId, gradeSectionId, studentId, requestedVersion }) {
  const parsed = parseTemplateVersion(requestedVersion);
  if (parsed) return parsed;

  const ayOk = mongoose.isValidObjectId(academicYearId);
  const gsOk = mongoose.isValidObjectId(gradeSectionId);
  const stOk = studentId ? mongoose.isValidObjectId(studentId) : false;
  if (!ayOk || !gsOk) return await getActiveTemplateVersion();

  const ay = new mongoose.Types.ObjectId(academicYearId);
  const gs = new mongoose.Types.ObjectId(gradeSectionId);

  // Prefer version where this student has most scores for the context.
  if (stOk) {
    const sid = new mongoose.Types.ObjectId(studentId);
    const agg = await ExamScore.aggregate([
      { $match: { student: sid } },
      { $lookup: { from: 'exams', localField: 'exam', foreignField: '_id', as: 'examDoc' } },
      { $unwind: '$examDoc' },
      { $match: { 'examDoc.academicYear': ay, 'examDoc.gradeSection': gs } },
      { $group: { _id: '$examDoc.templateVersion', scoreCount: { $sum: 1 } } },
      { $sort: { scoreCount: -1, _id: -1 } },
      { $limit: 1 },
    ]);
    if (agg?.[0]?._id != null) return Number(agg[0]._id);
  }

  // Otherwise choose version with most class scores.
  const classAgg = await Exam.aggregate([
    { $match: { academicYear: ay, gradeSection: gs } },
    { $lookup: { from: 'examscores', localField: '_id', foreignField: 'exam', as: 'scores' } },
    { $addFields: { scoreCount: { $size: '$scores' } } },
    { $group: { _id: '$templateVersion', scoreCount: { $sum: '$scoreCount' }, examsCount: { $sum: 1 } } },
    { $sort: { scoreCount: -1, examsCount: -1, _id: -1 } },
    { $limit: 1 },
  ]);
  if (classAgg?.[0]?._id != null) return Number(classAgg[0]._id);

  const anyExam = await Exam.findOne({ academicYear: ay, gradeSection: gs })
    .sort({ templateVersion: -1 })
    .select('templateVersion')
    .lean();
  if (anyExam?.templateVersion != null) return Number(anyExam.templateVersion);

  return await getActiveTemplateVersion();
}

async function computeExamTranscript({ academicYearId, gradeSectionId, studentId, requestedVersion }) {
  if (!mongoose.isValidObjectId(academicYearId) || !mongoose.isValidObjectId(gradeSectionId) || !mongoose.isValidObjectId(studentId)) {
    throw new AiToolError('Invalid academicYearId/gradeSectionId/studentId', 400);
  }

  const version = await resolveTemplateVersionForContext({ academicYearId, gradeSectionId, studentId, requestedVersion });
  const student = await Student.findById(studentId).select('fullName studentId').lean();
  if (!student) throw new AiToolError('Student not found', 404);

  const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version })
    .select('_id examType')
    .lean();
  if (!exams.length) {
    return { student, examTypes: [], subjects: [], rows: [], overall: { total: 0, average: 0 }, templateVersion: version };
  }

  const examTypeIds = [...new Set(exams.map((e) => String(e.examType)))];
  const examTypesDocs = await ExamType.find({ _id: { $in: examTypeIds } }).select('typeName order maxScore').lean();
  const examTypeMap = Object.fromEntries(examTypesDocs.map((t) => [String(t._id), { typeName: t.typeName, order: t.order, maxScore: t.maxScore }]));
  const examTypes = examTypeIds
    .map((id) => ({ _id: id, typeName: examTypeMap[id]?.typeName || 'Exam', order: examTypeMap[id]?.order || 0, maxScore: examTypeMap[id]?.maxScore || 0 }))
    .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || String(a.typeName || '').localeCompare(String(b.typeName || '')));

  const examIds = exams.map((e) => e._id);
  const gs = await GradeSection.findById(gradeSectionId).select('subjects').lean();
  const subjectIds = (gs?.subjects || []).map((id) => new mongoose.Types.ObjectId(id));
  if (!subjectIds.length) {
    return { student, examTypes, subjects: [], rows: [], overall: { total: 0, average: 0 }, templateVersion: version };
  }

  const subjectDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
  const subjectNameMap = Object.fromEntries(subjectDocs.map((s) => [String(s._id), s.subjectName]));
  const subjects = subjectIds.map((id) => ({ _id: id, subjectName: subjectNameMap[String(id)] || 'Subject' }));

  const scores = await ExamScore.find({ student: studentId, exam: { $in: examIds }, subject: { $in: subjectIds } })
    .select('subject exam scoreObtained')
    .lean();

  const examIdToTypeId = Object.fromEntries(exams.map((e) => [String(e._id), String(e.examType)]));
  const rows = subjects.map((su) => {
    const subjectIdStr = String(su._id);
    const examsMap = {};
    for (const et of examTypes) examsMap[String(et._id)] = 0;
    for (const sc of scores) {
      if (String(sc.subject) !== subjectIdStr) continue;
      const etId = examIdToTypeId[String(sc.exam)];
      if (!etId) continue;
      examsMap[etId] = (examsMap[etId] || 0) + Number(sc.scoreObtained || 0);
    }
    const perExamList = examTypes.map((et) => ({ examTypeId: et._id, typeName: et.typeName, score: Number(examsMap[String(et._id)] || 0) }));
    const total = perExamList.reduce((a, b) => a + Number(b.score || 0), 0);
    const average = subjects.length ? total : 0;
    return { subjectId: su._id, subjectName: su.subjectName, exams: perExamList, total, average };
  });

  const overallTotal = rows.reduce((a, b) => a + Number(b.total || 0), 0);
  const overallAverage = subjects.length ? (overallTotal / subjects.length) : 0;
  return { student, examTypes, subjects, rows, overall: { total: overallTotal, average: overallAverage }, templateVersion: version };
}

function truncateTranscript(transcript, maxSubjects = 40) {
  const max = Math.max(1, Math.min(80, Number(maxSubjects || 40)));
  const rows = Array.isArray(transcript?.rows) ? transcript.rows : [];
  if (rows.length <= max) return { transcript, truncated: false };
  return { transcript: { ...transcript, rows: rows.slice(0, max) }, truncated: true };
}

async function getStudentActiveGradeSectionId(user) {
  const studentId = toId(user?.studentRef?._id || user?.studentRef);
  if (!studentId) return null;
  const enr = await Enrollment.findOne({ student: studentId, status: 'active' })
    .sort({ createdAt: -1 })
    .select('gradeSection')
    .lean();
  return enr?.gradeSection ? String(enr.gradeSection) : null;
}

async function getTeacherAllowedGradeSectionIds(user) {
  const teacherId = toId(user?.teacherRef);
  if (!teacherId) return [];
  const ids = await TeacherAssignment.find({ teacher: teacherId }).distinct('gradeSection');
  return (ids || []).map((x) => String(x)).filter((id) => toId(id));
}

async function getStudentActiveGradeId(user) {
  const studentId = toId(user?.studentRef?._id || user?.studentRef);
  if (!studentId) return null;
  const enr = await Enrollment.findOne({ student: studentId, status: 'active' })
    .sort({ createdAt: -1 })
    .select('grade gradeSection')
    .lean();

  const gradeId = toId(enr?.grade);
  if (gradeId) return gradeId;

  const gradeSectionId = toId(enr?.gradeSection);
  if (!gradeSectionId) return null;
  const gs = await GradeSection.findById(gradeSectionId).select('grade').lean();
  return toId(gs?.grade);
}

async function getTeacherAssignedGradeIds(user) {
  const teacherId = toId(user?.teacherRef);
  if (!teacherId) return [];

  const rows = await TeacherAssignment.find({ teacher: teacherId })
    .select('gradeSection')
    .populate({ path: 'gradeSection', select: 'grade' })
    .lean();

  const set = new Set();
  for (const r of rows || []) {
    const gid = toId(r?.gradeSection?.grade);
    if (gid) set.add(gid);
  }
  return Array.from(set);
}

function buildLibraryVisibilityExprForUser(user) {
  const role = String(user?.role || '').toLowerCase();
  const publicExpr = { $or: [{ audience: 'public' }, { audience: { $exists: false } }, { audience: null }, { audience: '' }] };

  if (role === 'admin' || role === 'staff') return null;

  // Note: for student/teacher we need async lookups for gradeIds, so this function only handles roles
  // where we can return immediately.
  return publicExpr;
}

async function buildLibraryVisibilityExprForUserAsync(user) {
  const role = String(user?.role || '').toLowerCase();
  const publicExpr = { $or: [{ audience: 'public' }, { audience: { $exists: false } }, { audience: null }, { audience: '' }] };

  if (role === 'admin' || role === 'staff') return null;
  if (role === 'student') {
    const gradeId = await getStudentActiveGradeId(user);
    return gradeId
      ? { $or: [publicExpr, { audience: 'level', grade: gradeId }] }
      : publicExpr;
  }
  if (role === 'teacher') {
    const gradeIds = await getTeacherAssignedGradeIds(user);
    return gradeIds.length > 0
      ? { $or: [publicExpr, { audience: 'level', grade: { $in: gradeIds } }] }
      : publicExpr;
  }
  return publicExpr;
}

function isPrivateHostname(hostname) {
  const h = String(hostname || '').trim().toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true;
  if (h.endsWith('.local')) return true;

  // Basic IPv4 private ranges (string checks; avoids DNS resolution / network access).
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  const m = h.match(/^172\.(\d{1,3})\./);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 16 && n <= 31) return true;
  }

  return false;
}

async function fetchTextWithLimit(url, maxBytes = 1024 * 1024) {
  const u = new URL(url);
  if (u.username || u.password) throw new AiToolError('Link URL not allowed', 400);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new AiToolError('Link URL must be http(s)', 400);
  if (isPrivateHostname(u.hostname)) throw new AiToolError('Link URL host not allowed', 400);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(u.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'NuuruAI/1.0 (library summarizer)',
        'accept': 'text/html,text/plain,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) throw new AiToolError(`Failed to fetch link (HTTP ${res.status})`, 400);

    const chunks = [];
    let total = 0;
    for await (const chunk of res.body || []) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > maxBytes) {
        chunks.push(buf.slice(0, Math.max(0, maxBytes - (total - buf.length))));
        break;
      }
      chunks.push(buf);
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    const truncated = total > maxBytes;
    return { raw, truncated };
  } catch (err) {
    if (String(err?.name || '') === 'AbortError') throw new AiToolError('Link fetch timeout', 408);
    if (isAiToolError(err)) throw err;
    throw new AiToolError('Failed to fetch link', 400);
  } finally {
    clearTimeout(t);
  }
}

function stripHtmlToText(html) {
  const s = String(html || '');
  // Remove script/style blocks first.
  const noScripts = s
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

  // Strip tags.
  const text = noScripts
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function truncateText(text, maxChars = 20000) {
  const max = Math.max(500, Math.min(40000, Number(maxChars || 20000)));
  const s = String(text || '');
  if (s.length <= max) return { text: s, truncated: false, maxChars: max };
  return { text: s.slice(0, max), truncated: true, maxChars: max };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLibraryQueryCandidates(input) {
  const raw = String(input || '').trim();
  if (!raw) return [];

  const cleaned = raw
    .replace(/[“”«»]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const out = new Set();
  out.add(cleaned);

  // If user included something like: "Title – filename.pdf" or "Title - filename.pdf"
  const splitDash = cleaned.split(/\s[\-–—]\s/).map((s) => s.trim()).filter(Boolean);
  for (const part of splitDash) out.add(part);

  // Extract filename-like token if present.
  const fileLike = cleaned.match(/([^\\/]+\.(pdf|docx?|pptx?))\b/i);
  if (fileLike?.[1]) out.add(String(fileLike[1]).trim());

  // If it looks like a path, take basename.
  const lastSeg = cleaned.split(/[/\\]/).filter(Boolean).slice(-1)[0];
  if (lastSeg) out.add(lastSeg);

  // Remove extension to help match titles.
  for (const v of Array.from(out)) {
    const noExt = v.replace(/\.(pdf|docx?|pptx?)$/i, '').trim();
    if (noExt && noExt !== v) out.add(noExt);
  }

  // Replace underscores with spaces for better $text search.
  for (const v of Array.from(out)) {
    const spaced = v.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    if (spaced && spaced !== v) out.add(spaced);
  }

  // Drop very short noise.
  return Array.from(out)
    .map((s) => String(s).trim())
    .filter((s) => s.length >= 2)
    .slice(0, 12);
}

const argsLibraryResourceGetText = z
  .object({
    resourceId: z.string().trim().optional(),
    q: z.string().trim().max(160).optional(),
    maxChars: z.number().int().min(500).max(40000).optional(),
  })
  .strip()
  .refine((v) => Boolean(String(v?.resourceId || '').trim()) || Boolean(String(v?.q || '').trim()), {
    message: 'resourceId or q is required',
  });

async function toolLibraryResourceGetText({ user, args }) {
  requireAuthUser(user);
  if (!staffCanReadLibrary(user)) throw new AiToolError('Missing permission: library.view', 403);

  const visibility = await buildLibraryVisibilityExprForUserAsync(user);
  const id = toId(args?.resourceId);
  const q = String(args?.q || '').trim();
  const candidates = buildLibraryQueryCandidates(q);

  let doc = null;
  if (id) {
    const and = [{ _id: id }];
    if (visibility) and.push(visibility);
    const filter = and.length > 1 ? { $and: and } : and[0];
    doc = await LibraryResource.findOne(filter)
      .populate('grade', 'gradeName')
      .populate('subject', 'subjectName')
      .lean();
  } else {
    const and = [];
    if (q) and.push({ $text: { $search: q } });
    if (visibility) and.push(visibility);
    const filter = and.length ? { $and: and } : {};
    // Prefer text index search (title/description/category).
    doc = await LibraryResource.findOne(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .populate('grade', 'gradeName')
      .populate('subject', 'subjectName')
      .lean();

    // Fallback: match by title OR uploaded filename (file.originalName).
    if (!doc && candidates.length) {
      const ors = [];
      for (const c of candidates) {
        const safe = escapeRegex(c);
        ors.push({ title: { $regex: safe, $options: 'i' } });
        ors.push({ 'file.originalName': { $regex: safe, $options: 'i' } });
      }
      const and2 = [{ $or: ors }];
      if (visibility) and2.push(visibility);
      doc = await LibraryResource.findOne({ $and: and2 })
        .sort({ createdAt: -1 })
        .populate('grade', 'gradeName')
        .populate('subject', 'subjectName')
        .lean();
    }
  }

  if (!doc) {
    return {
      scope: 'library_resource_get_text',
      found: false,
      query: { resourceId: id || undefined, q: q || undefined },
      message: 'No matching library resource found (or not visible to you).',
    };
  }

  const kind = String(doc.kind || '').toLowerCase();
  const maxChars = Number(args?.maxChars || 20000);

  if (kind === 'link') {
    const linkUrl = String(doc.linkUrl || '').trim();
    if (!linkUrl) throw new AiToolError('Resource linkUrl missing', 400);

    const { raw, truncated: rawTruncated } = await fetchTextWithLimit(linkUrl, 1024 * 1024);
    const text = stripHtmlToText(raw);
    const { text: outText, truncated } = truncateText(text, maxChars);

    return {
      scope: 'library_resource_get_text',
      found: true,
      resource: {
        id: String(doc._id),
        title: doc.title || '',
        description: doc.description || '',
        category: doc.category || '',
        kind: 'link',
        audience: doc.audience || 'public',
        grade: doc.grade ? { id: String(doc.grade._id), name: doc.grade.gradeName || '' } : null,
        subject: doc.subject ? { id: String(doc.subject._id), name: doc.subject.subjectName || '' } : null,
        createdAt: doc.createdAt || null,
        createdByName: doc.createdByName || '',
        linkUrl,
      },
      extracted: {
        type: 'web_text',
        rawBytesTruncated: rawTruncated,
        textChars: outText.length,
        truncated,
        maxChars: Math.max(500, Math.min(40000, maxChars)),
        text: outText,
      },
    };
  }

  if (kind === 'pdf') {
    const mime = String(doc?.file?.mimeType || '').toLowerCase();
    const orig = String(doc?.file?.originalName || '').toLowerCase();
    const rel = String(doc?.file?.path || '').trim();

    if (!rel || !rel.startsWith('uploads/library/')) throw new AiToolError('Resource file path invalid', 400);

    // Only parse actual PDFs for now.
    const looksPdf = mime === 'application/pdf' || orig.endsWith('.pdf') || rel.toLowerCase().endsWith('.pdf');
    if (!looksPdf) {
      return {
        scope: 'library_resource_get_text',
        found: true,
        resource: {
          id: String(doc._id),
          title: doc.title || '',
          description: doc.description || '',
          category: doc.category || '',
          kind: 'pdf',
          audience: doc.audience || 'public',
          grade: doc.grade ? { id: String(doc.grade._id), name: doc.grade.gradeName || '' } : null,
          subject: doc.subject ? { id: String(doc.subject._id), name: doc.subject.subjectName || '' } : null,
          createdAt: doc.createdAt || null,
          createdByName: doc.createdByName || '',
          file: {
            url: doc?.file?.url || '',
            mimeType: doc?.file?.mimeType || '',
            size: Number(doc?.file?.size || 0),
            originalName: doc?.file?.originalName || '',
          },
        },
        extracted: {
          type: 'unsupported',
          message: 'This uploaded file is not a PDF (DOC/DOCX/PPT/PPTX parsing is not enabled yet).',
        },
      };
    }

    const abs = path.resolve(__dirname, '..', ...rel.split('/'));
    let parsed = null;
    try {
      const buf = await fs.readFile(abs);
      const pdfParse = await loadPdfParse();
      parsed = await pdfParse(buf);
    } catch (err) {
      return {
        scope: 'library_resource_get_text',
        found: true,
        resource: {
          id: String(doc._id),
          title: doc.title || '',
          description: doc.description || '',
          category: doc.category || '',
          kind: 'pdf',
          audience: doc.audience || 'public',
          grade: doc.grade ? { id: String(doc.grade._id), name: doc.grade.gradeName || '' } : null,
          subject: doc.subject ? { id: String(doc.subject._id), name: doc.subject.subjectName || '' } : null,
          createdAt: doc.createdAt || null,
          createdByName: doc.createdByName || '',
          file: {
            url: doc?.file?.url || '',
            mimeType: doc?.file?.mimeType || '',
            size: Number(doc?.file?.size || 0),
            originalName: doc?.file?.originalName || '',
          },
        },
        extracted: {
          type: 'pdf_text',
          pages: 0,
          textChars: 0,
          truncated: false,
          maxChars: Math.max(500, Math.min(40000, maxChars)),
          text: '',
          message: `Failed to extract PDF text (${String(err?.message || 'parse error')}).`,
        },
      };
    }

    const rawText = String(parsed?.text || '').replace(/\s+/g, ' ').trim();
    if (!rawText || rawText.length < 40) {
      return {
        scope: 'library_resource_get_text',
        found: true,
        resource: {
          id: String(doc._id),
          title: doc.title || '',
          description: doc.description || '',
          category: doc.category || '',
          kind: 'pdf',
          audience: doc.audience || 'public',
          grade: doc.grade ? { id: String(doc.grade._id), name: doc.grade.gradeName || '' } : null,
          subject: doc.subject ? { id: String(doc.subject._id), name: doc.subject.subjectName || '' } : null,
          createdAt: doc.createdAt || null,
          createdByName: doc.createdByName || '',
          file: {
            url: doc?.file?.url || '',
            mimeType: doc?.file?.mimeType || '',
            size: Number(doc?.file?.size || 0),
            originalName: doc?.file?.originalName || '',
          },
        },
        extracted: {
          type: 'pdf_text',
          pages: Number(parsed?.numpages || 0),
          textChars: 0,
          truncated: false,
          maxChars: Math.max(500, Math.min(40000, maxChars)),
          text: '',
          message: 'No readable text could be extracted from this PDF. It may be a scanned/image-only document. Upload a text-based PDF or provide a link/text excerpt.',
        },
      };
    }
    const { text: outText, truncated } = truncateText(rawText, maxChars);

    return {
      scope: 'library_resource_get_text',
      found: true,
      resource: {
        id: String(doc._id),
        title: doc.title || '',
        description: doc.description || '',
        category: doc.category || '',
        kind: 'pdf',
        audience: doc.audience || 'public',
        grade: doc.grade ? { id: String(doc.grade._id), name: doc.grade.gradeName || '' } : null,
        subject: doc.subject ? { id: String(doc.subject._id), name: doc.subject.subjectName || '' } : null,
        createdAt: doc.createdAt || null,
        createdByName: doc.createdByName || '',
        file: {
          url: doc?.file?.url || '',
          mimeType: doc?.file?.mimeType || '',
          size: Number(doc?.file?.size || 0),
          originalName: doc?.file?.originalName || '',
        },
      },
      extracted: {
        type: 'pdf_text',
        pages: Number(parsed?.numpages || 0),
        textChars: outText.length,
        truncated,
        maxChars: Math.max(500, Math.min(40000, maxChars)),
        text: outText,
      },
    };
  }

  throw new AiToolError('Unsupported library resource kind', 400);
}

const argsLibraryResourcesList = z
  .object({
    q: z.string().trim().max(120).optional(),
    audience: z.enum(['public', 'level']).optional(),
    gradeId: z.string().trim().optional(),
    subjectId: z.string().trim().optional(),
    kind: z.enum(['pdf', 'link']).optional(),
    page: z.number().int().min(1).max(1000).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strip();

async function toolLibraryResourcesList({ user, args }) {
  requireAuthUser(user);

  const q = String(args?.q || '').trim();
  const limit = clampLimit(args?.limit, 50, 15);
  const pageRaw = Number(args?.page || 1);
  const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
  const skip = (page - 1) * limit;

  const role = String(user?.role || '').toLowerCase();

  // Backward-compat: treat missing/empty audience as public.
  const publicExpr = { $or: [{ audience: 'public' }, { audience: { $exists: false } }, { audience: null }, { audience: '' }] };

  let visibility = null;
  if (role === 'admin' || role === 'staff') {
    visibility = null;
  } else if (role === 'student') {
    const gradeId = await getStudentActiveGradeId(user);
    visibility = gradeId
      ? { $or: [publicExpr, { audience: 'level', grade: gradeId }] }
      : publicExpr;
  } else if (role === 'teacher') {
    const gradeIds = await getTeacherAssignedGradeIds(user);
    visibility = gradeIds.length > 0
      ? { $or: [publicExpr, { audience: 'level', grade: { $in: gradeIds } }] }
      : publicExpr;
  } else {
    visibility = publicExpr;
  }

  const and = [];
  if (q) and.push({ $text: { $search: q } });
  if (visibility) and.push(visibility);

  // Optional narrowing filters (always safe because visibility is still applied).
  const audience = args?.audience ? String(args.audience).toLowerCase() : '';
  if (audience === 'public') and.push(publicExpr);
  if (audience === 'level') and.push({ audience: 'level' });

  const gradeId = toId(args?.gradeId);
  if (gradeId) and.push({ grade: gradeId });

  const subjectId = toId(args?.subjectId);
  if (subjectId) and.push({ subject: subjectId });

  const kind = args?.kind ? String(args.kind).toLowerCase() : '';
  if (kind === 'pdf' || kind === 'link') and.push({ kind });

  const filter = and.length ? { $and: and } : {};

  const [rows, total] = await Promise.all([
    LibraryResource.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('grade', 'gradeName')
      .populate('subject', 'subjectName')
      .lean(),
    LibraryResource.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / limit));

  return {
    scope: 'library_resources_list',
    filter: {
      q: q || undefined,
      audience: audience || undefined,
      gradeId: gradeId || undefined,
      subjectId: subjectId || undefined,
      kind: kind || undefined,
      page,
      limit,
    },
    meta: {
      page,
      limit,
      total: Number(total) || 0,
      totalPages,
      returned: Array.isArray(rows) ? rows.length : 0,
    },
    items: (rows || []).map((r) => ({
      id: String(r._id),
      title: r.title || '',
      description: r.description || '',
      category: r.category || '',
      kind: r.kind || '',
      audience: r.audience || 'public',
      grade: r.grade ? { id: String(r.grade._id), name: r.grade.gradeName || '' } : null,
      subject: r.subject ? { id: String(r.subject._id), name: r.subject.subjectName || '' } : null,
      createdAt: r.createdAt || null,
      createdByName: r.createdByName || '',
      linkUrl: r.kind === 'link' ? (r.linkUrl || '') : '',
      file: r.kind === 'pdf' && r.file
        ? {
          url: r.file.url || '',
          mimeType: r.file.mimeType || '',
          size: Number(r.file.size || 0),
          originalName: r.file.originalName || '',
        }
        : null,
    })),
    note: role === 'admin' || role === 'staff'
      ? 'Full visibility for admin/staff'
      : 'Visibility limited by role (public + assigned/enrolled level resources)',
  };
}

async function findLatestEnrollmentForStudent(studentId) {
  // Best-effort: prefer active enrollment, else newest.
  const active = await Enrollment.findOne({ student: studentId, status: 'active' })
    .sort({ createdAt: -1 })
    .lean();
  if (active) return active;
  return Enrollment.findOne({ student: studentId }).sort({ createdAt: -1 }).lean();
}

async function hydrateGradeSection(gradeSectionId) {
  const gs = await GradeSection.findById(gradeSectionId).select('grade shift section subjects').lean();
  if (!gs) return null;

  const [grade, shift, subjects] = await Promise.all([
    Grade.findById(gs.grade).select('gradeName').lean(),
    Shift.findById(gs.shift).select('shiftName').lean(),
    Subject.find({ _id: { $in: Array.isArray(gs.subjects) ? gs.subjects : [] } })
      .select('subjectName subjectCode')
      .sort({ subjectName: 1 })
      .lean(),
  ]);

  return {
    section: gs.section,
    grade: grade ? { gradeName: grade.gradeName } : null,
    shift: shift ? { shiftName: shift.shiftName } : null,
    subjects: Array.isArray(subjects)
      ? subjects.map((s) => ({ subjectName: s.subjectName, subjectCode: s.subjectCode }))
      : [],
  };
}

async function hydrateGradeSectionShort(gradeSectionId) {
  const gs = await GradeSection.findById(gradeSectionId).select('grade shift section').lean();
  if (!gs) return null;

  const [grade, shift] = await Promise.all([
    Grade.findById(gs.grade).select('gradeName').lean(),
    Shift.findById(gs.shift).select('shiftName').lean(),
  ]);

  return {
    grade: grade?.gradeName || null,
    shift: shift?.shiftName || null,
    section: gs.section || null,
  };
}

async function toolDashboardSummary({ user }) {
  requireAuthUser(user);
  requireRole(user, ['admin', 'staff']);

  const allowStudents = isRole(user, 'admin') || hasPermission(user, 'students', 'view');
  const allowTeachers = isRole(user, 'admin') || hasPermission(user, 'teachers', 'view');
  const allowExams = isRole(user, 'admin') || hasPermission(user, 'exams', 'view');

  const allowAnnouncements = isRole(user, 'admin') || staffHasAny(user, 'announcements', ['add', 'edit', 'delete', 'full']);
  const allowGrades = isRole(user, 'admin') || hasPermission(user, 'grades', 'view');
  const allowSubjects = isRole(user, 'admin') || hasPermission(user, 'subjects', 'view');
  const allowCohorts = isRole(user, 'admin') || hasPermission(user, 'cohorts', 'view');
  const allowClasses = isRole(user, 'admin') || staffHasAnyOfModules(user, ['students', 'timetable', 'attendance'], ['view', 'full']);
  const allowStaffUsers = isRole(user, 'admin');

  const allowSubjectsPerLevel = Boolean(allowGrades && allowSubjects && allowClasses);

  const [
    studentsCount,
    teachersCount,
    examsCount,
    announcementsCount,
    gradesCount,
    subjectsCount,
    cohortsCount,
    classesCount,
    staffUsersCount,
    subjectsPerLevel,
  ] = await Promise.all([
    allowStudents ? Student.countDocuments({ status: 'Active' }) : Promise.resolve(null),
    allowTeachers ? Teacher.countDocuments({ status: 'active' }) : Promise.resolve(null),
    allowExams ? Exam.countDocuments({}) : Promise.resolve(null),
    allowAnnouncements ? Announcement.countDocuments({}) : Promise.resolve(null),
    allowGrades ? Grade.countDocuments({}) : Promise.resolve(null),
    allowSubjects ? Subject.countDocuments({}) : Promise.resolve(null),
    allowCohorts ? Cohort.countDocuments({}) : Promise.resolve(null),
    allowClasses ? GradeSection.countDocuments({}) : Promise.resolve(null),
    allowStaffUsers ? User.countDocuments({ role: 'staff', status: 'active' }) : Promise.resolve(null),
    allowSubjectsPerLevel
      ? (async () => {
        const agg = await GradeSection.aggregate([
          { $unwind: '$subjects' },
          { $group: { _id: { grade: '$grade', subject: '$subjects' } } },
          { $group: { _id: '$_id.grade', subjectsCount: { $sum: 1 } } },
        ]);

        const byGradeId = new Map(agg.map((x) => [String(x._id), Number(x.subjectsCount || 0)]));
        const grades = await Grade.find({}).select('gradeName').sort({ gradeName: 1 }).lean();

        return Array.isArray(grades)
          ? grades.map((g) => ({
            gradeId: String(g._id),
            gradeName: g.gradeName,
            subjectsCount: byGradeId.get(String(g._id)) || 0,
          }))
          : [];
      })()
      : Promise.resolve(null),
  ]);

  return {
    studentsActive: studentsCount,
    teachersActive: teachersCount,
    examsTotal: examsCount,
    announcementsTotal: announcementsCount,
    levelsTotal: gradesCount,
    subjectsTotal: subjectsCount,
    cohortsTotal: cohortsCount,
    classesTotal: classesCount,
    staffActive: staffUsersCount,
    subjectsPerLevel,
    scope: 'admin_staff',
  };
}

const argsStudentsList = z.object({
  q: z.string().trim().max(80).optional(),
  gradeSectionId: z.string().trim().optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).strip();

async function toolStudentsList({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !hasPermission(user, 'students', 'view') && !hasPermission(user, 'students', 'full')) {
    throw new AiToolError('Missing permission: students.view', 403);
  }

  const limit = clampLimit(args?.limit, 50, 20);
  const q = String(args?.q || '').trim();
  const gradeSectionId = toId(args?.gradeSectionId);

  if (gradeSectionId) {
    const gsInfo = await hydrateGradeSectionShort(gradeSectionId);
    const enrollments = await Enrollment.find({ gradeSection: gradeSectionId, status: 'active' })
      .select('student')
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    const studentIds = enrollments.map((e) => e.student).filter(Boolean);
    const students = await Student.find({ _id: { $in: studentIds } })
      .select('fullName studentId gender status')
      .sort({ fullName: 1 })
      .limit(limit)
      .lean();

    return {
      scope: 'students_list',
      class: gsInfo,
      totalInClassActive: studentIds.length,
      returned: students.length,
      items: students.map((s) => ({
        fullName: s.fullName,
        studentId: s.studentId,
        gender: s.gender,
        status: s.status,
      })),
      note: students.length < studentIds.length ? 'List truncated by limit' : '',
    };
  }

  const filter = {};
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { fullName: { $regex: safe, $options: 'i' } },
      { studentId: { $regex: safe, $options: 'i' } },
    ];
  }

  const [totalActive, students] = await Promise.all([
    Student.countDocuments({ status: 'Active' }),
    Student.find(filter)
      .select('fullName studentId gender status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  return {
    scope: 'students_list',
    totalActive,
    returned: students.length,
    items: students.map((s) => ({
      fullName: s.fullName,
      studentId: s.studentId,
      gender: s.gender,
      status: s.status,
    })),
    note: 'Use gradeSectionId for class roster',
  };
}

const argsAcademicYearsList = z
  .object({
    q: z.string().trim().max(40).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  })
  .strip();

async function toolAcademicYearsList({ user, args }) {
  requireAuthUser(user);
  const limit = clampLimit(args?.limit, 20, 10);
  const q = String(args?.q || '').trim();
  const safe = q ? q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

  const filter = {};
  if (safe) filter.yearName = { $regex: safe, $options: 'i' };

  const rows = await AcademicYear.find(filter)
    .select('yearName createdAt')
    .sort({ yearName: -1, _id: -1 })
    .limit(limit)
    .lean();

  return {
    scope: 'academic_years_list',
    q: q || null,
    returned: rows.length,
    items: rows.map((y) => ({ academicYearId: String(y._id), yearName: y.yearName })),
  };
}

const argsGradeSectionsList = z
  .object({
    q: z.string().trim().max(80).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strip();

async function toolGradeSectionsList({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (
    isRole(user, 'staff')
    && !staffHasAnyOfModules(user, ['students', 'timetable', 'attendance'], ['view', 'full', 'add', 'edit', 'delete', 'print', 'download'])
  ) {
    throw new AiToolError('Missing permission: students.view', 403);
  }

  const limit = clampLimit(args?.limit, 50, 30);
  const q = String(args?.q || '').trim();
  const safe = q ? q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

  const filter = {};
  if (safe) {
    // We filter after population since grade/shift are refs.
    // Keep initial query wide and limit on output.
  }

  const rows = await GradeSection.find(filter)
    .select('section grade shift')
    .populate([{ path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' }])
    .sort({ section: 1, _id: 1 })
    .limit(500)
    .lean();

  let items = rows.map((gs) => ({
    gradeSectionId: String(gs._id),
    grade: gs.grade?.gradeName || null,
    shift: gs.shift?.shiftName || null,
    section: gs.section || null,
  }));

  if (safe) {
    const re = new RegExp(safe, 'i');
    items = items.filter((it) => re.test(String(it.grade || '')) || re.test(String(it.shift || '')) || re.test(String(it.section || '')));
  }

  items = items.slice(0, limit);

  return {
    scope: 'grade_sections_list',
    q: q || null,
    returned: items.length,
    items,
    note: rows.length > items.length ? 'List truncated by limit' : '',
  };
}

const argsSubjectsList = z
  .object({
    q: z.string().trim().max(80).optional(),
    limit: z.number().int().min(1).max(80).optional(),
  })
  .strip();

async function toolSubjectsList({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAnyOfModules(user, ['subjects', 'timetable', 'results', 'exams', 'transcript'], ['view', 'full', 'print', 'download'])) {
    throw new AiToolError('Missing permission: subjects.view', 403);
  }

  const limit = clampLimit(args?.limit, 80, 40);
  const q = String(args?.q || '').trim();
  const safe = q ? q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

  const filter = {};
  if (safe) {
    filter.$or = [{ subjectName: { $regex: safe, $options: 'i' } }, { subjectCode: { $regex: safe, $options: 'i' } }];
  }

  const rows = await Subject.find(filter)
    .select('subjectName subjectCode')
    .sort({ subjectName: 1 })
    .limit(limit)
    .lean();

  return {
    scope: 'subjects_list',
    q: q || null,
    returned: rows.length,
    items: rows.map((s) => ({
      subjectId: String(s._id),
      subjectName: s.subjectName || null,
      subjectCode: s.subjectCode || null,
    })),
  };
}

const argsTeacherLookup = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(20).optional(),
}).strip();

async function toolTeacherProfile({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !hasPermission(user, 'teachers', 'view') && !hasPermission(user, 'teachers', 'full')) {
    throw new AiToolError('Missing permission: teachers.view', 403);
  }

  const limit = clampLimit(args?.limit, 20, 5);
  const q = String(args?.q || '').trim();
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const teachers = await Teacher.find({
    $or: [
      { fullName: { $regex: safe, $options: 'i' } },
      { teacherId: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ],
  })
    .select('fullName teacherId employeeId email phone phone2 gender dob nationality residenceRegionId residenceDistrictId residenceNeighborhood hireDate employmentType salary status specialization qualification yearsOfExperience')
    .sort({ fullName: 1 })
    .limit(limit)
    .lean();

  const teacherIds = teachers.map((t) => t._id);
  const linkedUsers = await User.find({ teacherRef: { $in: teacherIds } })
    .select('fullName username email phone phone2 role status mustChangePassword')
    .lean();
  const userByTeacherId = new Map(linkedUsers.map((u) => [String(u.teacherRef), u]));

  return {
    scope: 'teacher_profile',
    returned: teachers.length,
    items: teachers.map((t) => {
      const u = userByTeacherId.get(String(t._id)) || null;
      return {
        teacher: {
          fullName: t.fullName,
          teacherId: t.teacherId,
          employeeId: t.employeeId || null,
          email: t.email || null,
          phone: t.phone || null,
          phone2: t.phone2 || null,
          gender: t.gender || null,
          dob: t.dob || null,
          nationality: t.nationality || null,
          residence: {
            regionId: t.residenceRegionId || '',
            districtId: t.residenceDistrictId || '',
            neighborhood: t.residenceNeighborhood || '',
          },
          hireDate: t.hireDate || null,
          employmentType: t.employmentType || null,
          salary: Number.isFinite(Number(t.salary)) ? Number(t.salary) : 0,
          status: t.status || null,
          specialization: t.specialization || '',
          qualification: t.qualification || '',
          yearsOfExperience: Number.isFinite(Number(t.yearsOfExperience)) ? Number(t.yearsOfExperience) : 0,
        },
        userAccount: u
          ? {
              username: u.username || null,
              email: u.email || null,
              phone: u.phone || null,
              phone2: u.phone2 || null,
              role: u.role || null,
              status: u.status || null,
              mustChangePassword: Boolean(u.mustChangePassword),
            }
          : null,
      };
    }),
  };
}

const argsDateClass = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  gradeSectionId: z.string().trim().min(1),
  periodCode: z.string().trim().max(20).optional(),
  limit: z.number().int().min(1).max(80).optional(),
}).strip();

async function attendanceSummaryForClass({ date, gradeSectionId, periodCode, limit }) {
  const day = parseISODateOnly(date);
  if (!day) throw new AiToolError('Invalid date', 400);
  const from = startOfDayUTC(day);
  const to = endOfDayUTC(day);

  const gsId = toId(gradeSectionId);
  if (!gsId) throw new AiToolError('Invalid gradeSectionId', 400);

  const match = {
    gradeSection: gsId,
    date: { $gte: from, $lte: to },
  };
  if (periodCode) match.periodCode = String(periodCode);

  const rows = await AttendanceRecord.find(match)
    .select('student status periodCode markedBy markedByUser markedByRole updatedByUser updatedByRole createdAt updatedAt')
    .lean();

  const counts = {};
  for (const r of rows) {
    const st = String(r.status || 'unknown');
    counts[st] = (counts[st] || 0) + 1;
  }

  const absent = rows.filter((r) => String(r.status) === 'absent');
  const absentIds = Array.from(new Set(absent.map((r) => String(r.student || '')).filter(Boolean)));
  const absentStudents = await Student.find({ _id: { $in: absentIds } })
    .select('fullName studentId')
    .sort({ fullName: 1 })
    .lean();
  const absentById = new Map(absentStudents.map((s) => [String(s._id), s]));

  const actorsKey = (role, id) => `${String(role || '')}:${String(id || '')}`;
  const actorCounts = new Map();
  for (const r of rows) {
    if (!r.markedByRole) continue;
    const key = actorsKey(r.markedByRole, r.markedByUser || r.markedBy || '');
    actorCounts.set(key, (actorCounts.get(key) || 0) + 1);
  }

  const actorItems = [];
  for (const [key, c] of actorCounts.entries()) {
    const [role, rawId] = key.split(':');
    let display = null;
    if (role === 'teacher') {
      const t = await Teacher.findById(rawId).select('fullName teacherId').lean();
      display = t ? { fullName: t.fullName, code: t.teacherId } : null;
    } else {
      display = await resolveUserDisplay(rawId);
    }
    actorItems.push({ role, count: c, actor: display });
  }
  actorItems.sort((a, b) => (b.count || 0) - (a.count || 0));

  const gsInfo = await hydrateGradeSectionShort(gsId);
  const lim = clampLimit(limit, 80, 40);

  return {
    class: gsInfo,
    date,
    periodCode: periodCode || null,
    counts,
    absent: absentStudents.slice(0, lim).map((s) => ({ fullName: s.fullName, studentId: s.studentId })),
    absentTotal: absentIds.length,
    markedBy: actorItems.slice(0, 10),
    note: absentIds.length > lim ? 'Absent list truncated by limit' : '',
  };
}

async function toolAttendanceClassSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'attendance', ['view', 'full'])) {
    throw new AiToolError('Missing permission: attendance.view', 403);
  }
  return {
    scope: 'attendance_class_summary',
    ...(await attendanceSummaryForClass({
      date: args.date,
      gradeSectionId: args.gradeSectionId,
      periodCode: args.periodCode,
      limit: args.limit,
    })),
  };
}

async function toolTeacherClassRoster({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['teacher']);

  const gsId = toId(args?.gradeSectionId);
  if (!gsId) throw new AiToolError('Invalid gradeSectionId', 400);
  const ok = await teacherHasGradeSection(user, gsId);
  if (!ok) throw new AiToolError('Forbidden (not assigned to this class)', 403);

  const limit = clampLimit(args?.limit, 80, 50);

  const enrollments = await Enrollment.find({ gradeSection: gsId, status: 'active' })
    .select('student')
    .sort({ createdAt: 1 })
    .limit(1500)
    .lean();
  const studentIds = enrollments.map((e) => e.student).filter(Boolean);
  const students = await Student.find({ _id: { $in: studentIds } })
    .select('fullName studentId gender status')
    .sort({ fullName: 1 })
    .limit(limit)
    .lean();

  return {
    scope: 'teacher_class_roster',
    class: await hydrateGradeSectionShort(gsId),
    totalActive: studentIds.length,
    returned: students.length,
    items: students.map((s) => ({
      fullName: s.fullName,
      studentId: s.studentId,
      gender: s.gender,
      status: s.status,
    })),
    note: students.length < studentIds.length ? 'List truncated by limit' : '',
  };
}

async function toolTeacherAttendanceClassSummary({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['teacher']);
  const ok = await teacherHasGradeSection(user, args.gradeSectionId);
  if (!ok) throw new AiToolError('Forbidden (not assigned to this class)', 403);
  return {
    scope: 'teacher_attendance_class_summary',
    ...(await attendanceSummaryForClass({
      date: args.date,
      gradeSectionId: args.gradeSectionId,
      periodCode: args.periodCode,
      limit: args.limit,
    })),
  };
}

const argsRange = z.object({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(50).optional(),
}).strip();

function parseRangeOrDefault(args) {
  const now = new Date();
  const def = monthRangeUTC(now);
  const from = args?.from ? parseISODateOnly(args.from) : def.from;
  const to = args?.to ? endOfDayUTC(parseISODateOnly(args.to) || def.to) : def.to;
  return { from: from || def.from, to: to || def.to };
}

async function toolTransfersSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'transfers', ['view', 'transfer', 'full'])) {
    throw new AiToolError('Missing permission: transfers.view', 403);
  }

  const { from, to } = parseRangeOrDefault(args);
  const limit = clampLimit(args?.limit, 50, 20);

  const logs = await TransferLog.find({ date: { $gte: from, $lte: to } })
    .select('student fromGradeSection toGradeSection byUser date reason notes reverted')
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  const total = await TransferLog.countDocuments({ date: { $gte: from, $lte: to } });

  const studentIds = Array.from(new Set(logs.map((l) => String(l.student || '')).filter(Boolean)));
  const students = await Student.find({ _id: { $in: studentIds } }).select('fullName studentId').lean();
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  const userIds = Array.from(new Set(logs.map((l) => String(l.byUser || '')).filter(Boolean)));
  const users = await User.find({ _id: { $in: userIds } }).select('fullName username role').lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return {
    scope: 'transfers_summary',
    from: from.toISOString(),
    to: to.toISOString(),
    total,
    returned: logs.length,
    items: await Promise.all(logs.map(async (l) => {
      const s = studentById.get(String(l.student || '')) || null;
      const by = userById.get(String(l.byUser || '')) || null;
      return {
        student: s ? { fullName: s.fullName, studentId: s.studentId } : null,
        fromClass: l.fromGradeSection ? await hydrateGradeSectionShort(l.fromGradeSection) : null,
        toClass: l.toGradeSection ? await hydrateGradeSectionShort(l.toGradeSection) : null,
        byUser: by ? { fullName: by.fullName, username: by.username, role: by.role } : null,
        date: l.date,
        reason: l.reason || '',
        notes: l.notes || '',
        reverted: Boolean(l.reverted),
      };
    })),
    note: total > logs.length ? 'List truncated by limit' : '',
  };
}

const argsStudentQuery = z.object({
  q: z.string().trim().min(1).max(80),
  limit: z.number().int().min(1).max(30).optional(),
}).strip();

async function toolStudentTransferHistory({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'transfers', ['view', 'transfer', 'full']) && !staffHasAny(user, 'students', ['view', 'full'])) {
    throw new AiToolError('Missing permission: transfers.view', 403);
  }

  const limit = clampLimit(args?.limit, 30, 15);
  const q = String(args?.q || '').trim();
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const student = await Student.findOne({
    $or: [
      { studentId: q },
      { fullName: { $regex: safe, $options: 'i' } },
    ],
  }).select('fullName studentId').lean();
  if (!student) throw new AiToolError('Student not found', 404);

  const logs = await TransferLog.find({ student: student._id })
    .select('fromGradeSection toGradeSection byUser date reason notes reverted')
    .sort({ date: -1 })
    .limit(limit)
    .lean();

  return {
    scope: 'student_transfer_history',
    student: { fullName: student.fullName, studentId: student.studentId },
    returned: logs.length,
    items: await Promise.all(logs.map(async (l) => ({
      date: l.date,
      fromClass: l.fromGradeSection ? await hydrateGradeSectionShort(l.fromGradeSection) : null,
      toClass: l.toGradeSection ? await hydrateGradeSectionShort(l.toGradeSection) : null,
      reason: l.reason || '',
      notes: l.notes || '',
      reverted: Boolean(l.reverted),
    }))),
    note: 'Transfer logs are per-student history',
  };
}

async function toolPromotionsSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'promotions', ['view', 'preview', 'promote', 'full'])) {
    throw new AiToolError('Missing permission: promotions.view', 403);
  }

  const { from, to } = parseRangeOrDefault(args);
  const limit = clampLimit(args?.limit, 50, 20);

  // Promotions are tracked via Enrollment status='promoted' and leftAt timestamp.
  const match = { status: 'promoted', leftAt: { $gte: from, $lte: to } };
  const [total, rows] = await Promise.all([
    Enrollment.countDocuments(match),
    Enrollment.find(match)
      .select('student gradeSection leftAt')
      .sort({ leftAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const studentIds = Array.from(new Set(rows.map((r) => String(r.student || '')).filter(Boolean)));
  const students = await Student.find({ _id: { $in: studentIds } }).select('fullName studentId').lean();
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  return {
    scope: 'promotions_summary',
    from: from.toISOString(),
    to: to.toISOString(),
    total,
    returned: rows.length,
    items: await Promise.all(rows.map(async (r) => ({
      student: studentById.get(String(r.student || ''))
        ? {
            fullName: studentById.get(String(r.student || '')).fullName,
            studentId: studentById.get(String(r.student || '')).studentId,
          }
        : null,
      fromClass: r.gradeSection ? await hydrateGradeSectionShort(r.gradeSection) : null,
      promotedAt: r.leftAt || null,
    }))),
    note: total > rows.length ? 'List truncated by limit' : '',
  };
}

async function toolAnnouncementsSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'announcements', ['add', 'edit', 'delete', 'full'])) {
    throw new AiToolError('Missing permission: announcements.*', 403);
  }

  const { from, to } = parseRangeOrDefault(args);
  const total = await Announcement.countDocuments({ createdAt: { $gte: from, $lte: to } });
  return {
    scope: 'announcements_summary',
    from: from.toISOString(),
    to: to.toISOString(),
    total,
  };
}

async function toolActivitySummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'security', ['view', 'full'])) {
    throw new AiToolError('Missing permission: security.view', 403);
  }

  const { from, to } = parseRangeOrDefault(args);
  const rows = await AuditLog.find({ timestamp: { $gte: from, $lte: to } })
    .select('user action timestamp')
    .limit(5000)
    .lean();

  const byAction = {};
  const byUser = new Map();
  for (const r of rows) {
    const act = String(r.action || 'unknown');
    byAction[act] = (byAction[act] || 0) + 1;
    const uid = String(r.user || '');
    if (uid) byUser.set(uid, (byUser.get(uid) || 0) + 1);
  }

  const topUsers = Array.from(byUser.entries())
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);

  const resolvedTopUsers = [];
  for (const u of topUsers) {
    const display = await resolveUserDisplay(u.userId);
    resolvedTopUsers.push({ user: display, count: u.count });
  }

  const topActions = Object.entries(byAction)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 25);

  return {
    scope: 'activity_summary',
    from: from.toISOString(),
    to: to.toISOString(),
    totalEvents: rows.length,
    topActions,
    topUsers: resolvedTopUsers,
    note: 'This summarizes AuditLog (mutations + auth.login).',
  };
}

async function toolLoginsToday({ user }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'security', ['view', 'full'])) {
    throw new AiToolError('Missing permission: security.view', 403);
  }

  const now = new Date();
  const from = startOfDayUTC(now);
  const to = endOfDayUTC(now);

  const rows = await AuditLog.find({
    action: 'auth.login',
    timestamp: { $gte: from, $lte: to },
  })
    .select('user timestamp')
    .sort({ timestamp: -1 })
    .limit(5000)
    .lean();

  const byUser = new Map();
  for (const r of rows) {
    const uid = String(r.user || '');
    if (!uid) continue;
    byUser.set(uid, (byUser.get(uid) || 0) + 1);
  }

  const top = Array.from(byUser.entries())
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 50);

  const out = [];
  for (const u of top) {
    out.push({ user: await resolveUserDisplay(u.userId), loginCount: u.count });
  }

  return {
    scope: 'logins_today',
    date: from.toISOString().slice(0, 10),
    uniqueUsers: byUser.size,
    totalLoginEvents: rows.length,
    users: out,
    note: 'This is login activity today (not live online presence).',
  };
}

async function toolTeacherAssignments({ user }) {
  requireAuthUser(user);
  requireRole(user, ['teacher']);

  const teacherId = toId(user.teacherRef);
  if (!teacherId) throw new AiToolError('Teacher profile not linked', 403);

  const assignments = await TeacherAssignment.find({ teacher: teacherId })
    .select('gradeSection subject')
    .lean();

  const gradeSectionIds = Array.from(
    new Set((assignments || []).map((a) => String(a.gradeSection || '')).filter(Boolean))
  );
  const subjectIds = Array.from(new Set((assignments || []).map((a) => String(a.subject || '')).filter(Boolean)));

  const [gradeSections, subjects] = await Promise.all([
    GradeSection.find({ _id: { $in: gradeSectionIds } }).select('grade shift section').lean(),
    Subject.find({ _id: { $in: subjectIds } }).select('subjectName subjectCode').lean(),
  ]);

  const gradeIds = Array.from(new Set((gradeSections || []).map((g) => String(g.grade || '')).filter(Boolean)));
  const shiftIds = Array.from(new Set((gradeSections || []).map((g) => String(g.shift || '')).filter(Boolean)));

  const [grades, shifts] = await Promise.all([
    Grade.find({ _id: { $in: gradeIds } }).select('gradeName').lean(),
    Shift.find({ _id: { $in: shiftIds } }).select('shiftName').lean(),
  ]);

  const gradeById = new Map((grades || []).map((g) => [String(g._id), g]));
  const shiftById = new Map((shifts || []).map((s) => [String(s._id), s]));
  const gsById = new Map((gradeSections || []).map((g) => [String(g._id), g]));
  const subjectById = new Map((subjects || []).map((s) => [String(s._id), s]));

  const items = (assignments || []).map((a) => {
    const gs = gsById.get(String(a.gradeSection || ''));
    const subj = subjectById.get(String(a.subject || ''));
    const grade = gs ? gradeById.get(String(gs.grade || '')) : null;
    const shift = gs ? shiftById.get(String(gs.shift || '')) : null;

    return {
      gradeSection: gs
        ? {
            section: gs.section,
            grade: grade ? grade.gradeName : null,
            shift: shift ? shift.shiftName : null,
          }
        : null,
      subject: subj
        ? { subjectName: subj.subjectName, subjectCode: subj.subjectCode }
        : null,
    };
  });

  return {
    assignments: items,
    scope: 'teacher_assignment',
  };
}

async function toolStudentSelfSummary({ user }) {
  requireAuthUser(user);
  requireRole(user, ['student']);

  const studentId = toId(user.studentRef);
  if (!studentId) throw new AiToolError('Student profile not linked', 403);

  const [student, enrollment] = await Promise.all([
    Student.findById(studentId).select('fullName studentId gender status').lean(),
    findLatestEnrollmentForStudent(studentId),
  ]);

  if (!student) throw new AiToolError('Student not found', 404);

  const gsId = enrollment ? toId(enrollment.gradeSection) : null;
  const gs = gsId ? await hydrateGradeSection(gsId) : null;

  return {
    student: {
      fullName: student.fullName,
      studentId: student.studentId,
      gender: student.gender,
      status: student.status,
    },
    class: gs,
    scope: 'student_self',
  };
}

const argsDayFilter = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  limit: z.number().int().min(1).max(80).optional(),
}).strip();

async function toolTimetableStudentSelf({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['student']);
  const gsId = await getStudentActiveGradeSectionId(user);
  if (!gsId) return { scope: 'student_timetable_self', items: [], note: 'No active enrollment' };

  const q = { gradeSection: gsId };
  if (args.dayOfWeek != null) q.dayOfWeek = args.dayOfWeek;

  const limit = clampLimit(args?.limit, 80, 80);
  const rows = await Timetable.find(q)
    .select('gradeSection subject teacher isBreak dayOfWeek startTime endTime room')
    .populate('subject', 'subjectName')
    .populate('teacher', 'fullName')
    .sort({ dayOfWeek: 1, startTime: 1 })
    .limit(limit)
    .lean();

  return {
    scope: 'student_timetable_self',
    class: await hydrateGradeSectionShort(gsId),
    returned: rows.length,
    items: rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      isBreak: Boolean(r.isBreak),
      subjectName: r.isBreak ? 'Break' : (r.subject?.subjectName || null),
      teacherName: r.isBreak ? null : (r.teacher?.fullName || null),
      room: r.room || null,
    })),
  };
}

const argsTeacherTimetable = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  mineOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
}).strip();

async function toolTimetableTeacherSelf({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['teacher']);

  const teacherId = toId(user?.teacherRef);
  if (!teacherId) throw new AiToolError('Teacher account is missing teacherRef', 403);

  const allowedGs = await getTeacherAllowedGradeSectionIds(user);
  if (!allowedGs.length) return { scope: 'teacher_timetable_self', items: [], note: 'No assigned classes' };

  const q = { gradeSection: { $in: allowedGs } };
  if (args.dayOfWeek != null) q.dayOfWeek = args.dayOfWeek;
  if (args.mineOnly) q.teacher = teacherId;

  const limit = clampLimit(args?.limit, 200, 200);
  const rows = await Timetable.find(q)
    .select('gradeSection subject teacher isBreak dayOfWeek startTime endTime room')
    .populate('subject', 'subjectName')
    .populate('teacher', 'fullName')
    .populate({ path: 'gradeSection', select: 'section grade shift', populate: [
      { path: 'grade', select: 'gradeName' },
      { path: 'shift', select: 'shiftName' },
    ]})
    .sort({ dayOfWeek: 1, startTime: 1 })
    .limit(limit)
    .lean();

  return {
    scope: 'teacher_timetable_self',
    returned: rows.length,
    items: rows.map((r) => ({
      class: {
        grade: r.gradeSection?.grade?.gradeName || null,
        shift: r.gradeSection?.shift?.shiftName || null,
        section: r.gradeSection?.section || null,
      },
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      isBreak: Boolean(r.isBreak),
      subjectName: r.isBreak ? 'Break' : (r.subject?.subjectName || null),
      teacherName: r.isBreak ? null : (r.teacher?.fullName || null),
      room: r.room || null,
    })),
  };
}

const argsTimetableClass = z.object({
  gradeSectionId: z.string().trim().min(1),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  limit: z.number().int().min(1).max(200).optional(),
}).strip();

async function toolTimetableClassSlots({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'timetable', ['view', 'full', 'add', 'edit', 'delete', 'print', 'download'])) {
    // Match route behavior: attendance users may also need timetable read.
    if (!staffHasAny(user, 'attendance', ['view', 'edit', 'full'])) {
      throw new AiToolError('Missing permission: timetable.view (or attendance.view)', 403);
    }
  }

  const gsId = toId(args.gradeSectionId);
  if (!gsId) throw new AiToolError('Invalid gradeSectionId', 400);

  const q = { gradeSection: gsId };
  if (args.dayOfWeek != null) q.dayOfWeek = args.dayOfWeek;
  const limit = clampLimit(args?.limit, 200, 200);

  const rows = await Timetable.find(q)
    .select('subject teacher isBreak dayOfWeek startTime endTime room')
    .populate('subject', 'subjectName')
    .populate('teacher', 'fullName')
    .sort({ dayOfWeek: 1, startTime: 1 })
    .limit(limit)
    .lean();

  return {
    scope: 'timetable_class_slots',
    class: await hydrateGradeSectionShort(gsId),
    returned: rows.length,
    items: rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      isBreak: Boolean(r.isBreak),
      subjectName: r.isBreak ? 'Break' : (r.subject?.subjectName || null),
      teacherName: r.isBreak ? null : (r.teacher?.fullName || null),
      room: r.room || null,
    })),
  };
}

const argsAnnouncementsRecent = z.object({
  limit: z.number().int().min(1).max(20).optional(),
}).strip();

async function toolAnnouncementsRecent({ user, args }) {
  requireAuthUser(user);
  const limit = clampLimit(args?.limit, 20, 10);

  const role = String(user?.role || '').toLowerCase();
  const filters = [{ audienceType: 'all' }];

  if (role === 'student') {
    const gsId = await getStudentActiveGradeSectionId(user);
    if (gsId) {
      filters.push({ audienceType: 'gradeSections', audienceGradeSections: { $in: [gsId] } });
    }
  }
  if (role === 'teacher') {
    const allowed = await getTeacherAllowedGradeSectionIds(user);
    if (allowed.length) {
      filters.push({ audienceType: 'gradeSections', audienceGradeSections: { $in: allowed } });
    }
  }

  // Admin/Staff: can see all announcements (including scoped ones).
  const q = isStaffOrAdmin(user) ? {} : { $or: filters };
  const rows = await Announcement.find(q)
    .select('title body author role audienceType date')
    .sort({ date: -1, _id: -1 })
    .limit(limit)
    .lean();

  return {
    scope: 'announcements_recent',
    returned: rows.length,
    items: rows.map((a) => ({
      title: a.title,
      author: a.author || null,
      role: a.role || null,
      date: a.date || null,
      audienceType: a.audienceType || 'all',
      bodyPreview: String(a.body || '').slice(0, 500),
    })),
    note: 'Body is truncated to preview length.',
  };
}

const argsTranscriptIndex = z.object({
  studentId: z.string().trim().optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(10).optional(),
}).strip();

async function toolTranscriptSelfIndex({ user }) {
  requireAuthUser(user);
  requireRole(user, ['student']);
  const studentId = toId(user?.studentRef?._id || user?.studentRef);
  if (!studentId) throw new AiToolError('Student account missing studentRef', 403);

  const enrollments = await Enrollment.find({ student: studentId })
    .sort({ joinedAt: -1, createdAt: -1 })
    .select('_id academicYear gradeSection joinedAt leftAt status')
    .populate([
      { path: 'academicYear', select: 'yearName' },
      { path: 'gradeSection', select: 'section grade shift', populate: [
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' },
      ] },
    ])
    .lean();

  return {
    scope: 'transcript_self_index',
    returned: enrollments.length,
    items: enrollments.map((en) => ({
      enrollmentId: String(en._id),
      academicYear: en.academicYear?.yearName || null,
      class: {
        grade: en.gradeSection?.grade?.gradeName || null,
        shift: en.gradeSection?.shift?.shiftName || null,
        section: en.gradeSection?.section || null,
      },
      joinedAt: en.joinedAt || null,
      leftAt: en.leftAt || null,
      status: en.status || null,
    })),
  };
}

async function toolTranscriptStudentIndex({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAnyOfModules(user, ['transcript', 'students'], ['view', 'print', 'download', 'full', 'add', 'edit', 'delete'])) {
    throw new AiToolError('Missing permission: transcript.view (or students.view)', 403);
  }

  const limit = clampLimit(args?.limit, 10, 5);
  let studentId = toId(args?.studentId);

  if (!studentId) {
    const q = String(args?.q || '').trim();
    if (!q) throw new AiToolError('Missing studentId or q', 400);
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = await Student.find({
      $or: [
        { studentId: q },
        { fullName: { $regex: safe, $options: 'i' } },
      ],
    })
      .select('_id fullName studentId')
      .sort({ fullName: 1 })
      .limit(limit)
      .lean();
    if (!found.length) throw new AiToolError('Student not found', 404);
    // If multiple match, return choices.
    if (found.length > 1) {
      return {
        scope: 'transcript_student_index',
        matches: found.map((s) => ({ studentId: s.studentId, fullName: s.fullName, id: String(s._id) })),
        note: 'Multiple students matched. Re-run with studentId or exact id.',
      };
    }
    studentId = String(found[0]._id);
  }

  const enrollments = await Enrollment.find({ student: studentId })
    .sort({ joinedAt: -1, createdAt: -1 })
    .select('_id academicYear gradeSection joinedAt leftAt status')
    .populate([
      { path: 'academicYear', select: 'yearName' },
      { path: 'gradeSection', select: 'section grade shift', populate: [
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' },
      ] },
    ])
    .lean();

  const stu = await Student.findById(studentId).select('fullName studentId').lean();
  return {
    scope: 'transcript_student_index',
    student: stu ? { fullName: stu.fullName, studentId: stu.studentId } : null,
    returned: enrollments.length,
    items: enrollments.map((en) => ({
      enrollmentId: String(en._id),
      academicYear: en.academicYear?.yearName || null,
      class: {
        grade: en.gradeSection?.grade?.gradeName || null,
        shift: en.gradeSection?.shift?.shiftName || null,
        section: en.gradeSection?.section || null,
      },
      joinedAt: en.joinedAt || null,
      leftAt: en.leftAt || null,
      status: en.status || null,
    })),
  };
}

const argsTranscriptFull = z.object({
  studentId: z.string().trim().optional(),
  q: z.string().trim().max(80).optional(),
  mode: z.enum(['latest', 'full']).optional(),
  enrollmentId: z.string().trim().optional(),
  maxSubjects: z.number().int().min(1).max(80).optional(),
  limitEnrollments: z.number().int().min(1).max(6).optional(),
}).strip();

async function toolTranscriptSelfFull({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['student']);
  const studentId = toId(user?.studentRef?._id || user?.studentRef);
  if (!studentId) throw new AiToolError('Student account missing studentRef', 403);

  const mode = String(args?.mode || 'latest').toLowerCase();
  const enrollmentId = args?.enrollmentId ? toId(args.enrollmentId) : null;
  const limitEnrollments = clampLimit(args?.limitEnrollments, 6, mode === 'latest' ? 1 : 6);

  const filter = { student: studentId };
  if (enrollmentId) filter._id = enrollmentId;

  const enrollments = await Enrollment.find(filter)
    .sort(mode === 'latest' ? { joinedAt: -1, createdAt: -1 } : { joinedAt: 1, createdAt: 1 })
    .limit(mode === 'latest' && !filter._id ? 1 : limitEnrollments)
    .select('_id academicYear gradeSection joinedAt leftAt status')
    .populate([
      { path: 'academicYear', select: 'yearName' },
      {
        path: 'gradeSection',
        select: 'section grade shift',
        populate: [
          { path: 'grade', select: 'gradeName' },
          { path: 'shift', select: 'shiftName' },
        ],
      },
    ])
    .lean();

  const student = await Student.findById(studentId).select('fullName studentId').lean();

  const enriched = [];
  let anyTrunc = false;
  for (const en of enrollments) {
    const ayId = toId(en.academicYear?._id || en.academicYear);
    const gsId = toId(en.gradeSection?._id || en.gradeSection);
    if (!ayId || !gsId) continue;
    const tr = await computeExamTranscript({ academicYearId: ayId, gradeSectionId: gsId, studentId, requestedVersion: null });
    const { transcript, truncated } = truncateTranscript(tr, args?.maxSubjects);
    if (truncated) anyTrunc = true;
    enriched.push({
      enrollmentId: String(en._id),
      academicYear: en.academicYear?.yearName || null,
      class: {
        grade: en.gradeSection?.grade?.gradeName || null,
        shift: en.gradeSection?.shift?.shiftName || null,
        section: en.gradeSection?.section || null,
      },
      joinedAt: en.joinedAt || null,
      leftAt: en.leftAt || null,
      status: en.status || null,
      transcript: {
        examTypes: transcript.examTypes,
        rows: transcript.rows,
        overall: transcript.overall,
        templateVersion: transcript.templateVersion,
      },
    });
  }

  const cumulativeTotal = enriched.reduce((a, e) => a + Number(e?.transcript?.overall?.total || 0), 0);
  const cumulativeAverage = enriched.length ? (cumulativeTotal / enriched.length) : 0;

  return {
    scope: 'transcript_self_full',
    student: student ? { fullName: student.fullName, studentId: student.studentId } : null,
    mode,
    returned: enriched.length,
    enrollments: enriched,
    summary: { cumulativeTotal, cumulativeAverage },
    note: anyTrunc ? 'Some enrollments were truncated by maxSubjects' : '',
  };
}

async function toolTranscriptStudentFull({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAnyOfModules(user, ['transcript', 'students', 'results', 'exams'], ['view', 'print', 'download', 'full'])) {
    throw new AiToolError('Missing permission: transcript.view', 403);
  }

  let studentId = toId(args?.studentId);
  if (!studentId) {
    const q = String(args?.q || '').trim();
    if (!q) throw new AiToolError('Missing studentId or q', 400);
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = await Student.find({
      $or: [
        { studentId: q },
        { fullName: { $regex: safe, $options: 'i' } },
      ],
    })
      .select('_id fullName studentId')
      .sort({ fullName: 1 })
      .limit(5)
      .lean();
    if (!found.length) throw new AiToolError('Student not found', 404);
    if (found.length > 1) {
      return {
        scope: 'transcript_student_full',
        matches: found.map((s) => ({ studentId: s.studentId, fullName: s.fullName, id: String(s._id) })),
        note: 'Multiple students matched. Re-run with studentId or exact id.',
      };
    }
    studentId = String(found[0]._id);
  }

  const mode = String(args?.mode || 'latest').toLowerCase();
  const enrollmentId = args?.enrollmentId ? toId(args.enrollmentId) : null;
  const limitEnrollments = clampLimit(args?.limitEnrollments, 6, mode === 'latest' ? 1 : 3);

  const filter = { student: studentId };
  if (enrollmentId) filter._id = enrollmentId;

  const enrollments = await Enrollment.find(filter)
    .sort(mode === 'latest' ? { joinedAt: -1, createdAt: -1 } : { joinedAt: 1, createdAt: 1 })
    .limit(mode === 'latest' && !filter._id ? 1 : limitEnrollments)
    .select('_id academicYear gradeSection joinedAt leftAt status')
    .populate([
      { path: 'academicYear', select: 'yearName' },
      {
        path: 'gradeSection',
        select: 'section grade shift',
        populate: [
          { path: 'grade', select: 'gradeName' },
          { path: 'shift', select: 'shiftName' },
        ],
      },
    ])
    .lean();

  const student = await Student.findById(studentId).select('fullName studentId').lean();
  const enriched = [];
  let anyTrunc = false;
  for (const en of enrollments) {
    const ayId = toId(en.academicYear?._id || en.academicYear);
    const gsId = toId(en.gradeSection?._id || en.gradeSection);
    if (!ayId || !gsId) continue;
    const tr = await computeExamTranscript({ academicYearId: ayId, gradeSectionId: gsId, studentId, requestedVersion: null });
    const { transcript, truncated } = truncateTranscript(tr, args?.maxSubjects);
    if (truncated) anyTrunc = true;
    enriched.push({
      enrollmentId: String(en._id),
      academicYear: en.academicYear?.yearName || null,
      class: {
        grade: en.gradeSection?.grade?.gradeName || null,
        shift: en.gradeSection?.shift?.shiftName || null,
        section: en.gradeSection?.section || null,
      },
      joinedAt: en.joinedAt || null,
      leftAt: en.leftAt || null,
      status: en.status || null,
      transcript: {
        examTypes: transcript.examTypes,
        rows: transcript.rows,
        overall: transcript.overall,
        templateVersion: transcript.templateVersion,
      },
    });
  }

  const cumulativeTotal = enriched.reduce((a, e) => a + Number(e?.transcript?.overall?.total || 0), 0);
  const cumulativeAverage = enriched.length ? (cumulativeTotal / enriched.length) : 0;

  return {
    scope: 'transcript_student_full',
    student: student ? { fullName: student.fullName, studentId: student.studentId } : null,
    mode,
    returned: enriched.length,
    enrollments: enriched,
    summary: { cumulativeTotal, cumulativeAverage },
    note: anyTrunc ? 'Some enrollments were truncated by maxSubjects' : '',
  };
}

const argsAttendanceRange = z.object({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strip();

async function toolStudentAttendanceSelfRangeSummary({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['student']);
  const studentId = toId(user?.studentRef?._id || user?.studentRef);
  if (!studentId) throw new AiToolError('Student account missing studentRef', 403);

  const fromDay = parseISODateOnly(args.from);
  const toDay = parseISODateOnly(args.to);
  if (!fromDay || !toDay) throw new AiToolError('Invalid date range', 400);
  const from = startOfDayUTC(fromDay);
  const to = endOfDayUTC(toDay);
  enforceMaxRangeDays({ user, from, to });

  const rows = await AttendanceRecord.find({ student: studentId, date: { $gte: from, $lte: to } })
    .select('date status periodCode remarks gradeSection')
    .sort({ date: -1 })
    .limit(5000)
    .lean();

  const counts = {};
  for (const r of rows) {
    const st = String(r.status || 'unknown');
    counts[st] = (counts[st] || 0) + 1;
  }

  const absentDays = new Set(rows.filter((r) => String(r.status) === 'absent').map((r) => String(r.date).slice(0, 10)));

  return {
    scope: 'student_attendance_self_range_summary',
    from: args.from,
    to: args.to,
    totalMarkedRecords: rows.length,
    counts,
    absentDaysCount: absentDays.size,
    note: 'This is a summary; it does not list every record.'
  };
}

const argsStudentFeeInvoicesSelf = z
  .object({
    month: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
    limit: z.number().int().min(1).max(30).optional(),
    includeItems: z.boolean().optional(),
  })
  .strip();

async function toolStudentFeeInvoicesSelfSummary({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['student']);

  const studentId = toId(user.studentRef);
  if (!studentId) throw new AiToolError('Student profile not linked', 403);

  const limit = clampLimit(args?.limit, 30, 12);
  const includeItems = Boolean(args?.includeItems);

  const q = { student: studentId };
  if (args?.month) q.billingMonth = args.month;

  const rows = await FeeInvoice.find(q)
    .select(includeItems ? 'title billingMonth status amount paidAmount balance dueDate items discounts isWaived waiverReason isHormaris' : 'title billingMonth status amount paidAmount balance dueDate isWaived isHormaris')
    .sort({ dueDate: -1, createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  const totals = rows.reduce(
    (acc, inv) => {
      acc.count += 1;
      acc.totalAmount += Number(inv.amount || 0);
      acc.totalPaidAmount += Number(inv.paidAmount || 0);
      acc.totalBalance += Number(inv.balance || 0);
      return acc;
    },
    { count: 0, totalAmount: 0, totalPaidAmount: 0, totalBalance: 0 }
  );

  return {
    scope: 'student_fee_invoices_self_summary',
    month: args?.month || null,
    totals: {
      count: Number(totals.count || 0),
      totalAmount: Number(totals.totalAmount || 0),
      totalPaidAmount: Number(totals.totalPaidAmount || 0),
      totalBalance: Number(totals.totalBalance || 0),
    },
    returned: rows.length,
    items: rows.map((inv) => ({
      title: inv.title,
      billingMonth: inv.billingMonth || null,
      status: inv.status,
      amount: Number(inv.amount || 0),
      paidAmount: Number(inv.paidAmount || 0),
      balance: Number(inv.balance || 0),
      dueDate: inv.dueDate || null,
      isWaived: Boolean(inv.isWaived),
      isHormaris: Boolean(inv.isHormaris),
      items: includeItems ? (inv.items || []).map((it) => ({ name: it.name, amount: Number(it.amount || 0) })) : undefined,
      discounts: includeItems ? (inv.discounts || []).map((d) => ({ name: d.name, type: d.type, value: Number(d.value || 0), amountOff: Number(d.amountOff || 0) })) : undefined,
    })),
    note: rows.length >= limit ? 'List truncated by limit' : '',
  };
}

const argsAttendanceClassRange = z.object({
  gradeSectionId: z.string().trim().min(1),
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodCode: z.string().trim().max(10).optional(),
  dailyLimit: z.number().int().min(1).max(31).optional(),
}).strip();

function dayKeyUTC(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

async function toolAttendanceClassRangeSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'attendance', ['view', 'full'])) throw new AiToolError('Missing permission: attendance.view', 403);

  const gsId = toId(args.gradeSectionId);
  if (!gsId) throw new AiToolError('Invalid gradeSectionId', 400);

  const fromDay = parseISODateOnly(args.from);
  const toDay = parseISODateOnly(args.to);
  if (!fromDay || !toDay) throw new AiToolError('Invalid date range', 400);
  const from = startOfDayUTC(fromDay);
  const to = endOfDayUTC(toDay);
  enforceMaxRangeDays({ user, from, to });

  const q = { gradeSection: gsId, date: { $gte: from, $lte: to } };
  if (args.periodCode) q.periodCode = String(args.periodCode);

  const rows = await AttendanceRecord.find(q)
    .select('date status periodCode')
    .sort({ date: 1 })
    .limit(200000)
    .lean();

  const counts = {};
  const daily = new Map();
  for (const r of rows) {
    const st = String(r.status || 'unknown');
    counts[st] = (counts[st] || 0) + 1;
    const k = dayKeyUTC(r.date);
    const ent = daily.get(k) || { date: k, counts: {} };
    ent.counts[st] = (ent.counts[st] || 0) + 1;
    daily.set(k, ent);
  }

  const dailyLimit = clampLimit(args?.dailyLimit, 31, 14);
  const dailyItems = Array.from(daily.values()).slice(-dailyLimit);

  return {
    scope: 'attendance_class_range_summary',
    class: await hydrateGradeSectionShort(gsId),
    from: args.from,
    to: args.to,
    periodCode: args.periodCode || null,
    totalRecords: rows.length,
    counts,
    daily: dailyItems,
    note: dailyItems.length < daily.size ? 'Daily breakdown truncated' : '',
  };
}

async function toolTeacherAttendanceClassRangeSummary({ user, args }) {
  requireAuthUser(user);
  requireRole(user, ['teacher']);
  const gsId = toId(args.gradeSectionId);
  if (!gsId) throw new AiToolError('Invalid gradeSectionId', 400);
  const ok = await teacherHasGradeSection(user, gsId);
  if (!ok) throw new AiToolError('Forbidden: not assigned to this class', 403);

  const fromDay = parseISODateOnly(args.from);
  const toDay = parseISODateOnly(args.to);
  if (!fromDay || !toDay) throw new AiToolError('Invalid date range', 400);
  const from = startOfDayUTC(fromDay);
  const to = endOfDayUTC(toDay);
  enforceMaxRangeDays({ user, from, to });

  const q = { gradeSection: gsId, date: { $gte: from, $lte: to } };
  if (args.periodCode) q.periodCode = String(args.periodCode);

  const rows = await AttendanceRecord.find(q)
    .select('date status periodCode')
    .sort({ date: 1 })
    .limit(200000)
    .lean();

  const counts = {};
  const daily = new Map();
  for (const r of rows) {
    const st = String(r.status || 'unknown');
    counts[st] = (counts[st] || 0) + 1;
    const k = dayKeyUTC(r.date);
    const ent = daily.get(k) || { date: k, counts: {} };
    ent.counts[st] = (ent.counts[st] || 0) + 1;
    daily.set(k, ent);
  }

  const dailyLimit = clampLimit(args?.dailyLimit, 31, 14);
  const dailyItems = Array.from(daily.values()).slice(-dailyLimit);

  return {
    scope: 'teacher_attendance_class_range_summary',
    class: await hydrateGradeSectionShort(gsId),
    from: args.from,
    to: args.to,
    periodCode: args.periodCode || null,
    totalRecords: rows.length,
    counts,
    daily: dailyItems,
    note: dailyItems.length < daily.size ? 'Daily breakdown truncated' : '',
  };
}

const argsResultsClassSummary = z.object({
  academicYearId: z.string().trim().min(1),
  gradeSectionId: z.string().trim().min(1),
  mode: z.enum(['overall', 'subject', 'trend', 'difficulty']).optional(),
  subjectId: z.string().trim().optional(),
  templateVersion: z.number().int().min(1).optional(),
  topN: z.number().int().min(0).max(50).optional(),
  bottomN: z.number().int().min(0).max(50).optional(),
  enrollmentStatus: z.enum(['active', 'all', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn']).optional(),
}).strip();

async function toolResultsClassSummary({ user, args }) {
  requireAuthUser(user);
  const role = String(user?.role || '').toLowerCase();

  const academicYearId = toId(args.academicYearId);
  const gradeSectionId = toId(args.gradeSectionId);
  if (!academicYearId || !gradeSectionId) throw new AiToolError('Invalid academicYearId/gradeSectionId', 400);

  if (role === 'teacher') {
    const subjectId = toId(args.subjectId);
    if (!subjectId) throw new AiToolError('For teachers, subjectId is required (subject-only scope)', 400);
    const ok = await teacherHasAssignment(user, gradeSectionId, subjectId);
    if (!ok) throw new AiToolError('Forbidden: not assigned to this class+subject', 403);
  } else if (role === 'staff') {
    if (!staffHasAnyOfModules(user, ['results', 'exams', 'transcript'], ['view', 'print', 'download', 'full'])) {
      throw new AiToolError('Missing permission: results.view', 403);
    }
  } else if (role !== 'admin') {
    throw new AiToolError('Forbidden', 403);
  }

  const mode = String(args.mode || (role === 'teacher' ? 'subject' : 'overall')).toLowerCase();
  const subjectId = args.subjectId ? toId(args.subjectId) : null;
  if (mode === 'subject' && !subjectId) throw new AiToolError('subjectId is required for mode=subject', 400);
  if (role === 'teacher' && mode !== 'subject') throw new AiToolError('Teachers can only use mode=subject', 403);

  const version = await resolveTemplateVersionForContext({ academicYearId, gradeSectionId, requestedVersion: args.templateVersion });
  const exams = await Exam.find({ academicYear: academicYearId, gradeSection: gradeSectionId, templateVersion: version }).select('_id examType').lean();
  const examIds = exams.map((e) => e._id);
  if (!examIds.length) {
    return { scope: 'results_class_summary', mode, templateVersion: version, results: [], classAverage: 0, note: 'No exams found for this class/year/templateVersion' };
  }

  let statusFilter = ['active'];
  if (args.enrollmentStatus === 'all') {
    statusFilter = ['active', 'inactive', 'promoted', 'graduated', 'transferred', 'withdrawn'];
  } else if (args.enrollmentStatus && args.enrollmentStatus !== 'active') {
    statusFilter = [args.enrollmentStatus];
  }
  const enrolls = await Enrollment.find({ academicYear: academicYearId, gradeSection: gradeSectionId, status: { $in: statusFilter } })
    .select('student')
    .lean();
  const studentIds = [...new Set(enrolls.map((e) => String(e.student)))].filter((x) => toId(x));
  if (!studentIds.length) return { scope: 'results_class_summary', mode, templateVersion: version, results: [], classAverage: 0, note: 'No enrolled students found' };

  const studentsDocs = await Student.find({ _id: { $in: studentIds } }).select('fullName').lean();
  const nameMap = Object.fromEntries(studentsDocs.map((s) => [String(s._id), s.fullName]));

  let subjectIds = [];
  if (mode === 'subject') {
    subjectIds = [new mongoose.Types.ObjectId(subjectId)];
  } else {
    const gs = await GradeSection.findById(gradeSectionId).select('subjects').lean();
    subjectIds = (gs?.subjects || []).map((id) => new mongoose.Types.ObjectId(id));
  }
  if (!subjectIds.length) return { scope: 'results_class_summary', mode, templateVersion: version, results: [], classAverage: 0, note: 'No subjects assigned to this class' };

  const baseMatch = {
    exam: { $in: examIds },
    student: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
    subject: { $in: subjectIds },
  };

  if (mode === 'difficulty') {
    const perStuSub = await ExamScore.aggregate([
      { $match: baseMatch },
      { $group: { _id: { student: '$student', subject: '$subject' }, total: { $sum: '$scoreObtained' } } },
    ]);
    const perSubGroups = new Map();
    for (const row of perStuSub) {
      const sub = String(row._id.subject);
      const ent = perSubGroups.get(sub) || { sum: 0, count: 0 };
      ent.sum += Number(row.total || 0);
      ent.count += 1;
      perSubGroups.set(sub, ent);
    }
    const subDocs = await Subject.find({ _id: { $in: subjectIds } }).select('subjectName').lean();
    const subNameMap = Object.fromEntries(subDocs.map((s) => [String(s._id), s.subjectName]));
    const subjects = subjectIds
      .map((id) => {
        const key = String(id);
        const { sum = 0, count = 0 } = perSubGroups.get(key) || {};
        const average = count ? sum / count : 0;
        return { subjectId: key, subjectName: subNameMap[key] || 'Subject', average, count };
      })
      .sort((a, b) => a.average - b.average);
    const classAverage = subjects.length ? (subjects.reduce((a, b) => a + b.average, 0) / subjects.length) : 0;
    return { scope: 'results_class_summary', mode, templateVersion: version, classAverage, subjects };
  }

  if (mode === 'trend') {
    const types = await ExamType.find({ templateVersion: version }).select('_id typeName').lean();
    const midType = types.find((t) => /mid/i.test(String(t.typeName || '')));
    const finalType = types.find((t) => /final/i.test(String(t.typeName || '')));
    if (!midType || !finalType) return { scope: 'results_class_summary', mode, templateVersion: version, results: [], classAverage: 0, note: 'Mid/Final components not found' };
    const midExamIds = exams.filter((e) => String(e.examType) === String(midType._id)).map((e) => e._id);
    const finalExamIds = exams.filter((e) => String(e.examType) === String(finalType._id)).map((e) => e._id);
    if (!midExamIds.length && !finalExamIds.length) return { scope: 'results_class_summary', mode, templateVersion: version, results: [], classAverage: 0, note: 'No mid/final exams found' };

    const base = { student: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) }, subject: { $in: subjectIds } };
    const midAgg = await ExamScore.aggregate([
      { $match: { ...base, exam: { $in: midExamIds } } },
      { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } },
    ]);
    const finalAgg = await ExamScore.aggregate([
      { $match: { ...base, exam: { $in: finalExamIds } } },
      { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } },
    ]);
    const midMap = Object.fromEntries(midAgg.map((r) => [String(r._id), r.total]));
    const finalMap = Object.fromEntries(finalAgg.map((r) => [String(r._id), r.total]));

    let results = studentIds.map((sid) => {
      const mid = Number(midMap[sid] || 0);
      const fin = Number(finalMap[sid] || 0);
      const delta = fin - mid;
      return { studentId: sid, fullName: nameMap[sid] || 'Student', mid, final: fin, delta };
    });
    results.sort((a, b) => b.delta - a.delta);
    results = results.map((r, i) => ({ ...r, rank: i + 1 }));
    const topN = args?.topN ? clampLimit(args.topN, 50, 20) : 20;
    results = results.slice(0, topN);
    const classAverage = results.length ? (results.reduce((a, b) => a + b.delta, 0) / results.length) : 0;
    return { scope: 'results_class_summary', mode, templateVersion: version, results, classAverage };
  }

  const scores = await ExamScore.aggregate([
    { $match: baseMatch },
    { $group: { _id: '$student', total: { $sum: '$scoreObtained' } } },
  ]);
  const denom = mode === 'overall' ? (subjectIds.length || 1) : 1;
  let results = scores.map((s) => {
    const sid = String(s._id);
    const total = Number(s.total || 0);
    const average = denom ? total / denom : 0;
    return { studentId: sid, fullName: nameMap[sid] || 'Student', total, average };
  });
  results.sort((a, b) => b.total - a.total);
  results = results.map((r, idx) => ({ ...r, rank: idx + 1 }));

  const bottomN = args?.bottomN ? clampLimit(args.bottomN, 50, 0) : 0;
  const topN = args?.topN ? clampLimit(args.topN, 50, 20) : 20;
  if (bottomN > 0) {
    const lastN = results.slice(Math.max(results.length - bottomN, 0));
    results = lastN.sort((a, b) => a.total - b.total);
  } else {
    results = results.slice(0, topN);
  }

  const classAverage = results.length ? (results.reduce((a, b) => a + Number(b.average || 0), 0) / results.length) : 0;
  return {
    scope: 'results_class_summary',
    mode,
    templateVersion: version,
    class: await hydrateGradeSectionShort(gradeSectionId),
    academicYearId,
    results,
    classAverage,
    note: 'Results list is truncated; use topN/bottomN to control.',
  };
}

const argsFinanceRange = z.object({
  from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  groupBy: z.enum(['category', 'source', 'status']).optional(),
}).strip();

async function toolFinanceExpensesSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAnyOfModules(user, ['financeExpensesLedger', 'financeExpenses', 'financeDashboard', 'financeAudit'], ['view', 'full'])) {
    throw new AiToolError('Missing permission: financeExpensesLedger.view', 403);
  }

  const fromDay = parseISODateOnly(args.from);
  const toDay = parseISODateOnly(args.to);
  if (!fromDay || !toDay) throw new AiToolError('Invalid date range', 400);
  const from = startOfDayUTC(fromDay);
  const to = endOfDayUTC(toDay);
  enforceMaxRangeDays({ user, from, to });

  const match = { date: { $gte: from, $lte: to } };
  const groupBy = args.groupBy || 'category';
  const groupField = groupBy === 'source' ? '$source' : groupBy === 'status' ? '$status' : '$category';

  const agg = await Expense.aggregate([
    { $match: match },
    { $group: { _id: groupField, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { totalAmount: -1 } },
    { $limit: 50 },
  ]);

  const totalAgg = await Expense.aggregate([
    { $match: match },
    { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const totals = totalAgg?.[0] || { totalAmount: 0, count: 0 };

  return {
    scope: 'finance_expenses_summary',
    from: args.from,
    to: args.to,
    groupBy,
    totals: { totalAmount: Number(totals.totalAmount || 0), count: Number(totals.count || 0) },
    breakdown: agg.map((r) => ({ key: r._id || 'Unknown', totalAmount: Number(r.totalAmount || 0), count: Number(r.count || 0) })),
  };
}

const argsFinanceUnpaid = z.object({
  month: z.string().trim().regex(/^\d{4}-\d{2}$/),
  gradeSectionId: z.string().trim().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  includeAmounts: z.boolean().optional(),
}).strip();

async function toolFinanceUnpaidStudentsSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAnyOfModules(user, ['financeStudentReceipt', 'financeDashboard', 'financeAudit'], ['view', 'full', 'add', 'edit', 'delete'])) {
    throw new AiToolError('Missing permission: financeStudentReceipt.view', 403);
  }

  const gradeSectionId = toId(args.gradeSectionId);
  const limit = clampLimit(args?.limit, 50, 20);
  const includeAmounts = Boolean(args?.includeAmounts);

  const q = {
    billingMonth: args.month,
    status: { $in: ['Unpaid', 'Partial', 'Overdue'] },
    balance: { $gt: 0 },
  };
  if (gradeSectionId) q.class = gradeSectionId;

  const rows = await FeeInvoice.find(q)
    .select('student class billingMonth status amount paidAmount balance')
    .sort({ balance: -1, paidAmount: 1, _id: -1 })
    .limit(5000)
    .lean();

  const studentIds = Array.from(new Set(rows.map((r) => String(r.student || '')).filter(Boolean)));
  const students = await Student.find({ _id: { $in: studentIds } }).select('fullName studentId').lean();
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  const classIds = Array.from(new Set(rows.map((r) => String(r.class || '')).filter(Boolean)));
  const classes = await GradeSection.find({ _id: { $in: classIds } })
    .select('section grade shift')
    .populate([{ path: 'grade', select: 'gradeName' }, { path: 'shift', select: 'shiftName' }])
    .lean();
  const classById = new Map(classes.map((c) => [String(c._id), c]));

  const totalBalance = rows.reduce((a, b) => a + Number(b.balance || 0), 0);
  const totalAmount = rows.reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalPaid = rows.reduce((a, b) => a + Number(b.paidAmount || 0), 0);

  const items = rows.slice(0, limit).map((r) => {
    const s = studentById.get(String(r.student || ''));
    const c = classById.get(String(r.class || ''));
    const base = {
      student: s ? { fullName: s.fullName, studentId: s.studentId } : null,
      class: c ? { grade: c.grade?.gradeName || null, shift: c.shift?.shiftName || null, section: c.section || null } : null,
      status: r.status,
    };
    if (!includeAmounts) return base;
    return { ...base, amount: Number(r.amount || 0), paidAmount: Number(r.paidAmount || 0), balance: Number(r.balance || 0) };
  });

  return {
    scope: 'finance_unpaid_students_summary',
    month: args.month,
    totals: {
      invoices: rows.length,
      totalBalance: Number(totalBalance || 0),
      totalAmount: Number(totalAmount || 0),
      totalPaid: Number(totalPaid || 0),
    },
    returned: items.length,
    items,
    note: rows.length > items.length ? 'List truncated by limit' : '',
  };
}

const argsFinanceFeeTransactions = z
  .object({
    from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    groupBy: z.enum(['transactionType', 'method', 'status', 'account']).optional(),
  })
  .strip();

async function toolFinanceFeeTransactionsSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAnyOfModules(user, ['financeStudentReceipt', 'financeDashboard', 'financeAudit'], ['view', 'full'])) {
    throw new AiToolError('Missing permission: financeStudentReceipt.view', 403);
  }

  const fromDt = parseISODateOnly(args.from);
  const toDt = parseISODateOnly(args.to);
  if (!fromDt || !toDt) throw new AiToolError('Invalid date range', 400);

  const from = startOfDayUTC(fromDt);
  const to = endOfDayUTC(toDt);
  if (Number(from) > Number(to)) throw new AiToolError('Invalid date range (from > to)', 400);
  enforceMaxRangeDays({ user, from, to });

  const groupBy = String(args?.groupBy || 'transactionType');
  const match = { date: { $gte: from, $lte: to } };

  const groupExpr =
    groupBy === 'method'
      ? '$method'
      : groupBy === 'status'
        ? '$status'
        : groupBy === 'account'
          ? '$account'
          : '$transactionType';

  const [agg, totalsAgg] = await Promise.all([
    FeeTransaction.aggregate([
      { $match: match },
      { $group: { _id: groupExpr, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1, count: -1 } },
    ]),
    FeeTransaction.aggregate([
      { $match: match },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const totals = totalsAgg?.[0] || { totalAmount: 0, count: 0 };

  let breakdown = agg.map((r) => ({ key: r._id ?? 'Unknown', totalAmount: Number(r.totalAmount || 0), count: Number(r.count || 0) }));
  if (groupBy === 'account') {
    const ids = breakdown.map((b) => String(b.key || '')).filter((x) => mongoose.isValidObjectId(x));
    const accounts = await Account.find({ _id: { $in: ids } }).select('name type institution branch currency status').lean();
    const byId = new Map(accounts.map((a) => [String(a._id), a]));
    breakdown = breakdown.map((b) => {
      const a = byId.get(String(b.key || ''));
      return {
        ...b,
        key: a ? { id: String(a._id), name: a.name, type: a.type, institution: a.institution, branch: a.branch, currency: a.currency, status: a.status } : null,
      };
    });
  }

  return {
    scope: 'finance_fee_transactions_summary',
    from: args.from,
    to: args.to,
    groupBy,
    totals: { totalAmount: Number(totals.totalAmount || 0), count: Number(totals.count || 0) },
    breakdown,
  };
}

const argsFinanceAccountsBalances = z
  .object({
    status: z.enum(['active', 'inactive']).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strip();

async function toolFinanceAccountsBalances({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAnyOfModules(user, ['financeAccountsOverview', 'financeAccountsLedger', 'financeDashboard', 'financeAudit'], ['view', 'full'])) {
    throw new AiToolError('Missing permission: financeAccountsOverview.view', 403);
  }

  const limit = clampLimit(args?.limit, 50, 20);
  const status = args?.status ? String(args.status) : 'active';

  const rows = await Account.find({ status })
    .select('name type institution branch accountNumber balance currency status')
    .sort({ balance: -1, name: 1 })
    .limit(limit)
    .lean();

  const totalBalance = rows.reduce((sum, a) => sum + Number(a.balance || 0), 0);

  return {
    scope: 'finance_accounts_balances',
    status,
    returned: rows.length,
    totals: { totalBalance: Number(totalBalance || 0) },
    items: rows.map((a) => ({
      name: a.name,
      type: a.type,
      institution: a.institution,
      branch: a.branch,
      accountNumber: a.accountNumber,
      balance: Number(a.balance || 0),
      currency: a.currency,
      status: a.status,
    })),
  };
}

const argsFinanceFoundationDonations = z
  .object({
    from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    groupBy: z.enum(['method', 'project', 'account']).optional(),
    limit: z.number().int().min(1).max(30).optional(),
    includeTopDonors: z.boolean().optional(),
  })
  .strip();

async function toolFinanceFoundationDonationsSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'financeFoundation', ['view', 'add', 'edit', 'delete', 'full'])) {
    throw new AiToolError('Missing permission: financeFoundation.view', 403);
  }

  const fromDt = parseISODateOnly(args.from);
  const toDt = parseISODateOnly(args.to);
  if (!fromDt || !toDt) throw new AiToolError('Invalid date range', 400);
  const from = startOfDayUTC(fromDt);
  const to = endOfDayUTC(toDt);
  if (Number(from) > Number(to)) throw new AiToolError('Invalid date range (from > to)', 400);
  enforceMaxRangeDays({ user, from, to });

  const groupBy = String(args?.groupBy || 'method');
  const limit = clampLimit(args?.limit, 30, 10);
  const includeTopDonors = Boolean(args?.includeTopDonors);

  const match = { date: { $gte: from, $lte: to } };

  const groupExpr = groupBy === 'project' ? '$project' : groupBy === 'account' ? '$account' : '$method';

  const [agg, totalsAgg] = await Promise.all([
    Donation.aggregate([
      { $match: match },
      { $group: { _id: groupExpr, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1, count: -1 } },
    ]),
    Donation.aggregate([
      { $match: match },
      { $group: { _id: null, totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  const totals = totalsAgg?.[0] || { totalAmount: 0, count: 0 };

  let breakdown = agg.map((r) => ({ key: r._id ?? 'Unknown', totalAmount: Number(r.totalAmount || 0), count: Number(r.count || 0) }));

  if (groupBy === 'account') {
    const ids = breakdown.map((b) => String(b.key || '')).filter((x) => mongoose.isValidObjectId(x));
    const accounts = await Account.find({ _id: { $in: ids } }).select('name type institution branch currency status').lean();
    const byId = new Map(accounts.map((a) => [String(a._id), a]));
    breakdown = breakdown.map((b) => {
      const a = byId.get(String(b.key || ''));
      return {
        ...b,
        key: a ? { id: String(a._id), name: a.name, type: a.type, institution: a.institution, branch: a.branch, currency: a.currency, status: a.status } : null,
      };
    });
  }

  if (groupBy === 'project') {
    const ids = breakdown.map((b) => String(b.key || '')).filter((x) => mongoose.isValidObjectId(x));
    const cats = await FinanceCategory.find({ _id: { $in: ids } }).select('name type status').lean();
    const byId = new Map(cats.map((c) => [String(c._id), c]));
    breakdown = breakdown.map((b) => {
      const c = byId.get(String(b.key || ''));
      return {
        ...b,
        key: c ? { id: String(c._id), name: c.name, type: c.type, status: c.status } : null,
      };
    });
  }

  let topDonors = [];
  if (includeTopDonors) {
    const top = await Donation.aggregate([
      { $match: match },
      { $group: { _id: '$donor', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalAmount: -1, count: -1 } },
      { $limit: limit },
    ]);

    const donorIds = top.map((t) => String(t._id || '')).filter((x) => mongoose.isValidObjectId(x));
    const donors = await Donor.find({ _id: { $in: donorIds } }).select('name type status').lean();
    const byId = new Map(donors.map((d) => [String(d._id), d]));
    topDonors = top.map((t) => {
      const d = byId.get(String(t._id || ''));
      return {
        donor: d ? { id: String(d._id), name: d.name, type: d.type, status: d.status } : null,
        totalAmount: Number(t.totalAmount || 0),
        count: Number(t.count || 0),
      };
    });
  }

  return {
    scope: 'finance_foundation_donations_summary',
    from: args.from,
    to: args.to,
    groupBy,
    totals: { totalAmount: Number(totals.totalAmount || 0), count: Number(totals.count || 0) },
    breakdown,
    topDonors: includeTopDonors ? topDonors : undefined,
    note: includeTopDonors ? 'Top donors list truncated by limit' : 'Set includeTopDonors=true to include a truncated top donors list',
  };
}

const argsFinancePayrollMonthSummary = z
  .object({
    month: z.string().trim().regex(/^\d{4}-\d{2}$/),
    status: z.enum(['Draft', 'Approved', 'Paid']).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    includeStaffList: z.boolean().optional(),
  })
  .strip();

async function toolFinancePayrollMonthSummary({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'financePayroll', ['view', 'add', 'edit', 'delete', 'full'])) {
    throw new AiToolError('Missing permission: financePayroll.view', 403);
  }

  const match = { month: args.month };
  if (args?.status) match.status = args.status;

  const [byStatus, totalsAgg] = await Promise.all([
    Payroll.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBasicSalary: { $sum: '$basicSalary' },
          totalNetSalary: { $sum: '$netSalary' },
          totalPaidAmount: { $sum: '$paidAmount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payroll.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalBasicSalary: { $sum: '$basicSalary' },
          totalNetSalary: { $sum: '$netSalary' },
          totalPaidAmount: { $sum: '$paidAmount' },
        },
      },
    ]),
  ]);

  const totals = totalsAgg?.[0] || { count: 0, totalBasicSalary: 0, totalNetSalary: 0, totalPaidAmount: 0 };
  const breakdown = byStatus.map((r) => ({
    status: r._id || 'Unknown',
    count: Number(r.count || 0),
    totalBasicSalary: Number(r.totalBasicSalary || 0),
    totalNetSalary: Number(r.totalNetSalary || 0),
    totalPaidAmount: Number(r.totalPaidAmount || 0),
  }));

  const includeStaffList = Boolean(args?.includeStaffList);
  const limit = clampLimit(args?.limit, 50, 20);

  let topStaff = [];
  if (includeStaffList) {
    const rows = await Payroll.find(match)
      .select('staff month status basicSalary netSalary paidAmount paymentDate paymentMethod')
      .sort({ netSalary: -1, _id: -1 })
      .limit(limit)
      .populate({ path: 'staff', select: 'fullName username email role status' })
      .lean();

    topStaff = rows.map((p) => ({
      staff: p.staff
        ? {
            fullName: p.staff.fullName || null,
            username: p.staff.username || null,
            email: p.staff.email || null,
            role: p.staff.role || null,
            status: p.staff.status || null,
          }
        : null,
      month: p.month,
      status: p.status,
      basicSalary: Number(p.basicSalary || 0),
      netSalary: Number(p.netSalary || 0),
      paidAmount: Number(p.paidAmount || 0),
      paymentDate: p.paymentDate || null,
      paymentMethod: p.paymentMethod || null,
    }));
  }

  return {
    scope: 'finance_payroll_month_summary',
    month: args.month,
    filter: { status: args?.status || null },
    totals: {
      count: Number(totals.count || 0),
      totalBasicSalary: Number(totals.totalBasicSalary || 0),
      totalNetSalary: Number(totals.totalNetSalary || 0),
      totalPaidAmount: Number(totals.totalPaidAmount || 0),
    },
    breakdown,
    topStaff: includeStaffList ? topStaff : undefined,
    note: includeStaffList ? 'Staff list is truncated by limit' : 'Set includeStaffList=true to include a truncated staff list',
  };
}

const argsFinancePayrollStaffSearch = z
  .object({
    q: z.string().trim().min(1).max(80),
    limit: z.number().int().min(1).max(20).optional(),
  })
  .strip();

async function toolFinancePayrollStaffSearch({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'financePayroll', ['view', 'add', 'edit', 'delete', 'full'])) {
    throw new AiToolError('Missing permission: financePayroll.view', 403);
  }

  const limit = clampLimit(args?.limit, 20, 8);
  const q = String(args.q || '').trim();
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const rows = await User.find({
    $or: [{ fullName: { $regex: safe, $options: 'i' } }, { username: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }],
  })
    .select('fullName username email role status')
    .sort({ fullName: 1 })
    .limit(limit)
    .lean();

  return {
    scope: 'finance_payroll_staff_search',
    q,
    returned: rows.length,
    items: rows.map((u) => ({
      userId: String(u._id),
      fullName: u.fullName || null,
      username: u.username || null,
      email: u.email || null,
      role: u.role || null,
      status: u.status || null,
    })),
  };
}

const argsFinancePayrollStaffLedger = z
  .object({
    staffUserId: z.string().trim().min(1),
    fromMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
    toMonth: z.string().trim().regex(/^\d{4}-\d{2}$/).optional(),
    limit: z.number().int().min(1).max(60).optional(),
  })
  .strip();

async function toolFinancePayrollStaffLedger({ user, args }) {
  requireAuthUser(user);
  if (!isStaffOrAdmin(user)) throw new AiToolError('Forbidden', 403);
  if (isRole(user, 'staff') && !staffHasAny(user, 'financePayroll', ['view', 'add', 'edit', 'delete', 'full'])) {
    throw new AiToolError('Missing permission: financePayroll.view', 403);
  }

  const staffUserId = toId(args.staffUserId);
  if (!staffUserId) throw new AiToolError('Invalid staffUserId', 400);

  const fromMonth = args?.fromMonth ? String(args.fromMonth) : null;
  const toMonth = args?.toMonth ? String(args.toMonth) : null;
  if (fromMonth && toMonth && fromMonth > toMonth) throw new AiToolError('Invalid month range (fromMonth > toMonth)', 400);

  const staffUser = await User.findById(staffUserId).select('fullName username email role status').lean();
  if (!staffUser) throw new AiToolError('Staff user not found', 404);

  const q = { staff: staffUserId };
  if (fromMonth || toMonth) {
    q.month = {};
    if (fromMonth) q.month.$gte = fromMonth;
    if (toMonth) q.month.$lte = toMonth;
  }

  const limit = clampLimit(args?.limit, 60, 24);
  const rows = await Payroll.find(q)
    .select('month status basicSalary netSalary paidAmount paymentDate paymentMethod')
    .sort({ month: -1, _id: -1 })
    .limit(limit)
    .lean();

  const totals = rows.reduce(
    (acc, r) => {
      acc.count += 1;
      acc.totalNetSalary += Number(r.netSalary || 0);
      acc.totalPaidAmount += Number(r.paidAmount || 0);
      return acc;
    },
    { count: 0, totalNetSalary: 0, totalPaidAmount: 0 }
  );

  return {
    scope: 'finance_payroll_staff_ledger',
    staff: {
      userId: String(staffUser._id),
      fullName: staffUser.fullName || null,
      username: staffUser.username || null,
      email: staffUser.email || null,
      role: staffUser.role || null,
      status: staffUser.status || null,
    },
    filter: { fromMonth, toMonth },
    totals: {
      count: Number(totals.count || 0),
      totalNetSalary: Number(totals.totalNetSalary || 0),
      totalPaidAmount: Number(totals.totalPaidAmount || 0),
    },
    returned: rows.length,
    items: rows.map((p) => ({
      month: p.month,
      status: p.status,
      basicSalary: Number(p.basicSalary || 0),
      netSalary: Number(p.netSalary || 0),
      paidAmount: Number(p.paidAmount || 0),
      paymentDate: p.paymentDate || null,
      paymentMethod: p.paymentMethod || null,
    })),
    note: rows.length >= limit ? 'List truncated by limit' : '',
  };
}

async function toolMyPermissions({ user }) {
  requireAuthUser(user);
  requireRole(user, ['admin', 'staff']);

  if (isRole(user, 'admin')) {
    return {
      role: 'admin',
      permissions: 'ALL',
      scope: 'admin',
    };
  }

  const perms = user?.permissions && typeof user.permissions === 'object' ? user.permissions : {};

  // Return only enabled flags to keep it readable.
  const enabled = {};
  for (const [mod, val] of Object.entries(perms)) {
    if (!val || typeof val !== 'object') continue;
    const obj = typeof val?.toObject === 'function' ? val.toObject() : val;
    const on = Object.entries(obj).filter(([, v]) => v === true).map(([k]) => k);
    if (on.length) enabled[mod] = on;
  }

  return {
    role: 'staff',
    permissions: enabled,
    scope: 'staff_permissions',
  };
}

const TOOL_REGISTRY = Object.freeze({
  dashboard_summary: {
    schema: z.object({}).strip(),
    run: toolDashboardSummary,
  },
  academic_years_list: {
    schema: argsAcademicYearsList,
    run: toolAcademicYearsList,
  },
  my_permissions: {
    schema: z.object({}).strip(),
    run: toolMyPermissions,
  },

  // Admin/Staff (permission-gated)
  students_list: {
    schema: argsStudentsList,
    run: toolStudentsList,
  },
  grade_sections_list: {
    schema: argsGradeSectionsList,
    run: toolGradeSectionsList,
  },
  subjects_list: {
    schema: argsSubjectsList,
    run: toolSubjectsList,
  },
  teacher_profile: {
    schema: argsTeacherLookup,
    run: toolTeacherProfile,
  },
  attendance_class_summary: {
    schema: argsDateClass,
    run: toolAttendanceClassSummary,
  },
  transfers_summary: {
    schema: argsRange,
    run: toolTransfersSummary,
  },
  student_transfer_history: {
    schema: argsStudentQuery,
    run: toolStudentTransferHistory,
  },
  promotions_summary: {
    schema: argsRange,
    run: toolPromotionsSummary,
  },
  announcements_summary: {
    schema: argsRange,
    run: toolAnnouncementsSummary,
  },
  announcements_recent: {
    schema: argsAnnouncementsRecent,
    run: toolAnnouncementsRecent,
  },
  activity_summary: {
    schema: argsRange,
    run: toolActivitySummary,
  },
  logins_today: {
    schema: z.object({}).strip(),
    run: toolLoginsToday,
  },

  // Timetable (read-only)
  timetable_class_slots: {
    schema: argsTimetableClass,
    run: toolTimetableClassSlots,
  },
  teacher_timetable_self: {
    schema: argsTeacherTimetable,
    run: toolTimetableTeacherSelf,
  },
  student_timetable_self: {
    schema: argsDayFilter,
    run: toolTimetableStudentSelf,
  },

  // Transcript (read-only)
  transcript_self_index: {
    schema: z.object({}).strip(),
    run: toolTranscriptSelfIndex,
  },
  transcript_self_full: {
    schema: argsTranscriptFull,
    run: toolTranscriptSelfFull,
  },
  transcript_student_index: {
    schema: argsTranscriptIndex,
    run: toolTranscriptStudentIndex,
  },
  transcript_student_full: {
    schema: argsTranscriptFull,
    run: toolTranscriptStudentFull,
  },

  // Attendance (read-only ranges)
  student_attendance_self_range_summary: {
    schema: argsAttendanceRange,
    run: toolStudentAttendanceSelfRangeSummary,
  },
  attendance_class_range_summary: {
    schema: argsAttendanceClassRange,
    run: toolAttendanceClassRangeSummary,
  },

  // Finance (read-only summaries)
  finance_expenses_summary: {
    schema: argsFinanceRange,
    run: toolFinanceExpensesSummary,
  },
  finance_fee_transactions_summary: {
    schema: argsFinanceFeeTransactions,
    run: toolFinanceFeeTransactionsSummary,
  },
  finance_accounts_balances: {
    schema: argsFinanceAccountsBalances,
    run: toolFinanceAccountsBalances,
  },
  finance_foundation_donations_summary: {
    schema: argsFinanceFoundationDonations,
    run: toolFinanceFoundationDonationsSummary,
  },
  finance_unpaid_students_summary: {
    schema: argsFinanceUnpaid,
    run: toolFinanceUnpaidStudentsSummary,
  },
  finance_payroll_month_summary: {
    schema: argsFinancePayrollMonthSummary,
    run: toolFinancePayrollMonthSummary,
  },
  finance_payroll_staff_search: {
    schema: argsFinancePayrollStaffSearch,
    run: toolFinancePayrollStaffSearch,
  },
  finance_payroll_staff_ledger: {
    schema: argsFinancePayrollStaffLedger,
    run: toolFinancePayrollStaffLedger,
  },

  // Teacher scoped
  teacher_assignments: {
    schema: z.object({}).strip(),
    run: toolTeacherAssignments,
  },
  teacher_class_roster: {
    schema: z.object({ gradeSectionId: z.string().trim().min(1), limit: z.number().int().min(1).max(80).optional() }).strip(),
    run: toolTeacherClassRoster,
  },
  teacher_attendance_class_summary: {
    schema: argsDateClass,
    run: toolTeacherAttendanceClassSummary,
  },
  teacher_attendance_class_range_summary: {
    schema: argsAttendanceClassRange,
    run: toolTeacherAttendanceClassRangeSummary,
  },

  // Results (read-only summaries)
  results_class_summary: {
    schema: argsResultsClassSummary,
    run: toolResultsClassSummary,
  },

  // Student scoped
  student_self_summary: {
    schema: z.object({}).strip(),
    run: toolStudentSelfSummary,
  },
  student_fee_invoices_self_summary: {
    schema: argsStudentFeeInvoicesSelf,
    run: toolStudentFeeInvoicesSelfSummary,
  },

  // Library (read-only)
  library_resources_list: {
    schema: argsLibraryResourcesList,
    run: toolLibraryResourcesList,
  },

  library_resource_get_text: {
    schema: argsLibraryResourceGetText,
    run: toolLibraryResourceGetText,
  },
});

export function getAllowedAiToolNamesForUser(user) {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin') {
    return [
      'dashboard_summary',
      'academic_years_list',
      'my_permissions',
      'students_list',
      'grade_sections_list',
      'subjects_list',
      'teacher_profile',
      'attendance_class_summary',
      'attendance_class_range_summary',
      'transfers_summary',
      'student_transfer_history',
      'promotions_summary',
      'announcements_summary',
      'announcements_recent',
      'activity_summary',
      'logins_today',

      // Timetable
      'timetable_class_slots',

      // Transcript
      'transcript_student_index',
      'transcript_student_full',

      // Results summaries
      'results_class_summary',

      // Finance summaries
      'finance_expenses_summary',
      'finance_fee_transactions_summary',
      'finance_accounts_balances',
      'finance_foundation_donations_summary',
      'finance_unpaid_students_summary',

      // Payroll (admin-only)
      'finance_payroll_month_summary',
      'finance_payroll_staff_search',
      'finance_payroll_staff_ledger',

      // Library
      'library_resources_list',
      'library_resource_get_text',
    ];
  }
  if (role === 'staff') {
    const out = ['dashboard_summary', 'academic_years_list', 'my_permissions', 'library_resources_list', 'library_resource_get_text'];
    if (staffHasAny(user, 'students', ['view', 'full'])) out.push('students_list');
    if (staffHasAnyOfModules(user, ['students', 'timetable', 'attendance'], ['view', 'full'])) out.push('grade_sections_list');
    if (staffHasAnyOfModules(user, ['subjects', 'timetable', 'results', 'exams', 'transcript'], ['view', 'full', 'print', 'download'])) out.push('subjects_list');
    if (staffHasAny(user, 'teachers', ['view', 'full'])) out.push('teacher_profile');
    if (staffHasAny(user, 'attendance', ['view', 'full'])) out.push('attendance_class_summary');
    if (staffHasAny(user, 'attendance', ['view', 'full'])) out.push('attendance_class_range_summary');
    if (staffHasAny(user, 'transfers', ['view', 'transfer', 'full'])) {
      out.push('transfers_summary');
      out.push('student_transfer_history');
    }
    if (staffHasAny(user, 'promotions', ['view', 'preview', 'promote', 'full'])) out.push('promotions_summary');
    if (staffHasAny(user, 'announcements', ['add', 'edit', 'delete', 'full'])) out.push('announcements_summary');
    // Read-only announcements can be useful for all staff.
    out.push('announcements_recent');
    if (staffHasAny(user, 'security', ['view', 'full'])) {
      out.push('activity_summary');
      out.push('logins_today');
    }

    // Timetable read: timetable.view OR attendance.view matches route behavior.
    if (staffHasAny(user, 'timetable', ['view', 'full', 'add', 'edit', 'delete', 'print', 'download']) || staffHasAny(user, 'attendance', ['view', 'edit', 'full'])) {
      out.push('timetable_class_slots');
    }

    // Transcript read
    if (staffHasAny(user, 'transcript', ['view', 'print', 'download', 'full']) || staffHasAny(user, 'students', ['view', 'full'])) {
      out.push('transcript_student_index');
      out.push('transcript_student_full');
    }

    // Results read-only summaries
    if (staffHasAnyOfModules(user, ['results', 'exams', 'transcript'], ['view', 'print', 'download', 'full'])) {
      out.push('results_class_summary');
    }

    // Finance read-only summaries
    if (staffHasAnyOfModules(user, ['financeExpensesLedger', 'financeExpenses', 'financeDashboard', 'financeAudit'], ['view', 'full'])) {
      out.push('finance_expenses_summary');
    }
    if (staffHasAnyOfModules(user, ['financeStudentReceipt', 'financeDashboard', 'financeAudit'], ['view', 'full'])) {
      out.push('finance_fee_transactions_summary');
    }
    if (staffHasAnyOfModules(user, ['financeAccountsOverview', 'financeAccountsLedger', 'financeDashboard', 'financeAudit'], ['view', 'full'])) {
      out.push('finance_accounts_balances');
    }
    if (staffHasAny(user, 'financeFoundation', ['view', 'add', 'edit', 'delete', 'full'])) {
      out.push('finance_foundation_donations_summary');
    }
    if (staffHasAnyOfModules(user, ['financeStudentReceipt', 'financeDashboard', 'financeAudit'], ['view', 'full', 'add', 'edit', 'delete'])) {
      out.push('finance_unpaid_students_summary');
    }

    // Payroll (very sensitive) - only for staff with financePayroll module access.
    if (staffHasAny(user, 'financePayroll', ['view', 'add', 'edit', 'delete', 'full'])) {
      out.push('finance_payroll_month_summary');
      out.push('finance_payroll_staff_search');
      out.push('finance_payroll_staff_ledger');
    }
    return out;
  }
  if (role === 'teacher') {
    return [
      'academic_years_list',
      'teacher_assignments',
      'teacher_class_roster',
      'teacher_attendance_class_summary',
      'teacher_attendance_class_range_summary',
      'teacher_timetable_self',
      'results_class_summary',
      'announcements_recent',
      'library_resources_list',
      'library_resource_get_text',
    ];
  }
  if (role === 'student') {
    return [
      'academic_years_list',
      'student_self_summary',
      'student_fee_invoices_self_summary',
      'student_timetable_self',
      'student_attendance_self_range_summary',
      'transcript_self_index',
      'transcript_self_full',
      'announcements_recent',
      'library_resources_list',
      'library_resource_get_text',
    ];
  }
  return [];
}

export async function executeAiTool({ toolName, args, user }) {
  requireAuthUser(user);

  const name = String(toolName || '').trim();
  const tool = TOOL_REGISTRY[name];
  if (!tool) throw new AiToolError('Unknown tool', 400);

  const allowed = new Set(getAllowedAiToolNamesForUser(user));
  if (!allowed.has(name)) throw new AiToolError('Forbidden', 403);

  let parsedArgs = {};
  try {
    parsedArgs = tool.schema.parse(args || {});
  } catch {
    throw new AiToolError('Invalid tool arguments', 400);
  }

  return tool.run({ user, args: parsedArgs });
}

export function isAiToolError(err) {
  return Boolean(err) && (err.name === 'AiToolError' || err instanceof AiToolError);
}
