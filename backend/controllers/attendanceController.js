import mongoose from 'mongoose';
import AttendanceRecord from '../models/AttendanceRecord.js';
import AttendanceAuditLog from '../models/AttendanceAuditLog.js';
import GradeSection from '../models/GradeSection.js';
import Enrollment from '../models/Enrollment.js';
import Timetable from '../models/Timetable.js';

function parseISODateOnly(value) {
  if (!value) return null;
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
  // Use UTC midnight to avoid timezone shifts
  return new Date(Date.UTC(y, mo - 1, d));
}

function todayUTCDateOnly() {
  // Keep frontend/backend consistent: use UTC date (same as new Date().toISOString().slice(0,10))
  const iso = new Date().toISOString().slice(0, 10);
  return parseISODateOnly(iso);
}

function dateToISODateOnlyUTC(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function clampDateRange(from, to) {
  const start = from || todayUTCDateOnly();
  const end = to || start;
  if (start > end) return { start: end, end: start };
  return { start, end };
}

function projectDayOfWeekFromUTCDate(date) {
  // JS: Sun=0..Sat=6
  const js = new Date(date).getUTCDay();
  // Project: Sat=0..Fri=6
  const project = (js + 1) % 7;
  return { js, project };
}

const ALLOWED_ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused', 'sick', 'medical', 'family', 'other']);
const EXCUSED_LIKE_STATUSES = ['excused', 'sick', 'medical', 'family', 'other'];

function sanitizeRemarks(value, { maxWords = 40, maxChars = 120 } = {}) {
  const raw = String(value ?? '');
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  const words = collapsed.split(' ').filter(Boolean);
  const cappedWords = words.length > maxWords ? words.slice(0, maxWords).join(' ') : collapsed;
  if (cappedWords.length <= maxChars) return cappedWords;
  return cappedWords.slice(0, maxChars).trim();
}

export const markAttendanceBulk = async (req, res) => {
  try {
    const { date, gradeSectionId, periodCode, markedBy, items } = req.body;
    if (!gradeSectionId || !periodCode || !Array.isArray(items)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }

    const when = date ? parseISODateOnly(date) : todayUTCDateOnly();
    if (!when) return res.status(400).json({ message: 'Invalid date (use YYYY-MM-DD)' });

    const pCode = String(periodCode).trim();
    if (!pCode) return res.status(400).json({ message: 'Invalid periodCode' });

    // Prevent mixing Daily vs Lesson attendance for the same section+date.
    // - If Daily (DAY) exists, block any per-period marking.
    // - If any per-period exists, block Daily (DAY) marking.
    // Re-marking the same mode/period is allowed (upsert updates records).
    if (pCode === 'DAY') {
      const hasLesson = await AttendanceRecord.exists({
        gradeSection: gradeSectionId,
        date: when,
        periodCode: { $ne: 'DAY' },
      });
      if (hasLesson) {
        return res.status(409).json({ message: 'Lesson attendance already exists for this section and date. You cannot also mark Daily attendance.' });
      }
    } else {
      const hasDaily = await AttendanceRecord.exists({
        gradeSection: gradeSectionId,
        date: when,
        periodCode: 'DAY',
      });
      if (hasDaily) {
        return res.status(409).json({ message: 'Daily attendance already exists for this section and date. You cannot also mark Lesson attendance.' });
      }
    }

    // Option 1 (Admin-first): markedBy is optional until teacher auth exists.
    const actorTeacher = (markedBy && mongoose.isValidObjectId(markedBy)) ? markedBy : null;

    // Prepare audit: read existing statuses for this selection.
    const studentIds = items
      .map(r => r?.studentId)
      .filter(id => mongoose.isValidObjectId(id))
      .map(id => new mongoose.Types.ObjectId(id));

    const existingForAudit = studentIds.length
      ? await AttendanceRecord.find({
          gradeSection: gradeSectionId,
          date: when,
          periodCode: pCode,
          student: { $in: studentIds },
        })
          .select('student status')
          .lean()
      : [];

    const oldStatusByStudent = new Map(
      (existingForAudit || []).map(r => [String(r.student), String(r.status)])
    );

    for (const r of items) {
      const st = String(r?.status || '').trim();
      if (!ALLOWED_ATTENDANCE_STATUSES.has(st)) {
        return res.status(400).json({ message: `Invalid status: ${st || '(empty)'}` });
      }
      if (r && typeof r === 'object') {
        r.remarks = sanitizeRemarks(r.remarks, { maxWords: 40, maxChars: 120 });
      }
    }

    const ops = items.map(r => ({
      updateOne: {
        filter: { gradeSection: gradeSectionId, date: when, periodCode: pCode, student: r.studentId },
        update: {
          $set: {
            status: String(r.status).trim(),
            remarks: sanitizeRemarks(r.remarks, { maxWords: 40, maxChars: 120 }),
            ...(actorTeacher ? { markedBy: actorTeacher } : {}),
          }
        },
        upsert: true,
      }
    }));
    if (ops.length === 0) return res.json({ updated: 0 });
    const resBulk = await AttendanceRecord.bulkWrite(ops, { ordered: false });

    // Write audit logs for status changes (best-effort; do not fail the request if audit fails).
    try {
      const audits = [];
      for (const r of items) {
        if (!mongoose.isValidObjectId(r?.studentId)) continue;
        const sid = String(r.studentId);
        const oldStatus = oldStatusByStudent.has(sid) ? oldStatusByStudent.get(sid) : null;
        const newStatus = String(r.status);
        if (oldStatus === newStatus) continue;
        audits.push({
          gradeSection: gradeSectionId,
          date: when,
          periodCode: pCode,
          student: r.studentId,
          oldStatus,
          newStatus,
          markedBy: actorTeacher,
        });
      }
      if (audits.length) {
        await AttendanceAuditLog.insertMany(audits, { ordered: false });
      }
    } catch {
      // ignore audit failures
    }

    res.json({ updated: (resBulk.upsertedCount || 0) + (resBulk.modifiedCount || 0) });
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ message: 'Duplicate attendance record detected. Please retry.' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { gradeSectionId, date, periodCode, rosterScope } = req.query;
    if (!mongoose.isValidObjectId(gradeSectionId)) return res.status(400).json({ message: 'gradeSectionId required' });

    // Date is used both for reading attendance and (optionally) for roster history queries.
    const when = date ? parseISODateOnly(date) : todayUTCDateOnly();
    if (!when) return res.status(400).json({ message: 'Invalid date (use YYYY-MM-DD)' });

    const pCode = String(periodCode || '').trim();
    if (!pCode) return res.status(400).json({ message: 'periodCode required' });

    // Load roster (active + inactive) for the gradeSection
    const gs = await GradeSection.findById(gradeSectionId).lean();
    if (!gs) return res.status(404).json({ message: 'GradeSection not found' });

    // Load roster from Enrollment (students are linked to sections via enrollments, not Student.gradeSection)
    // - current: active enrollments now
    // - asOf: students who were enrolled in this section on the given date
    const scope = String(rosterScope || 'current').toLowerCase();
    const wantAsOf = scope === 'asof' || scope === 'as_of' || scope === 'as-of';

    const rosterMatch = wantAsOf
      ? {
          gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
          joinedAt: { $lte: when },
          $or: [{ leftAt: null }, { leftAt: { $gte: when } }],
        }
      : {
          gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
          status: { $in: ['active'] },
        };

    const rosterAgg = await Enrollment.aggregate([
      {
        $match: rosterMatch
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$student',
          latest: { $first: '$$ROOT' },
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          _id: '$student._id',
          studentId: '$student.studentId',
          fullName: '$student.fullName',
          status: '$student.status',
        }
      },
      { $sort: { studentId: 1, fullName: 1, _id: 1 } },
    ]);

    const roster = rosterAgg || [];

    const [hasDaily, hasLesson, lessonPeriodCodes, existing] = await Promise.all([
      AttendanceRecord.exists({ gradeSection: gradeSectionId, date: when, periodCode: 'DAY' }),
      AttendanceRecord.exists({ gradeSection: gradeSectionId, date: when, periodCode: { $ne: 'DAY' } }),
      AttendanceRecord.distinct('periodCode', { gradeSection: gradeSectionId, date: when, periodCode: { $ne: 'DAY' } }),
      AttendanceRecord.find({ gradeSection: gradeSectionId, date: when, periodCode: pCode })
        .select('student status remarks')
        .lean(),
    ]);

    const statusMap = new Map(existing.map(r => [String(r.student), { status: r.status, remarks: r.remarks || '' }]));
    const merged = roster.map(stu => ({
      _id: stu._id,
      studentId: stu.studentId,
      fullName: stu.fullName,
      status: statusMap.get(String(stu._id))?.status || 'present',
      remarks: statusMap.get(String(stu._id))?.remarks || '',
      active: String(stu.status || '').toLowerCase() === 'active',
    }));

    res.json({
      meta: {
        date: dateToISODateOnlyUTC(when),
        periodCode: pCode,
        hasDaily: Boolean(hasDaily),
        hasLesson: Boolean(hasLesson),
        lessonPeriodCodes: Array.isArray(lessonPeriodCodes) ? lessonPeriodCodes : [],
        hasSelectionRecords: Array.isArray(existing) && existing.length > 0,
      },
      data: merged,
    });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Attendance report summaries for a section over a date range
// @route   GET /api/attendance/reports/summary?gradeSectionId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&mode=daily|lesson|both&studentId=...
export const getAttendanceReportSummary = async (req, res) => {
  try {
    const { gradeSectionId, from, to, mode, rosterScope, studentId } = req.query;
    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'gradeSectionId required' });
    }

    let studentObjectId = null;
    if (studentId != null && String(studentId).trim() !== '') {
      if (!mongoose.isValidObjectId(studentId)) {
        return res.status(400).json({ message: 'Invalid studentId' });
      }
      studentObjectId = new mongoose.Types.ObjectId(studentId);
    }

    const gs = await GradeSection.findById(gradeSectionId).lean();
    if (!gs) return res.status(404).json({ message: 'GradeSection not found' });

    const fromDate = from ? parseISODateOnly(from) : null;
    const toDate = to ? parseISODateOnly(to) : null;
    if (from && !fromDate) return res.status(400).json({ message: 'Invalid from (use YYYY-MM-DD)' });
    if (to && !toDate) return res.status(400).json({ message: 'Invalid to (use YYYY-MM-DD)' });

    const { start, end } = clampDateRange(fromDate, toDate);

    const scope = String(rosterScope || 'current').toLowerCase();
    const wantAsOf = scope === 'asof' || scope === 'as_of' || scope === 'as-of';

    // rosterCount is informational only (meta). Use Enrollment history for historical views.
    const rosterCount = studentObjectId
      ? (wantAsOf
          ? await Enrollment.countDocuments({
              gradeSection: gradeSectionId,
              student: studentObjectId,
              joinedAt: { $lte: end },
              $or: [{ leftAt: null }, { leftAt: { $gte: start } }],
            })
          : await Enrollment.countDocuments({
              gradeSection: gradeSectionId,
              student: studentObjectId,
              status: 'active',
            }))
      : (wantAsOf
          ? await Enrollment.countDocuments({
              gradeSection: gradeSectionId,
              joinedAt: { $lte: end },
              $or: [{ leftAt: null }, { leftAt: { $gte: start } }],
            })
          : await Enrollment.countDocuments({
              gradeSection: gradeSectionId,
              status: 'active',
            }));

    const want = String(mode || 'both').toLowerCase();
    const wantDaily = want === 'daily' || want === 'both';
    const wantLesson = want === 'lesson' || want === 'both';

    const baseMatch = {
      gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
      date: { $gte: start, $lte: end },
    };

    const effectiveMatch = studentObjectId
      ? { ...baseMatch, student: studentObjectId }
      : baseMatch;

    let daily = [];
    let lesson = [];

    if (wantDaily) {
      daily = await AttendanceRecord.aggregate([
        { $match: { ...effectiveMatch, periodCode: 'DAY' } },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$date',
                  timezone: 'UTC',
                }
              }
            },
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
            excused: { $sum: { $cond: [{ $in: ['$status', EXCUSED_LIKE_STATUSES] }, 1, 0] } },
            total: { $sum: 1 },
          }
        },
        { $sort: { '_id.date': 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            present: 1,
            absent: 1,
            late: 1,
            excused: 1,
            total: 1,
          }
        }
      ]);
    }

    if (wantLesson) {
      lesson = await AttendanceRecord.aggregate([
        { $match: { ...effectiveMatch, periodCode: { $ne: 'DAY' } } },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$date',
                  timezone: 'UTC',
                }
              },
              periodCode: '$periodCode',
            },
            present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
            excused: { $sum: { $cond: [{ $in: ['$status', EXCUSED_LIKE_STATUSES] }, 1, 0] } },
            total: { $sum: 1 },
          }
        },
        { $sort: { '_id.date': 1, '_id.periodCode': 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            periodCode: '$_id.periodCode',
            present: 1,
            absent: 1,
            late: 1,
            excused: 1,
            total: 1,
          }
        }
      ]);
    }

    res.json({
      meta: {
        gradeSectionId: String(gradeSectionId),
        ...(studentObjectId ? { studentId: String(studentObjectId) } : {}),
        from: dateToISODateOnlyUTC(start),
        to: dateToISODateOnlyUTC(end),
        rosterCount,
        rosterScope: wantAsOf ? 'asOf' : 'current',
      },
      daily,
      lesson,
    });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Attendance report details (student-level list) for a single date
