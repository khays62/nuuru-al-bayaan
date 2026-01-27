import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Teacher from "../models/Teacher.js";
import Student from "../models/Student.js";
import { getDefaultInitialPassword } from "../utils/defaultPasswords.js";
import { getAuthCookieOptions, getCookieConfig } from "../config/cookies.js";
import { CSRF_COOKIE_NAME, generateCsrfToken, setCsrfCookie } from "../middleware/csrf.js";
import { writeAuditLog } from "../services/auditService.js";
import { recordUnknownLoginAttempt } from "../utils/loginThrottleMemory.js";
import AuthLockEvent from "../models/AuthLockEvent.js";
import AuditLog from "../models/AuditLog.js";


// Progressive throttling config (requested schedule)
//  - 10 wrong attempts -> 15s cooldown
//  - then 5 wrong attempts -> 30s cooldown
//  - then 3 wrong attempts -> 60s cooldown
//  - then 3 wrong attempts -> 24h lock (contact admin)
// Important: 24h lock MUST NOT allow login even with correct password.
const SECURITY_LOCK_LEVEL = 4;
const LOCK_24H_SECONDS = 24 * 60 * 60;

const computeCooldownSeconds = (level = 0) => {
  const n = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  if (n <= 0) return 15;
  if (n === 1) return 30;
  if (n === 2) return 60;
  // level 3 threshold triggers the 24h lock (handled separately)
  return 60;
};

const computeMaxAttempts = (level = 0) => {
  const n = Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  if (n <= 0) return 10;
  if (n === 1) return 5;
  return 3;
};

const secondsUntil = (dateOrMs) => {
  const t = dateOrMs instanceof Date ? dateOrMs.getTime() : Number(dateOrMs);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t - Date.now()) / 1000));
};

const getClientIp = (req) => {
  return String(req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '')
    .split(',')[0]
    .trim();
};

const isDetailedAuthErrors = () => {
  const v = String(process.env.AUTH_DETAILED_ERRORS ?? '').trim();
  if (v === '1') return true;
  if (v === '0') return false;
  return String(process.env.NODE_ENV || '').trim() !== 'production';
};

export const getCsrfToken = (req, res) => {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  const token = existing && String(existing).trim() ? String(existing) : generateCsrfToken();
  if (!existing) {
    setCsrfCookie(res, token);
  }
  return res.status(200).json({ success: true, csrfToken: token });
};



