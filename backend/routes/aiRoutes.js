import express from 'express';
import { z } from 'zod';

import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import AiChatThread from '../models/AiChatThread.js';
import { geminiGenerateReply } from '../services/geminiChat.js';
import { executeAiTool, getAllowedAiToolNamesForUser, isAiToolError } from '../services/aiDbTools.js';

const router = express.Router();

const messageBody = z
  .object({
    message: z.string().trim().min(1).max(2000),
  })
  .strip();

function getPrincipalModel(req) {
  const modelName = req?.user?.constructor?.modelName;
  if (typeof modelName === 'string' && modelName) return modelName;
  // Fallback heuristic: Admin model has no permissions map.
  return req?.user?.permissions ? 'User' : 'Admin';
}

function buildSystemInstruction({ locale, role }) {
  const loc = String(locale || 'en').toLowerCase();
  const roleLower = String(role || '').toLowerCase();

  const langLine = loc === 'ar'
    ? 'Respond in Arabic.'
    : loc === 'so'
      ? 'Respond in Somali.'
      : 'Respond in English.';

  const scopeLine = roleLower === 'admin'
    ? 'The user is an ADMIN (full access), but you still must not claim to access databases or private records unless explicitly provided in the conversation.'
    : roleLower === 'staff'
      ? 'The user is STAFF (permission-based). Do not provide sensitive aggregates or private records; provide guidance and ask for the exact screen/data they are looking at.'
      : roleLower === 'teacher'
        ? 'The user is a TEACHER (assignment-scoped). Never provide school-wide aggregates (especially finance) or other students\' private info.'
        : 'The user is a STUDENT (self-scoped). Never provide any other student\'s info or school-wide aggregates (especially finance).';

  return [
    'You are an AI assistant embedded inside a school management system.',
    langLine,
    'If the user asks you to switch language between Somali, Arabic, and English, comply.',
    scopeLine,
    'You may be given trusted DB tool results (JSON) by the server. Use them when present, but do not claim access beyond what is provided.',
    'Hard rules:',
    '- Do not invent or claim access to internal data, databases, payments, or student lists.',
    '- If the user asks for restricted/private data, explain you cannot access it and suggest using the appropriate page in the app or contacting an admin.',
    '- Keep answers concise and practical. Ask clarifying questions when needed.',
  ].join('\n');
}

