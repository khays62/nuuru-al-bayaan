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

  const announcementRoleStatsPromise = allowAnnouncements
    ? Announcement.aggregate([
        { $match: { date: { $gte: range.from, $lte: range.to } } },
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

  const recentAnnouncementsPromise = allowAnnouncements
    ? Announcement.find({})
        .sort({ date: -1 })
        .limit(8)
        .select('title date role author updatedAt updatedByRole')
        .lean()
    : Promise.resolve([]);

  const examsCountPromise = allowExams
    ? Exam.countDocuments({ createdAt: { $gte: range.from, $lte: range.to } })
    : Promise.resolve(null);

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
    recentAnnouncements,
    examsCreated,
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
    recentAnnouncementsPromise,
    examsCountPromise,
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
        examsCreated,
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
      },
      lists: {
        recentAnnouncements,
        recentTransfers,
      },
    },
  });
}
