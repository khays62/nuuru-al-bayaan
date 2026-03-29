import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import './config/config.js';
import connectDB from './config/db.js';
import { ensureIndexes } from './utils/indexMaintenance.js';
import { getDefaultInitialPassword } from './utils/defaultPasswords.js';
import { csrfProtection } from './middleware/csrf.js';
import { responseNormalize } from './middleware/responseNormalize.js';
import { auditTrail } from './middleware/auditTrail.js';
import { i18nMiddleware } from './middleware/i18n.js';
import { protect } from './middleware/authMiddleware.js';
import { hasPermission } from './middleware/checkPermission.js';
import { writeAuditLog } from './services/auditService.js';
import LibraryResource from './models/LibraryResource.js';
import { createUploadsRemoteOnlyHandler } from './middleware/serveUploadsRemoteOnly.js';
// import seedDatabase from './utils/seeder.js'; // Import the seeder function

// Import routes
import lookupRoutes from './routes/lookupRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import subjectRoutes from './routes/subjectRoutes.js';
import gradeSectionRoutes from './routes/gradeSectionRoutes.js';
import examRoutes from './routes/examRoutes.js';
import cohortRoutes from './routes/cohortRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import transferRoutes from './routes/transferRoutes.js';
import libraryRoutes from './routes/libraryRoutes.js';
import transcriptRoutes from './routes/transcriptRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import timetableRoutes from './routes/timetableRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import realtimeRoutes from './routes/realtimeRoutes.js';
import setupRoutes from './routes/setupRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import financeRoutes from './routes/financeRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// Auth + User Management routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import auditRoutes from './routes/auditRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required secrets early (avoid running with an implicit weak default password)
try {
  getDefaultInitialPassword();
} catch (err) {
  console.error('[config] Missing DEFAULT_INITIAL_PASSWORD:', err?.message || err);
  process.exit(1);
}

