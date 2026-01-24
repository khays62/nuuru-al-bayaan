import mongoose from 'mongoose';
import Timetable from '../models/Timetable.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import Enrollment from '../models/Enrollment.js';

function buildTimeOverlapQuery({ startTime, endTime }) {
  return { startTime: { $lt: endTime }, endTime: { $gt: startTime } };
}

export const listSlots = async (req, res) => {
  try {
    let { gs, teacher, day, subject, from, to, mine } = req.query;
    const q = {};

    // Student-safe scope: force gradeSection to the student's active enrollment.
    if (req.user?.role === 'student') {
      const selfStudentId = req.user?.studentRef?._id || req.user?.studentRef || null;
      const studentId = selfStudentId ? String(selfStudentId) : String(req.user._id);
      const enr = await Enrollment.findOne({ student: studentId, status: 'active' })
        .sort({ createdAt: -1 })
        .select('gradeSection')
        .lean();
      if (!enr?.gradeSection) {
        return res.json({ data: [] });
      }
      q.gradeSection = enr.gradeSection;
    }

    // Teacher-safe scope: teacher can view timetable for assigned gradeSections.
    // If `mine=1`, return only slots taught by the logged-in teacher.
    if (req.user?.role === 'teacher') {
      const teacherRef = req.user?.teacherRef;
      if (!teacherRef || !mongoose.isValidObjectId(teacherRef)) {
        return res.status(403).json({ message: 'Teacher account is missing teacherRef' });
      }

      const mineOnly = ['1', 'true', 'yes'].includes(String(mine || '').toLowerCase());
      const assigned = await TeacherAssignment.find({ teacher: teacherRef }).distinct('gradeSection');
      const allowed = (assigned || []).filter((id) => mongoose.isValidObjectId(id));
      if (!allowed.length) return res.json({ data: [] });

      if (gs && mongoose.isValidObjectId(gs)) {
        const ok = allowed.some((id) => String(id) === String(gs));
        if (!ok) return res.status(403).json({ message: 'Not assigned to this class' });
        q.gradeSection = gs;
      } else {
        q.gradeSection = { $in: allowed };
      }

      if (mineOnly) {
        q.teacher = teacherRef;
      }

      // Ignore teacher query param for teachers (they can see the full class timetable).
    } else {
      if (!q.gradeSection && gs && mongoose.isValidObjectId(gs)) q.gradeSection = gs;
      if (teacher && mongoose.isValidObjectId(teacher)) q.teacher = teacher;
    }
    if (subject && mongoose.isValidObjectId(subject)) q.subject = subject;
    if (day != null && day !== '') {
      const d = Number(day);
      if (!Number.isNaN(d)) q.dayOfWeek = d;
    }
    if (from && to) {
      Object.assign(q, buildTimeOverlapQuery({ startTime: from, endTime: to }));
    }
    const rows = await Timetable.find(q)
      .select('gradeSection subject teacher isBreak dayOfWeek startTime endTime room createdAt')
      .populate('subject', 'subjectName')
      .populate('teacher', 'fullName')
      .populate({ path: 'gradeSection', select: 'section grade shift', populate: [
        { path: 'grade', select: 'gradeName' },
        { path: 'shift', select: 'shiftName' }
      ]})
      .lean();
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createSlot = async (req, res) => {
  try {
    let { gsId, subjectId, dayOfWeek, startTime, endTime, room, teacherId, isBreak } = req.body;
    if (!mongoose.isValidObjectId(gsId)) return res.status(400).json({ message: 'Invalid ids' });
    if (!isBreak && !mongoose.isValidObjectId(subjectId)) return res.status(400).json({ message: 'Invalid subject id' });
    const day = Number(dayOfWeek);
    if (!Number.isInteger(day) || day < 0 || day > 6) return res.status(400).json({ message: 'Invalid dayOfWeek' });
    if (!startTime || !endTime || !(typeof startTime === 'string') || !(typeof endTime === 'string')) return res.status(400).json({ message: 'Invalid time range' });
    if (startTime >= endTime) return res.status(400).json({ message: 'Invalid time range (start ≥ end)' });

    // Auto-fill teacher from assignment if not provided (non-break only)
    let teacher = null;
    if (!isBreak) {
      teacher = teacherId && mongoose.isValidObjectId(teacherId) ? teacherId : null;
      if (!teacher) {
        const assign = await TeacherAssignment.findOne({ gradeSection: gsId, subject: subjectId }).select('teacher').lean();
        teacher = assign?.teacher || null;
      }
      if (!teacher) {
        return res.status(409).json({ message: 'No teacher assigned to this subject in this class.' });
      }
    }

    // Conflicts: GS
    const gsConflict = await Timetable.exists({
      gradeSection: gsId,
      dayOfWeek: day,
      ...buildTimeOverlapQuery({ startTime, endTime })
    });
    if (gsConflict) return res.status(409).json({ message: 'Period already occupied for this class.' });

    // Conflicts: Teacher (skip if break)
    if (!isBreak && teacher) {
      const tConflict = await Timetable.exists({
        teacher,
        dayOfWeek: day,
        ...buildTimeOverlapQuery({ startTime, endTime })
      });
      if (tConflict) return res.status(409).json({ message: 'Teacher has another class in this period.' });
    }

    // Conflicts: Room (optional)
    if (room) {
      const rConflict = await Timetable.exists({
        room,
        dayOfWeek: day,
        ...buildTimeOverlapQuery({ startTime, endTime })
      });
      if (rConflict) return res.status(409).json({ message: 'Room already booked at this time.' });
    }

    const created = await Timetable.create({
      gradeSection: gsId,
      isBreak: !!isBreak,
      subject: isBreak ? undefined : subjectId,
      teacher: isBreak ? undefined : teacher,
      dayOfWeek: day,
      startTime,
      endTime,
      room: room || undefined,
    });

    res.status(201).json({ data: { _id: String(created._id), createdAt: created.createdAt } });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const createSlotsBulk = async (req, res) => {
  try {
    let { gsId, subjectId, days = [], startTime, endTime, room, teacherId, isBreak } = req.body;
    if (!mongoose.isValidObjectId(gsId)) return res.status(400).json({ message: 'Invalid ids' });
    if (!isBreak && !mongoose.isValidObjectId(subjectId)) return res.status(400).json({ message: 'Invalid subject id' });
    if (!Array.isArray(days) || days.length === 0) return res.status(400).json({ message: 'days required' });
    if (!startTime || !endTime || startTime >= endTime) return res.status(400).json({ message: 'Invalid time range' });

    let teacher = null;
    if (!isBreak) {
      teacher = teacherId && mongoose.isValidObjectId(teacherId) ? teacherId : null;
      if (!teacher) {
        const assign = await TeacherAssignment.findOne({ gradeSection: gsId, subject: subjectId }).select('teacher').lean();
        teacher = assign?.teacher || null;
      }
      if (!teacher) {
        return res.status(409).json({ message: 'No teacher assigned to this subject in this class.' });
      }
    }

    const created = [];
    const conflicts = [];

    for (const dRaw of days) {
      const d = Number(dRaw);
      if (!Number.isInteger(d) || d < 0 || d > 6) { conflicts.push({ day: dRaw, reason: 'Invalid day' }); continue; }

      const gsConflict = await Timetable.exists({ gradeSection: gsId, dayOfWeek: d, ...buildTimeOverlapQuery({ startTime, endTime }) });
      if (gsConflict) { conflicts.push({ day: d, reason: 'GS conflict' }); continue; }

      if (!isBreak && teacher) {
        const tConflict = await Timetable.exists({ teacher, dayOfWeek: d, ...buildTimeOverlapQuery({ startTime, endTime }) });
        if (tConflict) { conflicts.push({ day: d, reason: 'Teacher conflict' }); continue; }
      }

      if (room) {
        const rConflict = await Timetable.exists({ room, dayOfWeek: d, ...buildTimeOverlapQuery({ startTime, endTime }) });
        if (rConflict) { conflicts.push({ day: d, reason: 'Room conflict' }); continue; }
      }

      const doc = await Timetable.create({ gradeSection: gsId, isBreak: !!isBreak, subject: isBreak ? undefined : subjectId, teacher: isBreak ? undefined : teacher, dayOfWeek: d, startTime, endTime, room: room || undefined });
      created.push({ _id: String(doc._id), day: d });
    }

    return res.status(200).json({ data: { created, conflicts } });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const updateSlot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    const found = await Timetable.findById(id).select('gradeSection subject teacher dayOfWeek startTime endTime room');
    if (!found) return res.status(404).json({ message: 'Not found' });

    const day = req.body.dayOfWeek != null ? Number(req.body.dayOfWeek) : found.dayOfWeek;
    const startTime = req.body.startTime || found.startTime;
    const endTime = req.body.endTime || found.endTime;
    const subject = req.body.subjectId && mongoose.isValidObjectId(req.body.subjectId) ? req.body.subjectId : found.subject;
    const room = req.body.room !== undefined ? req.body.room : found.room;
    let teacher = req.body.teacherId && mongoose.isValidObjectId(req.body.teacherId) ? req.body.teacherId : found.teacher;

    if (!Number.isInteger(day) || day < 0 || day > 6) return res.status(400).json({ message: 'Invalid dayOfWeek' });
    if (!startTime || !endTime || startTime >= endTime) return res.status(400).json({ message: 'Invalid time range' });

    // Auto-fill if subject changed and no teacher provided explicitly
    if (String(subject) !== String(found.subject) && !(req.body.teacherId && mongoose.isValidObjectId(req.body.teacherId))) {
      const assign = await TeacherAssignment.findOne({ gradeSection: found.gradeSection, subject }).select('teacher').lean();
      teacher = assign?.teacher || null;
    }

    // Conflicts excluding self
    const overlap = buildTimeOverlapQuery({ startTime, endTime });
    const baseExcl = { _id: { $ne: id }, dayOfWeek: day };

    const gsConflict = await Timetable.exists({ ...baseExcl, gradeSection: found.gradeSection, ...overlap });
    if (gsConflict) return res.status(409).json({ message: 'Period already occupied for this class.' });

    if (teacher) {
      const tConflict = await Timetable.exists({ ...baseExcl, teacher, ...overlap });
      if (tConflict) return res.status(409).json({ message: 'Teacher has another class in this period.' });
    }

    if (room) {
      const rConflict = await Timetable.exists({ ...baseExcl, room, ...overlap });
      if (rConflict) return res.status(409).json({ message: 'Room already booked at this time.' });
    }

    found.dayOfWeek = day;
    found.startTime = startTime;
    found.endTime = endTime;
    found.subject = subject;
    found.teacher = teacher;
    found.room = room;
    await found.save();

    res.json({ data: { _id: String(found._id) } });
  } catch (e) {
    res.status(400).json({ message: e.message || 'Bad Request' });
  }
};

export const deleteSlot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });
    await Timetable.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const swapSlots = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { aId, bId } = req.body || {};
    if (!mongoose.isValidObjectId(aId) || !mongoose.isValidObjectId(bId)) {
      return res.status(400).json({ message: 'Invalid ids' });
    }
    if (String(aId) === String(bId)) {
      return res.status(400).json({ message: 'Ids must be different' });
    }

    let a;
    let b;

    await session.withTransaction(async () => {
      a = await Timetable.findById(aId).session(session).select('gradeSection subject teacher isBreak dayOfWeek startTime endTime room');
      b = await Timetable.findById(bId).session(session).select('gradeSection subject teacher isBreak dayOfWeek startTime endTime room');
      if (!a || !b) {
        throw new Error('Not found');
      }
      if (String(a.gradeSection) !== String(b.gradeSection)) {
        const err = new Error('Swap requires same class (gradeSection)');
        err.statusCode = 400;
        throw err;
      }

      // New positions are each other's cell.
      const aNew = { dayOfWeek: b.dayOfWeek, startTime: b.startTime, endTime: b.endTime };
      const bNew = { dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime };

      const overlapA = buildTimeOverlapQuery({ startTime: aNew.startTime, endTime: aNew.endTime });
      const overlapB = buildTimeOverlapQuery({ startTime: bNew.startTime, endTime: bNew.endTime });
      const exclBoth = { _id: { $nin: [a._id, b._id] } };

      // GS conflicts (excluding the two being swapped)
      const gsConflictA = await Timetable.exists({
        ...exclBoth,
        gradeSection: a.gradeSection,
        dayOfWeek: aNew.dayOfWeek,
        ...overlapA,
      }).session(session);
      if (gsConflictA) {
        const err = new Error('Period already occupied for this class.');
        err.statusCode = 409;
        throw err;
      }

      const gsConflictB = await Timetable.exists({
        ...exclBoth,
        gradeSection: a.gradeSection,
        dayOfWeek: bNew.dayOfWeek,
        ...overlapB,
      }).session(session);
      if (gsConflictB) {
        const err = new Error('Period already occupied for this class.');
        err.statusCode = 409;
        throw err;
      }

      // Teacher conflicts (skip breaks / missing teacher)
      if (!a.isBreak && a.teacher) {
        const tConflictA = await Timetable.exists({
          ...exclBoth,
          teacher: a.teacher,
          dayOfWeek: aNew.dayOfWeek,
          ...overlapA,
        }).session(session);
        if (tConflictA) {
          const err = new Error('Teacher has another class in this period.');
          err.statusCode = 409;
          throw err;
        }
      }

      if (!b.isBreak && b.teacher) {
        const tConflictB = await Timetable.exists({
          ...exclBoth,
          teacher: b.teacher,
          dayOfWeek: bNew.dayOfWeek,
          ...overlapB,
        }).session(session);
        if (tConflictB) {
          const err = new Error('Teacher has another class in this period.');
          err.statusCode = 409;
          throw err;
        }
      }

      // Room conflicts (optional)
      if (a.room) {
        const rConflictA = await Timetable.exists({
          ...exclBoth,
          room: a.room,
          dayOfWeek: aNew.dayOfWeek,
          ...overlapA,
        }).session(session);
        if (rConflictA) {
          const err = new Error('Room already booked at this time.');
          err.statusCode = 409;
          throw err;
        }
      }

      if (b.room) {
        const rConflictB = await Timetable.exists({
          ...exclBoth,
          room: b.room,
          dayOfWeek: bNew.dayOfWeek,
          ...overlapB,
        }).session(session);
        if (rConflictB) {
          const err = new Error('Room already booked at this time.');
          err.statusCode = 409;
          throw err;
        }
      }

      // Apply swap
      a.dayOfWeek = aNew.dayOfWeek;
      a.startTime = aNew.startTime;
      a.endTime = aNew.endTime;

      b.dayOfWeek = bNew.dayOfWeek;
      b.startTime = bNew.startTime;
      b.endTime = bNew.endTime;

      await a.save({ session });
      await b.save({ session });
    });

    return res.json({ data: { aId: String(a._id), bId: String(b._id) } });
  } catch (e) {
    const status = e.statusCode || (e.message === 'Not found' ? 404 : 400);
    return res.status(status).json({ message: e.message || 'Bad Request' });
  } finally {
    session.endSession();
  }
};
