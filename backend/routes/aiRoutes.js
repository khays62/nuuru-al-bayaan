import express from 'express';
import { z } from 'zod';

import { protect } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import AiChatThread from '../models/AiChatThread.js';
import { aiGenerateReply } from '../services/aiChat.js';
import { executeAiTool, getAllowedAiToolNamesForUser, isAiToolError } from '../services/aiDbTools.js';

const router = express.Router();

const messageBody = z
  .object({
    message: z.string().trim().min(1).max(2000),
    threadId: z.string().trim().optional(),
  })
  .strip();

const threadsCreateBody = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
  })
  .strip();

const threadsQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strip();

const historyQuery = z
  .object({
    threadId: z.string().trim().optional(),
  })
  .strip();

const threadIdParams = z
  .object({
    threadId: z.string().trim().min(1),
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
      ? 'The user is STAFF (permission-based). You may provide sensitive/finance data ONLY when the server provides trusted tool results (JSON). Otherwise, provide guidance and ask for the exact screen/data they are looking at.'
      : roleLower === 'teacher'
        ? 'The user is a TEACHER (assignment-scoped). Never provide school-wide aggregates (especially finance) or other students\' private info.'
        : 'The user is a STUDENT (self-scoped). Never provide any other student\'s info or school-wide aggregates (especially finance).';

  return [
    'You are an AI assistant embedded inside a school management system.',
    langLine,
    'If the user asks you to switch language between Somali, Arabic, and English, comply.',
    scopeLine,
    'You may be given trusted DB tool results (JSON) by the server. Use them when present, but do not claim access beyond what is provided.',
    'If trusted tool results include library resources or extracted library text, use them as primary references.',
    '- If TRUSTED_DB_TOOL_RESULT_JSON.scope is library_resource_get_text and extracted.text is present: you may generate study material: summary, key notes, and Q&A (with answers). Keep it structured and concise.',
    '- If TRUSTED_DB_TOOL_RESULT_JSON.scope is library_resources_list: mention 2-5 relevant titles (and level/subject if present) and then explain the topic clearly. If no relevant resources are found, say so and provide general guidance.',
    '- If TRUSTED_DB_TOOL_RESULT_JSON.scope is library_resource_get_text but extracted.text is empty AND extracted.message exists: explain the real reason (e.g., scanned PDF / parse error) and suggest re-uploading a text-based PDF or using a link. Do NOT ask the user to paste the book text.',
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
    if (t === 'dashboard_summary') return `- dashboard_summary (args: {}): system counts overview (students/teachers/staff/exams + announcements/classes/subjects/levels/cohorts when permitted) (admin/staff)`;
    if (t === 'academic_years_list') return `- academic_years_list (args: { q?: string, limit?: number<=20 }): list academic years (all roles; used to get academicYearId)`;
    if (t === 'my_permissions') return `- my_permissions (args: {}): show my permission matrix (admin/staff)`;
    if (t === 'students_list')
      return `- students_list (args: { q?: string, gradeSectionId?: string, limit?: number<=50 }): list students (admin or staff with students.view)`;
    if (t === 'grade_sections_list')
      return `- grade_sections_list (args: { q?: string, limit?: number<=50 }): list grade sections/classes (admin or staff with students/timetable/attendance permissions)`;
    if (t === 'subjects_list')
      return `- subjects_list (args: { q?: string, limit?: number<=80 }): list subjects (admin or staff with subjects/results/exams/timetable permissions)`;
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
    if (t === 'finance_fee_transactions_summary')
      return `- finance_fee_transactions_summary (args: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', groupBy?: 'transactionType'|'method'|'status'|'account' }): fee transactions totals (admin/staff with finance permissions)`;
    if (t === 'finance_accounts_balances')
      return `- finance_accounts_balances (args: { status?: 'active'|'inactive', limit?: number<=50 }): account balances snapshot (admin/staff with finance permissions)`;
    if (t === 'finance_unpaid_students_summary')
      return `- finance_unpaid_students_summary (args: { month: 'YYYY-MM', gradeSectionId?: string, limit?: number<=50, includeAmounts?: boolean }): unpaid/partial invoices list (admin/staff with finance permissions)`;
    if (t === 'finance_foundation_donations_summary')
      return `- finance_foundation_donations_summary (args: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD', groupBy?: 'method'|'project'|'account', limit?: number<=30, includeTopDonors?: boolean }): donations totals (admin/staff with financeFoundation permissions)`;

    // Payroll (admin-only)
    if (t === 'finance_payroll_month_summary')
      return `- finance_payroll_month_summary (args: { month: 'YYYY-MM', status?: 'Draft'|'Approved'|'Paid', limit?: number<=50, includeStaffList?: boolean }): payroll totals by status for a month (admin/staff with financePayroll)`;
    if (t === 'finance_payroll_staff_search')
      return `- finance_payroll_staff_search (args: { q: string, limit?: number<=20 }): find staff userId for payroll lookup (admin/staff with financePayroll)`;
    if (t === 'finance_payroll_staff_ledger')
      return `- finance_payroll_staff_ledger (args: { staffUserId: string, fromMonth?: 'YYYY-MM', toMonth?: 'YYYY-MM', limit?: number<=60 }): payroll history for one staff user (admin/staff with financePayroll)`;

    // Library (read-only)
    if (t === 'library_resources_list')
      return `- library_resources_list (args: { q?: string, audience?: 'public'|'level', gradeId?: string, subjectId?: string, kind?: 'pdf'|'link', page?: number, limit?: number<=50 }): list/search library resources visible to me (all roles; level visibility is enrollment/assignment-scoped)`;
    if (t === 'library_resource_get_text')
      return `- library_resource_get_text (args: { resourceId?: string, q?: string, maxChars?: number<=40000 }): get extracted text from ONE visible library resource (PDF text or link text). Use this for summary/notes/Q&A.`;
    if (t === 'teacher_assignments') return `- teacher_assignments (args: {}): my assigned grade sections (teacher)`;
    if (t === 'teacher_class_roster')
      return `- teacher_class_roster (args: { gradeSectionId: string, limit?: number<=80 }): roster for my assigned class only (teacher)`;
    if (t === 'teacher_attendance_class_summary')
      return `- teacher_attendance_class_summary (args: { date: 'YYYY-MM-DD', gradeSectionId: string, periodCode?: string, limit?: number<=80 }): attendance for my assigned class only (teacher)`;
    if (t === 'student_self_summary') return `- student_self_summary (args: {}): my own profile summary (student)`;
    if (t === 'student_fee_invoices_self_summary')
      return `- student_fee_invoices_self_summary (args: { month?: 'YYYY-MM', limit?: number<=30, includeItems?: boolean }): my fee invoices + balance summary (student self-only)`;
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
    '- If the user asks for counts/totals/overview (e.g., "how many announcements/classes/subjects/levels/cohorts/staff/teachers/students"), and dashboard_summary is available, output {"tool": "dashboard_summary", "args": {}}.',
    '- If the user asks about Digital Library resources OR asks a topic/"cilmi" question and you should base the answer on available library books/links, and library_resources_list is available: output {"tool": "library_resources_list", "args": {"q": <topic keywords>, "limit": 8 }}. You may optionally include audience/kind/page filters if the user specifies them.',
    '- If the user asks for summary/notes/questions (Q&A) for a specific book/resource and library_resource_get_text is available: output {"tool": "library_resource_get_text", "args": {"q": <book title/keywords>, "maxChars": 20000 }}. If the user provides a specific resource id, prefer {"resourceId": "..."}.',
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

function wantsLibraryStudyMaterial(message) {
  const s = String(message || '').toLowerCase();
  if (!s) return false;
  return /\b(summary|summarize|notes?|study\s*guide|revision|q\s*&\s*a|q\/a|questions?|quiz)\b/i.test(s)
    || /\b(su'?aalo|jawaabo|soo\s*koob|dulmar|cashar|imtixaan|imtihaan|tijaabo)\b/i.test(s)
    || /\b(ملخص|تلخيص|ملاحظات|اسئلة|أسئلة|اجوبة|إجوبة)\b/i.test(s);
}

async function getOrCreateThread({ principalModel, principalId, locale }) {
  const nextLocale = String(locale || 'en').toLowerCase();
  const existing = await AiChatThread.findOne({ principalModel, principalId });

  if (existing) {
    if (nextLocale && existing.locale !== nextLocale) {
      existing.locale = nextLocale;
    }

    // Lazy-migrate legacy single-thread `messages` -> first `threads` entry.
    const legacyMessages = Array.isArray(existing.messages) ? existing.messages : [];
    const hasThreads = Array.isArray(existing.threads) && existing.threads.length > 0;
    if (!hasThreads && legacyMessages.length) {
      existing.threads = [{ title: 'Chat', messages: legacyMessages }];
      existing.activeThreadId = existing.threads?.[0]?._id || null;
      existing.messages = [];
    }

    if (!Array.isArray(existing.threads)) existing.threads = [];
    if (existing.threads.length === 0) {
      existing.threads.push({ title: 'New chat', messages: [] });
      existing.activeThreadId = existing.threads?.[0]?._id || null;
    }

    await existing.save();
    return existing;
  }

  const created = await AiChatThread.create({
    principalModel,
    principalId,
    locale: nextLocale,
    threads: [{ title: 'New chat', messages: [] }],
    activeThreadId: null,
    messages: [],
  });

  created.activeThreadId = created.threads?.[0]?._id || null;
  await created.save();
  return created;
}

function safeTitleFromText(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return 'New chat';
  return s.length > 60 ? `${s.slice(0, 60)}…` : s;
}

function pickThreadOrFallback(store, threadId) {
  const id = String(threadId || '').trim();
  const byId = id ? store?.threads?.id?.(id) : null;
  if (byId && !byId.deletedAt) return byId;

  const activeId = store?.activeThreadId ? String(store.activeThreadId) : '';
  const active = activeId ? store?.threads?.id?.(activeId) : null;
  if (active && !active.deletedAt) return active;

  const threads = Array.isArray(store?.threads) ? store.threads : [];
  const newest = threads
    .filter((t) => t && !t.deletedAt)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
  return newest || null;
}

// List chat threads (per account)
router.get('/chat/threads', protect, validate({ query: threadsQuery }), async (req, res, next) => {
  try {
    const principalModel = getPrincipalModel(req);
    const principalId = req.user?._id;
    const locale = req.locale || 'en';
    const store = await getOrCreateThread({ principalModel, principalId, locale });

    const limit = Number(req.query?.limit || 20);
    const threads = (Array.isArray(store.threads) ? store.threads : [])
      .filter((t) => t && !t.deletedAt)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, limit)
      .map((t) => {
        const msgs = Array.isArray(t.messages) ? t.messages : [];
        const last = msgs.length ? msgs[msgs.length - 1] : null;
        const preview = last?.content ? String(last.content).slice(0, 120) : '';
        const lastMessageAt = last?.createdAt || null;
        return {
          threadId: String(t._id),
          title: String(t.title || 'New chat'),
          updatedAt: t.updatedAt,
          createdAt: t.createdAt,
          lastMessageAt,
          preview,
          isActive: store?.activeThreadId ? String(store.activeThreadId) === String(t._id) : false,
        };
      });

    return res.json({
      activeThreadId: store?.activeThreadId ? String(store.activeThreadId) : null,
      threads,
    });
  } catch (err) {
    return next(err);
  }
});

// Create a new chat thread
router.post('/chat/threads', protect, validate({ body: threadsCreateBody }), async (req, res, next) => {
  try {
    const principalModel = getPrincipalModel(req);
    const principalId = req.user?._id;
    const locale = req.locale || 'en';
    const store = await getOrCreateThread({ principalModel, principalId, locale });

    const title = String(req.body?.title || '').trim();
    store.threads.push({ title: title || 'New chat', messages: [] });
    const created = store.threads[store.threads.length - 1];
    store.activeThreadId = created?._id || store.activeThreadId;
    await store.save();

    return res.status(201).json({
      threadId: String(created._id),
      title: String(created.title || 'New chat'),
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  } catch (err) {
    return next(err);
  }
});

// Delete a chat thread
router.delete('/chat/threads/:threadId', protect, validate({ params: threadIdParams }), async (req, res, next) => {
  try {
    const principalModel = getPrincipalModel(req);
    const principalId = req.user?._id;
    const locale = req.locale || 'en';
    const store = await getOrCreateThread({ principalModel, principalId, locale });

    const threadId = String(req.params.threadId);
    const t = store.threads?.id?.(threadId);
    if (!t || t.deletedAt) {
      return res.status(404).json({ success: false, message: 'Thread not found' });
    }

    t.deleteOne();

    const wasActive = store?.activeThreadId && String(store.activeThreadId) === threadId;
    if (wasActive) {
      const fallback = (Array.isArray(store.threads) ? store.threads : [])
        .filter((x) => x && !x.deletedAt)
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];

      if (fallback) store.activeThreadId = fallback._id;
      else {
        store.threads.push({ title: 'New chat', messages: [] });
        store.activeThreadId = store.threads?.[0]?._id || null;
      }
    }

    await store.save();
    return res.json({ success: true });
  } catch (err) {
    return next(err);
  }
});

// Fetch the current user's chat history (single thread)
router.get('/chat/history', protect, validate({ query: historyQuery }), async (req, res, next) => {
  try {
    const principalModel = getPrincipalModel(req);
    const principalId = req.user?._id;
    const locale = req.locale || 'en';

    const store = await getOrCreateThread({ principalModel, principalId, locale });
    const thread = pickThreadOrFallback(store, req.query?.threadId);
    if (!thread) {
      return res.json({ threadId: null, messages: [] });
    }

    store.activeThreadId = thread._id;
    await store.save();

    return res.json({
      threadId: String(thread._id),
      title: String(thread.title || 'New chat'),
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

    const store = await getOrCreateThread({ principalModel, principalId, locale });
    let thread = pickThreadOrFallback(store, req.body?.threadId);
    if (!thread) {
      store.threads.push({ title: 'New chat', messages: [] });
      thread = store.threads?.[store.threads.length - 1] || null;
    }
    if (!thread) {
      return res.status(500).json({ success: false, message: 'Chat thread failed to initialize' });
    }

    store.activeThreadId = thread._id;

    const userMessage = String(req.body?.message || '').trim();

    thread.messages.push({ role: 'user', content: userMessage });
    thread.updatedAt = new Date();
    if (!thread.title || String(thread.title).toLowerCase() === 'new chat') {
      thread.title = safeTitleFromText(userMessage);
    }

    // Keep the context bounded.
    const maxHistory = 20;
    const recent = (thread.messages || []).slice(-maxHistory);

    // 1) Ask the model whether it needs a DB tool (JSON-only)
    const allowedTools = getAllowedAiToolNamesForUser(req.user);
    let toolName = null;
    let toolArgs = {};

    if (allowedTools.length) {
      const plannerInstruction = buildToolPlannerInstruction({ locale, role, allowedTools });
      const plannerOut = await aiGenerateReply({
        systemInstruction: plannerInstruction,
        messages: recent,
        mode: 'json',
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

    // 2b) Library helper: if user asked for study materials, try to ensure we have extracted text.
    // This reduces failures when the user provides a filename or mixed "title – filename".
    try {
      const allowed = new Set(allowedTools);
      const wantsStudy = wantsLibraryStudyMaterial(userMessage);
      const canList = allowed.has('library_resources_list');
      const canGetText = allowed.has('library_resource_get_text');

      if (wantsStudy && canGetText) {
        // Case 0: planner chose no tool, but user clearly wants summary/notes/Q&A -> search then extract.
        if (!toolName && canList) {
          const q = userMessage.slice(0, 180);
          const list = await executeAiTool({ toolName: 'library_resources_list', args: { q, limit: 5, page: 1 }, user: req.user });
          const first = Array.isArray(list?.items) && list.items.length ? list.items[0] : null;
          if (first?.id) {
            toolName = 'library_resource_get_text';
            toolArgs = { resourceId: String(first.id), maxChars: 20000 };
            toolResult = await executeAiTool({ toolName, args: toolArgs, user: req.user });
          } else {
            toolName = 'library_resource_get_text';
            toolArgs = { q, maxChars: 20000 };
            toolResult = await executeAiTool({ toolName, args: toolArgs, user: req.user });
          }
        }

        // Case A: model listed resources but user wants summary/Q&A -> pick the top result and extract text.
        if (toolName === 'library_resources_list' && toolResult && Array.isArray(toolResult.items) && toolResult.items.length > 0) {
          const first = toolResult.items[0];
          if (first?.id) {
            toolName = 'library_resource_get_text';
            toolArgs = { resourceId: String(first.id), maxChars: 20000 };
            toolResult = await executeAiTool({ toolName, args: toolArgs, user: req.user });
          }
        }

        // Case B: model tried to get text but didn't find a match -> search then extract.
        if (toolName === 'library_resource_get_text' && toolResult && toolResult.found === false && canList) {
          const q = String(toolArgs?.q || userMessage).slice(0, 180);
          const list = await executeAiTool({ toolName: 'library_resources_list', args: { q, limit: 5, page: 1 }, user: req.user });
          const first = Array.isArray(list?.items) && list.items.length ? list.items[0] : null;
          if (first?.id) {
            toolArgs = { resourceId: String(first.id), maxChars: 20000 };
            toolResult = await executeAiTool({ toolName: 'library_resource_get_text', args: toolArgs, user: req.user });
          } else {
            // Keep original not-found result.
          }
        }
      }
    } catch {
      // Non-blocking: fall back to whatever the original tool produced.
    }

    // 3) Final answer (with optional trusted tool result)
    const systemInstruction = buildSystemInstruction({ locale, role })
      + (toolResult ? `\n\nTRUSTED_DB_TOOL_RESULT_JSON:\n${JSON.stringify(toolResult)}` : '');

    const assistantText = await aiGenerateReply({
      systemInstruction,
      messages: recent,
      mode: 'text',
    });

    thread.messages.push({ role: 'assistant', content: assistantText });
    thread.updatedAt = new Date();
    await store.save();

    return res.json({
      threadId: String(thread._id),
      title: String(thread.title || 'New chat'),
      reply: assistantText,
    });
  } catch (err) {
    // Localize missing key / config issues.
    if (String(err?.message || '').includes('AI_API_KEY')) {
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
