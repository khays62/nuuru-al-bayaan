import express from 'express';
import { z } from 'zod';

import { protect } from '../middleware/authMiddleware.js';
import { checkAnyPermission } from '../middleware/checkPermission.js';
import { validate } from '../middleware/validate.js';
import { realtimeBus } from '../utils/realtimeBus.js';

import {
  getSystemAuditAnalytics,
  getSystemAuditAnalyticsDetails,
  getSystemAuditEvents,
  getSystemAuditOperationSummary,
  getSystemAuditSummary,
  getSystemAuditTimeline,
  postClientAuditEvent,
  getSystemAuditTop,
} from '../controllers/auditController.js';

const router = express.Router();

const rangeQuerySchema = z
  .object({
    range: z.enum(['today', 'week', 'month', 'all']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    operation: z.string().trim().min(1).optional(),
    metric: z.string().trim().min(1).optional(),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
  })
  .strip();

// System-wide audit access:
// - Admin: always allowed
// - Staff: must have security.view
router.get(
  '/summary',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  validate({ query: rangeQuerySchema.optional() }),
  getSystemAuditSummary
);

router.get(
  '/top',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  validate({ query: rangeQuerySchema.optional() }),
  getSystemAuditTop
);

router.get(
  '/analytics',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  validate({ query: rangeQuerySchema.optional() }),
  getSystemAuditAnalytics
);

router.get(
  '/analytics/details',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  validate({ query: rangeQuerySchema.optional() }),
  getSystemAuditAnalyticsDetails
);

router.get(
  '/analytics/operation-summary',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  validate({ query: rangeQuerySchema.optional() }),
  getSystemAuditOperationSummary
);

router.get(
  '/timeline',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  validate({ query: rangeQuerySchema.optional() }),
  getSystemAuditTimeline
);

router.get(
  '/events',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  validate({ query: rangeQuerySchema.optional() }),
  getSystemAuditEvents
);

// Realtime SSE stream (admin/staff with security.view).
router.get(
  '/stream',
  protect,
  checkAnyPermission([{ module: 'security', action: 'view' }]),
  (req, res) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    try { res.flushHeaders?.(); } catch { /* ignore */ }

    const write = (payload) => {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // ignore
      }
    };

    // Initial hello.
    write({ type: 'hello', ts: Date.now() });

    const onEvent = (payload) => {
      if (String(payload?.type || '') !== 'audit:created') return;
      write(payload);
    };
    realtimeBus.on('event', onEvent);

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
  }
);

// Client-side tracking (page views)
// Any authenticated role can write their own page.view event.
router.post('/client-event', protect, postClientAuditEvent);

export default router;