export const login = async (req, res) => {
  try {
    const { username, studentId, password } = req.body;
    const loginId = username || studentId;

    
    const loginIdStr = String(loginId || '').trim();
    const passwordStr = String(password || '');

    if (!loginIdStr || !passwordStr) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: "Username / Student ID and password required",
      });
    }

    // Basic input hardening to avoid extreme payloads (bcrypt compare is CPU-expensive).
    if (loginIdStr.length > 128) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Username / Student ID is too long' });
    }
    if (passwordStr.length > 256) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', message: 'Password is too long' });
    }

    let user = null;
    let role = "unknown";

    const clientIp = getClientIp(req);
    const unknownKey = `${clientIp}|${String(loginIdStr || '').toLowerCase()}`;

    // 🔍 1. Try Admin/User
    user =
      (await Admin.findOne({ $or: [{ username: loginIdStr }, { email: loginIdStr }] })) ||
      (await User.findOne({ $or: [{ username: loginIdStr }, { email: loginIdStr }] }));
    if (user) {
      // Do not trust a mutable role value on Admin documents.
      // If it is in the Admin collection, treat it as admin.
      const modelName = user?.constructor?.modelName;
      role = modelName === 'Admin' ? 'admin' : user.role;
    }

    // 🔍 1b. TeacherId fallback: if loginId matches Teacher.teacherId, resolve to its linked User.
    // This supports older teacher accounts where username might be the email.
    if (!user) {
      const t = await Teacher.findOne({ teacherId: loginIdStr }).select('_id').lean();
      if (t?._id) {
        user = await User.findOne({ teacherRef: t._id });
        if (user) role = user.role;
      }
    }

    // 🔍 2. Try Student
    // CUTOVER: Students now authenticate via User accounts (role=student, username=studentId).

    // ❌ Not found
    if (!user) {
      // Apply throttling even for unknown usernames (prevents brute-force and matches UX expectations).
      const throttled = recordUnknownLoginAttempt({
        key: unknownKey,
        computeCooldownSeconds,
        computeMaxAttempts,
        securityLockLevel: SECURITY_LOCK_LEVEL,
      });

      if (throttled.blocked) {
        const retryAfterSeconds = Number(throttled.retryAfterSeconds || 0);
        const lockUntil = retryAfterSeconds > 0 ? new Date(Date.now() + retryAfterSeconds * 1000) : null;

        // If an unknown username is blocked, notify via AuthLockEvent (best-effort).
        if (throttled.code === 'UNKNOWN_USERNAME_BLOCKED') {
          try {
            const normalizedUsername = String(loginIdStr || '').trim().toLowerCase();
            const existing = await AuthLockEvent.findOne({
              principalModel: 'Unknown',
              username: normalizedUsername,
              resolvedAt: null,
            }).select('_id occurrences').lean();

            if (existing?._id) {
              await AuthLockEvent.updateOne(
                { _id: existing._id },
                {
                  $set: {
                    lastSeenAt: new Date(),
                    lockUntil: null,
                    isRead: false,
                  },
                  $inc: { occurrences: 1 },
                }
              );
            } else {
              await AuthLockEvent.create({
                principalModel: 'Unknown',
                principalId: null,
                username: normalizedUsername,
                fullName: '',
                role: 'unknown',
                lockUntil: null,
                ip: String(clientIp || ''),
                userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
                occurrences: 1,
                isRead: false,
                resolvedAt: null,
              });
            }
          } catch {
            // ignore notification failures
          }
        }

        return res.status(429).json({
          success: false,
          code: throttled.code,
          principalType: 'unknown',
          message: throttled.code === 'UNKNOWN_USERNAME_BLOCKED'
            ? 'Unknown username. Too many attempts; login is blocked.'
            : 'Too many login attempts. Try again later.',
          remainingAttempts: 0,
          retryAfterSeconds,
        });
      }

      // Avoid user enumeration by default.
      const detailed = isDetailedAuthErrors();
      return res.status(401).json({
        success: false,
        code: detailed ? 'USER_NOT_FOUND' : 'INVALID_CREDENTIALS',
        message: detailed ? 'Unknown username / student ID' : 'Invalid credentials',
        principalType: 'unknown',
        remainingAttempts: throttled.remainingAttempts,
        retryAfterSeconds: 0,
      });
    }

    const level = Number(user.loginCooldownLevel || 0);
    const cooldownActive = user.lockUntil && user.lockUntil.getTime && user.lockUntil.getTime() > Date.now();

    const storedPassword = user.password || '';
    const looksHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');

    // ✅ Password check (support legacy plaintext)
    const isMatch = looksHashed
      ? await bcrypt.compare(passwordStr, storedPassword)
      : String(passwordStr) === String(storedPassword);

    // If account is in the 24h lock state, never allow login (even with correct password).
    if (cooldownActive && level >= SECURITY_LOCK_LEVEL) {
      const retryAfterSeconds = secondsUntil(user.lockUntil);
      return res.status(429).json({
        success: false,
        code: 'LOGIN_LOCKED_24H',
        message: 'Too many attempts. Account is locked for 24 hours. Contact an administrator.',
        remainingAttempts: 0,
        retryAfterSeconds: retryAfterSeconds || LOCK_24H_SECONDS,
      });
    }

    // If cooldown is active (15s/30s/60s), always block login until it expires.
    // This matches your requirement: even correct credentials must wait for cooldown to finish.
    if (cooldownActive) {
      const retryAfterSeconds = secondsUntil(user.lockUntil);
      return res.status(429).json({
        success: false,
        code: 'LOGIN_COOLDOWN',
        message: 'Too many login attempts. Try again later.',
        remainingAttempts: 0,
        retryAfterSeconds,
      });
    }

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = computeMaxAttempts(level);

      // Hit threshold => apply progressive cooldown and reset the attempt counter.
      if (user.failedLoginAttempts >= maxAttempts) {
        const cooldownSeconds = computeCooldownSeconds(level);
        const nextLevel = level + 1;

        // After the 60s stage (level 3), the next lock becomes a 24h security lock.
        if (nextLevel >= SECURITY_LOCK_LEVEL) {
          user.lockUntil = new Date(Date.now() + LOCK_24H_SECONDS * 1000);
          user.loginCooldownLevel = SECURITY_LOCK_LEVEL;
          user.failedLoginAttempts = 0;
          await user.save();

          // Notify admin/staff via AuthLockEvent (best-effort)
          try {
            const modelName = user?.constructor?.modelName === 'Admin' ? 'Admin' : 'User';
            const existing = await AuthLockEvent.findOne({
              principalModel: modelName,
              principalId: user._id,
              resolvedAt: null,
            }).select('_id occurrences').lean();

            if (existing?._id) {
              await AuthLockEvent.updateOne(
                { _id: existing._id },
                {
                  $set: { lastSeenAt: new Date(), lockUntil: user.lockUntil, isRead: false },
                  $inc: { occurrences: 1 },
                }
              );
            } else {
              await AuthLockEvent.create({
                principalModel: modelName,
                principalId: user._id,
                username: String(user.username || user.email || ''),
                role: String(role || user.role || '').toLowerCase(),
                lockUntil: user.lockUntil,
                ip: String(clientIp || ''),
                userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
                occurrences: 1,
                isRead: false,
                resolvedAt: null,
              });
            }
          } catch {
            // ignore notification failures
          }

          return res.status(429).json({
                fullName: String(user.fullName || ''),
            success: false,
            code: 'LOGIN_LOCKED_24H',
            message: 'Too many attempts. Account is locked for 24 hours. Contact an administrator.',
            remainingAttempts: 0,
            retryAfterSeconds: LOCK_24H_SECONDS,
          });
        }

        user.lockUntil = new Date(Date.now() + cooldownSeconds * 1000);
        user.loginCooldownLevel = nextLevel;
        user.failedLoginAttempts = 0;
        await user.save();

        return res.status(429).json({
          success: false,
          code: 'LOGIN_COOLDOWN',
          message: 'Too many login attempts. Try again later.',
          remainingAttempts: 0,
          retryAfterSeconds: cooldownSeconds,
        });
      }

      const remainingAttempts = Math.max(0, maxAttempts - user.failedLoginAttempts);
      await user.save();
      // Avoid leaking whether the username exists.
      const detailed = isDetailedAuthErrors();
      return res.status(401).json({
        success: false,
        code: detailed ? 'WRONG_PASSWORD' : 'INVALID_CREDENTIALS',
        message: detailed ? 'Wrong password' : 'Invalid credentials',
        remainingAttempts,
        retryAfterSeconds: 0,
      });
    }

    // If the stored password was legacy plaintext, upgrade it to a bcrypt hash.
    if (!looksHashed) {
      const hashed = await bcrypt.hash(String(passwordStr), 10);
      user.password = hashed;
      await user.save();
    }

    // ✅ Reset failed attempts and cooldown on successful login
    // NOTE: Security lock (24h) is blocked earlier and cannot reach here.
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.loginCooldownLevel = 0;
    await user.save();

    // 🚫 Inactive check applies only to User accounts
    // if ((role === "registration_office" || role === "exam_office") && user.status?.toLowerCase() !== "active") {
    //   return res.status(403).json({ success: false, message: "User is inactive" });
    // }

    // 🚫 Inactive accounts — Users and Students
