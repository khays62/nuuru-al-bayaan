import TeacherAssignment from '../models/TeacherAssignment.js';
import mongoose from 'mongoose';

const clients = new Set();

function sseWrite(res, payload) {
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    // ignore
  }
}

function normalizeId(v) {
  try {
    if (!v) return null;
    const s = String(v);
    return mongoose.isValidObjectId(s) ? s : null;
  } catch {
    return null;
  }
}

function arrayToSet(arr) {
  const set = new Set();
  (Array.isArray(arr) ? arr : []).forEach((x) => {
    const id = normalizeId(x);
    if (id) set.add(id);
  });
  return set;
}

function canUserSeeAnnouncement(clientCtx, announcement) {
  if (!clientCtx?.role) return false;

  const role = String(clientCtx.role || '').toLowerCase();
  if (role === 'admin' || role === 'staff') {
    const raw = announcement?.audienceType;
    if (raw == null) return true;
    return String(raw) === 'all';
  }

  const type = String(announcement?.audienceType || 'all');
  if (type === 'all') return true;

  if (type === 'gradeSections') {
    const aud = arrayToSet(announcement?.audienceGradeSections);
    if (role === 'student') {
      const gs = normalizeId(clientCtx.studentGradeSectionId);
      if (!gs) return false;
      return aud.has(gs);
    }
    if (role === 'teacher') {
      const mine = clientCtx.teacherGradeSectionsSet;
      if (!mine || mine.size === 0) return false;
      for (const gsId of mine) {
        if (aud.has(gsId)) return true;
      }
      return false;
    }
  }

  return false;
}

export async function registerAnnouncementStream({ req, res }) {
  const user = req.user;
  const role = String(user?.role || '').toLowerCase();

  const client = {
    res,
    role,
    username: user?.username || null,
    userId: normalizeId(user?._id),
    teacherGradeSectionsSet: new Set(),
    studentGradeSectionId: null,
  };

  try {
    if (role === 'teacher') {
      const teacherId = normalizeId(user?.teacherRef);
      if (teacherId) {
        const gradeSections = await TeacherAssignment.find({ teacher: teacherId }).distinct('gradeSection');
        client.teacherGradeSectionsSet = arrayToSet(gradeSections);
      }
    } else if (role === 'student') {
      const studentId = normalizeId(user?.studentRef);
      if (studentId) {
        const Enrollment = (await import('../models/Enrollment.js')).default;
        const active = await Enrollment.findOne({ student: studentId, status: 'active' })
          .sort({ joinedAt: -1, createdAt: -1 })
          .select('gradeSection')
          .lean();
        const latest = active || await Enrollment.findOne({ student: studentId })
          .sort({ joinedAt: -1, createdAt: -1 })
          .select('gradeSection')
          .lean();
        client.studentGradeSectionId = normalizeId(latest?.gradeSection);
      }
    }
  } catch {
    // Non-blocking: if scope can't be determined, client will receive only 'all' announcements.
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Initial hello
  sseWrite(res, { type: 'hello', ts: Date.now() });

  clients.add(client);

  // Keep-alive ping
  const pingId = setInterval(() => {
    sseWrite(res, { type: 'ping', ts: Date.now() });
  }, 25_000);

  req.on('close', () => {
    clearInterval(pingId);
    clients.delete(client);
    try {
      res.end();
    } catch {
      // ignore
    }
  });
}

export function broadcastAnnouncementEvent(event) {
  const payload = {
    type: event?.type,
    announcement: event?.announcement,
    id: event?.id,
    ts: Date.now(),
  };

  for (const c of clients) {
    try {
      if (!c?.res) continue;
      if (payload.type === 'deleted') {
        // If the controller provided the deleted document's audience fields,
        // we can filter deletes just like creates/updates.
        if (payload.announcement && !canUserSeeAnnouncement(c, payload.announcement)) continue;
        sseWrite(c.res, payload);
        continue;
      }

      if (!canUserSeeAnnouncement(c, payload.announcement)) continue;
      sseWrite(c.res, payload);
    } catch {
      // ignore
    }
  }
}
