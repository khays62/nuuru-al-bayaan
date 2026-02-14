import FeeInvoice from '../../models/FeeInvoice.js';
import FinanceCategory from '../../models/FinanceCategory.js';
import Student from '../../models/Student.js';
import AuditLog from '../../models/AuditLog.js';
import { publishRealtime } from '../../utils/realtimeBus.js';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

function monthToDueDate(month) {
  // month: YYYY-MM -> dueDate at end of that month
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0); // last day of previous month (i.e. current month)
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function monthVariants(month) {
  const raw = String(month || '');
  const match = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return [raw];

  const year = match[1];
  const monthNum = Number(match[2]);
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return [raw];

  const padded = `${year}-${String(monthNum).padStart(2, '0')}`;
  const unpadded = `${year}-${monthNum}`;
  return padded === unpadded ? [padded] : [padded, unpadded];
}

function normalizeMonth(month) {
  const raw = String(month || '');
  const match = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;

  const year = match[1];
  const monthNum = Number(match[2]);
  if (!Number.isFinite(monthNum) || monthNum < 1 || monthNum > 12) return null;

  return `${year}-${String(monthNum).padStart(2, '0')}`;
}

async function resolveTargetStudents({ chargeType, classId, studentId }) {
  const Enrollment = (await import('../../models/Enrollment.js')).default;

  if (chargeType === 'single') {
    if (!studentId) throw new Error('studentId is required for single charge (CHARGE)');

    let student;
    if (isValidObjectId(studentId)) {
      student = await Student.findById(studentId).select('_id isFree overallDiscount');
    } else {
      student = await Student.findOne({ studentId: studentId }).select('_id isFree overallDiscount');
    }

    if (!student) throw new Error('Student not found');

    let resolvedClassId = classId || null;
    if (!resolvedClassId) {
      const enrollment = await Enrollment.findOne({ student: student._id, status: 'active' }).select('gradeSection');
      resolvedClassId = enrollment?.gradeSection || null;
    }

    return [{
      studentId: student._id,
      classId: resolvedClassId,
      isFree: !!student.isFree,
      overallDiscount: student.overallDiscount
    }];
  }

  // class-based (bulk)
  if (chargeType === 'class') {
    if (!classId || !isValidObjectId(classId)) throw new Error('classId is required for class charge');
    const enrollments = await Enrollment.find({ gradeSection: classId, status: 'active' })
      .populate('student', '_id isFree overallDiscount');
    return enrollments
      .filter(e => e.student)
      .map(e => ({
        studentId: e.student._id,
        classId,
        isFree: !!e.student.isFree,
        overallDiscount: e.student.overallDiscount
      }));
  }

  // all students (bulk)
  if (chargeType === 'all') {
    const query = classId ? { gradeSection: classId, status: 'active' } : { status: 'active' };
    const enrollments = await Enrollment.find(query).populate('student', '_id isFree overallDiscount');
    return enrollments
      .filter(e => e.student)
      .map(e => ({
        studentId: e.student._id,
        classId: e.gradeSection,
        isFree: !!e.student.isFree,
        overallDiscount: e.student.overallDiscount
      }));
  }

  throw new Error('Invalid chargeType. Use: all | single | class');
}

/**
 * Charge fees (creates invoices)
 * Body:
 * - chargeType: all|single|class (required)
 * - classId: GradeSection (optional for all/single; required for class)
 * - studentId: required for single
 * - academicYearId: optional
 * - month: YYYY-MM (required unless months[] provided)
 * - months: YYYY-MM[] (optional)
 * - categoryId: FinanceCategory (required)
 * - feeType: personal|free (required)
 * - amount: number (optional; defaults to category.defaultAmount)
 */