// @route   GET /api/attendance/reports/details?gradeSectionId=...&date=YYYY-MM-DD&mode=daily|lesson&periodCode=...&studentId=...
export const getAttendanceReportDetails = async (req, res) => {
  try {
    const { gradeSectionId, date, mode, periodCode, rosterScope, studentId } = req.query;
    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'gradeSectionId required' });
    }

    let studentObjectId = null;
    if (studentId != null && String(studentId).trim() !== '') {
      if (!mongoose.isValidObjectId(studentId)) {
        return res.status(400).json({ message: 'Invalid studentId' });
      }
      studentObjectId = new mongoose.Types.ObjectId(studentId);
    }

    const gs = await GradeSection.findById(gradeSectionId).lean();
    if (!gs) return res.status(404).json({ message: 'GradeSection not found' });

    const when = parseISODateOnly(date);
    if (!when) return res.status(400).json({ message: 'Invalid date (use YYYY-MM-DD)' });

    const m = String(mode || 'daily').toLowerCase();
    const pCode = (m === 'daily') ? 'DAY' : String(periodCode || '').trim();
    if (m !== 'daily' && m !== 'lesson') {
      return res.status(400).json({ message: 'Invalid mode (use daily or lesson)' });
    }
    if (m === 'lesson' && !pCode) {
      return res.status(400).json({ message: 'periodCode required for lesson mode' });
    }
    if (m === 'lesson' && pCode === 'DAY') {
      return res.status(400).json({ message: 'Invalid periodCode for lesson mode' });
    }

    const scope = String(rosterScope || 'current').toLowerCase();
    const wantAsOf = scope === 'asof' || scope === 'as_of' || scope === 'as-of';

    const rosterMatch = wantAsOf
      ? {
          gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
          joinedAt: { $lte: when },
          $or: [{ leftAt: null }, { leftAt: { $gte: when } }],
        }
      : {
          gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
          status: { $in: ['active'] },
        };

    const rosterAgg = await Enrollment.aggregate([
      {
        $match: {
          ...rosterMatch,
          ...(studentObjectId ? { student: studentObjectId } : {}),
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$student',
          latest: { $first: '$$ROOT' },
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student',
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          _id: '$student._id',
          studentId: '$student.studentId',
          fullName: '$student.fullName',
          studentStatus: '$student.status',
          enrollmentStatus: '$latest.status',
          joinedAt: '$latest.joinedAt',
          leftAt: '$latest.leftAt',
        }
      },
      { $sort: { studentId: 1, fullName: 1, _id: 1 } },
    ]);

    const roster = rosterAgg || [];

    const [existingAny, existingStudent] = await Promise.all([
      AttendanceRecord.find({
        gradeSection: gradeSectionId,
        date: when,
        periodCode: pCode,
      })
        .select('student status remarks')
        .lean(),
      studentObjectId
        ? AttendanceRecord.find({
            gradeSection: gradeSectionId,
            date: when,
            periodCode: pCode,
            student: studentObjectId,
          })
            .select('student status remarks')
            .lean()
        : null,
    ]);

    const existing = studentObjectId ? (existingStudent || []) : (existingAny || []);

    // IMPORTANT: Reports should not fabricate "absent" when no attendance was marked.
    // If there are no records at all for this section/date/period, return empty data.
    if (!existingAny || existingAny.length === 0) {
      return res.json({
        meta: {
          gradeSectionId: String(gradeSectionId),
          ...(studentObjectId ? { studentId: String(studentObjectId) } : {}),
          date: dateToISODateOnlyUTC(when),
          mode: m,
          periodCode: pCode,
          rosterScope: wantAsOf ? 'asOf' : 'current',
        },
        counts: { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
        data: [],
      });
    }

    const statusMap = new Map(existing.map(r => [String(r.student), { status: r.status, remarks: r.remarks || '' }]));

    const data = roster.map(stu => ({
      _id: stu._id,
      studentId: stu.studentId,
      fullName: stu.fullName,
      status: statusMap.get(String(stu._id))?.status || 'absent',
      remarks: statusMap.get(String(stu._id))?.remarks || '',
      studentStatus: stu.studentStatus,
      enrollmentStatus: stu.enrollmentStatus,
      joinedAt: stu.joinedAt,
      leftAt: stu.leftAt,
    }));

    const counts = data.reduce(
      (acc, r) => {
        acc.total += 1;
        const s = String(r.status || '');
        const key = (s === 'sick' || s === 'medical' || s === 'family' || s === 'other') ? 'excused' : s;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
    );

    res.json({
      meta: {
        gradeSectionId: String(gradeSectionId),
        ...(studentObjectId ? { studentId: String(studentObjectId) } : {}),
        date: dateToISODateOnlyUTC(when),
        mode: m,
        periodCode: pCode,
        rosterScope: wantAsOf ? 'asOf' : 'current',
      },
      counts,
      data,
    });
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Attendance report timeline for a single student over a date range
// @route   GET /api/attendance/reports/student-range?gradeSectionId=...&studentId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&mode=daily|lesson&periodCode=...&rosterScope=current|asOf
export const getAttendanceReportStudentRange = async (req, res) => {
  try {
    let { gradeSectionId, studentId, from, to, mode, periodCode, rosterScope } = req.query;

    const isStudentSelf = req.user?.role === 'student';
    if (isStudentSelf) {
      studentId = String(req.user._id);
      rosterScope = 'current';

      const enr = await Enrollment.findOne({ student: req.user._id, status: 'active' })
        .sort({ createdAt: -1 })
        .select('gradeSection')
        .lean();
      gradeSectionId = enr?.gradeSection ? String(enr.gradeSection) : null;
    }

    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'gradeSectionId required' });
    }
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'studentId required' });
    }

    const gs = await GradeSection.findById(gradeSectionId).lean();
    if (!gs) return res.status(404).json({ message: 'GradeSection not found' });

    const fromDate = from ? parseISODateOnly(from) : null;
    const toDate = to ? parseISODateOnly(to) : null;
    if (from && !fromDate) return res.status(400).json({ message: 'Invalid from (use YYYY-MM-DD)' });
    if (to && !toDate) return res.status(400).json({ message: 'Invalid to (use YYYY-MM-DD)' });

    const { start, end } = clampDateRange(fromDate, toDate);
    // Enforce max 31 days (month) on server too.
    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diffDays > 31) {
      return res.status(400).json({ message: 'Max range is 1 month (31 days).' });
    }

    const m = String(mode || 'daily').toLowerCase();
    if (m !== 'daily' && m !== 'lesson') {
      return res.status(400).json({ message: 'Invalid mode (use daily or lesson)' });
    }
    const pCode = (m === 'daily') ? 'DAY' : String(periodCode || '').trim();
    if (m === 'lesson' && !pCode) {
      return res.status(400).json({ message: 'periodCode required for lesson mode' });
    }
    if (m === 'lesson' && pCode === 'DAY') {
      return res.status(400).json({ message: 'Invalid periodCode for lesson mode' });
    }

    const scope = String(rosterScope || 'current').toLowerCase();
    const wantAsOf = scope === 'asof' || scope === 'as_of' || scope === 'as-of';

    // Validate that this student belongs to the section for this scope.
    const membership = wantAsOf
      ? await Enrollment.exists({
          gradeSection: gradeSectionId,
          student: studentId,
          joinedAt: { $lte: end },
          $or: [{ leftAt: null }, { leftAt: { $gte: start } }],
        })
      : await Enrollment.exists({
          gradeSection: gradeSectionId,
          student: studentId,
          status: 'active',
        });
    if (!membership) {
      return res.status(404).json({ message: 'Student is not in this section for the selected roster scope.' });
    }

    const anyByDateAgg = await AttendanceRecord.aggregate([
      {
        $match: {
          gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
          date: { $gte: start, $lte: end },
          periodCode: pCode,
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: 'UTC',
              }
            }
          },
          count: { $sum: 1 },
        }
      },
      { $project: { _id: 0, date: '$_id.date', count: 1 } },
    ]);
    const anyByDate = new Map((anyByDateAgg || []).map(r => [String(r.date), Number(r.count || 0)]));

    const studentRecs = await AttendanceRecord.find({
      gradeSection: gradeSectionId,
      student: studentId,
      date: { $gte: start, $lte: end },
      periodCode: pCode,
    })
      .select('date status remarks')
      .lean();
    const studentByDate = new Map(
      (studentRecs || []).map(r => [dateToISODateOnlyUTC(r.date), { status: r.status, remarks: r.remarks || '' }])
    );

    const rows = [];
    for (let i = 0; i < diffDays; i++) {
      const dt = new Date(start.getTime() + (i * 86400000));
      const dateKey = dateToISODateOnlyUTC(dt);

      const any = (anyByDate.get(dateKey) || 0) > 0;
      const stu = studentByDate.get(dateKey) || null;
      if (!any) {
        rows.push({
          date: dateKey,
          periodCode: pCode,
          status: 'not_marked',
          remarks: '',
        });
      } else if (stu) {
        rows.push({
          date: dateKey,
          periodCode: pCode,
          status: String(stu.status || ''),
          remarks: String(stu.remarks || ''),
        });
      } else {
        rows.push({
          date: dateKey,
          periodCode: pCode,
          status: 'absent',
          remarks: '',
        });
      }
    }

    const counts = rows.reduce(
      (acc, r) => {
        acc.total += 1;
        const s = String(r.status || '');
        if (s === 'not_marked') {
          acc.notMarked += 1;
          return acc;
        }
        const key = (s === 'sick' || s === 'medical' || s === 'family' || s === 'other') ? 'excused' : s;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0, excused: 0, notMarked: 0 }
    );

    res.json({
      meta: {
        gradeSectionId: String(gradeSectionId),
        studentId: String(studentId),
        from: dateToISODateOnlyUTC(start),
        to: dateToISODateOnlyUTC(end),
        mode: m,
        periodCode: pCode,
        rosterScope: wantAsOf ? 'asOf' : 'current',
      },
      counts,
      data: rows,
    });
  } catch {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Student self view: show only attendance that was actually taken/saved (no not_marked days)
//          If daily (DAY) was used for a date, return a single daily entry.
//          If lesson-based was used, return an entry per periodCode; attempt to map to timetable subject/teacher.
// @route   GET /api/attendance/student/self?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getStudentSelfAttendance = async (req, res) => {
  try {
    if (req.user?.role !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const studentId = String(req.user._id);
    const enr = await Enrollment.findOne({ student: req.user._id, status: 'active' })
      .sort({ createdAt: -1 })
      .select('gradeSection')
      .lean();
    const gradeSectionId = enr?.gradeSection ? String(enr.gradeSection) : null;
    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.json({ meta: { from: null, to: null }, data: [] });
    }

    const { from, to } = req.query;
    const fromDate = from ? parseISODateOnly(from) : null;
    const toDate = to ? parseISODateOnly(to) : null;
    if (from && !fromDate) return res.status(400).json({ message: 'Invalid from (use YYYY-MM-DD)' });
    if (to && !toDate) return res.status(400).json({ message: 'Invalid to (use YYYY-MM-DD)' });

    const { start, end } = clampDateRange(fromDate, toDate);
    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diffDays > 31) {
      return res.status(400).json({ message: 'Max range is 1 month (31 days).' });
    }

    // Which (date, periodCode) had any attendance taken for the class?
    const anyAgg = await AttendanceRecord.aggregate([
      {
        $match: {
          gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
          date: { $gte: start, $lte: end },
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: 'UTC',
              }
            },
            periodCode: '$periodCode',
          },
          count: { $sum: 1 },
        }
      },
      { $project: { _id: 0, date: '$_id.date', periodCode: '$_id.periodCode', count: 1 } },
    ]);

    const periodCodesByDate = new Map();
    for (const r of anyAgg || []) {
      const dateKey = String(r?.date || '');
      const p = String(r?.periodCode || '').trim();
      if (!dateKey || !p) continue;
      const set = periodCodesByDate.get(dateKey) || new Set();
      set.add(p);
      periodCodesByDate.set(dateKey, set);
    }

    // Student records in range (may be sparse; missing implies absent when class has any attendance for that slot)
    const studentRecs = await AttendanceRecord.find({
      gradeSection: gradeSectionId,
      student: studentId,
      date: { $gte: start, $lte: end },
    })
      .select('date periodCode status remarks')
      .lean();

    const studentByDatePeriod = new Map();
    for (const r of studentRecs || []) {
      const dateKey = dateToISODateOnlyUTC(r.date);
      const p = String(r?.periodCode || '').trim();
      if (!dateKey || !p) continue;
      studentByDatePeriod.set(`${dateKey}|${p}`, {
        status: String(r?.status || ''),
        remarks: String(r?.remarks || ''),
      });
    }

    // Timetable lookup for subject/teacher mapping for lesson periodCodes like "HH:MM-HH:MM"
    const slots = await Timetable.find({ gradeSection: gradeSectionId, isBreak: { $ne: true } })
      .select('dayOfWeek startTime endTime subject teacher')
      .populate('subject', 'subjectName')
      .populate('teacher', 'fullName')
      .lean();

    const slotByDayAndPeriod = new Map();
    for (const s of slots || []) {
      const day = Number(s?.dayOfWeek);
      const startTime = String(s?.startTime || '').trim();
      const endTime = String(s?.endTime || '').trim();
      if (!Number.isInteger(day) || !startTime || !endTime) continue;
      const key = `${day}|${startTime}-${endTime}`;
      slotByDayAndPeriod.set(key, {
        startTime,
        endTime,
        subjectName: String(s?.subject?.subjectName || ''),
        teacherName: String(s?.teacher?.fullName || ''),
      });
    }

    const data = [];
    const dateKeys = Array.from(periodCodesByDate.keys()).sort((a, b) => String(b).localeCompare(String(a)));
    for (const dateKey of dateKeys) {
      const periodSet = periodCodesByDate.get(dateKey);
      if (!periodSet || periodSet.size === 0) continue;

      // If daily exists for this date, show only daily.
      if (periodSet.has('DAY')) {
        const rec = studentByDatePeriod.get(`${dateKey}|DAY`) || null;
        data.push({
          date: dateKey,
          mode: 'daily',
          periodCode: 'DAY',
          status: rec ? rec.status : 'absent',
          remarks: rec ? rec.remarks : '',
        });
        continue;
      }

      // Lesson attendance: show each period that was taken for that date.
      // Sort periods by time if they look like HH:MM-HH:MM.
      const periods = Array.from(periodSet).filter(p => p && p !== 'DAY');
      periods.sort((a, b) => String(a).localeCompare(String(b)));

      // Compute day keys from date
      const dt = parseISODateOnly(dateKey);
      const { project, js } = dt ? projectDayOfWeekFromUTCDate(dt) : { project: null, js: null };

      for (const pCode of periods) {
        const rec = studentByDatePeriod.get(`${dateKey}|${pCode}`) || null;

        let startTime = '';
        let endTime = '';
        let subjectName = '';
        let teacherName = '';

        const m = String(pCode).match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
        if (m) {
          startTime = m[1];
          endTime = m[2];
          const hit =
            (project != null && slotByDayAndPeriod.get(`${project}|${startTime}-${endTime}`)) ||
            (js != null && slotByDayAndPeriod.get(`${js}|${startTime}-${endTime}`)) ||
            null;
          if (hit) {
            subjectName = hit.subjectName || '';
            teacherName = hit.teacherName || '';
          }
        }

        data.push({
          date: dateKey,
          mode: 'lesson',
          periodCode: pCode,
          startTime,
          endTime,
          subjectName,
          teacherName,
          status: rec ? rec.status : 'absent',
          remarks: rec ? rec.remarks : '',
        });
      }
    }

    return res.json({
      meta: {
        gradeSectionId: String(gradeSectionId),
        studentId: String(studentId),
        from: dateToISODateOnlyUTC(start),
        to: dateToISODateOnlyUTC(end),
      },
      data,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Staff/Admin view: show student's "self" attendance (only taken/saved) for the student's active enrollment
// @route   GET /api/attendance/student/:id/self?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getStudentAttendanceSelfForStudentId = async (req, res) => {
  try {
    const studentId = String(req.params?.id || '').trim();
    if (!mongoose.isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Invalid student id' });
    }

    const enr = await Enrollment.findOne({ student: studentId, status: 'active' })
      .sort({ createdAt: -1 })
      .select('gradeSection')
      .lean();
    const gradeSectionId = enr?.gradeSection ? String(enr.gradeSection) : null;
    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.json({ meta: { from: null, to: null }, data: [] });
    }

    const { from, to } = req.query;
    const fromDate = from ? parseISODateOnly(from) : null;
    const toDate = to ? parseISODateOnly(to) : null;
    if (from && !fromDate) return res.status(400).json({ message: 'Invalid from (use YYYY-MM-DD)' });
    if (to && !toDate) return res.status(400).json({ message: 'Invalid to (use YYYY-MM-DD)' });

    const { start, end } = clampDateRange(fromDate, toDate);
    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (diffDays > 31) {
      return res.status(400).json({ message: 'Max range is 1 month (31 days).' });
    }

    // Which (date, periodCode) had any attendance taken for the class?
    const anyAgg = await AttendanceRecord.aggregate([
      {
        $match: {
          gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
          date: { $gte: start, $lte: end },
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: 'UTC',
              }
            },
            periodCode: '$periodCode',
          },
          count: { $sum: 1 },
        }
      },
      { $project: { _id: 0, date: '$_id.date', periodCode: '$_id.periodCode', count: 1 } },
    ]);

    const periodCodesByDate = new Map();
    for (const r of anyAgg || []) {
      const dateKey = String(r?.date || '');
      const p = String(r?.periodCode || '').trim();
      if (!dateKey || !p) continue;
      const set = periodCodesByDate.get(dateKey) || new Set();
      set.add(p);
      periodCodesByDate.set(dateKey, set);
    }

    // Student records in range (may be sparse; missing implies absent when class has any attendance for that slot)
    const studentRecs = await AttendanceRecord.find({
      gradeSection: gradeSectionId,
      student: studentId,
      date: { $gte: start, $lte: end },
    })
      .select('date periodCode status remarks')
      .lean();

    const studentByDatePeriod = new Map();
    for (const r of studentRecs || []) {
      const dateKey = dateToISODateOnlyUTC(r.date);
      const p = String(r?.periodCode || '').trim();
      if (!dateKey || !p) continue;
      studentByDatePeriod.set(`${dateKey}|${p}`, {
        status: String(r?.status || ''),
        remarks: String(r?.remarks || ''),
      });
    }

    // Timetable lookup for subject/teacher mapping for lesson periodCodes like "HH:MM-HH:MM"
    const slots = await Timetable.find({ gradeSection: gradeSectionId, isBreak: { $ne: true } })
      .select('dayOfWeek startTime endTime subject teacher')
      .populate('subject', 'subjectName')
      .populate('teacher', 'fullName')
      .lean();

    const slotByDayAndPeriod = new Map();
    for (const s of slots || []) {
      const day = Number(s?.dayOfWeek);
      const startTime = String(s?.startTime || '').trim();
      const endTime = String(s?.endTime || '').trim();
      if (!Number.isInteger(day) || !startTime || !endTime) continue;
      const key = `${day}|${startTime}-${endTime}`;
      slotByDayAndPeriod.set(key, {
        startTime,
        endTime,
        subjectName: String(s?.subject?.subjectName || ''),
        teacherName: String(s?.teacher?.fullName || ''),
      });
    }

    const data = [];
    const dateKeys = Array.from(periodCodesByDate.keys()).sort((a, b) => String(b).localeCompare(String(a)));
    for (const dateKey of dateKeys) {
      const periodSet = periodCodesByDate.get(dateKey);
      if (!periodSet || periodSet.size === 0) continue;

      // If daily exists for this date, show only daily.
      if (periodSet.has('DAY')) {
        const rec = studentByDatePeriod.get(`${dateKey}|DAY`) || null;
        data.push({
          date: dateKey,
          mode: 'daily',
          periodCode: 'DAY',
          status: rec ? rec.status : 'absent',
          remarks: rec ? rec.remarks : '',
        });
        continue;
      }

      // Lesson attendance: show each period that was taken for that date.
      // Sort periods by time if they look like HH:MM-HH:MM.
      const periods = Array.from(periodSet).filter(p => p && p !== 'DAY');
      periods.sort((a, b) => String(a).localeCompare(String(b)));

      // Compute day keys from date
      const dt = parseISODateOnly(dateKey);
      const { project, js } = dt ? projectDayOfWeekFromUTCDate(dt) : { project: null, js: null };

      for (const pCode of periods) {
        const rec = studentByDatePeriod.get(`${dateKey}|${pCode}`) || null;

        let startTime = '';
        let endTime = '';
        let subjectName = '';
        let teacherName = '';

        const m = String(pCode).match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/);
        if (m) {
          startTime = m[1];
          endTime = m[2];
          const hit =
            (project != null && slotByDayAndPeriod.get(`${project}|${startTime}-${endTime}`)) ||
            (js != null && slotByDayAndPeriod.get(`${js}|${startTime}-${endTime}`)) ||
            null;
          if (hit) {
            subjectName = hit.subjectName || '';
            teacherName = hit.teacherName || '';
          }
        }

        data.push({
          date: dateKey,
          mode: 'lesson',
          periodCode: pCode,
          startTime,
          endTime,
          subjectName,
          teacherName,
          status: rec ? rec.status : 'absent',
          remarks: rec ? rec.remarks : '',
        });
      }
    }

    return res.json({
      meta: {
        gradeSectionId: String(gradeSectionId),
        studentId: String(studentId),
        from: dateToISODateOnlyUTC(start),
        to: dateToISODateOnlyUTC(end),
      },
      data,
    });
  } catch {
    return res.status(500).json({ message: 'Server Error' });
  }
};