if (role !== "admin" && user.status?.toLowerCase() !== "active") {
  return res.status(403).json({
    success: false,
    code: 'ACCOUNT_INACTIVE',
    message: `${role === "student" ? "Student" : "User"} is inactive`,
  });
}


    // 🔐 JWT Token
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Server auth is not configured (JWT_SECRET missing)' });
    }

    const DEFAULT_INITIAL_PASSWORD = getDefaultInitialPassword();
    const usedDefaultInitialPassword = String(passwordStr) === String(DEFAULT_INITIAL_PASSWORD);

    // If the user logged in using the default initial password, force password change.
    // Persist this on User accounts so `/api/auth/verify` consistently reports it.
    if (usedDefaultInitialPassword && role !== 'admin') {
      const modelName = user?.constructor?.modelName;
      if (modelName === 'User' && user?.mustChangePassword !== true) {
        user.mustChangePassword = true;
        await user.save();
      }
    }

    const tokenVersion = Number(user.tokenVersion || 0);
    const token = jwt.sign(
      { id: user._id, username: user.username || user.studentId, role, v: tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const DEFAULT_STUDENT_PASSWORD = DEFAULT_INITIAL_PASSWORD;
    let mustChangePassword = false;
    if (role === 'student') {
      // New model: student logs in via User account (has mustChangePassword flag)
      if (user && Object.prototype.hasOwnProperty.call(user, 'mustChangePassword')) {
        mustChangePassword = Boolean(user?.mustChangePassword);
      } else {
        // Legacy model: student logs in via Student collection; detect default password.
        mustChangePassword = looksHashed
          ? await bcrypt.compare(DEFAULT_STUDENT_PASSWORD, storedPassword)
          : String(storedPassword) === DEFAULT_STUDENT_PASSWORD;
      }
    } else {
      mustChangePassword = Boolean(user?.mustChangePassword);
    }

    if (usedDefaultInitialPassword && role !== 'admin') {
      mustChangePassword = true;
    }

    // 🍪 Cookie
    res.cookie("auth_token", token, getAuthCookieOptions());

    // Ensure CSRF cookie exists for the session (frontend reads it and echoes in header)
    if (!req.cookies?.[CSRF_COOKIE_NAME]) {
      setCsrfCookie(res, generateCsrfToken());
    }

    // ✅ Success response
    await writeAuditLog({
      userId: user._id,
      action: 'auth.login',
      description: `role=${role}`,
      req,
    });

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username || user.studentId,
        fullName: user.fullName,
        role,
        mustChangePassword,
        teacherRef: user.teacherRef || null,
        studentRef: user.studentRef || null,
      },
    });

  
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const resetLoginLockout = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id);
    const user = admin ? null : await User.findById(id);
    const principal = admin || user;
    if (!principal) return res.status(404).json({ success: false, message: "User not found" });

    principal.failedLoginAttempts = 0;
    principal.lockUntil = null;
    principal.loginCooldownLevel = 0;

    // Invalidate all existing JWT sessions for this account.
    // This forces logout on all devices/tabs on the next request.
    principal.tokenVersion = Number(principal.tokenVersion || 0) + 1;
    await principal.save();

    res.json({ success: true, message: "Login lockout reset successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const verifyUser = async (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) {
      // Not logged in (no cookie): this is a normal state on first load.
      // Return 200 to avoid noisy console errors in the frontend.
      return res.status(200).json({ success: false, user: null });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, user: null, message: 'Server auth is not configured (JWT_SECRET missing)' });
    }

    // ✅ Decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Invalid/expired token: clear cookie and treat as logged out.
      res.clearCookie("auth_token", {
        httpOnly: true,
        ...getCookieConfig(),
      });
      return res.status(200).json({ success: false, user: null });
    }
    const { id, role: tokenRole, v: tokenVersionFromToken } = decoded;

    // 🔍 Try to find principal in Admin or User collections.
    // CUTOVER: Students are now User accounts (role=student).
    let user =
      (await Admin.findById(id).select("-password")) ||
      (await User.findById(id).select("-password"));

    if (!user) {
      // Stale token: clear cookie and treat as logged out.
      res.clearCookie("auth_token", {
        httpOnly: true,
        ...getCookieConfig(),
      });
      return res.status(200).json({ success: false, user: null });
    }

    // 🔒 Session invalidation: if token version is stale, treat as logged out.
    try {
      const currentVersion = Number(user.tokenVersion || 0);
      const tokenV = Number(tokenVersionFromToken || 0);
      if (tokenV !== currentVersion) {
        res.clearCookie("auth_token", {
          httpOnly: true,
          ...getCookieConfig(),
        });
        return res.status(200).json({ success: false, user: null });
      }
    } catch {
      // ignore
    }

    // 🚫 Security lock (24h): force logout even if cookie is still present.
    try {
      const lockUntilMs = user.lockUntil?.getTime ? user.lockUntil.getTime() : 0;
      const lvl = Number(user.loginCooldownLevel || 0);
      if (lockUntilMs && lockUntilMs > Date.now() && lvl >= 4) {
        res.clearCookie("auth_token", {
          httpOnly: true,
          ...getCookieConfig(),
        });
        return res.status(200).json({ success: false, user: null });
      }
    } catch {
      // ignore
    }

    // 🚫 Block inactive accounts
    if (user.status && user.status.toLowerCase() !== "active") {
      // Optional: clear cookie so the client doesn't keep retrying.
      res.clearCookie("auth_token", {
        httpOnly: true,
        ...getCookieConfig(),
      });
      return res.status(403).json({ message: "User is inactive" });
    }

    // Normalize payload for frontend: ensure role exists
    const userObj = typeof user.toObject === 'function' ? user.toObject() : user;
    if (!userObj.role && tokenRole) userObj.role = tokenRole;

    // Student self UX fix:
    // Some student User accounts may exist without a linked studentRef, OR with a broken studentRef
    // (commonly set to the User _id during an old cutover). When that happens, student-self pages
    // (attendance/timetable/profile) can't resolve the Student profile.
    // Best-effort: auto-link by username (= studentId) during verify.
    if (String(tokenRole || '') === 'student') {
      try {
        const currentRef = user?.studentRef?._id || user?.studentRef || null;
        const currentRefStr = currentRef ? String(currentRef) : '';
        const userIdStr = user?._id ? String(user._id) : '';

        const needsLink = !currentRefStr || (userIdStr && currentRefStr === userIdStr);
        if (needsLink) {
          const raw = String(user?.username || '').trim();

          const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const sid = raw ? new RegExp(`^${escapeRegex(raw)}$`, 'i') : null;

          if (sid) {
            const st = await Student.findOne({ studentId: sid }).select('_id').lean();
            if (st?._id) {
              user.studentRef = st._id;
              await user.save();
              userObj.studentRef = st._id;
            }
          }
        }
      } catch {
        // Non-blocking: if linking fails, still return the user.
      }
    }

    const DEFAULT_STUDENT_PASSWORD = getDefaultInitialPassword();
    let mustChangePassword = false;
    if (tokenRole === 'student') {
      // CUTOVER: student principal is a User doc.
      mustChangePassword = Boolean(userObj.mustChangePassword);
    } else {
      // Staff/Teacher/Admin accounts use stored flag.
      mustChangePassword = Boolean(userObj.mustChangePassword);
    }

    userObj.mustChangePassword = mustChangePassword;

    return res.status(200).json({
      success: true,
      user: userObj,
    });
  } catch (err) {
    console.error("❌ Verify error:", err);
    // Fallback: treat unexpected errors as logged out.
    return res.status(200).json({ success: false, user: null });
  }
};

