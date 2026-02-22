import FeeInvoice from '../../models/FeeInvoice.js';
import FeeTransaction from '../../models/FeeTransaction.js';
import FinanceCategory from '../../models/FinanceCategory.js';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const endExclusive = new Date(start);
  endExclusive.setUTCMonth(endExclusive.getUTCMonth() + 1);
  return { start, endExclusive };
}

function parseDateRange(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  // inclusive end-of-day
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Print Monthly Invoice
 * هدف: list paid invoices for a given month, optionally filtered by class and amount type (category).
 * Query:
 * - month: YYYY-MM (required)
 * - classId: GradeSection id (optional)
 * - academicYearId: AcademicYear id (optional)
 * - categoryId: FinanceCategory id (optional)
 * - includePartial: 'true'|'false' (optional, default false)
 * - includeUnpaid: 'true'|'false' (optional, default false)
 * - status: 'Paid'|'Partial'|'Unpaid'|'All' (optional; overrides includePartial/includeUnpaid when provided)
 */
export async function printMonthlyInvoices(req, res) {
  try {
    const { month, classId, academicYearId, categoryId, includePartial, includeUnpaid, status } = req.query;

    if (!month) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    const range = parseMonthRange(month);
    if (!range) return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });

    // Default behavior for monthly printing: Paid + Partial only.
    let statusList = ['Paid', 'Partial'];

    // Optional overrides
    if (includePartial === 'false') statusList = statusList.filter(s => s !== 'Partial');
    if (includeUnpaid === 'true') statusList = Array.from(new Set([...statusList, 'Unpaid', 'Overdue']));
    if (status) {
      const s = String(status).toLowerCase();
      if (s === 'all') statusList = ['Paid', 'Partial', 'Unpaid'];
      else if (s === 'paid') statusList = ['Paid'];
      else if (s === 'partial') statusList = ['Partial'];
      else if (s === 'unpaid') statusList = ['Unpaid'];
      else return res.status(400).json({ message: "Invalid status. Use: Paid | Partial | Unpaid | All" });
    }
    const paidInMonthTx = await FeeTransaction.find({
      transactionType: 'Payment',
      status: 'Completed',
      date: { $gte: range.start, $lt: range.endExclusive },
    }).select('invoice');

    const paidInMonthInvoiceIds = paidInMonthTx
      .map(t => t?.invoice)
      .filter(Boolean);

    const monthFilter = [
      { billingMonth: month },
      { dueDate: { $gte: range.start, $lt: range.endExclusive } },
      ...(paidInMonthInvoiceIds.length ? [{ _id: { $in: paidInMonthInvoiceIds } }] : []),
    ];

    const statusOrPaidFilter = [
      { status: { $in: statusList } },
      ...(paidInMonthInvoiceIds.length ? [{ _id: { $in: paidInMonthInvoiceIds } }] : []),
    ];

    const query = {
      $and: [{ status: { $ne: 'Cancelled' } }],
      __monthFilter: monthFilter,
      __statusOrPaid: statusOrPaidFilter,
    };

    if (classId) {
      if (!isValidObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' });
      query.class = classId;
    }
    if (academicYearId) {
      if (!isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });
      query.$and = [
        { status: { $ne: 'Cancelled' } },
        { $or: query.__statusOrPaid },
        { $or: query.__monthFilter },
        { $or: [
          { academicYear: academicYearId },
          { academicYear: { $exists: false } },
          { academicYear: null },
        ] },
      ];
      delete query.__statusOrPaid;
      delete query.__monthFilter;
    }
    let categoryNameForFallback = null;
    if (categoryId) {
      if (!isValidObjectId(categoryId)) return res.status(400).json({ message: 'Invalid categoryId' });

      // Legacy safety: some invoices may have items with a name but missing items.category.
      // In that case, allow matching by the category name.
      const cat = await FinanceCategory.findById(categoryId).select('name').lean();
      categoryNameForFallback = cat?.name ? String(cat.name).trim() : null;

      const categoryMatchOr = [
        { 'items.category': categoryId },
      ];

      if (categoryNameForFallback) {
        const safe = escapeRegex(categoryNameForFallback);
        const titlePrefix = new RegExp(`^\\s*${safe}(?:\\b|\\s|$)`, 'i');

        categoryMatchOr.push({
          items: {
            $elemMatch: {
              name: categoryNameForFallback,
              $or: [
                { category: { $exists: false } },
                { category: null },
              ],
            },
          },
        });

        // Extra legacy fallback: older invoices may not have items at all, but their title
        // was generated as `${category.name} ${YYYY-MM}`.
        categoryMatchOr.push({
          $and: [
            {
              $or: [
                { items: { $exists: false } },
                { items: { $size: 0 } },
              ],
            },
            { title: titlePrefix },
          ],
        });
      }

      query.$and = [...(query.$and || []), { $or: categoryMatchOr }];
    }

    if (query.__monthFilter || query.__statusOrPaid) {
      const andParts = [...(query.$and || [])];
      if (query.__statusOrPaid) andParts.push({ $or: query.__statusOrPaid });
      if (query.__monthFilter) andParts.push({ $or: query.__monthFilter });
      query.$and = andParts;
      delete query.__statusOrPaid;
      delete query.__monthFilter;
    }

    const invoices = await FeeInvoice.find(query)
        .populate('student', 'fullName studentId contactNumber isFree')
      .populate({
        path: 'class',
          select: 'section grade shift fee name gradeName',
        populate: [
          { path: 'grade', select: 'name gradeName' },
          { path: 'shift', select: 'shiftName' },
        ],
      })
      .populate('academicYear', 'yearName')
      .populate('items.category', 'name type')
      .sort({ 'student.fullName': 1 });

    let transactions = await FeeTransaction.find({
      transactionType: 'Payment',
      status: 'Completed',
      date: { $gte: range.start, $lt: range.endExclusive },
    })
      .populate({
        path: 'invoice',
        populate: [
          {
            path: 'class',
            select: 'section grade shift fee name gradeName',
            populate: [
              { path: 'grade', select: 'name gradeName' },
              { path: 'shift', select: 'shiftName' },
            ],
          },
          { path: 'academicYear', select: 'yearName' },
          { path: 'items.category', select: 'name type' },
        ],
      })
      .populate('student', 'fullName studentId contactNumber isFree')
      .sort({ date: -1 });

    if (classId) {
      transactions = transactions.filter(t => String(t?.invoice?.class?._id || t?.invoice?.class || '') === String(classId));
    }
    if (academicYearId) {
      transactions = transactions.filter(t => {
        const ay = t?.invoice?.academicYear?._id || t?.invoice?.academicYear || null;
        if (!ay) return true;
        return String(ay) === String(academicYearId);
      });
    }
    if (categoryId) {
      transactions = transactions.filter(t => {
        const items = Array.isArray(t?.invoice?.items) ? t.invoice.items : [];
        const byCategoryId = items.some(i => String(i?.category?._id || i?.category || '') === String(categoryId));
        if (byCategoryId) return true;

        if (!categoryNameForFallback) return false;
        const title = String(t?.invoice?.title || '').trim();
        if (!items.length && title) {
          const safe = escapeRegex(categoryNameForFallback);
          const titlePrefix = new RegExp(`^\\s*${safe}(?:\\b|\\s|$)`, 'i');
          if (titlePrefix.test(title)) return true;
        }
        return items.some(i => {
          const hasCategory = !!(i?.category?._id || i?.category);
          if (hasCategory) return false;
          return String(i?.name || '').trim() === categoryNameForFallback;
        });
      });
    }

    const totals = invoices.reduce(
      (acc, inv) => {
        acc.count += 1;
        acc.amount += Number(inv.amount || 0);
        acc.paid += Number(inv.paidAmount || 0);
        acc.balance += Number(inv.balance || 0);
        return acc;
      },
      { count: 0, amount: 0, paid: 0, balance: 0 }
    );

    res.json({
      month,
      filters: { classId: classId || null, academicYearId: academicYearId || null, categoryId: categoryId || null },
      totals,
      invoices,
      transactions,
    });
  } catch (error) {
    console.error('printMonthlyInvoices Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Print Daily Invoice
 * Goal: list payments made within a date range.
 * Query:
 * - from: date string (required)
 * - to: date string (required)
 * - method: Cash|Bank Transfer|Mobile Money|Cheque (optional)
 */
export async function printDailyInvoices(req, res) {
  try {
    const { from, to, method } = req.query;

    if (!from || !to) return res.status(400).json({ message: 'from and to are required' });
    const range = parseDateRange(from, to);
    if (!range) return res.status(400).json({ message: 'Invalid from/to date range' });

    const query = {
      transactionType: 'Payment',
      status: 'Completed',
      date: { $gte: range.start, $lte: range.end },
    };
    if (method) query.method = method;

    const transactions = await FeeTransaction.find(query)
      .populate({
        path: 'invoice',
        populate: [
          {
            path: 'class',
              select: 'section grade shift gradeName name fee',
            populate: [
              { path: 'grade', select: 'name gradeName' },
              { path: 'shift', select: 'shiftName' },
            ],
          },
          { path: 'academicYear', select: 'yearName' },
        ],
      })
        .populate('student', 'fullName studentId contactNumber isFree')
      .sort({ date: -1 });

    const totals = transactions.reduce(
      (acc, t) => {
        acc.count += 1;
        acc.amount += Number(t.amount || 0);
        return acc;
      },
      { count: 0, amount: 0 }
    );

    res.json({
      filters: { from: range.start.toISOString(), to: range.end.toISOString(), method: method || null },
      totals,
      transactions,
    });
  } catch (error) {
    console.error('printDailyInvoices Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Receipt print payload (single transaction)
 * Params:
 * - transactionId
 * Query:
 * - mode: 'level'|'receipt' (optional) controls discount visibility on the client
 */
export async function getReceiptPrintPayload(req, res) {
  try {
    const { transactionId } = req.params;
    const { mode } = req.query;

    if (!isValidObjectId(transactionId)) return res.status(400).json({ message: 'Invalid transactionId' });

    const tx = await FeeTransaction.findById(transactionId)
      .populate({
        path: 'invoice',
        populate: [
          {
            path: 'class',
              select: 'section grade shift academicYear fee name gradeName',
            populate: [
              { path: 'grade', select: 'name gradeName' },
              { path: 'shift', select: 'shiftName' },
              { path: 'academicYear', select: 'yearName' },
            ],
          },
          { path: 'academicYear', select: 'yearName' },
          { path: 'items.category', select: 'name type' },
        ],
      })
        .populate('student', 'fullName studentId contactNumber isFree')
      .populate('recordedBy', 'fullName username');

    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    // Note: UI prints using shared PrintHeader/PrintFooter; backend returns normalized payload only.
    const invoice = tx.invoice;
    const payload = {
      receiptNo: tx._id,
      printedMode: mode === 'level' ? 'level' : 'receipt',
      date: tx.date,
      student: tx.student,
      invoice,
      payment: {
        amount: tx.amount,
        method: tx.method,
        reference: tx.reference || null,
        remarks: tx.remarks || null,
        recordedBy: tx.recordedBy || null,
      },
    };

    res.json(payload);
  } catch (error) {
    console.error('getReceiptPrintPayload Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Payment Group receipt payload (aggregated)
 * Params:
 * - paymentGroupId
 * Query:
 * - mode: 'level'|'receipt'
 */
export async function getPaymentGroupReceiptPayload(req, res) {
  try {
    const { paymentGroupId } = req.params;
    const { mode } = req.query;

    if (!isValidObjectId(paymentGroupId)) return res.status(400).json({ message: 'Invalid paymentGroupId' });

    let txs = await FeeTransaction.find({ paymentGroup: paymentGroupId, transactionType: 'Payment', status: 'Completed' })
      .populate({
        path: 'invoice',
        populate: [
          {
            path: 'class',
              select: 'section grade shift academicYear fee name gradeName',
            populate: [
              { path: 'grade', select: 'name gradeName' },
              { path: 'shift', select: 'shiftName' },
              { path: 'academicYear', select: 'yearName' },
            ],
          },
          { path: 'academicYear', select: 'yearName' },
          { path: 'items.category', select: 'name type' },
        ],
      })
        .populate('student', 'fullName studentId contactNumber isFree')
      .populate('recordedBy', 'fullName username')
      .populate('account', 'name type')
      .sort({ date: 1 });

    // Backward compatibility:
    // Old data may not have paymentGroup set. In that case history uses transactionId as "paymentGroupId".
    if (!txs.length) {
      const single = await FeeTransaction.findById(paymentGroupId)
        .populate({
          path: 'invoice',
          populate: [
            {
              path: 'class',
              select: 'section grade shift academicYear',
              populate: [
                { path: 'grade', select: 'name gradeName' },
                { path: 'shift', select: 'shiftName' },
                { path: 'academicYear', select: 'yearName' },
              ],
            },
            { path: 'academicYear', select: 'yearName' },
            { path: 'items.category', select: 'name type' },
          ],
        })
        .populate('student', 'fullName studentId contactNumber')
        .populate('recordedBy', 'fullName username')
        .populate('account', 'name type');

      if (!single || single.transactionType !== 'Payment' || single.status !== 'Completed') {
        return res.status(404).json({ message: 'Payment group not found' });
      }

      const invoice = single.invoice;
      const totals = {
        amount: Number(invoice?.amount || 0),
        paid: Number(invoice?.paidAmount || 0),
        balance: Number(invoice?.balance || 0),
      };

      return res.json({
        receiptNo: single._id,
        printedMode: mode === 'level' ? 'level' : 'receipt',
        date: single.date,
        student: single.student,
        invoices: invoice ? [invoice] : [],
        payment: {
          amount: Number(single.amount || 0),
          method: single.method,
          account: single.account || null,
          transactions: [{ _id: single._id, invoice: invoice?._id || null, amount: single.amount, date: single.date }],
          recordedBy: single.recordedBy || null,
        },
        totals,
      });
    }

    const student = txs[0].student;
    const date = txs[txs.length - 1].date;
    const invoices = txs.map(t => t.invoice).filter(Boolean);

    const totals = invoices.reduce(
      (acc, inv) => {
        acc.amount += Number(inv?.amount || 0);
        acc.paid += Number(inv?.paidAmount || 0);
        acc.balance += Number(inv?.balance || 0);
        return acc;
      },
      { amount: 0, paid: 0, balance: 0 }
    );

    const paymentTotal = txs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    res.json({
      receiptNo: paymentGroupId,
      printedMode: mode === 'level' ? 'level' : 'receipt',
      date,
      student,
      invoices,
      payment: {
        amount: paymentTotal,
        method: txs[0].method,
        account: txs[0].account || null,
        transactions: txs.map(t => ({ _id: t._id, invoice: t.invoice?._id, amount: t.amount, date: t.date })),
        recordedBy: txs[0].recordedBy || null,
      },
      totals,
    });
  } catch (error) {
    console.error('getPaymentGroupReceiptPayload Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Pass cards by class
 * Query:
 * - classId: GradeSection id (required)
 * - academicYearId: AcademicYear id (optional)
 * - examType: 'Midterm'|'Final' (optional)
 * - validUntil: date string (optional)
 */
export async function getPassCardsByClass(req, res) {
  try {
    const { classId, academicYearId, examType, validUntil } = req.query;
    if (classId && !isValidObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' });
    if (academicYearId && !isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });

    const Enrollment = (await import('../../models/Enrollment.js')).default;

    const enrollmentQuery = { status: 'active' };
    if (classId) enrollmentQuery.gradeSection = classId;
    if (academicYearId) enrollmentQuery.academicYear = academicYearId;

    let enrollments = await Enrollment.find(enrollmentQuery)
      .populate('student', 'fullName studentId contactNumber isFree')
      .populate({
        path: 'gradeSection',
        select: 'section grade shift',
        populate: [
          { path: 'grade', select: 'name gradeName' },
          { path: 'shift', select: 'shiftName' },
        ],
      });

    // If a specific academic year was requested but yields no enrollments,
    // fall back to all active enrollments for that class.
    if (academicYearId && enrollments.length === 0) {
      const fallbackQuery = { status: 'active' };
      if (classId) fallbackQuery.gradeSection = classId;
      enrollments = await Enrollment.find(fallbackQuery)
        .populate('student', 'fullName studentId contactNumber isFree')
        .populate({
          path: 'gradeSection',
          select: 'section grade shift',
          populate: [
            { path: 'grade', select: 'name gradeName' },
            { path: 'shift', select: 'shiftName' },
          ],
        });
    }

    const students = enrollments
      .map(e => ({
        student: e.student,
        class: e.gradeSection,
      }))
      .filter(x => x.student);

    const studentIds = students.map(x => x.student._id);

    // Aggregate balances for the selected academic year (or all if not provided)
    const match = { student: { $in: studentIds }, status: { $ne: 'Cancelled' } };
    if (academicYearId) match.academicYear = academicYearId;

    const balances = await FeeInvoice.aggregate([
      { $match: match },
      { $group: { _id: '$student', totalBilled: { $sum: '$amount' }, totalPaid: { $sum: '$paidAmount' } } },
      { $project: { balance: { $subtract: ['$totalBilled', '$totalPaid'] }, totalBilled: 1, totalPaid: 1 } },
    ]);

    const balanceByStudent = new Map(balances.map(b => [String(b._id), b]));

    const cards = students.map(({ student, class: gradeSection }) => {
      const agg = balanceByStudent.get(String(student._id)) || { balance: 0, totalBilled: 0, totalPaid: 0 };
      const cleared = student.isFree ? true : Number(agg.balance) <= 0;
      return {
        student,
        class: gradeSection,
        clearanceStatus: cleared ? 'CLEARED' : 'OUTSTANDING',
        totals: {
          totalBilled: agg.totalBilled,
          totalPaid: agg.totalPaid,
          balance: agg.balance,
        },
      };
    });

    res.json({
      classId,
      academicYearId: academicYearId || null,
      examType: examType || null,
      validUntil: validUntil || null,
      cards,
    });
  } catch (error) {
    console.error('getPassCardsByClass Error:', error);
    res.status(500).json({ message: error.message });
  }
}
