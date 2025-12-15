import mongoose from 'mongoose';
import AttendanceRecord from '../models/AttendanceRecord.js';
import GradeSection from '../models/GradeSection.js';
import Enrollment from '../models/Enrollment.js';

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

    const ops = items.map(r => ({
      updateOne: {
        filter: { gradeSection: gradeSectionId, date: when, periodCode: pCode, student: r.studentId },
        update: {
          $set: {
            status: r.status,
            remarks: r.remarks || '',
            ...(actorTeacher ? { markedBy: actorTeacher } : {}),
          }
        },
        upsert: true,
      }
    }));
    if (ops.length === 0) return res.json({ updated: 0 });
    const resBulk = await AttendanceRecord.bulkWrite(ops, { ordered: false });
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

    // Load existing attendance for the given date (defaults to today)
    let existing = [];

    existing = await AttendanceRecord.find({ gradeSection: gradeSectionId, date: when, periodCode: pCode })
      .select('student status remarks')
      .lean();

    const statusMap = new Map(existing.map(r => [String(r.student), { status: r.status, remarks: r.remarks || '' }]));
    const merged = roster.map(stu => ({
      _id: stu._id,
      studentId: stu.studentId,
      fullName: stu.fullName,
      status: statusMap.get(String(stu._id))?.status || 'absent',
      remarks: statusMap.get(String(stu._id))?.remarks || '',
      active: String(stu.status || '').toLowerCase() === 'active',
    }));

    res.json({ data: merged });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Attendance report summaries for a section over a date range
// @route   GET /api/attendance/reports/summary?gradeSectionId=...&from=YYYY-MM-DD&to=YYYY-MM-DD&mode=daily|lesson|both
export const getAttendanceReportSummary = async (req, res) => {
  try {
    const { gradeSectionId, from, to, mode, rosterScope } = req.query;
    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'gradeSectionId required' });
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
    const rosterCount = wantAsOf
      ? await Enrollment.countDocuments({
          gradeSection: gradeSectionId,
          joinedAt: { $lte: end },
          $or: [{ leftAt: null }, { leftAt: { $gte: start } }],
        })
      : await Enrollment.countDocuments({
          gradeSection: gradeSectionId,
          status: 'active',
        });

    const want = String(mode || 'both').toLowerCase();
    const wantDaily = want === 'daily' || want === 'both';
    const wantLesson = want === 'lesson' || want === 'both';

    const baseMatch = {
      gradeSection: new mongoose.Types.ObjectId(gradeSectionId),
      date: { $gte: start, $lte: end },
    };

    let daily = [];
    let lesson = [];

    if (wantDaily) {
      daily = await AttendanceRecord.aggregate([
        { $match: { ...baseMatch, periodCode: 'DAY' } },
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
            excused: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } },
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
        { $match: { ...baseMatch, periodCode: { $ne: 'DAY' } } },
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
            excused: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } },
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
// @route   GET /api/attendance/reports/details?gradeSectionId=...&date=YYYY-MM-DD&mode=daily|lesson&periodCode=...
export const getAttendanceReportDetails = async (req, res) => {
  try {
    const { gradeSectionId, date, mode, periodCode, rosterScope } = req.query;
    if (!mongoose.isValidObjectId(gradeSectionId)) {
      return res.status(400).json({ message: 'gradeSectionId required' });
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

    const existing = await AttendanceRecord.find({
      gradeSection: gradeSectionId,
      date: when,
      periodCode: pCode,
    })
      .select('student status remarks')
      .lean();

    // IMPORTANT: Reports should not fabricate "absent" for the whole roster when no attendance was marked.
    // If there are no records at all for this section/date/period, return empty data.
    if (!existing || existing.length === 0) {
      return res.json({
        meta: {
          gradeSectionId: String(gradeSectionId),
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
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
    );

    res.json({
      meta: {
        gradeSectionId: String(gradeSectionId),
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
