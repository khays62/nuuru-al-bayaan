import express from 'express';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import { realtimeBus } from '../utils/realtimeBus.js';

const router = express.Router();

// Server-Sent Events stream for realtime UI refresh.
// Emits small, non-PII events like { type: 'students:changed', id?: '...' }.
router.get('/stream', protect, authorizeRoles('admin', 'staff', 'teacher'), (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  // If behind a proxy, ensure headers are flushed immediately.
  try { res.flushHeaders?.(); } catch { /* ignore */ }

  const write = (payload) => {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // ignore
    }
  };

  // Initial hello for quick client confirmation.
  write({ type: 'hello', ts: Date.now() });

  const onEvent = (payload) => write(payload);
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
