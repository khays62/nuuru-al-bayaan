import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { realtimeBus } from '../utils/realtimeBus.js';

const router = express.Router();

// Server-Sent Events stream for realtime UI refresh.
// Emits small, non-PII events like { type: 'students:changed', id?: '...' }.
router.get('/stream', protect, authorizeRoles('admin', 'staff', 'teacher', 'student'), (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // If behind a proxy, ensure headers are flushed immediately.
  try { res.flushHeaders?.(); } catch { /* ignore */ }

  const roleLower = String(req.user?.role || '').toLowerCase();
  const studentRefId = (() => {
    const ref = req.user?.studentRef;
    if (!ref) return null;
    if (typeof ref === 'object' && ref._id) return String(ref._id);
    return String(ref);
  })();

  const allowedForStudent = new Set([
    // Student-visible domains
    'students:changed',
    'transfers:changed',
    'attendance:changed',
    'timetable:changed',
    // Exam lifecycle affecting student transcript/results
    'exams:changed',
    'results:changed',
    'transcript:changed',
    // Student finance
    'studentFinance:changed',
  ]);

  const canSendToStudent = (payload) => {
    const type = String(payload?.type || '').trim();
    if (!type) return false;
    if (!allowedForStudent.has(type)) return false;

    // For student-scoped events that include a student id, only allow events matching the logged-in student's ref.
    // Note: Some events (e.g. attendance:changed, exams/results) may not include a student id today; those are allowed.
    if ((type === 'students:changed' || type === 'transfers:changed') && studentRefId) {
      const eventStudentId = payload?.studentId ? String(payload.studentId) : (payload?.id ? String(payload.id) : null);
      if (eventStudentId && eventStudentId !== studentRefId) return false;
    }

    // Finance MUST be explicitly scoped, otherwise it could leak cross-student refresh signals.
    if (type === 'studentFinance:changed' && studentRefId) {
      const eventStudentId = payload?.studentId ? String(payload.studentId) : (payload?.id ? String(payload.id) : null);
      if (!eventStudentId) return false;
      if (eventStudentId !== studentRefId) return false;
    }

    return true;
  };

  const write = (payload) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // ignore
    }
  };

  // Initial hello for quick client confirmation.
  write({ type: 'hello', ts: Date.now() });

  const onEvent = (payload) => {
    if (roleLower === 'student') {
      if (!canSendToStudent(payload)) return;
    }
    write(payload);
  };
  realtimeBus.on('event', onEvent);

  // Heartbeat to keep connections alive through proxies.
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    } catch {
      // ignore
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    realtimeBus.off('event', onEvent);
    try { res.end(); } catch { /* ignore */ }
  });
});

export default router;
