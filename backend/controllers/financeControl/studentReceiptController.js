import FeeInvoice from '../../models/FeeInvoice.js';
import FeeTransaction from '../../models/FeeTransaction.js';
import FinanceCategory from '../../models/FinanceCategory.js';
import Student from '../../models/Student.js';
import mongoose from 'mongoose';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

function parseMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const endExclusive = new Date(start);
  endExclusive.setUTCMonth(endExclusive.getUTCMonth() + 1);
  return { start, endExclusive };
}

/**
 * Receipt: list students in class with their balance before a given month.
 * Query:
 * - classId (required)
 * - academicYearId (optional)
 * - month YYYY-MM (required)
 */
export async function listReceiptStudents(req, res) {
  try {
    const { classId, academicYearId, month } = req.query;
    if (!classId || !isValidObjectId(classId)) return res.status(400).json({ message: 'classId is required' });
    if (!month) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    const range = parseMonthRange(month);
    if (!range) return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });
    if (academicYearId && !isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });

    const Enrollment = (await import('../../models/Enrollment.js')).default;

    const enrollments = await Enrollment.find({ gradeSection: classId, status: 'active' })
      .populate('student', 'fullName studentId contactNumber isFree')
      .populate('gradeSection', 'gradeName name shift');

    const students = enrollments
      .map(e => ({
        student: e.student,
        gradeSection: e.gradeSection,
      }))
      .filter(x => x.student);

    const studentIds = students.map(x => x.student._id);

    const match = {
      student: { $in: studentIds },
      status: { $in: ['Unpaid', 'Partial', 'Overdue'] },
      dueDate: { $lt: range.start },
    };
    if (academicYearId) match.academicYear = academicYearId;

    const balances = await FeeInvoice.aggregate([
      { $match: match },
      { $group: { _id: '$student', balanceBeforeMonth: { $sum: '$balance' }, overdueCount: { $sum: 1 } } },
    ]);

    const balanceByStudent = new Map(balances.map(b => [String(b._id), b]));

    const rows = students
      .map(({ student, gradeSection }) => {
        const agg = balanceByStudent.get(String(student._id)) || { balanceBeforeMonth: 0, overdueCount: 0 };
        return {
          studentId: student._id,
          studentCode: student.studentId,
          studentName: student.fullName,
          phone: student.contactNumber,
          class: gradeSection,
          isFree: !!student.isFree,
          balanceBeforeMonth: Number(agg.balanceBeforeMonth || 0),
          overdueCount: Number(agg.overdueCount || 0),
        };
      })
      .sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));

    res.json({ month, classId, academicYearId: academicYearId || null, rows });
  } catch (error) {
    console.error('listReceiptStudents Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Receipt: student ledger (invoices + payments)
 * Query:
 * - studentId (required)
 * - academicYearId (optional)
 * - includePaid true|false (optional, default true)
 */
export async function getStudentReceiptLedger(req, res) {
  try {
    const { studentId, academicYearId, includePaid } = req.query;
    if (!studentId) return res.status(400).json({ message: 'studentId is required (RECEPT)' });

    let finalStudentId = studentId;
    if (!isValidObjectId(studentId)) {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      finalStudentId = student._id;
    }
    if (academicYearId && !isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });

    const statusFilter = includePaid === 'false' ? { $in: ['Unpaid', 'Partial', 'Overdue'] } : { $ne: 'Cancelled' };
    const invoiceQuery = { student: finalStudentId, status: statusFilter };
    if (academicYearId) invoiceQuery.academicYear = academicYearId;

    const invoices = await FeeInvoice.find(invoiceQuery)
      .populate('class', 'gradeName name shift')
      .populate('academicYear', 'yearName')
      .populate('items.category', 'name type')
      .sort({ dueDate: 1 });

    const invoiceIds = invoices.map(i => i._id);
    const payments = await FeeTransaction.find({
      invoice: { $in: invoiceIds },
      transactionType: 'Payment',
      status: 'Completed',
    })
      .populate('account', 'name type')
      .populate('recordedBy', 'fullName username')
      .sort({ date: 1 });

    const paymentsByInvoice = new Map();
    for (const p of payments) {
      const key = String(p.invoice);
      if (!paymentsByInvoice.has(key)) paymentsByInvoice.set(key, []);
      paymentsByInvoice.get(key).push(p);
    }

    const rows = invoices.map(inv => {
      const pmts = paymentsByInvoice.get(String(inv._id)) || [];
      return {
        invoice: inv,
        payments: pmts,
        billingMonth: inv.billingMonth || null,
      };
    });

    res.json({ studentId: finalStudentId, academicYearId: academicYearId || null, rows });
  } catch (error) {
    console.error('getStudentReceiptLedger Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Finance: Students summary (balances)
 * Used by StudentFees Receipt tab.
 * Query:
 * - search (optional): matches studentId, fullName, contactNumber
 * - classId (optional): GradeSection id
 * - type (optional): 'unpaid' | 'uncharged'
 * - academicYearId (optional)
 */
export async function getFinanceStudentsSummary(req, res) {
  try {
    const { search, classId, type, academicYearId } = req.query;
    if (classId && !isValidObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' });
    if (academicYearId && !isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });

    const Enrollment = (await import('../../models/Enrollment.js')).default;

    // Find candidate students by search (optional)
    const studentMatch = { status: { $ne: 'Inactive' } };
    if (search) {
      const q = String(search).trim();
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        studentMatch.$or = [
          { studentId: rx },
          { fullName: rx },
          { contactNumber: rx },
        ];
      }
    }

    const students = await Student.find(studentMatch)
      .select('fullName studentId contactNumber')
      .limit(500);

    const studentIds = students.map(s => s._id);
    if (studentIds.length === 0) return res.json([]);

    // Load active enrollments to get current class label
    const enrollmentQuery = { student: { $in: studentIds }, status: 'active' };
    if (classId) enrollmentQuery.gradeSection = classId;
    if (academicYearId) enrollmentQuery.academicYear = academicYearId;

    const enrollments = await Enrollment.find(enrollmentQuery)
      .populate('student', 'fullName studentId contactNumber')
      .populate({
        path: 'gradeSection',
        select: 'section grade shift name gradeName',
        populate: [
          { path: 'grade', select: 'name gradeName' },
          { path: 'shift', select: 'shiftName' },
        ],
      });

    // Index enrollment by student (prefer latest created if duplicates)
    const enrollmentByStudent = new Map();
    for (const e of enrollments) {
      if (!e?.student?._id) continue;
      enrollmentByStudent.set(String(e.student._id), e);
    }

    const enrolledStudentIds = Array.from(enrollmentByStudent.keys()).map(id => id);
    if (enrolledStudentIds.length === 0) return res.json([]);

    // Current month window (for 'unpaid' / 'uncharged')
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
    const monthEndExclusive = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0));

    const studentObjectIds = enrolledStudentIds.map(id => new mongoose.Types.ObjectId(id));

    const invoiceMatch = { student: { $in: studentObjectIds }, status: { $ne: 'Cancelled' } };
    if (academicYearId) invoiceMatch.academicYear = new mongoose.Types.ObjectId(academicYearId);

    const aggregates = await FeeInvoice.aggregate([
      { $match: invoiceMatch },
      {
        $addFields: {
          _createdMonth: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          _billingMonthNorm: {
            $let: {
              vars: {
                bm: { $ifNull: ['$billingMonth', ''] },
              },
              in: {
                $cond: [
                  { $regexMatch: { input: '$$bm', regex: /^\d{4}-\d{2}$/ } },
                  '$$bm',
                  {
                    $cond: [
                      { $regexMatch: { input: '$$bm', regex: /^\d{4}-\d{1}$/ } },
                      {
                        $let: {
                          vars: {
                            parts: { $split: ['$$bm', '-'] },
                          },
                          in: {
                            $concat: [
                              { $arrayElemAt: ['$$parts', 0] },
                              '-',
                              '0',
                              { $arrayElemAt: ['$$parts', 1] },
                            ],
                          },
                        },
                      },
                      null,
                    ],
                  },
                ],
              },
            },
          },
          _isHormaris: {
            $or: [
              { $eq: ['$isHormaris', true] },
              { $and: [
                { $ne: ['$_billingMonthNorm', null] },
                { $gt: ['$_billingMonthNorm', '$_createdMonth'] },
              ] },
            ],
          },
          _isOutstanding: {
            $gt: [
              { $subtract: [{ $ifNull: ['$amount', 0] }, { $ifNull: ['$paidAmount', 0] }] },
              0,
            ],
          },
          _outstandingAmount: {
            $max: [
              0,
              { $subtract: [{ $ifNull: ['$amount', 0] }, { $ifNull: ['$paidAmount', 0] }] },
            ],
          },
          _isHormarisOutstanding: { $and: ['$_isHormaris', '$_isOutstanding'] },
          _isCreatedThisMonth: {
            $and: [
              { $gte: ['$createdAt', monthStart] },
              { $lt: ['$createdAt', monthEndExclusive] },
            ],
          },
          _isThisMonth: {
            $or: [
              { $eq: ['$billingMonth', monthStr] },
              { $and: [
                { $gte: ['$dueDate', monthStart] },
                { $lt: ['$dueDate', monthEndExclusive] },
              ] },
            ],
          },
          _isThisMonthOutstanding: {
            $and: [
              {
                $or: [
                  { $eq: ['$billingMonth', monthStr] },
                  { $and: [
                    { $gte: ['$dueDate', monthStart] },
                    { $lt: ['$dueDate', monthEndExclusive] },
                  ] },
                ],
              },
              { $in: ['$status', ['Unpaid', 'Partial', 'Overdue']] },
            ],
          },
          _isThisMonthPaid: {
            $and: [
              {
                $or: [
                  { $eq: ['$billingMonth', monthStr] },
                  { $and: [
                    { $gte: ['$dueDate', monthStart] },
                    { $lt: ['$dueDate', monthEndExclusive] },
                  ] },
                ],
              },
              { $eq: ['$status', 'Paid'] },
            ],
          },
          _isHormarisCreatedThisMonthOutstanding: {
            $and: [
              '$_isHormaris',
              '$_isCreatedThisMonth',
              { $in: ['$status', ['Unpaid', 'Partial', 'Overdue']] },
              '$_isOutstanding',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$student',
          totalBilled: { $sum: { $ifNull: ['$amount', 0] } },
          totalPaid: { $sum: { $ifNull: ['$paidAmount', 0] } },
          chargeCountThisMonth: { $sum: { $cond: ['$_isThisMonth', 1, 0] } },
          paidCountThisMonth: { $sum: { $cond: ['$_isThisMonthPaid', 1, 0] } },
          outstandingCountThisMonth: { $sum: { $cond: ['$_isThisMonthOutstanding', 1, 0] } },
          hormarisOutstandingCreatedThisMonthCount: { $sum: { $cond: ['$_isHormarisCreatedThisMonthOutstanding', 1, 0] } },
          hasHormaris: { $max: { $cond: ['$_isHormaris', 1, 0] } },
          hasHormarisOutstanding: { $max: { $cond: ['$_isHormarisOutstanding', 1, 0] } },
          hormarisOutstandingAmount: { $sum: { $cond: ['$_isHormaris', '$_outstandingAmount', 0] } },
        },
      },
      {
        $project: {
          totalBilled: 1,
          totalPaid: 1,
          balance: { $subtract: ['$totalBilled', '$totalPaid'] },
          chargeCountThisMonth: 1,
          paidCountThisMonth: 1,
          outstandingCountThisMonth: 1,
          hormarisOutstandingCreatedThisMonthCount: 1,
          hasHormaris: { $toBool: '$hasHormaris' },
          hasHormarisOutstanding: { $toBool: '$hasHormarisOutstanding' },
          hormarisOutstandingAmount: 1,
        },
      },
    ]);

    const aggByStudent = new Map(aggregates.map(a => [String(a._id), a]));

    const rows = Array.from(enrollmentByStudent.entries())
      .map(([studentIdStr, e]) => {
        const s = e.student;
        const gs = e.gradeSection || {};
        const gradeName = gs?.grade?.gradeName || gs?.grade?.name || gs?.gradeName || '';
        const section = gs?.section || '';
        const legacyName = typeof gs?.name === 'string' ? gs.name : '';
        const className = legacyName || `${gradeName}${section ? ` - ${section}` : ''}`.trim() || '—';

        const agg = aggByStudent.get(studentIdStr) || {
          totalBilled: 0,
          totalPaid: 0,
          balance: 0,
          chargeCountThisMonth: 0,
          paidCountThisMonth: 0,
          outstandingCountThisMonth: 0,
          hormarisOutstandingCreatedThisMonthCount: 0,
          hasHormaris: false,
          hasHormarisOutstanding: false,
          hormarisOutstandingAmount: 0,
        };

        return {
          _id: studentIdStr,
          studentId: s?.studentId || '',
          fullName: s?.fullName || '',
          phone: s?.contactNumber || '',
          className,
          totalBilled: Number(agg.totalBilled || 0),
          totalPaid: Number(agg.totalPaid || 0),
          balance: Number(agg.balance || 0),
          chargeCountThisMonth: Number(agg.chargeCountThisMonth || 0),
          paidCountThisMonth: Number(agg.paidCountThisMonth || 0),
          outstandingCountThisMonth: Number(agg.outstandingCountThisMonth || 0),
          hormarisOutstandingCreatedThisMonthCount: Number(agg.hormarisOutstandingCreatedThisMonthCount || 0),
          hasHormaris: !!agg.hasHormaris,
          hasHormarisOutstanding: !!agg.hasHormarisOutstanding,
          hormarisOutstandingAmount: Number(agg.hormarisOutstandingAmount || 0),
        };
      })
      .filter(r => (r.studentId || r.fullName));

    let filtered = rows;
    if (type === 'unpaid') {
      filtered = filtered.filter(r => (r.outstandingCountThisMonth > 0) || (r.hormarisOutstandingCreatedThisMonthCount > 0));
    } else if (type === 'paid') {
      filtered = filtered.filter(r => r.chargeCountThisMonth > 0 && r.outstandingCountThisMonth === 0);
    } else if (type === 'charged') {
      filtered = filtered.filter(r => r.chargeCountThisMonth > 0);
    } else if (type === 'uncharged') {
      filtered = filtered.filter(r => r.chargeCountThisMonth === 0);
    } else if (type === 'hormaris') {
      filtered = filtered.filter(r => Number(r.hormarisOutstandingAmount || 0) > 0);
    }

    filtered.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    res.json(filtered);
  } catch (error) {
    console.error('getFinanceStudentsSummary Error:', error);
    res.status(500).json({ message: error.message });
  }
}

function normalizeMonthString(value) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  const m2 = raw.match(/^(\d{4})-(\d{2})$/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  const m1 = raw.match(/^(\d{4})-(\d{1})$/);
  if (m1) return `${m1[1]}-0${m1[2]}`;
  return null;
}

/**
 * Finance: Previous Balance invoices summary
 * Query:
 * - search (optional): matches studentId, fullName, contactNumber
 * - classId (optional): GradeSection id (matches invoice.class)
 * - month (optional): YYYY-MM; if omitted, returns latest Previous Balance per student across any month
 * - onlyOutstanding (optional): true|false
 */
export async function getPreviousBalanceSummary(req, res) {
  try {
    const { search, classId, month, onlyOutstanding } = req.query;
    if (classId && !isValidObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' });

    const monthStr = month ? normalizeMonthString(month) : null;

    const categories = await FinanceCategory.find({ type: 'fee', status: 'active' }).select('name type status').lean();
    const normalized = (categories || [])
      .map(c => ({ ...c, _name: String(c?.name || '').trim().toLowerCase() }))
      .filter(c => c && c.type === 'fee' && c.status === 'active');

    const exact = normalized.find(c => c._name === 'previous balance');
    const contains = normalized.find(c => c._name.includes('previous') && c._name.includes('balance'));
    const fallback = normalized.find(c => c._name.includes('balance'));
    const category = exact || contains || fallback;
    if (!category?._id) return res.json({ month: monthStr, categoryId: null, rows: [] });

    // Optional student search filter
    let studentIdFilter = null;
    if (search) {
      const q = String(search).trim();
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const matchedStudents = await Student.find({
          status: { $ne: 'Inactive' },
          $or: [{ studentId: rx }, { fullName: rx }, { contactNumber: rx }],
        }).select('_id').limit(500);
        const ids = matchedStudents.map(s => s._id);
        if (ids.length === 0) return res.json({ month: monthStr, categoryId: String(category._id), rows: [] });
        studentIdFilter = { $in: ids };
      }
    }

    const invoiceQuery = {
      status: { $ne: 'Cancelled' },
      'items.category': category._id,
    };
    if (monthStr) invoiceQuery.billingMonth = monthStr;
    if (classId) invoiceQuery.class = classId;
    if (studentIdFilter) invoiceQuery.student = studentIdFilter;

    const invoices = await FeeInvoice.find(invoiceQuery)
      .populate('student', 'fullName studentId contactNumber')
      .populate({
        path: 'class',
        select: 'section grade shift name gradeName',
        populate: [
          { path: 'grade', select: 'name gradeName' },
          { path: 'shift', select: 'shiftName' },
        ],
      })
      .sort({ createdAt: -1 });

    const byStudent = new Map();
    for (const inv of invoices) {
      const sid = String(inv?.student?._id || inv?.student);
      if (!sid || byStudent.has(sid)) continue;
      const bal = Number(inv?.balance || 0);
      if (onlyOutstanding === 'true' && bal <= 0) continue;
      byStudent.set(sid, inv);
    }

    const rows = Array.from(byStudent.values()).map(inv => {
      const s = inv.student || {};
      const gs = inv.class || {};
      const gradeName = gs?.grade?.gradeName || gs?.grade?.name || gs?.gradeName || '';
      const section = gs?.section || '';
      const legacyName = typeof gs?.name === 'string' ? gs.name : '';
      const className = legacyName || `${gradeName}${section ? ` - ${section}` : ''}`.trim() || '—';

      return {
        studentObjectId: String(s?._id || ''),
        studentId: s?.studentId || '',
        fullName: s?.fullName || '',
        phone: s?.contactNumber || '',
        className,
        invoiceId: String(inv?._id || ''),
        billingMonth: inv?.billingMonth || null,
        amount: Number(inv?.amount || 0),
        paidAmount: Number(inv?.paidAmount || 0),
        balance: Number(inv?.balance || 0),
      };
    });

    rows.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    res.json({ month: monthStr, categoryId: String(category._id), rows });
  } catch (error) {
    console.error('getPreviousBalanceSummary Error:', error);
    res.status(500).json({ message: error.message });
  }
}