export async function chargeStudentFees(req, res) {
  try {
    const { chargeType, classId, studentId, academicYearId, month, months, categoryId, feeType, amount } = req.body;

    if (!chargeType) return res.status(400).json({ message: 'chargeType is required' });
    if (!categoryId || !isValidObjectId(categoryId)) return res.status(400).json({ message: 'categoryId is required' });
    if (!feeType || !['personal', 'free'].includes(String(feeType).toLowerCase())) {
      return res.status(400).json({ message: 'feeType must be personal or free' });
    }

    const monthListRaw = Array.isArray(months) ? months : (month ? [month] : []);
    const monthList = Array.from(
      new Set(
        monthListRaw
          .map(m => normalizeMonth(m))
          .filter(Boolean)
      )
    );

    if (monthList.length === 0) {
      return res.status(400).json({ message: 'month is required (YYYY-MM) or months[] must contain at least one valid month' });
    }

    const dueDateByMonth = new Map();
    for (const m of monthList) {
      const dd = monthToDueDate(m);
      if (!dd) return res.status(400).json({ message: 'Invalid month format. Expected YYYY-MM' });
      dueDateByMonth.set(m, dd);
    }
    if (academicYearId && !isValidObjectId(academicYearId)) return res.status(400).json({ message: 'Invalid academicYearId' });
    if (classId && !isValidObjectId(classId)) return res.status(400).json({ message: 'Invalid classId' });

    const category = await FinanceCategory.findById(categoryId);
    if (!category) return res.status(404).json({ message: 'Amount type (category) not found' });
    if (category.type !== 'fee') return res.status(400).json({ message: 'categoryId must be a fee type' });
    if (category.status && category.status !== 'active') {
      return res.status(400).json({ message: 'This amount type is inactive and cannot be used for new charges' });
    }

    const resolvedAmount = amount !== undefined && amount !== null ? Number(amount) : Number(category.defaultAmount || 0);
    if (!Number.isFinite(resolvedAmount) || resolvedAmount < 0) return res.status(400).json({ message: 'Invalid amount' });

    const targets = await resolveTargetStudents({ chargeType, classId, studentId });
    if (targets.length === 0) return res.status(404).json({ message: 'No active students found to charge' });

    const createdMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const allMonthVariants = monthList.flatMap(m => monthVariants(m));

    // Dedup rule: for the same student + month + category, allow only one invoice.
    const studentIds = targets.map(t => t.studentId);
    const existing = await FeeInvoice.find({
      student: { $in: studentIds },
      billingMonth: { $in: allMonthVariants },
      'items.category': categoryId,
      status: { $ne: 'Cancelled' },
    }).select('student billingMonth status paidAmount');

    const existingKeys = new Set(
      existing
        .map(e => {
          const bm = normalizeMonth(e.billingMonth);
          if (!bm) return null;
          return `${String(e.student)}|${bm}`;
        })
        .filter(Boolean)
    );

    const paidKeys = new Set(
      existing
        .filter(e => (e.status === 'Paid') || Number(e.paidAmount || 0) > 0)
        .map(e => {
          const bm = normalizeMonth(e.billingMonth);
          if (!bm) return null;
          return `${String(e.student)}|${bm}`;
        })
        .filter(Boolean)
    );

    const toCreate = [];
    let skippedPaid = 0;
    for (const t of targets) {
      for (const m of monthList) {
        const key = `${String(t.studentId)}|${m}`;
        if (paidKeys.has(key)) {
          skippedPaid += 1;
          continue;
        }
        if (existingKeys.has(key)) continue;

        // Apply permanent discount if applicable
        let studentDiscount = 0;
        if (t.overallDiscount && t.overallDiscount.amount > 0) {
          if (t.overallDiscount.type === 'percentage') {
            studentDiscount = (resolvedAmount * t.overallDiscount.amount) / 100;
          } else {
            studentDiscount = t.overallDiscount.amount;
          }
        }

        const waived = String(feeType).toLowerCase() === 'free' || t.isFree;
        const title = `${category.name} ${m}`;
        const isHormarisCharge = m > createdMonth;
        // IMPORTANT: insertMany() does NOT run pre-save hooks, so we must compute final math here.
        const netAmount = Math.max(0, resolvedAmount - studentDiscount);
        const finalBalance = waived ? 0 : netAmount;

        toCreate.push({
          student: t.studentId,
          class: t.classId,
          academicYear: academicYearId || undefined,
          billingMonth: m,
          title,
          items: [{ name: category.name, amount: resolvedAmount, category: categoryId }],
          discounts: studentDiscount > 0 ? [{
            name: 'Permanent Scholarship',
            type: t.overallDiscount.type,
            value: t.overallDiscount.amount,
            amountOff: studentDiscount
          }] : [],
          isWaived: waived,
          waiverReason: waived ? 'Free Student / Scholarship' : undefined,
          isHormaris: isHormarisCharge,
          dueDate: dueDateByMonth.get(m),
          amount: netAmount,
          // Free/Waived means zero payable, NOT a fake payment.
          paidAmount: 0,
          balance: finalBalance,
          status: waived ? 'Paid' : (finalBalance === 0 ? 'Paid' : 'Unpaid'),
          createdBy: req.user._id,
        });
      }
    }

    if (toCreate.length > 0) await FeeInvoice.insertMany(toCreate);

    if (toCreate.length === 0 && skippedPaid > 0) {
      return res.status(409).json({
        message: 'This month is already paid. Charging again isn’t allowed.',
        stats: {
          requested: targets.length * monthList.length,
          created: 0,
          skippedDuplicates: (targets.length * monthList.length) - skippedPaid,
          skippedPaid,
          months: monthList,
        },
      });
    }

    try {
      publishRealtime({ type: 'studentFinance:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    res.status(201).json({
      message: 'Charge process complete',
      stats: {
        requested: targets.length * monthList.length,
        created: toCreate.length,
        skippedDuplicates: (targets.length * monthList.length) - toCreate.length,
        skippedPaid,
        months: monthList,
      },
    });
  } catch (error) {
    console.error('chargeStudentFees Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Apply month-specific discount to a student's invoice.
 */
export async function applyMonthlyDiscount(req, res) {
  try {
    const { studentId, month, months, academicYearId, categoryId, discountAmount } = req.body;

    if (!studentId || discountAmount === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const monthListRaw = Array.isArray(months) ? months : (month ? [month] : []);
    const monthList = Array.from(new Set(monthListRaw.map(m => normalizeMonth(m)).filter(Boolean)));
    if (monthList.length === 0) {
      return res.status(400).json({ message: 'month is required (YYYY-MM) or months[] must contain at least one valid month' });
    }

    const amt = Number(discountAmount);
    if (!Number.isFinite(amt) || amt < 0) return res.status(400).json({ message: 'discountAmount must be >= 0' });

    let resolvedStudentId;
    if (isValidObjectId(studentId)) {
      resolvedStudentId = studentId;
    } else {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      resolvedStudentId = student._id;
    }

    const updated = [];
    const missingMonths = [];

    for (const m of monthList) {
      const query = {
        student: resolvedStudentId,
        billingMonth: { $in: monthVariants(m) },
        'items.category': categoryId,
        status: { $ne: 'Cancelled' },
      };
      if (academicYearId) query.academicYear = academicYearId;

      const invoice = await FeeInvoice.findOne(query);
      if (!invoice) {
        missingMonths.push(m);
        continue;
      }
      if (invoice.isWaived) return res.status(400).json({ message: `Cannot discount a waived/free invoice (${m})` });
      if (invoice.paidAmount > 0) return res.status(400).json({ message: `Cannot discount after payments (${m}).` });

      invoice.discounts = (invoice.discounts || []).filter(d => d.name !== 'Monthly Discount');
      if (amt > 0) {
        invoice.discounts.push({
          name: 'Monthly Discount',
          type: 'fixed',
          value: amt,
          amountOff: amt,
        });
      }

      await invoice.save();
      updated.push(m);
    }

    if (updated.length === 0) return res.status(404).json({ message: 'Invoice not found', missingMonths });

    try {
      publishRealtime({ type: 'studentFinance:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    return res.json({
      message: 'Discount applied',
      updatedCount: updated.length,
      updatedMonths: updated,
      missingMonths,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Apply bulk discount to active invoices based on criteria.
 */
export async function applyBulkDiscount(req, res) {
  try {
    const { academicYear, month, amountTypeId, discountType, discountValue } = req.body;

    if (!month || !amountTypeId || !discountValue) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const query = {
      billingMonth: month,
      'items.category': amountTypeId,
      status: { $ne: 'Cancelled' },
      paidAmount: 0 // ERP rule: Only discount unpaid invoices
    };
    if (academicYear) query.academicYear = academicYear;

    const invoices = await FeeInvoice.find(query);
    if (invoices.length === 0) return res.status(404).json({ message: 'No eligible invoices found' });

    for (const inv of invoices) {
      // Calculate discount
      let amtOff = Number(discountValue);
      if (discountType === 'percentage') {
        amtOff = (inv.amount * amtOff) / 100;
      }

      inv.discounts = (inv.discounts || []).filter(d => d.name !== 'Bulk Discount');
      inv.discounts.push({
        name: 'Bulk Discount',
        type: discountType || 'fixed',
        value: Number(discountValue),
        amountOff: amtOff
      });
      // Pre-save hook expected to recalc balance and status
      await inv.save();
    }

    try {
      publishRealtime({ type: 'studentFinance:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    res.json({ message: `Bulk discount applied to ${invoices.length} invoices` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Record a correction (amount adjustment) for a specific student's invoice.
 */
export async function recordCorrection(req, res) {
  try {
    const { studentId, amountTypeId, amount, month } = req.body;

    if (!studentId || !amountTypeId || amount === undefined) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const query = {
      billingMonth: month,
      'items.category': amountTypeId,
      status: { $ne: 'Cancelled' }
    };
    if (isValidObjectId(studentId)) {
      query.student = studentId;
    } else {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      query.student = student._id;
    }

    const invoice = await FeeInvoice.findOne(query);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Update amount directly (Correction)
    invoice.amount = Number(amount);
    // Recalc balance manually if needed or let pre-save handle it if implemented
    invoice.balance = Math.max(0, invoice.amount - invoice.paidAmount);
    if (invoice.balance === 0 && invoice.amount > 0) invoice.status = 'Paid';
    else if (invoice.paidAmount > 0) invoice.status = 'Partial';
    else invoice.status = 'Unpaid';

    await invoice.save();

    try {
      publishRealtime({ type: 'studentFinance:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    res.json({ message: 'Correction recorded', invoice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Delete charges (invoices) safely (SOFT DELETE).
 */
export async function deleteMonthlyCharges(req, res) {
  try {
    const { scope, month, months, academicYear, amountTypeId, classId, studentId, date, reason } = req.body;

    const monthListRaw = Array.isArray(months) ? months : (month ? [month] : []);
    const monthList = Array.from(new Set(monthListRaw.map(m => normalizeMonth(m)).filter(Boolean)));
    if (monthList.length === 0) return res.status(400).json({ message: 'Billing month is required (YYYY-MM) or months[] must contain at least one valid month' });

    const allMonthVariants = Array.from(new Set(monthList.flatMap(m => monthVariants(m))));

    const query = {
      billingMonth: { $in: allMonthVariants },
      status: { $ne: 'Cancelled' }
    };

    if (date) {
      const start = new Date(date);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ message: 'Invalid created date' });
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    if (amountTypeId) query['items.category'] = amountTypeId;
    if (academicYear) query.academicYear = academicYear;

    if (scope === 'single' && studentId) {
      if (isValidObjectId(studentId)) {
        query.student = studentId;
      } else {
        const student = await Student.findOne({ studentId: studentId });
        if (!student) return res.status(404).json({ message: 'Student not found' });
        query.student = student._id;
      }
    } else if (scope === 'class' && classId) {
      query.class = classId;
    }

    // ERP safety: check for payments
    const withPayments = await FeeInvoice.countDocuments({ ...query, paidAmount: { $gt: 0 } });
    if (withPayments > 0) {
      return res.status(400).json({
        message: 'Cannot delete charges that have payments. Revert payments first.',
        withPayments
      });
    }

    // SOFT DELETE
    const result = await FeeInvoice.updateMany(query, { $set: { status: 'Cancelled' } });

    await AuditLog.create({
      user: req.user._id,
      action: 'CANCEL_CHARGES',
      targetModel: 'Invoice',
      changes: {
        before: { status: 'Unpaid/Partial/Overdue' },
        after: { status: 'Cancelled' },
        criteria: {
          scope: scope || 'all',
          studentId: scope === 'single' ? studentId : null,
          classId: scope === 'class' ? classId : null,
          amountTypeId: amountTypeId || null,
          months: monthList,
          date: date || null,
          academicYear: academicYear || null,
        },
        cancelledCount: result.modifiedCount || 0,
      },
      description: `Charges cancelled: ${reason || 'Manual undo'}`,
    });

    try {
      publishRealtime({ type: 'studentFinance:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    res.json({ message: 'Charges Cancelled (Soft Deleted)', cancelledCount: result.modifiedCount || 0 });
  } catch (error) {
    console.error('deleteMonthlyCharges Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * ERP-Grade: Update Charge Amount (Correction Path)
 * Preserves paid history, recalcs balance, logs audit.
 */
export async function updateChargeAmount(req, res) {
  try {
    const { studentId, categoryId, amount, month, months, reason } = req.body;

    if (!studentId || !categoryId || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields for correction' });
    }

    const monthListRaw = Array.isArray(months) ? months : (month ? [month] : []);
    const monthList = Array.from(new Set(monthListRaw.map(m => normalizeMonth(m)).filter(Boolean)));
    if (monthList.length === 0) {
      return res.status(400).json({ message: 'month is required (YYYY-MM) or months[] must contain at least one valid month' });
    }

    let resolvedStudentId;
    if (isValidObjectId(studentId)) {
      resolvedStudentId = studentId;
    } else {
      const student = await Student.findOne({ studentId: studentId });
      if (!student) return res.status(404).json({ message: 'Student not found' });
      resolvedStudentId = student._id;
    }

    const updated = [];
    const missingMonths = [];

    for (const m of monthList) {
      const query = {
        student: resolvedStudentId,
        billingMonth: { $in: monthVariants(m) },
        'items.category': categoryId,
        status: { $ne: 'Cancelled' }
      };

      const invoice = await FeeInvoice.findOne(query);
      if (!invoice) {
        missingMonths.push(m);
        continue;
      }

      // Snapshot BEFORE
      const snapshotBefore = JSON.parse(JSON.stringify(invoice));

      // Logic: Correct the first item that matches category
      const itemIndex = invoice.items.findIndex(i => String(i.category) === String(categoryId));
      if (itemIndex === -1) return res.status(404).json({ message: `Charge item not found in invoice (${m})` });

      const oldTotal = invoice.amount;
      const newAmount = Number(amount);

      // Update amount
      invoice.items[itemIndex].amount = newAmount;
      invoice.amount = invoice.items.reduce((sum, item) => sum + item.amount, 0);

      // Recalc balance (amount - discounts - paid)
      const discountsTotal = (invoice.discounts || []).reduce((sum, d) => sum + (d.amountOff || 0), 0);
      invoice.balance = Math.max(0, invoice.amount - discountsTotal - invoice.paidAmount);

      // Update status
      if (invoice.balance === 0 && invoice.amount > 0) invoice.status = 'Paid';
      else if (invoice.paidAmount > 0) invoice.status = 'Partial';
      else invoice.status = 'Unpaid';

      await invoice.save();

      // Log AUDIT
      await AuditLog.create({
        user: req.user._id,
        action: 'UPDATE_CHARGE_AMOUNT',
        targetId: invoice._id,
        targetModel: 'Invoice',
        changes: {
          before: { amount: oldTotal, balance: snapshotBefore.balance },
          after: { amount: invoice.amount, balance: invoice.balance }
        },
        description: `Charge amount correction (${m}): ${reason || 'Manual adjustment'}`
      });

      updated.push(m);
    }

    if (updated.length === 0) return res.status(404).json({ message: 'No active charge found for this criteria', missingMonths });

    try {
      publishRealtime({ type: 'studentFinance:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    return res.json({
      message: 'Charge corrected and balance updated',
      updatedCount: updated.length,
      updatedMonths: updated,
      missingMonths,
    });
  } catch (error) {
    console.error('updateChargeAmount Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * ERP-Grade: Apply Overall Discount (Profile Path)
 * Stored at student level, applies to future charges.
 */
export async function applyOverallDiscount(req, res) {
  try {
    const { studentId, discountType, discountValue, reason } = req.body;

    if (!studentId || discountValue === undefined) {
      return res.status(400).json({ message: 'studentId and discountValue are required' });
    }

    let student;
    if (isValidObjectId(studentId)) {
      student = await Student.findById(studentId);
    } else {
      student = await Student.findOne({ studentId });
    }

    if (!student) return res.status(404).json({ message: 'Student not found' });

    const snapshotBefore = { overallDiscount: student.overallDiscount };

    student.overallDiscount = {
      amount: Number(discountValue),
      type: discountType || 'fixed'
    };

    await student.save();

    // Log AUDIT
    await AuditLog.create({
      user: req.user._id,
      action: 'APPLY_OVERALL_DISCOUNT',
      targetId: student._id,
      targetModel: 'Student',
      changes: {
        before: snapshotBefore,
        after: { overallDiscount: student.overallDiscount }
      },
      description: `Permanent discount updated: ${reason || 'Scholarship/Grant'}`
    });

    try {
      publishRealtime({ type: 'studentFinance:changed', studentId: String(student._id), ts: Date.now() });
    } catch {
      // ignore
    }

    res.json({ message: 'Overall discount updated', student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
