import mongoose from 'mongoose';

import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import GradeSection from '../models/GradeSection.js';
import Subject from '../models/Subject.js';
import AcademicYear from '../models/AcademicYear.js';
import AttendanceRecord from '../models/AttendanceRecord.js';
import Announcement from '../models/Announcement.js';
import TransferLog from '../models/TransferLog.js';
import Exam from '../models/Exam.js';
import Cohort from '../models/Cohort.js';
import ExamScore from '../models/ExamScore.js';

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

const can = (user, moduleName, actionName = 'view') => {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return true;
  if (role !== 'staff') return false;

  const perms = isPlainObject(user.permissions) ? user.permissions : {};
  const mod = isPlainObject(perms[moduleName]) ? perms[moduleName] : {};
  if (mod.full === true) return true;
  if (actionName && mod[actionName] === true) return true;
  if (!actionName) return Object.values(mod).some(Boolean);
  return false;
};

const parseISODateOnly = (value) => {
  const s = String(value || '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const dt = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const parseISODateTime = (value) => {
  const s = String(value || '').trim();
  if (!s) return null;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
};

const startOfDayUTC = (dt) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
const endOfDayUTC = (dt) => new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999));

const clampRange = ({ from, to }) => {
  if (!from && !to) {
    const today = new Date();
    const fromD = startOfDayUTC(today);
    const toD = endOfDayUTC(today);
    return { from: fromD, to: toD };
  }
  const a = from ? startOfDayUTC(from) : null;
  const b = to ? endOfDayUTC(to) : null;
  if (a && b && b < a) return { from: a, to: endOfDayUTC(a) };
  if (a && !b) return { from: a, to: endOfDayUTC(a) };
  if (!a && b) return { from: startOfDayUTC(b), to: b };
  return { from: a, to: b };
};

const resolveAcademicYear = async (academicYearId) => {
  const id = String(academicYearId || '').trim();
  if (id && mongoose.isValidObjectId(id)) {
    const ay = await AcademicYear.findById(id).select('yearName').lean();
    if (ay) return ay;
  }

  // Fallback: latest created AY (best-effort default)
  const latest = await AcademicYear.findOne({}).sort({ createdAt: -1 }).select('yearName').lean();
  return latest || null;
};

