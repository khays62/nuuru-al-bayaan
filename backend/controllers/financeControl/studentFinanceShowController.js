import mongoose from 'mongoose';
import FeeInvoice from '../../models/FeeInvoice.js';
import FeeTransaction from '../../models/FeeTransaction.js';
import Student from '../../models/Student.js';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

function parseMonthRange(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const endExclusive = new Date(start);
  endExclusive.setUTCMonth(endExclusive.getUTCMonth() + 1);
  return { start, endExclusive };
}

function currentYYYYMM() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function guessMethodFromAccount(account) {
  const hay = `${account?.name || ''} ${account?.type || ''}`.toLowerCase();
  if (hay.includes('bank')) return 'Bank Transfer';
  if (hay.includes('mobile') || hay.includes('mpesa') || hay.includes('zaad') || hay.includes('edahab')) return 'Mobile Money';
  return 'Cash';
}

function monthFromInvoice(inv) {
  if (inv?.billingMonth && /^\d{4}-\d{2}$/.test(inv.billingMonth)) return inv.billingMonth;
  if (inv?.dueDate instanceof Date && !Number.isNaN(inv.dueDate.getTime())) return inv.dueDate.toISOString().slice(0, 7);
  return null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * SHOW button summary
 * Returns one row per (Student, AcademicYear, Class, Month) where charges exist.
 */
export async function listChargedMonthSummary(req, res) {
  try {
    const { academicYearId, classId, month } = req.query;
    if (academicYearId && !isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });
    if (classId && !isValidObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' });
    if (month && !/^\d{4}-\d{2}$/.test(String(month))) return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });

    const nowMonth = currentYYYYMM();

    const match = { status: { $ne: 'Cancelled' } };
    if (academicYearId) match.academicYear = new mongoose.Types.ObjectId(academicYearId);
    if (classId) match.class = new mongoose.Types.ObjectId(classId);

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          effectiveMonth: {
            $ifNull: [
              '$billingMonth',
              { $dateToString: { format: '%Y-%m', date: '$dueDate' } },
            ],
          },
          discountsTotalDoc: { $sum: '$discounts.amountOff' },
        },
      },
    ];

    if (month) {
      pipeline.push({ $match: { effectiveMonth: String(month) } });
    } else {
      pipeline.push({ $match: { effectiveMonth: { $lte: nowMonth } } });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            student: '$student',
            academicYear: '$academicYear',
            class: '$class',
            month: '$effectiveMonth',
          },
          dueDate: { $min: '$dueDate' },
          amount: { $sum: '$amount' },
          paid: { $sum: '$paidAmount' },
          balance: { $sum: '$balance' },
          invoiceIds: { $push: '$_id' },
          titles: { $addToSet: '$title' },
          discountTotal: { $sum: '$discountsTotalDoc' },
        },
      },
      { $sort: { '_id.month': -1 } }
    );

    const groups = await FeeInvoice.aggregate(pipeline);

    const studentIds = Array.from(
      new Set(
        groups
          .map(g => g?._id?.student)
          .map(v => (v ? String(v) : ''))
          .filter(id => isValidObjectId(id))
      )
    );
    const classIds = Array.from(
      new Set(
        groups
          .map(g => g?._id?.class)
          .map(v => (v ? String(v) : ''))
          .filter(id => isValidObjectId(id))
      )
    );
    const yearIds = Array.from(
      new Set(
        groups
          .map(g => g?._id?.academicYear)
          .map(v => (v ? String(v) : ''))
          .filter(id => isValidObjectId(id))
      )
    );

    const GradeSection = (await import('../../models/GradeSection.js')).default;
    const AcademicYear = (await import('../../models/AcademicYear.js')).default;

    const [students, classes, years] = await Promise.all([
      studentIds.length
        ? Student.find({ _id: { $in: studentIds } }).select('fullName studentId contactNumber admissionDate')
        : Promise.resolve([]),
      classIds.length
        ? GradeSection.find({ _id: { $in: classIds } })
          .populate('grade', 'gradeName name level')
          .select('section grade academicYear')
        : Promise.resolve([]),
      yearIds.length ? AcademicYear.find({ _id: { $in: yearIds } }).select('yearName') : Promise.resolve([]),
    ]);

    const studentById = new Map(students.map(s => [String(s._id), s]));
    const classById = new Map(classes.map(c => [String(c._id), c]));
    const yearById = new Map(years.map(y => [String(y._id), y]));

    const rows = groups.map((g) => {
      const student = studentById.get(String(g._id.student));
      const gradeSection = classById.get(String(g._id.class));
      const academicYear = yearById.get(String(g._id.academicYear));

      const grade = gradeSection?.grade;
      const classLabel = grade
        ? `${grade.gradeName || grade.name || grade.level || 'Level'} - ${gradeSection?.section || ''}`.trim()
        : (gradeSection?.section ? `Section ${gradeSection.section}` : '');

      return {
        key: `${g._id.student}_${g._id.academicYear || 'na'}_${g._id.class || 'na'}_${g._id.month}`,
        month: g._id.month,
        dueDate: g.dueDate,
        totals: {
          amount: Number(g.amount || 0),
          paid: Number(g.paid || 0),
          balance: Number(g.balance || 0),
          discount: Number(g.discountTotal || 0),
        },
        student: student
          ? {
            _id: student._id,
            fullName: student.fullName,
            studentId: student.studentId,
            contactNumber: student.contactNumber,
            registerDate: student.admissionDate,
          }
          : null,
        academicYear: academicYear ? { _id: academicYear._id, yearName: academicYear.yearName } : null,
        class: gradeSection
          ? {
            _id: gradeSection._id,
            section: gradeSection.section,
            label: classLabel,
            grade: grade || null,
          }
          : null,
        invoiceIds: g.invoiceIds,
      };
    });

    res.json({ filters: { academicYearId: academicYearId || null, classId: classId || null, month: month || null }, rows });
  } catch (error) {
    console.error('listChargedMonthSummary Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Pay a student-month group safely.
 */
export async function payChargedMonth(req, res) {
  try {
    const { studentId, month, academicYearId, classId, accountId, amount, paymentType, description, method: clientMethod, date: clientDate, reference } = req.body;

    if (!studentId) return res.status(400).json({ message: 'studentId is required (SHOW)' });

    let finalStudentId = studentId;
    if (!isValidObjectId(studentId)) {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      finalStudentId = student._id;
    }

    if (!month || !/^\d{4}-\d{2}$/.test(String(month))) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    if (!accountId || !isValidObjectId(accountId)) return res.status(400).json({ message: 'accountId is required' });

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'amount must be > 0' });

    const Account = (await import('../../models/Account.js')).default;
    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const range = parseMonthRange(String(month));
    if (!range) return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });

    const invoiceQuery = {
      student: finalStudentId,
      status: { $ne: 'Cancelled' },
      $or: [
        { billingMonth: String(month) },
        { billingMonth: { $exists: false }, dueDate: { $gte: range.start, $lt: range.endExclusive } },
        { billingMonth: null, dueDate: { $gte: range.start, $lt: range.endExclusive } },
      ],
    };
    if (academicYearId) invoiceQuery.academicYear = academicYearId;
    if (classId) invoiceQuery.class = classId;

    const invoices = await FeeInvoice.find(invoiceQuery).sort({ dueDate: 1, createdAt: 1 });
    if (!invoices.length) return res.status(404).json({ message: 'No charged invoices found for this student/month' });

    const openInvoices = invoices.filter(i => Number(i.balance || 0) > 0);
    const totalBalance = openInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);

    if (totalBalance <= 0) return res.status(400).json({ message: 'This month is already fully paid' });
    if (amt > totalBalance) return res.status(400).json({ message: 'Amount exceeds month balance' });

    const groupId = new mongoose.Types.ObjectId();
    const method = (clientMethod && String(clientMethod).trim()) ? String(clientMethod).trim() : guessMethodFromAccount(account);
    const parsedDate = clientDate ? new Date(clientDate) : null;
    const txDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;

    let remaining = amt;
    const created = [];

    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const pay = Math.min(remaining, Number(inv.balance || 0));

      inv.paidAmount += pay;
      if (!inv.billingMonth) inv.billingMonth = String(month);
      await inv.save();

      const tx = await FeeTransaction.create({
        invoice: inv._id,
        student: inv.student,
        account: account._id,
        amount: pay,
        method,
        transactionType: 'Payment',
        reference: reference ? String(reference).trim() : null,
        remarks: description || null,
        recordedBy: req.user?._id,
        paymentGroup: groupId,
        ...(txDate ? { date: txDate } : {}),
      });

      created.push(tx);
      remaining -= pay;
    }

    account.balance += amt;
    await account.save();

    res.status(201).json({
      paymentGroupId: groupId,
      totals: { amount: amt, method, account: { _id: account._id, name: account.name, type: account.type } },
      transactions: created.map(t => ({ _id: t._id, invoice: t.invoice, amount: t.amount, date: t.date })),
      print: { mode: paymentType === 'level' ? 'level' : 'receipt', paymentGroupId: groupId },
    });
  } catch (error) {
    console.error('payChargedMonth Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Pay multiple selected months (Hormaris / advance months) in a single payment group.
 * Body:
 * - studentId (required)
 * - months: string[] (required, YYYY-MM)
 * - accountId (required)
 * - paymentType (optional: 'level'|'receipt')
 * - description (optional)
 * - method, date (optional)
 */
export async function paySelectedMonths(req, res) {
  try {
    const { studentId, months, academicYearId, classId, accountId, paymentType, description, method: clientMethod, date: clientDate, reference } = req.body;

    if (!studentId) return res.status(400).json({ message: 'studentId is required (SHOW)' });

    let finalStudentId = studentId;
    if (!isValidObjectId(studentId)) {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      finalStudentId = student._id;
    }

    if (!Array.isArray(months) || months.length === 0) {
      return res.status(400).json({ message: 'months is required (array of YYYY-MM, or array of { month, amount })' });
    }

    const rawAllocations = months
      .map((m) => {
        if (typeof m === 'string' || typeof m === 'number') {
          return { month: String(m).trim(), amount: null };
        }
        if (m && typeof m === 'object') {
          return { month: String(m.month || '').trim(), amount: m.amount ?? null };
        }
        return { month: '', amount: null };
      })
      .filter(a => !!a.month);

    if (!rawAllocations.length) {
      return res.status(400).json({ message: 'months is required (array of YYYY-MM, or array of { month, amount })' });
    }

    const byMonth = new Map();
    for (const a of rawAllocations) {
      if (!/^\d{4}-\d{2}$/.test(a.month)) return res.status(400).json({ message: 'Each month must be YYYY-MM' });
      // last wins if duplicates
      byMonth.set(a.month, a);
    }
    const uniqueMonths = Array.from(byMonth.keys());

    const nowMonth = new Date().toISOString().slice(0, 7);
    // Hormaris: paying ahead of current month
    const nonHormaris = uniqueMonths.filter(m => m <= nowMonth);
    if (nonHormaris.length) {
      return res.status(400).json({ message: `Hormaris months must be after current month (${nowMonth}). Invalid: ${nonHormaris.join(', ')}` });
    }

    if (!accountId || !isValidObjectId(accountId)) return res.status(400).json({ message: 'accountId is required' });

    const Account = (await import('../../models/Account.js')).default;
    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const groupId = new mongoose.Types.ObjectId();
    const method = (clientMethod && String(clientMethod).trim()) ? String(clientMethod).trim() : guessMethodFromAccount(account);
    const parsedDate = clientDate ? new Date(clientDate) : null;
    const txDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : undefined;

    let totalPaid = 0;
    const created = [];

    // Deterministic ordering
    uniqueMonths.sort();

    const normalizedAllocations = [];

    for (const month of uniqueMonths) {
      const range = parseMonthRange(String(month));
      if (!range) return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });

      const invoiceQuery = {
        student: finalStudentId,
        status: { $ne: 'Cancelled' },
        $or: [
          { billingMonth: String(month) },
          { billingMonth: { $exists: false }, dueDate: { $gte: range.start, $lt: range.endExclusive } },
          { billingMonth: null, dueDate: { $gte: range.start, $lt: range.endExclusive } },
        ],
      };
      if (academicYearId) invoiceQuery.academicYear = academicYearId;
      if (classId) invoiceQuery.class = classId;

      const invoices = await FeeInvoice.find(invoiceQuery).sort({ dueDate: 1, createdAt: 1 });
      if (!invoices.length) continue;

      const openInvoices = invoices.filter(i => Number(i.balance || 0) > 0);
      const totalBalance = openInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
      if (totalBalance <= 0) continue;

      const requested = byMonth.get(month);
      const requestedAmtRaw = requested ? requested.amount : null;
      const requestedAmt = requestedAmtRaw == null || requestedAmtRaw === '' ? null : Number(requestedAmtRaw);

      let monthPayAmount = totalBalance;
      if (requestedAmt != null) {
        if (!Number.isFinite(requestedAmt) || requestedAmt <= 0) {
          return res.status(400).json({ message: `Invalid amount for ${month}. Must be > 0` });
        }
        monthPayAmount = round2(requestedAmt);
      }

      if (monthPayAmount > totalBalance) {
        return res.status(400).json({ message: `Amount exceeds balance for ${month}` });
      }

      normalizedAllocations.push({ month, requestedAmount: requestedAmt == null ? null : monthPayAmount, paidAmount: monthPayAmount, monthBalance: round2(totalBalance) });

      let remaining = monthPayAmount;
      for (const inv of openInvoices) {
        if (remaining <= 0) break;
        const pay = Math.min(remaining, Number(inv.balance || 0));
        if (pay <= 0) continue;

        inv.paidAmount += pay;
        if (!inv.billingMonth) inv.billingMonth = String(month);
        if (typeof inv.isHormaris !== 'boolean') inv.isHormaris = true;
        if (inv.isHormaris !== true) inv.isHormaris = true;
        await inv.save();

        const tx = await FeeTransaction.create({
          invoice: inv._id,
          student: inv.student,
          account: account._id,
          amount: pay,
          method,
          transactionType: 'Payment',
          reference: reference ? String(reference).trim() : null,
          remarks: description || `Hormaris payment for ${month}`,
          recordedBy: req.user?._id,
          paymentGroup: groupId,
          ...(txDate ? { date: txDate } : {}),
        });

        created.push(tx);
        totalPaid += pay;
        remaining -= pay;
      }
    }

    if (totalPaid <= 0) return res.status(400).json({ message: 'Selected months have no outstanding balance to pay' });

    account.balance += totalPaid;
    await account.save();

    res.status(201).json({
      paymentGroupId: groupId,
      totals: { amount: totalPaid, method, account: { _id: account._id, name: account.name, type: account.type } },
      transactions: created.map(t => ({ _id: t._id, invoice: t.invoice, amount: t.amount, date: t.date })),
      months: uniqueMonths,
      allocations: normalizedAllocations,
      print: { mode: paymentType === 'level' ? 'level' : 'receipt', paymentGroupId: groupId },
    });
  } catch (error) {
    console.error('paySelectedMonths Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * History for a student.
 */
export async function getStudentMonthHistory(req, res) {
  try {
    const { studentId, academicYearId } = req.query;
    if (!studentId) return res.status(400).json({ message: 'studentId is required (SHOW)' });

    let finalStudentId = studentId;
    if (!isValidObjectId(studentId)) {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      finalStudentId = student._id;
    }

    const invoiceQuery = { student: finalStudentId, status: { $ne: 'Cancelled' } };
    if (academicYearId) invoiceQuery.academicYear = academicYearId;

    const invoices = await FeeInvoice.find(invoiceQuery)
      .populate('class', 'section')
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
      .sort({ date: 1 });

    const buckets = new Map();
    for (const inv of invoices) {
      const month = monthFromInvoice(inv);
      if (!month) continue;
      const key = `${month}__${String(inv.academicYear?._id || 'na')}__${String(inv.class?._id || 'na')}`;
      if (!buckets.has(key)) {
        buckets.set(key, {
          month,
          academicYear: inv.academicYear || null,
          class: inv.class || null,
          description: inv.title,
          amountTypes: new Set(),
          amount: 0,
          paid: 0,
          balance: 0,
          discount: 0,
          invoiceIds: [],
          paymentGroups: new Map(),
        });
      }
      const b = buckets.get(key);
      b.amount += Number(inv.amount || 0);
      b.paid += Number(inv.paidAmount || 0);
      b.balance += Number(inv.balance || 0);
      b.discount += (inv.discounts || []).reduce((s, d) => s + (d.amountOff || 0), 0);
      b.invoiceIds.push(inv._id);

      for (const item of inv.items || []) {
        const label = item?.category?.name || item?.name;
        if (label) b.amountTypes.add(label);
      }
    }

    for (const b of buckets.values()) {
      const relevantPayments = payments.filter(p => b.invoiceIds.some(id => String(id) === String(p.invoice)));
      for (const p of relevantPayments) {
        const groupId = p.paymentGroup ? String(p.paymentGroup) : String(p._id);
        if (!b.paymentGroups.has(groupId)) {
          b.paymentGroups.set(groupId, {
            paymentGroupId: p.paymentGroup || p._id,
            date: p.date,
            account: p.account || null,
            method: p.method,
            totalPaid: 0,
            transactionIds: [],
          });
        }
        const g = b.paymentGroups.get(groupId);
        g.totalPaid += Number(p.amount || 0);
        g.transactionIds.push(p._id);
      }
    }

    const rows = Array.from(buckets.values())
      .map(b => ({
        id: `${b.month}_${String(b.academicYear?._id || 'na')}_${String(b.class?._id || 'na')}`,
        month: b.month,
        academicYear: b.academicYear,
        class: b.class,
        description: b.description,
        amountType: Array.from(b.amountTypes).join(', '),
        amount: Number(b.amount || 0),
        discount: Number(b.discount || 0),
        paid: Number(b.paid || 0),
        balance: Number(b.balance || 0),
        paymentGroups: Array.from(b.paymentGroups.values()).sort((a, c) => new Date(a.date) - new Date(c.date)),
      }))
      .filter(r => r.paid > 0)
      .sort((a, b) => (a.month || '').localeCompare(b.month || ''));

    res.json({ studentId: finalStudentId, academicYearId: academicYearId || null, rows });
  } catch (error) {
    console.error('getStudentMonthHistory Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Apply fixed discount.
 */
export async function discountChargedMonth(req, res) {
  try {
    const { studentId, month, academicYearId, classId, discountAmount, discountName } = req.body;

    if (!studentId) return res.status(400).json({ message: 'studentId is required (SHOW)' });

    let finalStudentId = studentId;
    if (!isValidObjectId(studentId)) {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      finalStudentId = student._id;
    }

    if (!month || !/^\d{4}-\d{2}$/.test(String(month))) return res.status(400).json({ message: 'month is required (YYYY-MM)' });

    const amt = Number(discountAmount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'discountAmount must be > 0' });

    const range = parseMonthRange(String(month));
    if (!range) return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });

    const invoiceQuery = {
      student: finalStudentId,
      status: { $ne: 'Cancelled' },
      $or: [
        { billingMonth: String(month) },
        { billingMonth: { $exists: false }, dueDate: { $gte: range.start, $lt: range.endExclusive } },
        { billingMonth: null, dueDate: { $gte: range.start, $lt: range.endExclusive } },
      ],
    };
    if (academicYearId) invoiceQuery.academicYear = academicYearId;
    if (classId) invoiceQuery.class = classId;

    const invoices = await FeeInvoice.find(invoiceQuery).sort({ dueDate: 1, createdAt: 1 });
    if (!invoices.length) return res.status(404).json({ message: 'No charged invoices found for this student/month' });

    if (invoices.some(i => i.isWaived)) return res.status(400).json({ message: 'Cannot discount a waived/free invoice.' });
    if (invoices.some(i => Number(i.paidAmount || 0) > 0)) {
      return res.status(400).json({ message: 'Cannot discount after payments.' });
    }

    const openInvoices = invoices.filter(i => Number(i.balance || 0) > 0);
    const totalBalance = openInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);
    if (totalBalance <= 0) return res.status(400).json({ message: 'No balance to discount' });
    if (amt > totalBalance) return res.status(400).json({ message: 'Discount exceeds month balance' });

    let remaining = round2(amt);
    const baseName = String(discountName || 'Monthly Discount').trim() || 'Monthly Discount';

    const allocations = openInvoices.map((inv) => ({
      invoice: inv,
      share: totalBalance > 0 ? (Number(inv.balance || 0) / totalBalance) : 0,
      amountOff: 0,
    }));

    for (const a of allocations) {
      if (remaining <= 0) break;
      const raw = round2(amt * a.share);
      const cap = round2(Number(a.invoice.balance || 0));
      const off = Math.min(cap, raw, remaining);
      a.amountOff = off;
      remaining = round2(remaining - off);
    }

    for (const a of allocations) {
      if (!a.amountOff || a.amountOff <= 0) continue;
      const inv = a.invoice;
      inv.discounts = (inv.discounts || []).filter(d => d.name !== baseName);
      inv.discounts.push({ name: baseName, type: 'fixed', value: a.amountOff, amountOff: a.amountOff });
      if (!inv.billingMonth) inv.billingMonth = String(month);
      await inv.save();
    }

    res.json({ message: 'Discount applied', totals: { discountApplied: round2(amt - remaining) } });
  } catch (error) {
    console.error('discountChargedMonth Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Edit a month payment group safely.
 */
export async function editPaymentGroup(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { paymentGroupId, accountId, amount, paymentType, description } = req.body;
    if (!paymentGroupId || !isValidObjectId(String(paymentGroupId))) return res.status(400).json({ message: 'paymentGroupId is required' });
    if (!accountId || !isValidObjectId(String(accountId))) return res.status(400).json({ message: 'accountId is required' });
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'amount must be > 0' });

    const Account = (await import('../../models/Account.js')).default;
    const newAccount = await Account.findById(accountId).session(session);
    if (!newAccount) return res.status(404).json({ message: 'Account not found' });

    const groupObjectId = new mongoose.Types.ObjectId(String(paymentGroupId));
    const oldTxs = await FeeTransaction.find({
      paymentGroup: groupObjectId,
      transactionType: 'Payment',
      status: 'Completed',
    }).session(session);

    if (!oldTxs.length) return res.status(404).json({ message: 'Payment group not found' });

    const invoiceIds = Array.from(new Set(oldTxs.map(t => String(t.invoice)).filter(Boolean))).map(id => new mongoose.Types.ObjectId(id));
    const invoices = await FeeInvoice.find({ _id: { $in: invoiceIds } }).session(session);
    if (!invoices.length) return res.status(404).json({ message: 'No invoices found' });

    const firstInv = invoices[0];
    const studentId = String(firstInv.student);
    const month = monthFromInvoice(firstInv);
    if (!month) return res.status(400).json({ message: 'Cannot infer month' });
    const academicYearId = firstInv.academicYear ? String(firstInv.academicYear) : null;
    const classId = firstInv.class ? String(firstInv.class) : null;

    let reversedTotal = 0;
    for (const tx of oldTxs) {
      const inv = invoices.find(i => String(i._id) === String(tx.invoice));
      if (inv) {
        inv.paidAmount = Math.max(0, round2(Number(inv.paidAmount || 0) - Number(tx.amount || 0)));
        await inv.save({ session });
      }
      tx.status = 'Reversed';
      await tx.save({ session });
      reversedTotal = round2(reversedTotal + Number(tx.amount || 0));
    }

    const range = parseMonthRange(String(month));
    const invoiceQuery = {
      student: studentId,
      status: { $ne: 'Cancelled' },
      $or: [
        { billingMonth: String(month) },
        { billingMonth: { $exists: false }, dueDate: { $gte: range.start, $lt: range.endExclusive } },
      ],
    };
    if (academicYearId) invoiceQuery.academicYear = academicYearId;
    if (classId) invoiceQuery.class = classId;

    const monthInvoices = await FeeInvoice.find(invoiceQuery).sort({ dueDate: 1, createdAt: 1 }).session(session);
    const openInvoices = monthInvoices.filter(i => Number(i.balance || 0) > 0);
    const totalBalance = openInvoices.reduce((sum, i) => sum + Number(i.balance || 0), 0);
    if (amt > totalBalance) return res.status(400).json({ message: 'Amount exceeds month balance' });

    const newGroupId = new mongoose.Types.ObjectId();
    const method = guessMethodFromAccount(newAccount);
    let remaining = amt;
    for (const inv of openInvoices) {
      if (remaining <= 0) break;
      const pay = Math.min(remaining, Number(inv.balance || 0));
      inv.paidAmount += pay;
      await inv.save({ session });

      await FeeTransaction.create([{
        invoice: inv._id,
        student: inv.student,
        account: newAccount._id,
        amount: pay,
        method,
        transactionType: 'Payment',
        recordedBy: req.user?._id,
        paymentGroup: newGroupId,
      }], { session });
      remaining -= pay;
    }

    newAccount.balance = round2(Number(newAccount.balance || 0) + amt);
    await newAccount.save({ session });

    await session.commitTransaction();
    res.status(200).json({ message: 'Payment group updated', paymentGroupId: newGroupId });
  } catch (error) {
    try { await session.abortTransaction(); } catch { /* ignore */ }
    console.error('editPaymentGroup Error:', error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
}

/**
 * Revert (void) a payment group (or a single payment if no group).
 * This rolls back invoice paidAmount and account balances, and marks transactions as Reversed.
 * Body:
 * - paymentGroupId: ObjectId (required)
 * - reason: string (optional)
 */
export async function revertPaymentGroup(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { paymentGroupId, reason } = req.body;
    if (!paymentGroupId || !isValidObjectId(String(paymentGroupId))) {
      return res.status(400).json({ message: 'paymentGroupId is required' });
    }

    const Account = (await import('../../models/Account.js')).default;
    const groupObjectId = new mongoose.Types.ObjectId(String(paymentGroupId));

    const txs = await FeeTransaction.find({
      transactionType: 'Payment',
      status: 'Completed',
      $or: [{ paymentGroup: groupObjectId }, { _id: groupObjectId }],
    }).session(session);

    if (!txs.length) return res.status(404).json({ message: 'Payment group not found' });

    const invoiceIds = Array.from(new Set(txs.map(t => String(t.invoice)).filter(Boolean)))
      .map(id => new mongoose.Types.ObjectId(id));
    const invoices = await FeeInvoice.find({ _id: { $in: invoiceIds } }).session(session);

    let reversedTotal = 0;
    const accountDeltas = new Map();

    for (const tx of txs) {
      const inv = invoices.find(i => String(i._id) === String(tx.invoice));
      if (inv) {
        inv.paidAmount = Math.max(0, round2(Number(inv.paidAmount || 0) - Number(tx.amount || 0)));
        await inv.save({ session });
      }

      const accId = tx.account ? String(tx.account) : null;
      if (accId) {
        accountDeltas.set(accId, round2(Number(accountDeltas.get(accId) || 0) - Number(tx.amount || 0)));
      }

      tx.status = 'Reversed';
      if (reason) {
        const base = String(tx.remarks || '').trim();
        tx.remarks = base ? `${base} | Reverted: ${reason}` : `Reverted: ${reason}`;
      }
      await tx.save({ session });
      reversedTotal = round2(reversedTotal + Number(tx.amount || 0));
    }

    // Roll back account balances
    for (const [accId, delta] of accountDeltas.entries()) {
      if (!delta) continue;
      const acc = await Account.findById(accId).session(session);
      if (!acc) continue;
      acc.balance = round2(Number(acc.balance || 0) + delta);
      await acc.save({ session });
    }

    await session.commitTransaction();
    res.status(200).json({ message: 'Payment reverted', reversedTotal });
  } catch (error) {
    try { await session.abortTransaction(); } catch { /* ignore */ }
    console.error('revertPaymentGroup Error:', error);
    res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
}