function buildToolPlannerInstruction({ locale, role, allowedTools }) {
  const loc = String(locale || 'en').toLowerCase();
  const langLine = loc === 'ar'
    ? 'Respond in Arabic.'
    : loc === 'so'
      ? 'Respond in Somali.'
      : 'Respond in English.';

  const roleLower = String(role || '').toLowerCase();
  const scopeLine = roleLower === 'admin'
    ? 'User is ADMIN.'
    : roleLower === 'staff'
      ? 'User is STAFF (permission-based).' 
      : roleLower === 'teacher'
        ? 'User is TEACHER (assignment-scoped).' 
        : 'User is STUDENT (self-scoped).';

  const toolLines = (Array.isArray(allowedTools) ? allowedTools : []).map((t) => {
    if (t === 'dashboard_summary') return `- dashboard_summary (args: {}): counts overview (admin/staff)`;
    if (t === 'my_permissions') return `- my_permissions (args: {}): show my permission matrix (admin/staff)`;
    if (t === 'students_list')
      return `- students_list (args: { q?: string, gradeSectionId?: string, limit?: number<=50 }): list students (admin or staff with students.view)`;
    if (t === 'teacher_profile')
      return `- teacher_profile (args: { q: string, limit?: number<=20 }): lookup teacher personal/profile fields (admin or staff with teachers.view)`;
    if (t === 'attendance_class_summary')
      return `- attendance_class_summary (args: { date: 'YYYY-MM-DD', gradeSectionId: string, periodCode?: string, limit?: number<=80 }): attendance + who marked it (admin or staff with attendance.view)`;
    if (t === 'transfers_summary')
      return `- transfers_summary (args: { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD', limit?: number<=50 }): transfer logs summary (admin or staff with transfers permissions)`;
    if (t === 'student_transfer_history')
      return `- student_transfer_history (args: { q: string, limit?: number<=30 }): transfer history for one student (admin/staff with transfers/students permissions)`;
    if (t === 'promotions_summary')
      return `- promotions_summary (args: { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD', limit?: number<=50 }): promotions summary (admin or staff with promotions permissions)`;
    if (t === 'announcements_summary')
      return `- announcements_summary (args: { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }): count announcements (admin/staff with announcements permissions)`;
    if (t === 'announcements_recent')
      return `- announcements_recent (args: { limit?: number<=20 }): recent announcements visible to me (all roles; scoped by class for teachers/students)`;
    if (t === 'activity_summary')
      return `- activity_summary (args: { from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }): audit actions summary (admin/staff with security.view)`;
    if (t === 'logins_today')
      return `- logins_today (args: {}): users who logged in today (admin/staff with security.view)`;

    // Timetable
    if (t === 'timetable_class_slots')
      return `- timetable_class_slots (args: { gradeSectionId: string, dayOfWeek?: 0..6, limit?: number<=200 }): class timetable slots (admin/staff with timetable.view or attendance.view)`;
    if (t === 'teacher_timetable_self')
      return `- teacher_timetable_self (args: { dayOfWeek?: 0..6, mineOnly?: boolean, limit?: number<=200 }): timetable for my assigned classes (teacher)`;
    if (t === 'student_timetable_self')
      return `- student_timetable_self (args: { dayOfWeek?: 0..6, limit?: number<=80 }): my class timetable (student)`;

    // Transcript
    if (t === 'transcript_self_index')
      return `- transcript_self_index (args: {}): list my enrollments (student)`;
    if (t === 'transcript_self_full')
      return `- transcript_self_full (args: { mode?: 'latest'|'full', enrollmentId?: string, maxSubjects?: number<=80, limitEnrollments?: number<=6 }): my read-only transcript (student; output may be truncated)`;
    if (t === 'transcript_student_index')
      return `- transcript_student_index (args: { studentId?: string, q?: string, limit?: number<=10 }): list a student's enrollments (admin/staff with transcript/students view)`;
    if (t === 'transcript_student_full')
      return `- transcript_student_full (args: { studentId?: string, q?: string, mode?: 'latest'|'full', enrollmentId?: string, maxSubjects?: number<=80, limitEnrollments?: number<=6 }): student's read-only transcript (admin/staff; output may be truncated)`;

    // Attendance ranges
    if (t === 'student_attendance_self_range_summary')
      return `- student_attendance_self_range_summary (args: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }): my attendance summary in range (student; max 31 days)`;
    if (t === 'attendance_class_range_summary')
      return `- attendance_class_range_summary (args: { gradeSectionId: string, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', periodCode?: string, dailyLimit?: number<=31 }): class attendance summary in date range (admin/staff with attendance.view)`;
    if (t === 'teacher_attendance_class_range_summary')
      return `- teacher_attendance_class_range_summary (args: { gradeSectionId: string, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', periodCode?: string, dailyLimit?: number<=31 }): class attendance summary in date range (teacher; assigned class only)`;

    // Results summaries
    if (t === 'results_class_summary')
      return `- results_class_summary (args: { academicYearId: string, gradeSectionId: string, mode?: 'overall'|'subject'|'trend'|'difficulty', subjectId?: string, templateVersion?: number, topN?: number<=50, bottomN?: number<=50 }): class results summary (teacher must use mode=subject and provide subjectId)`;

    // Finance summaries
    if (t === 'finance_expenses_summary')
      return `- finance_expenses_summary (args: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', groupBy?: 'category'|'source'|'status' }): expenses totals (admin/staff with finance permissions)`;
    if (t === 'finance_unpaid_students_summary')
      return `- finance_unpaid_students_summary (args: { month: 'YYYY-MM', gradeSectionId?: string, limit?: number<=50, includeAmounts?: boolean }): unpaid/partial invoices list (admin/staff with finance permissions)`;
    if (t === 'teacher_assignments') return `- teacher_assignments (args: {}): my assigned grade sections (teacher)`;
    if (t === 'teacher_class_roster')
      return `- teacher_class_roster (args: { gradeSectionId: string, limit?: number<=80 }): roster for my assigned class only (teacher)`;
    if (t === 'teacher_attendance_class_summary')
      return `- teacher_attendance_class_summary (args: { date: 'YYYY-MM-DD', gradeSectionId: string, periodCode?: string, limit?: number<=80 }): attendance for my assigned class only (teacher)`;
    if (t === 'student_self_summary') return `- student_self_summary (args: {}): my own profile summary (student)`;
    return `- ${t}`;
  });

  return [
    'You are selecting whether a server-side DB tool is needed to answer the user.',
    langLine,
    scopeLine,
    'Available tools (you may ONLY choose from this list):',
    ...(toolLines.length ? toolLines : ['- (none)']),
    'Output MUST be valid JSON only (no markdown, no extra text).',
    'Schema:',
    '{"tool": string|null, "args": object}',
    'Rules:',
    '- If the question can be answered without DB data, output {"tool": null, "args": {}}.',
    '- If the request is outside the user\'s role/scope or permission, output {"tool": null, "args": {}}.',
  ].join('\n');
}