export async function getDashboardSummary(req, res) {
  const user = req.user;
  const role = String(user?.role || '').toLowerCase();

  if (role !== 'admin' && role !== 'staff') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  const fromQ = parseISODateOnly(req.query?.from) || parseISODateTime(req.query?.from);
  const toQ = parseISODateOnly(req.query?.to) || parseISODateTime(req.query?.to);
  const range = clampRange({ from: fromQ, to: toQ });

  const gradeIdQ = String(req.query?.gradeId || '').trim();
  const shiftIdQ = String(req.query?.shiftId || '').trim();
  const gradeSectionIdQ = String(req.query?.gradeSectionId || '').trim();
  const academicYearIdQ = String(req.query?.academicYearId || '').trim();

  const gradeId = mongoose.isValidObjectId(gradeIdQ) ? gradeIdQ : '';
  const shiftId = mongoose.isValidObjectId(shiftIdQ) ? shiftIdQ : '';
  const gradeSectionId = mongoose.isValidObjectId(gradeSectionIdQ) ? gradeSectionIdQ : '';
  const attendanceAyFilterId = mongoose.isValidObjectId(academicYearIdQ) ? academicYearIdQ : '';
  const hasAttendanceClassFilter = Boolean(gradeId || shiftId || gradeSectionId);

  // IMPORTANT: Only filter by Academic Year when the client explicitly requested it.
  // `selectedAcademicYear` may fall back to latest AY for display, but analytics should not be silently scoped.
  const academicYearFilterId = attendanceAyFilterId;

  const selectedAcademicYear = await resolveAcademicYear(req.query?.academicYearId);
  const selectedAcademicYearId = selectedAcademicYear?._id ? String(selectedAcademicYear._id) : null;

  const allowPeople = can(user, 'students', 'view') || can(user, 'teachers', 'view');
  const allowStudents = can(user, 'students', 'view');
  const allowTeachers = can(user, 'teachers', 'view');
  const allowTransfers = can(user, 'transfers', 'view') || can(user, 'transfers', 'transfer');
  const allowAttendance = can(user, 'attendance', 'view') || can(user, 'attendanceReports', 'view');
  const allowAnnouncements = can(user, 'announcements', 'view');
  const allowExams = can(user, 'exams', 'view') || can(user, 'results', 'view');
  const allowAcademics = can(user, 'grades', 'view') || can(user, 'subjects', 'view') || can(user, 'cohorts', 'view');

  const academicYearsPromise = AcademicYear.find({}).sort({ createdAt: -1 }).select('yearName').lean();

  const studentCountsPromise = allowStudents
    ? Student.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
    : Promise.resolve([]);

  const teacherCountsPromise = allowTeachers
    ? Teacher.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
    : Promise.resolve([]);

  const staffCountsPromise = role === 'admin'
    ? User.aggregate([
        { $match: { role: 'staff' } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ])
    : Promise.resolve([]);

  const activeEnrollmentsPromise = selectedAcademicYearId && allowStudents
    ? Enrollment.countDocuments({ academicYear: selectedAcademicYearId, status: 'active' })
    : Promise.resolve(null);

  const gradeSectionsCountPromise = allowAcademics ? GradeSection.countDocuments({}) : Promise.resolve(null);
  const subjectsCountPromise = can(user, 'subjects', 'view') ? Subject.countDocuments({}) : Promise.resolve(null);
  const cohortsCountPromise = can(user, 'cohorts', 'view') ? Cohort.countDocuments({}) : Promise.resolve(null);

  const studentsByAcademicYearPromise = allowStudents
    ? Enrollment.aggregate([
        {
          $group: {
            _id: '$academicYear',
            studentsSet: { $addToSet: '$student' },
            enrollments: { $sum: 1 },
          },
        },
        {
          $project: {
            academicYear: '$_id',
            _id: 0,
            uniqueStudents: { $size: '$studentsSet' },
            enrollments: 1,
          },
        },
        {
          $lookup: {
            from: 'academicyears',
            localField: 'academicYear',
            foreignField: '_id',
            as: 'ay',
          },
        },
        { $unwind: { path: '$ay', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            academicYearId: '$academicYear',
            yearName: { $ifNull: ['$ay.yearName', 'Unknown'] },
            createdAt: '$ay.createdAt',
            uniqueStudents: 1,
            enrollments: 1,
          },
        },
        { $sort: { createdAt: 1 } },
      ])
    : Promise.resolve([]);

  // New students per Academic Year (intake): count each student only once,
  // based on their FIRST EVER enrollment (earliest joinedAt).
  const newStudentsByAcademicYearPromise = allowStudents
    ? Enrollment.aggregate([
        { $sort: { joinedAt: 1, createdAt: 1 } },
        { $group: { _id: '$student', firstAcademicYear: { $first: '$academicYear' } } },
        { $group: { _id: '$firstAcademicYear', newStudents: { $sum: 1 } } },
        {
          $lookup: {
            from: 'academicyears',
            localField: '_id',
            foreignField: '_id',
            as: 'ay',
          },
        },
        { $unwind: { path: '$ay', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            academicYearId: '$_id',
            yearName: { $ifNull: ['$ay.yearName', 'Unknown'] },
            createdAt: '$ay.createdAt',
            newStudents: 1,
          },
        },
        { $sort: { createdAt: 1 } },
      ])
    : Promise.resolve([]);

  // New students by day/week/month (based on FIRST EVER enrollment date)
  const now = new Date();
  const sinceDays = new Date(now.getTime() - 30 * 86400000);
  const sinceWeeks = new Date(now.getTime() - 26 * 7 * 86400000);
  const sinceMonths = new Date(now.getTime() - 18 * 30 * 86400000);

  const newStudentsByDayPromise = allowStudents
    ? Enrollment.aggregate([
        { $sort: { joinedAt: 1, createdAt: 1 } },
        { $group: { _id: '$student', firstJoinedAt: { $first: '$joinedAt' } } },
        { $match: { firstJoinedAt: { $gte: sinceDays } } },
        {
          $project: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$firstJoinedAt' } },
          },
        },
        { $group: { _id: '$day', newStudents: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
    : Promise.resolve([]);

  const newStudentsByWeekPromise = allowStudents
    ? Enrollment.aggregate([
        { $sort: { joinedAt: 1, createdAt: 1 } },
        { $group: { _id: '$student', firstJoinedAt: { $first: '$joinedAt' } } },
        { $match: { firstJoinedAt: { $gte: sinceWeeks } } },
        {
          $project: {
            isoWeekYear: { $isoWeekYear: '$firstJoinedAt' },
            isoWeek: { $isoWeek: '$firstJoinedAt' },
          },
        },
        { $group: { _id: { isoWeekYear: '$isoWeekYear', isoWeek: '$isoWeek' }, newStudents: { $sum: 1 } } },
        { $sort: { '_id.isoWeekYear': 1, '_id.isoWeek': 1 } },
      ])
    : Promise.resolve([]);

  const newStudentsByMonthPromise = allowStudents
    ? Enrollment.aggregate([
        { $sort: { joinedAt: 1, createdAt: 1 } },
        { $group: { _id: '$student', firstJoinedAt: { $first: '$joinedAt' } } },
        { $match: { firstJoinedAt: { $gte: sinceMonths } } },
        {
          $project: {
            year: { $year: '$firstJoinedAt' },
            month: { $month: '$firstJoinedAt' },
          },
        },
        { $group: { _id: { year: '$year', month: '$month' }, newStudents: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ])
    : Promise.resolve([]);

  const attendanceAggPromise = allowAttendance
    ? (async () => {
        let sectionIds = null;

        if (gradeSectionId) {
          sectionIds = [new mongoose.Types.ObjectId(gradeSectionId)];
        } else if (hasAttendanceClassFilter) {
          const match = {};
          if (gradeId) match.grade = new mongoose.Types.ObjectId(gradeId);
          if (shiftId) match.shift = new mongoose.Types.ObjectId(shiftId);
          const rows = await GradeSection.find(match).select('_id').lean();
          const ids = (rows || []).map((r) => r?._id).filter(Boolean);
          if (ids.length === 0) {
            return { byDayAllRaw: [], byDateSourceRaw: [], byPeriodRaw: [] };
          }
          sectionIds = ids;
        }

        const match = { date: { $gte: range.from, $lte: range.to } };
        if (Array.isArray(sectionIds) && sectionIds.length > 0) {
          match.gradeSection = { $in: sectionIds };
        }

        const pipeline = [{ $match: match }];

        // Optional AcademicYear filter: derive AY by joining Enrollment membership on that date.
        // Only apply when client explicitly provides academicYearId.
        if (attendanceAyFilterId) {
          pipeline.push({
            $lookup: {
              from: 'enrollments',
              let: { studentId: '$student', gradeSectionId: '$gradeSection', when: '$date' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$student', '$$studentId'] },
                        { $eq: ['$gradeSection', '$$gradeSectionId'] },
                        { $lte: ['$joinedAt', '$$when'] },
                        {
                          $or: [
                            { $eq: ['$leftAt', null] },
                            { $gte: ['$leftAt', '$$when'] },
                          ],
                        },
                      ],
                    },
                  },
                },
                { $sort: { joinedAt: -1, createdAt: -1 } },
                { $limit: 1 },
                { $project: { academicYear: 1 } },
              ],
              as: 'enrollmentForDate',
            },
          });
          pipeline.push({
            $match: {
              'enrollmentForDate.0.academicYear': new mongoose.Types.ObjectId(attendanceAyFilterId),
            },
          });
        }

        pipeline.push({
          $facet: {
            byDayAll: [
              {
                $project: {
                  dateKey: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' },
                  },
                  status: 1,
                },
              },
              {
                $group: {
                  _id: { dateKey: '$dateKey', status: '$status' },
                  count: { $sum: 1 },
                },
              },
              {
                $group: {
                  _id: '$_id.dateKey',
                  items: { $push: { status: '$_id.status', count: '$count' } },
                },
              },
              { $sort: { _id: 1 } },
            ],
            byDateSource: [
              {
                $project: {
                  dateKey: {
                    $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' },
                  },
                  source: {
                    $cond: [{ $eq: ['$periodCode', 'DAY'] }, 'DAY', 'LESSON'],
                  },
                  status: 1,
                },
              },
              {
                $group: {
                  _id: { dateKey: '$dateKey', source: '$source', status: '$status' },
                  count: { $sum: 1 },
                },
              },
              {
                $group: {
                  _id: { dateKey: '$_id.dateKey', source: '$_id.source' },
                  items: { $push: { status: '$_id.status', count: '$count' } },
                },
              },
              { $sort: { '_id.dateKey': 1 } },
            ],
            byPeriod: [
              {
                $project: {
                  periodCode: {
                    $cond: [
                      {
                        $or: [
                          { $eq: ['$periodCode', null] },
                          { $eq: ['$periodCode', ''] },
                        ],
                      },
                      'UNKNOWN',
                      '$periodCode',
                    ],
                  },
                  status: 1,
                },
              },
              {
                $group: {
                  _id: { periodCode: '$periodCode', status: '$status' },
                  count: { $sum: 1 },
                },
              },
              {
                $group: {
                  _id: '$_id.periodCode',
                  items: { $push: { status: '$_id.status', count: '$count' } },
                },
              },
              { $sort: { _id: 1 } },
            ],
          },
        });

        const out = await AttendanceRecord.aggregate(pipeline);
        const first = Array.isArray(out) && out.length > 0 ? out[0] : {};
        return {
          byDayAllRaw: Array.isArray(first?.byDayAll) ? first.byDayAll : [],
          byDateSourceRaw: Array.isArray(first?.byDateSource) ? first.byDateSource : [],
          byPeriodRaw: Array.isArray(first?.byPeriod) ? first.byPeriod : [],
        };
      })()
    : Promise.resolve({ byDayAllRaw: [], byDateSourceRaw: [], byPeriodRaw: [] });

  const transfersByDayPromise = allowTransfers
    ? TransferLog.aggregate([
        { $match: { date: { $gte: range.from, $lte: range.to } } },
        {
          $project: {
            dateKey: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          },
        },
        { $group: { _id: '$dateKey', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
    : Promise.resolve([]);

  const recentTransfersPromise = allowTransfers
    ? TransferLog.find({})
        .sort({ date: -1 })
        .limit(8)
        .populate('student', 'fullName studentId')
        .populate('fromGradeSection', 'section')
        .populate('toGradeSection', 'section')
        .lean()
    : Promise.resolve([]);

  const announcementVisibilityMatch = role === 'admin' || role === 'staff'
    ? { audienceType: { $in: [null, 'all'] } }
    : {};

  const announcementRoleStatsPromise = allowAnnouncements
    ? Announcement.aggregate([
        { $match: { ...announcementVisibilityMatch, date: { $gte: range.from, $lte: range.to } } },
        {
          $project: {
            role: { $ifNull: ['$role', 'unknown'] },
            updatedByRole: { $ifNull: ['$updatedByRole', null] },
            wasUpdated: {
              $cond: [{ $ifNull: ['$updatedAt', false] }, true, false],
            },
          },
        },
        {
          $group: {
            _id: '$role',
            created: { $sum: 1 },
            updated: {
              $sum: {
                $cond: ['$wasUpdated', 1, 0],
              },
            },
          },
        },
        { $sort: { created: -1 } },
      ])
    : Promise.resolve([]);

  const announcementMixBucketsPromise = allowAnnouncements
    ? (async () => {
        const now = new Date();
        const windows = {
          day: { from: startOfDayUTC(now), to: endOfDayUTC(now) },
          week: { from: startOfDayUTC(new Date(now.getTime() - 6 * 86400000)), to: endOfDayUTC(now) },
          month: { from: startOfDayUTC(new Date(now.getTime() - 29 * 86400000)), to: endOfDayUTC(now) },
          year: { from: startOfDayUTC(new Date(now.getTime() - 364 * 86400000)), to: endOfDayUTC(now) },
        };

        const mergeRoleRows = ({ createdRows, updatedRows }) => {
          const byRole = new Map();
          for (const r of createdRows || []) {
            const role = String(r?._id || 'unknown');
            byRole.set(role, { role, created: Number(r?.created || 0), updated: 0 });
          }
          for (const r of updatedRows || []) {
            const role = String(r?._id || 'unknown');
            const cur = byRole.get(role) || { role, created: 0, updated: 0 };
            cur.updated = Number(r?.updated || 0);
            byRole.set(role, cur);
          }
          const arr = Array.from(byRole.values()).sort((a, b) => (b.created + b.updated) - (a.created + a.updated));
          const totals = arr.reduce(
            (acc, r) => {
              acc.created += Number(r.created || 0);
              acc.updated += Number(r.updated || 0);
              return acc;
            },
            { created: 0, updated: 0 }
          );
          return { byRole: arr, totals };
        };

        const computeWindow = async ({ from, to }) => {
          const facet = await Announcement.aggregate([
            { $match: { ...announcementVisibilityMatch } },
            {
              $facet: {
                created: [
                  { $match: { date: { $gte: from, $lte: to } } },
                  { $group: { _id: { $ifNull: ['$role', 'unknown'] }, created: { $sum: 1 } } },
                ],
                updated: [
                  { $match: { updatedAt: { $gte: from, $lte: to } } },
                  { $group: { _id: { $ifNull: ['$role', 'unknown'] }, updated: { $sum: 1 } } },
                ],
              },
            },
          ]);
          const first = Array.isArray(facet) && facet.length ? facet[0] : null;
          return mergeRoleRows({ createdRows: first?.created || [], updatedRows: first?.updated || [] });
        };

        const [day, week, month, year] = await Promise.all([
          computeWindow(windows.day),
          computeWindow(windows.week),
          computeWindow(windows.month),
          computeWindow(windows.year),
        ]);

        return { day, week, month, year };
      })()
    : Promise.resolve({ day: null, week: null, month: null, year: null });

  const announcementRoleStatsAllTimePromise = allowAnnouncements
    ? Announcement.aggregate([
        { $match: { ...announcementVisibilityMatch } },
        {
          $project: {
            role: { $ifNull: ['$role', 'unknown'] },
            wasUpdated: {
              $cond: [{ $ifNull: ['$updatedAt', false] }, true, false],
            },
          },
        },
        {
          $group: {
            _id: '$role',
            created: { $sum: 1 },
            updated: {
              $sum: {
                $cond: ['$wasUpdated', 1, 0],
              },
            },
          },
        },
        { $sort: { created: -1 } },
      ])
    : Promise.resolve([]);

  const announcementsTotalAllTimePromise = allowAnnouncements
    ? Announcement.countDocuments({ ...announcementVisibilityMatch })
    : Promise.resolve(null);

  const recentAnnouncementsPromise = allowAnnouncements
    ? Announcement.find({ ...announcementVisibilityMatch })
        .sort({ date: -1 })
        .limit(8)
        .select('title date role author updatedAt updatedByRole')
        .lean()
    : Promise.resolve([]);

  const examsCountPromise = allowExams
    ? Exam.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } })
    : Promise.resolve(null);

  // Exam score activity (created/updated within the selected range).
  // This is used only as a lightweight ops metric (not for grading analytics).
  const scoreActivityPromise = allowExams
    ? (async () => {
        const dateMatch = { $gte: range.from, $lte: range.to };

        const needsExamJoin = Boolean(academicYearFilterId || hasAttendanceClassFilter);
        if (!needsExamJoin) {
          const [touched, created, updated] = await Promise.all([
            ExamScore.countDocuments({ updatedAt: dateMatch }),
            ExamScore.countDocuments({ createdAt: dateMatch }),
            ExamScore.countDocuments({ updatedAt: dateMatch, createdAt: { $lt: range.from } }),
          ]);
          return { touched, created, updated };
        }

        let sectionIds = null;
        if (gradeSectionId) {
          sectionIds = [new mongoose.Types.ObjectId(gradeSectionId)];
        } else if (hasAttendanceClassFilter) {
          const match = {};
          if (gradeId) match.grade = new mongoose.Types.ObjectId(gradeId);
          if (shiftId) match.shift = new mongoose.Types.ObjectId(shiftId);
          const rows = await GradeSection.find(match).select('_id').lean();
          const ids = (rows || []).map((r) => r?._id).filter(Boolean);
          if (ids.length === 0) return { touched: 0, created: 0, updated: 0 };
          sectionIds = ids;
        }

        const pipeline = [
          { $match: { updatedAt: dateMatch } },
          {
            $lookup: {
              from: 'exams',
              localField: 'exam',
              foreignField: '_id',
              as: 'examDoc',
            },
          },
          { $unwind: { path: '$examDoc', preserveNullAndEmptyArrays: false } },
        ];

        if (academicYearFilterId && mongoose.isValidObjectId(academicYearFilterId)) {
          pipeline.push({ $match: { 'examDoc.academicYear': new mongoose.Types.ObjectId(academicYearFilterId) } });
        }

        if (Array.isArray(sectionIds) && sectionIds.length > 0) {
          pipeline.push({ $match: { 'examDoc.gradeSection': { $in: sectionIds } } });
        }

        pipeline.push({
          $group: {
            _id: null,
            touched: { $sum: 1 },
            created: {
              $sum: {
                $cond: [{ $and: [{ $gte: ['$createdAt', range.from] }, { $lte: ['$createdAt', range.to] }] }, 1, 0],
              },
            },
            updated: {
              $sum: {
                $cond: [{ $and: [{ $lt: ['$createdAt', range.from] }, { $gte: ['$updatedAt', range.from] }, { $lte: ['$updatedAt', range.to] }] }, 1, 0],
              },
            },
          },
        });

        const rows = await ExamScore.aggregate(pipeline);
        const row = Array.isArray(rows) && rows.length ? rows[0] : null;
        return {
          touched: Number(row?.touched || 0),
          created: Number(row?.created || 0),
          updated: Number(row?.updated || 0),
        };
      })()
    : Promise.resolve(null);

  // Score activity by day (based on ExamScore.updatedAt within the selected range)
  // Returns [{ _id: 'YYYY-MM-DD', touched, created, updated }, ...]
  const scoreActivityByDayPromise = allowExams
    ? (async () => {
        const dateMatch = { $gte: range.from, $lte: range.to };

        const mergeRows = (createdRows, touchedRows) => {
          const byDay = new Map();

          for (const r of createdRows || []) {
            const day = String(r?._id || '');
            if (!day) continue;
            byDay.set(day, {
              _id: day,
              touched: 0,
              created: Number(r?.created || 0),
              updated: 0,
            });
          }

          for (const r of touchedRows || []) {
            const day = String(r?._id || '');
            if (!day) continue;
            const cur = byDay.get(day) || { _id: day, touched: 0, created: 0, updated: 0 };
            cur.touched = Number(r?.touched || 0);
            cur.updated = Number(r?.updated || 0);
            byDay.set(day, cur);
          }

          return Array.from(byDay.values()).sort((a, b) => String(a._id).localeCompare(String(b._id)));
        };

        const needsExamJoin = Boolean(academicYearFilterId || hasAttendanceClassFilter);
        if (!needsExamJoin) {
          const [createdRows, touchedRows] = await Promise.all([
            ExamScore.aggregate([
              { $match: { createdAt: dateMatch } },
              { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
              { $group: { _id: '$day', created: { $sum: 1 } } },
              { $sort: { _id: 1 } },
            ]),
            ExamScore.aggregate([
              { $match: { updatedAt: dateMatch } },
              {
                $project: {
                  day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                  createdDay: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                },
              },
              {
                $group: {
                  _id: '$day',
                  touched: { $sum: 1 },
                  updated: { $sum: { $cond: [{ $lt: ['$createdDay', '$day'] }, 1, 0] } },
                },
              },
              { $sort: { _id: 1 } },
            ]),
          ]);

          return mergeRows(createdRows, touchedRows);
        }

        let sectionIds = null;
        if (gradeSectionId) {
          sectionIds = [new mongoose.Types.ObjectId(gradeSectionId)];
        } else if (hasAttendanceClassFilter) {
          const match = {};
          if (gradeId) match.grade = new mongoose.Types.ObjectId(gradeId);
          if (shiftId) match.shift = new mongoose.Types.ObjectId(shiftId);
          const rows = await GradeSection.find(match).select('_id').lean();
          const ids = (rows || []).map((r) => r?._id).filter(Boolean);
          if (ids.length === 0) return [];
          sectionIds = ids;
        }

        const withExamFilters = (match) => {
          const p = [
            { $match: match },
            {
              $lookup: {
                from: 'exams',
                localField: 'exam',
                foreignField: '_id',
                as: 'examDoc',
              },
            },
            { $unwind: { path: '$examDoc', preserveNullAndEmptyArrays: false } },
          ];

          if (academicYearFilterId && mongoose.isValidObjectId(academicYearFilterId)) {
            p.push({ $match: { 'examDoc.academicYear': new mongoose.Types.ObjectId(academicYearFilterId) } });
          }

          if (Array.isArray(sectionIds) && sectionIds.length > 0) {
            p.push({ $match: { 'examDoc.gradeSection': { $in: sectionIds } } });
          }

          return p;
        };

        const [createdRows, touchedRows] = await Promise.all([
          ExamScore.aggregate([
            ...withExamFilters({ createdAt: dateMatch }),
            { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
            { $group: { _id: '$day', created: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ]),
          ExamScore.aggregate([
            ...withExamFilters({ updatedAt: dateMatch }),
            {
              $project: {
                day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
                createdDay: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              },
            },
            {
              $group: {
                _id: '$day',
                touched: { $sum: 1 },
                updated: { $sum: { $cond: [{ $lt: ['$createdDay', '$day'] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ]),
        ]);

        return mergeRows(createdRows, touchedRows);
      })()
    : Promise.resolve([]);

  const scoreActivityBucketsPromise = allowExams
    ? (async () => {
        const now = new Date();
        const end = endOfDayUTC(now);

        const dayWindow = { from: startOfDayUTC(new Date(now.getTime() - 13 * 86400000)), to: end };
        const weekWindow = { from: startOfDayUTC(new Date(now.getTime() - 83 * 86400000)), to: end };
        const monthWindow = { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)), to: end };
        const yearWindow = { from: new Date(Date.UTC(now.getUTCFullYear() - 4, 0, 1)), to: end };

        const needsExamJoin = Boolean(academicYearFilterId || hasAttendanceClassFilter);

        let sectionIds = null;
        if (needsExamJoin) {
          if (gradeSectionId) {
            sectionIds = [new mongoose.Types.ObjectId(gradeSectionId)];
          } else if (hasAttendanceClassFilter) {
            const match = {};
            if (gradeId) match.grade = new mongoose.Types.ObjectId(gradeId);
            if (shiftId) match.shift = new mongoose.Types.ObjectId(shiftId);
            const rows = await GradeSection.find(match).select('_id').lean();
            const ids = (rows || []).map((r) => r?._id).filter(Boolean);
            sectionIds = ids.length ? ids : [];
          }
        }

        const withExamFilters = (match) => {
          const p = [{ $match: match }];
          if (!needsExamJoin) return p;
          if (Array.isArray(sectionIds) && sectionIds.length === 0) return [{ $match: { _id: { $exists: false } } }];

          p.push(
            {
              $lookup: {
                from: 'exams',
                localField: 'exam',
                foreignField: '_id',
                as: 'examDoc',
              },
            },
            { $unwind: { path: '$examDoc', preserveNullAndEmptyArrays: false } }
          );

          if (academicYearFilterId && mongoose.isValidObjectId(academicYearFilterId)) {
            p.push({ $match: { 'examDoc.academicYear': new mongoose.Types.ObjectId(academicYearFilterId) } });
          }
          if (Array.isArray(sectionIds) && sectionIds.length > 0) {
            p.push({ $match: { 'examDoc.gradeSection': { $in: sectionIds } } });
          }
          return p;
        };

        const mergeKeyed = ({ createdRows, touchedRows }) => {
          const byKey = new Map();
          for (const r of createdRows || []) {
            const key = String(r?._id || '');
            if (!key) continue;
            byKey.set(key, { key, touched: 0, created: Number(r?.created || 0), updated: 0 });
          }
          for (const r of touchedRows || []) {
            const key = String(r?._id || '');
            if (!key) continue;
            const cur = byKey.get(key) || { key, touched: 0, created: 0, updated: 0 };
            cur.touched = Number(r?.touched || 0);
            cur.updated = Number(r?.updated || 0);
            byKey.set(key, cur);
          }
          return Array.from(byKey.values()).sort((a, b) => String(a.key).localeCompare(String(b.key)));
        };

        const mergeWeek = ({ createdRows, touchedRows }) => {
          const toKey = (id) => `${Number(id?.y || 0)}-W${String(Math.max(0, Number(id?.w || 0))).padStart(2, '0')}`;
          const byKey = new Map();

          for (const r of createdRows || []) {
            const key = toKey(r?._id);
            if (!key) continue;
            byKey.set(key, { key, touched: 0, created: Number(r?.created || 0), updated: 0 });
          }
          for (const r of touchedRows || []) {
            const key = toKey(r?._id);
            if (!key) continue;
            const cur = byKey.get(key) || { key, touched: 0, created: 0, updated: 0 };
            cur.touched = Number(r?.touched || 0);
            cur.updated = Number(r?.updated || 0);
            byKey.set(key, cur);
          }

          return Array.from(byKey.values()).sort((a, b) => String(a.key).localeCompare(String(b.key)));
        };

        const aggKeyed = async ({ from, to, dateField, keyFormat }) => {
          const dateMatch = { $gte: from, $lte: to };
          if (dateField === 'createdAt') {
            return ExamScore.aggregate([
              ...withExamFilters({ createdAt: dateMatch }),
              { $project: { key: { $dateToString: { format: keyFormat, date: '$createdAt' } } } },
              { $group: { _id: '$key', created: { $sum: 1 } } },
              { $sort: { _id: 1 } },
            ]);
          }

          return ExamScore.aggregate([
            ...withExamFilters({ updatedAt: dateMatch }),
            {
              $project: {
                key: { $dateToString: { format: keyFormat, date: '$updatedAt' } },
                createdKey: { $dateToString: { format: keyFormat, date: '$createdAt' } },
              },
            },
            {
              $group: {
                _id: '$key',
                touched: { $sum: 1 },
                updated: { $sum: { $cond: [{ $lt: ['$createdKey', '$key'] }, 1, 0] } },
              },
            },
            { $sort: { _id: 1 } },
          ]);
        };

        const aggWeek = async ({ from, to, mode }) => {
          const dateMatch = { $gte: from, $lte: to };
          if (mode === 'created') {
            return ExamScore.aggregate([
              ...withExamFilters({ createdAt: dateMatch }),
              { $project: { y: { $isoWeekYear: '$createdAt' }, w: { $isoWeek: '$createdAt' } } },
              { $group: { _id: { y: '$y', w: '$w' }, created: { $sum: 1 } } },
              { $sort: { '_id.y': 1, '_id.w': 1 } },
            ]);
          }
          return ExamScore.aggregate([
            ...withExamFilters({ updatedAt: dateMatch }),
            {
              $project: {
                y: { $isoWeekYear: '$updatedAt' },
                w: { $isoWeek: '$updatedAt' },
                cy: { $isoWeekYear: '$createdAt' },
                cw: { $isoWeek: '$createdAt' },
              },
            },
            {
              $group: {
                _id: { y: '$y', w: '$w' },
                touched: { $sum: 1 },
                updated: {
                  $sum: {
                    $cond: [
                      { $or: [{ $lt: ['$cy', '$y'] }, { $and: [{ $eq: ['$cy', '$y'] }, { $lt: ['$cw', '$w'] }] }] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            { $sort: { '_id.y': 1, '_id.w': 1 } },
          ]);
        };

        const [dayCreated, dayTouched] = await Promise.all([
          aggKeyed({ ...dayWindow, dateField: 'createdAt', keyFormat: '%Y-%m-%d' }),
          aggKeyed({ ...dayWindow, dateField: 'updatedAt', keyFormat: '%Y-%m-%d' }),
        ]);
        const [weekCreated, weekTouched] = await Promise.all([
          aggWeek({ ...weekWindow, mode: 'created' }),
          aggWeek({ ...weekWindow, mode: 'touched' }),
        ]);
        const [monthCreated, monthTouched] = await Promise.all([
          aggKeyed({ ...monthWindow, dateField: 'createdAt', keyFormat: '%Y-%m' }),
          aggKeyed({ ...monthWindow, dateField: 'updatedAt', keyFormat: '%Y-%m' }),
        ]);
        const [yearCreated, yearTouched] = await Promise.all([
          aggKeyed({ ...yearWindow, dateField: 'createdAt', keyFormat: '%Y' }),
          aggKeyed({ ...yearWindow, dateField: 'updatedAt', keyFormat: '%Y' }),
        ]);

        return {
          day: mergeKeyed({ createdRows: dayCreated, touchedRows: dayTouched }),
          week: mergeWeek({ createdRows: weekCreated, touchedRows: weekTouched }),
          month: mergeKeyed({ createdRows: monthCreated, touchedRows: monthTouched }),
          year: mergeKeyed({ createdRows: yearCreated, touchedRows: yearTouched }),
        };
      })()
    : Promise.resolve({ day: [], week: [], month: [], year: [] });

  const [
    academicYears,
    studentCounts,
    teacherCounts,
    staffCounts,
    activeEnrollments,
    gradeSectionsCount,
    subjectsCount,
    cohortsCount,
    studentsByAcademicYear,
    newStudentsByAcademicYear,
    newStudentsByDay,
    newStudentsByWeek,
    newStudentsByMonth,
    attendanceAgg,
    transfersByDayRaw,
    recentTransfers,
    announcementRoleStats,
    announcementRoleStatsAllTime,
    announcementsTotalAllTime,
    recentAnnouncements,
    announcementMixBuckets,
    examsCreated,
    scoreActivity,
    scoreActivityByDay,
    scoreActivityBuckets,
  ] = await Promise.all([
    academicYearsPromise,
    studentCountsPromise,
    teacherCountsPromise,
    staffCountsPromise,
    activeEnrollmentsPromise,
    gradeSectionsCountPromise,
    subjectsCountPromise,
    cohortsCountPromise,
    studentsByAcademicYearPromise,
    newStudentsByAcademicYearPromise,
    newStudentsByDayPromise,
    newStudentsByWeekPromise,
    newStudentsByMonthPromise,
    attendanceAggPromise,
    transfersByDayPromise,
    recentTransfersPromise,
    announcementRoleStatsPromise,
    announcementRoleStatsAllTimePromise,
    announcementsTotalAllTimePromise,
    recentAnnouncementsPromise,
    announcementMixBucketsPromise,
    examsCountPromise,
    scoreActivityPromise,
    scoreActivityByDayPromise,
    scoreActivityBucketsPromise,
  ]);

  const normalizeCounts = (rows, activeKey) => {
    const out = { total: 0, active: 0, inactive: 0, other: 0 };
    for (const r of rows || []) {
      const key = String(r?._id || '').toLowerCase();
      const c = Number(r?.count || 0);
      out.total += c;
      if (key === String(activeKey).toLowerCase()) out.active += c;
      else if (key === 'inactive') out.inactive += c;
      else out.other += c;
    }
    return out;
  };

  const studentsAgg = allowStudents ? normalizeCounts(studentCounts, 'active') : null;
  const teachersAgg = allowTeachers ? normalizeCounts(teacherCounts, 'active') : null;
  const staffAgg = role === 'admin' ? normalizeCounts(staffCounts, 'active') : null;

  const statusKeys = ['present', 'absent', 'late', 'excused', 'sick', 'medical', 'family', 'other'];
  const attendanceByDay = (attendanceAgg?.byDayAllRaw || []).map((row) => {
    const byStatus = Object.fromEntries(statusKeys.map((k) => [k, 0]));
    for (const it of row?.items || []) {
      const k = String(it?.status || '').toLowerCase();
      if (k && Object.prototype.hasOwnProperty.call(byStatus, k)) {
        byStatus[k] += Number(it?.count || 0);
      } else if (k) {
        byStatus.other += Number(it?.count || 0);
      }
    }
    return { date: String(row?._id || ''), ...byStatus };
  });

  const attendanceStatusTrend = (() => {
    const rows = attendanceAgg?.byDateSourceRaw || [];
    const byDate = new Map();

    const emptyCounts = () => Object.fromEntries(statusKeys.map((k) => [k, 0]));

    for (const row of rows) {
      const dateKey = String(row?._id?.dateKey || '');
      const source = String(row?._id?.source || '').toUpperCase();
      if (!dateKey || (source !== 'DAY' && source !== 'LESSON')) continue;

      const cur = byDate.get(dateKey) || { DAY: emptyCounts(), LESSON: emptyCounts() };
      const target = source === 'DAY' ? cur.DAY : cur.LESSON;

      for (const it of row?.items || []) {
        const k = String(it?.status || '').toLowerCase();
        if (k && Object.prototype.hasOwnProperty.call(target, k)) {
          target[k] += Number(it?.count || 0);
        } else if (k) {
          target.other += Number(it?.count || 0);
        }
      }

      byDate.set(dateKey, cur);
    }

    const sumCounts = (c) => statusKeys.reduce((sum, k) => sum + Number(c?.[k] || 0), 0);

    const dates = Array.from(byDate.keys()).sort((a, b) => String(a).localeCompare(String(b)));
    return dates.map((date) => {
      const v = byDate.get(date) || { DAY: emptyCounts(), LESSON: emptyCounts() };
      const dayTotal = sumCounts(v.DAY);
      const lessonTotal = sumCounts(v.LESSON);
      const hasAllDay = dayTotal > 0;
      const hasPerPeriod = lessonTotal > 0;
      const preferSource = hasAllDay ? 'DAY' : 'LESSON';
      const eff = hasAllDay ? v.DAY : v.LESSON;
      const total = sumCounts(eff);
      return {
        date,
        preferSource,
        hasAllDay,
        hasPerPeriod,
        ...eff,
        total,
        dayPresent: Number(v.DAY.present || 0),
        dayTotal,
        lessonPresent: Number(v.LESSON.present || 0),
        lessonTotal,
      };
    });
  })();

  const attendanceByPeriod = (attendanceAgg?.byPeriodRaw || []).map((row) => {
    const byStatus = Object.fromEntries(statusKeys.map((k) => [k, 0]));
    for (const it of row?.items || []) {
      const k = String(it?.status || '').toLowerCase();
      if (k && Object.prototype.hasOwnProperty.call(byStatus, k)) {
        byStatus[k] += Number(it?.count || 0);
      } else if (k) {
        byStatus.other += Number(it?.count || 0);
      }
    }
    const total = statusKeys.reduce((sum, k) => sum + Number(byStatus[k] || 0), 0);
    return { periodCode: String(row?._id || ''), ...byStatus, total };
  });

  const transfersByDay = (transfersByDayRaw || []).map((r) => ({
    date: String(r?._id || ''),
    count: Number(r?.count || 0),
  }));

  const transfersInRange = allowTransfers
    ? transfersByDay.reduce((sum, r) => sum + Number(r?.count || 0), 0)
    : null;

  const announcementsCreatedInRange = allowAnnouncements
    ? (announcementRoleStats || []).reduce((sum, r) => sum + Number(r?.created || 0), 0)
    : null;

  // Lightweight, user-facing performance metrics for the dashboard.
  const attendancePerf = (() => {
    if (!allowAttendance) return null;
    const rows = Array.isArray(attendanceStatusTrend) ? attendanceStatusTrend : [];
    const last = rows.length ? rows[rows.length - 1] : null;
    const present = Number(last?.present || 0);
    const total = Number(last?.total || 0);
    const ratePct = total > 0 ? (present / total) * 100 : null;
    return {
      date: last?.date ? String(last.date) : null,
      source: last?.preferSource ? String(last.preferSource) : null,
      present,
      total,
      ratePct: ratePct == null ? null : Math.max(0, Math.min(100, ratePct)),
    };
  })();

  return res.json({
    success: true,
    data: {
      meta: {
        generatedAt: new Date().toISOString(),
        range: {
          from: range.from?.toISOString() || null,
          to: range.to?.toISOString() || null,
        },
      },
      permissions: {
        allowPeople,
        allowStudents,
        allowTeachers,
        allowAttendance,
        allowTransfers,
        allowAnnouncements,
        allowExams,
        allowAcademics,
        isAdmin: role === 'admin',
      },
      academicYears: Array.isArray(academicYears)
        ? academicYears.map((ay) => ({ _id: String(ay?._id || ''), yearName: ay?.yearName }))
        : [],
      selectedAcademicYear: selectedAcademicYear
        ? { _id: String(selectedAcademicYear?._id || ''), yearName: selectedAcademicYear?.yearName }
        : null,
      cards: {
        students: studentsAgg,
        teachers: teachersAgg,
        staff: staffAgg,
        activeEnrollments: activeEnrollments,
        gradeSections: gradeSectionsCount,
        subjects: subjectsCount,
        cohorts: cohortsCount,
        transfersInRange,
        announcementsCreatedInRange,
        announcementsTotalAllTime,
        examsCreated,
      },
      performance: {
        attendance: attendancePerf,
        scores: scoreActivity,
      },
      charts: {
        attendanceByDay,
        attendanceStatusTrend,
        attendanceByPeriod,
        transfersByDay,
        studentsByAcademicYear: Array.isArray(studentsByAcademicYear)
          ? studentsByAcademicYear.map((r) => ({
              academicYearId: r?.academicYearId ? String(r.academicYearId) : null,
              yearName: String(r?.yearName || 'Unknown'),
              uniqueStudents: Number(r?.uniqueStudents || 0),
              enrollments: Number(r?.enrollments || 0),
            }))
          : [],
        newStudentsByAcademicYear: Array.isArray(newStudentsByAcademicYear)
          ? newStudentsByAcademicYear.map((r) => ({
              academicYearId: r?.academicYearId ? String(r.academicYearId) : null,
              yearName: String(r?.yearName || 'Unknown'),
              newStudents: Number(r?.newStudents || 0),
            }))
          : [],
        newStudentsByDay: Array.isArray(newStudentsByDay)
          ? newStudentsByDay.map((r) => ({
              day: String(r?._id || ''),
              newStudents: Number(r?.newStudents || 0),
            }))
          : [],
        newStudentsByWeek: Array.isArray(newStudentsByWeek)
          ? newStudentsByWeek.map((r) => ({
              isoWeekYear: Number(r?._id?.isoWeekYear || 0),
              isoWeek: Number(r?._id?.isoWeek || 0),
              newStudents: Number(r?.newStudents || 0),
            }))
          : [],
        newStudentsByMonth: Array.isArray(newStudentsByMonth)
          ? newStudentsByMonth.map((r) => ({
              year: Number(r?._id?.year || 0),
              month: Number(r?._id?.month || 0),
              newStudents: Number(r?.newStudents || 0),
            }))
          : [],
        announcementsByRole: Array.isArray(announcementRoleStats)
          ? announcementRoleStats.map((r) => ({
              role: String(r?._id || 'unknown'),
              created: Number(r?.created || 0),
              updated: Number(r?.updated || 0),
            }))
          : [],
        announcementsByRoleAllTime: Array.isArray(announcementRoleStatsAllTime)
          ? announcementRoleStatsAllTime.map((r) => ({
              role: String(r?._id || 'unknown'),
              created: Number(r?.created || 0),
              updated: Number(r?.updated || 0),
            }))
          : [],
        announcementsMixBuckets: announcementMixBuckets || null,
        scoreActivityByDay: Array.isArray(scoreActivityByDay)
          ? scoreActivityByDay.map((r) => ({
              day: String(r?._id || ''),
              touched: Number(r?.touched || 0),
              created: Number(r?.created || 0),
              updated: Number(r?.updated || 0),
            }))
          : [],
        scoreActivityBuckets: scoreActivityBuckets || null,
      },
      lists: {
        recentAnnouncements,
        recentTransfers,
      },
    },
  });
}