// ------------------ LOGOUT CONTROLLER ------------------
export const logout = async (req, res) => {
  // Default: global logout (invalidate all existing sessions for this account).
  const global = req?.body?.global !== false;

  const token = req.cookies?.auth_token;
  if (global && token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const id = decoded?.id;
      if (id) {
        // Do not trust role in token; check Admin first, then User.
        await Promise.allSettled([
          Admin.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } }),
          User.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } }),
        ]);
      }
    } catch {
      // ignore
    }
  }

  res.clearCookie("auth_token", {
    httpOnly: true,
    ...getCookieConfig(),
  });

  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const changePassword = async (req, res) => {
  try {
    if (!req.user || !req.user.role) return res.status(401).json({ message: 'Not authorized' });
    const role = String(req.user.role).toLowerCase();
    if (role === 'student') return res.status(403).json({ message: 'Use student change-password endpoint' });

    const { currentPassword, newPassword } = req.body || {};
    const nextPwd = String(newPassword || '').trim();
    if (!nextPwd || nextPwd.length < 6) {
      return res.status(400).json({ message: 'newPassword must be at least 6 characters' });
    }
    if (nextPwd.length > 256) {
      return res.status(400).json({ message: 'newPassword is too long' });
    }

    const Model = role === 'admin' ? Admin : User;
    const account = await Model.findById(req.user._id).select('password mustChangePassword').lean();
    if (!account) return res.status(404).json({ message: 'User not found' });

    const storedPassword = account.password || '';
    const looksHashed = typeof storedPassword === 'string' && storedPassword.startsWith('$2');
    const allowSkipCurrent = Boolean(account.mustChangePassword);

    if (!allowSkipCurrent) {
      const cur = String(currentPassword || '');
      if (!cur) return res.status(400).json({ message: 'currentPassword required' });
      const ok = looksHashed ? await bcrypt.compare(cur, storedPassword) : String(cur) === String(storedPassword);
      if (!ok) return res.status(400).json({ message: 'Invalid current password' });
    }

    const hashed = await bcrypt.hash(nextPwd, 10);
    await Model.updateOne(
      { _id: req.user._id },
      { $set: { password: hashed, mustChangePassword: false, failedLoginAttempts: 0, lockUntil: null } }
    );

    await writeAuditLog({
      userId: req.user._id,
      action: 'auth.changePassword',
      description: `role=${role}`,
      req,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('❌ changePassword error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getMyAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query?.limit || 50)));
    const uid = req.user?._id;
    if (!uid) return res.status(401).json({ message: 'Unauthorized' });

    const role = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'staff'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const logs = await AuditLog.find({ user: uid })
      .select('action description ip device timestamp')
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.json({ data: logs });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch logs' });
  }
};