function extractJsonObject(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return null;
  const raw = s.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getOrCreateThread({ principalModel, principalId, locale }) {
  const existing = await AiChatThread.findOne({ principalModel, principalId });
  if (existing) {
    // Keep last known locale updated for better responses.
    const nextLocale = String(locale || 'en').toLowerCase();
    if (nextLocale && existing.locale !== nextLocale) {
      existing.locale = nextLocale;
      await existing.save();
    }
    return existing;
  }

  return AiChatThread.create({
    principalModel,
    principalId,
    locale: String(locale || 'en').toLowerCase(),
    messages: [],
  });
}

// Fetch the current user's chat history (single persistent thread)
router.get('/chat/history', protect, async (req, res, next) => {
  try {
    const principalModel = getPrincipalModel(req);
    const principalId = req.user?._id;
    const locale = req.locale || 'en';

    const thread = await getOrCreateThread({ principalModel, principalId, locale });

    return res.json({
      threadId: String(thread._id),
      messages: (thread.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// Send a message and get an assistant reply
router.post('/chat/message', protect, validate({ body: messageBody }), async (req, res, next) => {
  try {
    const principalModel = getPrincipalModel(req);
    const principalId = req.user?._id;
    const locale = req.locale || 'en';
    const role = req.user?.role;

    const thread = await getOrCreateThread({ principalModel, principalId, locale });

    const userMessage = String(req.body?.message || '').trim();

    thread.messages.push({ role: 'user', content: userMessage });

    // Keep the context bounded.
    const maxHistory = 20;
    const recent = (thread.messages || []).slice(-maxHistory);

    // 1) Ask the model whether it needs a DB tool (JSON-only)
    const allowedTools = getAllowedAiToolNamesForUser(req.user);
    let toolName = null;
    let toolArgs = {};

    if (allowedTools.length) {
      const plannerInstruction = buildToolPlannerInstruction({ locale, role, allowedTools });
      const plannerOut = await geminiGenerateReply({
        systemInstruction: plannerInstruction,
        messages: recent,
        locale,
      });

      const parsed = extractJsonObject(plannerOut);
      if (parsed && (parsed.tool === null || typeof parsed.tool === 'string')) {
        toolName = parsed.tool;
        toolArgs = parsed.args && typeof parsed.args === 'object' ? parsed.args : {};
      }
    }

    // 2) Execute tool server-side (permission/scope enforced)
    let toolResult = null;
    if (toolName) {
      try {
        toolResult = await executeAiTool({ toolName, args: toolArgs, user: req.user });
      } catch (err) {
        const safeMsg = isAiToolError(err) ? String(err.message || 'Tool error') : 'Tool error';
        toolResult = { error: safeMsg };
      }
    }

    // 3) Final answer (with optional trusted tool result)
    const systemInstruction = buildSystemInstruction({ locale, role })
      + (toolResult ? `\n\nTRUSTED_DB_TOOL_RESULT_JSON:\n${JSON.stringify(toolResult)}` : '');

    const assistantText = await geminiGenerateReply({
      systemInstruction,
      messages: recent,
      locale,
    });

    thread.messages.push({ role: 'assistant', content: assistantText });
    await thread.save();

    return res.json({
      reply: assistantText,
    });
  } catch (err) {
    // Localize missing key / config issues.
    if (String(err?.message || '').includes('GEMINI_API_KEY')) {
      err.status = err.status || 500;
      err.message = req.t('ai.missingApiKey', null, 'AI is not configured on the server');
    }

    // User-facing friendly messages for upstream throttling/busy conditions.
    const st = Number(err?.status);
    const retryAfter = Number(err?.retryAfterSeconds);
    if (st === 429) {
      const base = req.t('ai.quotaExceeded', null, 'AI quota exceeded. Please try again later.');
      err.message = Number.isFinite(retryAfter) && retryAfter > 0
        ? `${base} ${req.t('ai.retryIn', null, 'Retry in')} ${Math.ceil(retryAfter)}s.`
        : base;
    }
    if (st === 503) {
      const base = req.t('ai.busy', null, 'AI service is busy. Please try again shortly.');
      err.message = Number.isFinite(retryAfter) && retryAfter > 0
        ? `${base} ${req.t('ai.retryIn', null, 'Retry in')} ${Math.ceil(retryAfter)}s.`
        : base;
    }
    return next(err);
  }
});

export default router;