// Connect to the database and then seed it
const startServer = async () => {
  await connectDB();
  await ensureIndexes();
  // After connecting, run the seeder to ensure initial data exists.
  // await seedDatabase();

  const app = express();

  // Reduce fingerprinting / information leakage.
  app.disable('x-powered-by');

  // CORS allowlist (comma-separated). In production, avoid using '*', especially with cookies.
  const corsAllowlist = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const isDev = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
  const isLocalhostOrigin = (origin) => {
    const value = String(origin || '');
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
  };
  app.use(
    cors({
      origin(origin, cb) {
        // Allow non-browser clients (no Origin header).
        if (!origin) return cb(null, true);

        // Dev QoL: allow any localhost origin (Vite may change ports).
        if (isDev && isLocalhostOrigin(origin)) return cb(null, true);

        if (corsAllowlist.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: Origin not allowed'));
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // If deploying behind a reverse proxy/load balancer, enable this so IP-based
  // features like rate limiting work correctly.
  if (process.env.TRUST_PROXY === '1') {
    // Only enable this when you are actually behind a trusted reverse proxy.
    // Otherwise, clients can spoof IP via X-Forwarded-For.
    app.set('trust proxy', 1);
  }

  // Basic security headers. Keep CSP disabled for now to avoid breaking the SPA in dev.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
    })
  );

  // Parse JSON before route-level limiters that may depend on body fields.
  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  // Attach req.t() based on Accept-Language (ar/so/en). Default: en.
  app.use(i18nMiddleware());

  // Normalize JSON responses so frontend can rely on { success: true|false, ... }
  // for common object responses, without breaking endpoints that return arrays or Mongoose documents.
  app.use(responseNormalize());

  // Centralized audit trail for staff/admin actions.
  // Logs successful mutating requests (POST/PUT/PATCH/DELETE) with permission context.
  app.use('/api', auditTrail());

  // CSRF protection for cookie-based auth (double-submit token).
  app.use('/api', csrfProtection);

  // General API limiter to reduce bot scraping / noisy clients.
  // NOTE: In production, consider a shared store (e.g., Redis) so limits survive restarts.
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      return res.status(429).json({
        success: false,
        message: req.t('rateLimit.slowDown', null, 'Too many requests. Please slow down.'),
      });
    },
  });
  app.use('/api', apiLimiter);

  // Login brute-force defense:
  // 1) Per-IP limiter
  // 2) Per-IP+identity limiter (username/studentId) to prevent distributed attempts across many accounts.
  const loginIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler(req, res) {
      const resetTime = req.rateLimit?.resetTime;
      const retryAfterSeconds = resetTime ? Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : 0;
      if (retryAfterSeconds) res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        message: retryAfterSeconds
          ? req.t('rateLimit.tryAgainIn', { seconds: retryAfterSeconds }, `Too many requests. Try again in ${retryAfterSeconds}s.`)
          : req.t('rateLimit.tryAgainLater', null, 'Too many requests. Try again later.'),
        remainingAttempts: 0,
        retryAfterSeconds,
      });
    },
  });

  app.use('/api/auth/login', loginIpLimiter);

  // Handle invalid JSON bodies gracefully (avoids server crashes on bad requests)
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        success: false,
        message: req.t('common.invalidJsonBody', null, 'Invalid JSON body'),
      });
    }
    return next(err);
  });

  // Routes
  app.get('/', (req, res) => {
    const loc = req?.locale;
    if (loc === 'ar') return res.send('واجهة API تعمل...');
    if (loc === 'so') return res.send('API-ga wuu shaqaynayaa...');
    return res.send('API is running...');
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/security', securityRoutes);
  app.use('/api/audit', auditRoutes);

  // Protected static file serving for uploads (e.g., student photos)
  // Library downloads: add permission guard + audit log.
  // NOTE: Must be mounted before the generic /api/uploads static handler.
  app.use(
    '/api/uploads/library',
    protect,
    async (req, res, next) => {
      try {
        const role = String(req.user?.role || '').toLowerCase();

        // Admin/Teacher/Student can download library resources.
        if (role === 'admin' || role === 'teacher' || role === 'student') return next();

        // Staff must have library.download (or full). Fall back to view for backward compatibility.
        const ok = hasPermission(req.user, 'library', 'download')
          || hasPermission(req.user, 'library', 'full')
          || hasPermission(req.user, 'library', 'view');
        if (!ok) {
          return res.status(403).json({
            success: false,
            message: req.t('permissions.noPermissionActionModule', { action: 'download', module: 'library' }, 'You do not have permission to download library'),
          });
        }
        return next();
      } catch {
        return res.status(403).json({ success: false, message: req.t('common.accessDenied', null, 'Access denied') });
      }
    },
    async (req, res, next) => {
      // Audit only GET/HEAD requests for file access.
      const method = String(req.method || '').toUpperCase();
      if (method !== 'GET' && method !== 'HEAD') return next();

      try {
        const filename = path.posix.basename(String(req.path || ''));
        if (!filename || filename === '/' || filename === '.') return next();

        const rel = path.posix.join('uploads', 'library', filename);
        const doc = await LibraryResource.findOne({ 'file.path': rel }).select('_id title kind').lean();

        // If this file isn't linked to a library resource, deny.
        if (!doc) {
          return res.status(404).json({
            success: false,
            message: req.t('common.notFound', null, 'Not found'),
          });
        }

        const title = String(doc?.title || '').trim();
        const resourceId = String(doc?._id || '').trim();
        const actorRole = String(req.user?.role || '').toLowerCase();

        await writeAuditLog({
          userId: req.user?._id,
          action: 'library_download',
          description: `role=${actorRole} resourceId=${resourceId}${title ? ` title=${title}` : ''}`,
          req,
        });
      } catch {
        // Non-blocking
      }

      return next();
    },
    createUploadsRemoteOnlyHandler({
      keyPrefix: 'uploads/library',
      isDev,
      singleSegment: true,
    })
  );

  // Generic uploads: protected serving (includes student/teacher/user photos etc.)
  app.use(
    '/api/uploads',
    protect,
    createUploadsRemoteOnlyHandler({
      keyPrefix: 'uploads',
      isDev,
      singleSegment: false,
    })
  );

  app.use('/api/lookups', lookupRoutes);
  app.use('/api/students', studentRoutes);
  app.use('/api/subjects', subjectRoutes);
  // legacy /api/classes removed
  app.use('/api/grades', gradeSectionRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/cohorts', cohortRoutes);
  app.use('/api/promotions', promotionRoutes);
  app.use('/api/library', libraryRoutes);
  app.use('/api/transfers', transferRoutes);
  app.use('/api/transcripts', transcriptRoutes);
  app.use('/api/teachers', teacherRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/timetable', timetableRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/realtime', realtimeRoutes);
  app.use('/api/setup', setupRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/ai', aiRoutes);

  // User management (admin-only). Mount on a specific prefix so unknown /api/*
  // routes return 404 (not 401 from router-level auth).
  app.use('/api/users', userRoutes);

  // 404 handler (JSON)
  app.use((req, res) =>
    res.status(404).json({
      success: false,
      message: req.t('common.notFound', null, 'Not found'),
    })
  );

  // Central error handler (JSON)
  app.use((err, req, res, next) => {
    if (err?.message?.startsWith('CORS:')) {
      return res.status(403).json({
        success: false,
        message: req.t('common.corsOriginNotAllowed', null, 'CORS: Origin not allowed'),
      });
    }

    const status = Number(err?.status) || 500;
    const isProd = process.env.NODE_ENV === 'production';
    const messageEn = status === 500 && isProd ? 'Server error' : (err?.message || 'Server error');
    const message = status === 500
      ? req.t('common.serverError', null, messageEn)
      : messageEn;

    if (!isProd) {
      console.error(err);
    }

    const retryAfter = Number(err?.retryAfterSeconds);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      res.set('Retry-After', String(Math.ceil(retryAfter)));
    }

    return res.status(status).json({ success: false, message });
  });

  const PORT = process.env.PORT || 7000;
  app.listen(PORT, () => {
    console.log(`${chalk.green.bold('Server')} is running on port ${PORT}`);
  });
};

startServer();

