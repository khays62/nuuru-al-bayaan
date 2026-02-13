import Payroll from '../../models/Payroll.js';
import Account from '../../models/Account.js';
import Expense from '../../models/Expense.js';
import User from '../../models/User.js';
import Teacher from '../../models/Teacher.js';
import bcrypt from 'bcryptjs';
import { getDefaultInitialPassword } from '../../utils/defaultPasswords.js';
import { publishRealtime } from '../../utils/realtimeBus.js';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
const isValidMonth = (value) => typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
const hasValidSalary = (staff) => Number(staff?.salary || 0) > 0;

const computeNetSalary = (payroll) => {
  const allowanceTotal = (payroll.allowances || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const deductionTotal = (payroll.deductions || []).reduce((sum, d) => sum + Number(d.amount || 0), 0);
  return (
    Number(payroll.basicSalary || 0) +
    allowanceTotal +
    Number(payroll.commission || 0) +
    Number(payroll.correction || 0) -
    Number(payroll.decrease || 0) -
    deductionTotal
  );
};

const ensureTeacherUsers = async () => {
  try {
    const teachers = await Teacher.find({ status: 'active' })
      .select('fullName teacherId email phone status salary')
      .lean();
    if (!teachers.length) return;

    const teacherIds = teachers.map(t => t._id);
    const existingUsers = await User.find({ teacherRef: { $in: teacherIds } })
      .select('teacherRef')
      .lean();
    const existingSet = new Set(existingUsers.map(u => String(u.teacherRef)));

    let hashed;
    try {
      hashed = await bcrypt.hash(getDefaultInitialPassword(), 10);
    } catch {
      return;
    }

    const buildAvailableUsername = async (base) => {
      const trimmed = String(base || '').trim();
      if (!trimmed) return null;
      let candidate = trimmed;
      let suffix = 1;
      while (await User.findOne({ username: candidate }).select('_id').lean()) {
        candidate = `${trimmed}-${suffix++}`;
        if (suffix > 20) return null;
      }
      return candidate;
    };

    const pickAvailableEmail = async (email) => {
      const value = String(email || '').trim();
      if (!value) return undefined;
      const conflict = await User.findOne({ email: value }).select('_id').lean();
      return conflict ? undefined : value;
    };

    const toCreate = [];
    for (const t of teachers) {
      if (existingSet.has(String(t._id))) continue;
      const username = await buildAvailableUsername(t.teacherId);
      if (!username) continue;
      const email = await pickAvailableEmail(t.email);

      toCreate.push({
        fullName: t.fullName,
        username,
        email,
        phone: t.phone || undefined,
        salary: Number(t.salary || 0),
        password: hashed,
        role: 'teacher',
        teacherRef: t._id,
        mustChangePassword: true,
        status: t.status || 'active',
      });
    }

    if (toCreate.length) {
      await User.insertMany(toCreate);
    }
  } catch {
    // best-effort
  }
};

/**
 * Payroll Charge (creates payroll drafts)
 * Body:
 * - chargeType: all|single (required)
 * - month: YYYY-MM (required)
 * - academicYear: AcademicYear ObjectId (required)
 * - staffId: required for single
 */
export async function chargePayroll(req, res) {
  try {
    const { chargeType, month, academicYear, staffId, amount } = req.body;

    if (amount !== undefined && amount !== null && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      return res.status(400).json({ message: 'amount must be greater than 0' });
    }

    if (!month || !isValidMonth(month)) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    if (!academicYear || !isValidObjectId(academicYear)) return res.status(400).json({ message: 'academicYear is required' });
    if (!chargeType || !['all', 'single'].includes(chargeType)) return res.status(400).json({ message: 'chargeType must be all or single' });
    if (chargeType === 'single' && (!staffId || !isValidObjectId(staffId))) return res.status(400).json({ message: 'staffId is required for single charge' });

    await ensureTeacherUsers();
    const allTargets =
      chargeType === 'single'
        ? await User.find({ _id: staffId, status: 'active' })
        : await User.find({ status: 'active', role: { $in: ['admin', 'staff', 'teacher'] } });

    if (!allTargets.length) return res.status(404).json({ message: 'No active staff found for payroll charge' });

    // When charging ALL staff without an explicit amount override, skip staff with missing/zero salary.
    const shouldSkipNoSalary = chargeType === 'all' && (amount === undefined || amount === null);
    const skippedNoSalary = shouldSkipNoSalary ? allTargets.filter((s) => !hasValidSalary(s)) : [];
    const targetStaff = shouldSkipNoSalary ? allTargets.filter(hasValidSalary) : allTargets;

    if (!targetStaff.length) {
      return res.status(400).json({ message: 'No staff with a valid salary found for payroll charge' });
    }

    const existingPayrolls = await Payroll.find({ month, academicYear, staff: { $in: targetStaff.map(s => s._id) } }).select('staff');
    const existingStaffIds = new Set(existingPayrolls.map(p => String(p.staff)));

    const toCreate = targetStaff
      .filter(s => !existingStaffIds.has(String(s._id)))
      .map(s => {
        const payroll = {
          staff: s._id,
          academicYear,
          month,
          basicSalary: Number.isFinite(Number(amount)) ? Number(amount) : Number(s.salary || 0),
          allowances: [],
          deductions: [],
          commission: 0,
          decrease: 0,
          correction: 0,
          processedBy: req.user._id,
          status: 'Draft',
        };
        return { ...payroll, netSalary: computeNetSalary(payroll) };
      });

    if (toCreate.length === 0) return res.status(400).json({ message: 'Payroll already generated for the selected period/staff.' });

    const created = await Payroll.insertMany(toCreate);
    try {
      publishRealtime({ type: 'payroll:changed', ts: Date.now() });
    } catch { /* ignore */ }
    res.status(201).json({
      message: 'Payroll charge complete',
      stats: {
        requested: allTargets.length,
        eligible: targetStaff.length,
        skippedNoSalary: skippedNoSalary.length,
        created: created.length,
        skippedExisting: targetStaff.length - created.length,
      },
      academicYear,
      created,
    });
  } catch (error) {
    console.error('chargePayroll Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Payroll Full Payment (charge + pay in one step)
 * Body:
 * - scope: all|single (required)
 * - month: YYYY-MM (required)
 * - academicYear: AcademicYear ObjectId (required)
 * - staffId: required for single
 * - accountId (required)
 * - paymentMethod (optional)
 * - reference (optional)
 * - date (optional)
 */
export async function payrollFullPayment(req, res) {
  try {
    const { scope, month, academicYear, staffId, accountId, paymentMethod, reference, date, amount } = req.body;

    if (amount !== undefined && amount !== null && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      return res.status(400).json({ message: 'amount must be greater than 0' });
    }

    if (!month || !isValidMonth(month)) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    if (!academicYear || !isValidObjectId(academicYear)) return res.status(400).json({ message: 'academicYear is required' });
    if (!scope || !['all', 'single'].includes(scope)) return res.status(400).json({ message: 'scope must be all or single' });
    if (scope === 'single' && (!staffId || !isValidObjectId(staffId))) return res.status(400).json({ message: 'staffId is required for single' });
    if (!accountId || !isValidObjectId(accountId)) return res.status(400).json({ message: 'accountId is required' });

    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    await ensureTeacherUsers();
    const targetStaff =
      scope === 'single'
        ? await User.find({ _id: staffId, status: 'active' })
        : await User.find({ status: 'active', role: { $in: ['admin', 'staff', 'teacher'] } });

    if (!targetStaff.length) return res.status(404).json({ message: 'No active staff found for payroll charge' });

    // Allow missing salary values; they will be charged as 0 unless an amount is provided.

    await chargePayroll(
      { body: { chargeType: scope === 'all' ? 'all' : 'single', month, academicYear, staffId, amount }, user: req.user },
      { status: () => ({ json: () => null }), json: () => null }
    );

    const query = { month, academicYear, status: { $in: ['Draft', 'Approved'] } };
    if (scope === 'single') query.staff = staffId;

    const payrolls = await Payroll.find(query);
    if (!payrolls.length) return res.status(404).json({ message: 'No unpaid payroll records found for selected scope/month' });

    const total = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
    if (account.balance < total) {
      return res.status(400).json({
        code: 'FIN_INSUFFICIENT_FUNDS',
        message: "The account you selected doesn't have enough balance",
        required: total,
        available: account.balance,
      });
    }

    const paymentDate = date ? new Date(date) : new Date();
    if (Number.isNaN(paymentDate.getTime())) return res.status(400).json({ message: 'Invalid date' });

    account.balance -= total;
    await account.save();

    const updates = [];

    const staffIds = Array.from(new Set(payrolls.map((p) => String(p.staff)).filter(Boolean)));
    const staffUsers = await User.find({ _id: { $in: staffIds } }).select('name fullName username email');
    const staffNameById = new Map(
      staffUsers.map((u) => [
        String(u._id),
        String(u?.name || u?.fullName || u?.username || u?.email || u._id),
      ])
    );

    for (const payroll of payrolls) {
      payroll.status = 'Paid';
      payroll.paidAmount = Number(payroll.netSalary || 0);
      payroll.paymentDate = paymentDate;
      payroll.paymentMethod = paymentMethod;
      payroll.reference = reference;
      payroll.account = accountId;
      payroll.paymentSplits = [{ account: accountId, amount: Number(payroll.netSalary || 0), date: paymentDate }];
      updates.push(payroll.save());

      const staffLabel = staffNameById.get(String(payroll.staff)) || String(payroll.staff);

      updates.push(
        Expense.create({
          title: `Salary Payment - ${payroll.month}`,
          category: 'Salary',
          amount: payroll.netSalary,
          date: paymentDate,
          description: `Payroll full payment for staff: ${staffLabel}`,
          account: accountId,
          approvedBy: req.user._id,
          status: 'Approved',
        })
      );
    }
    await Promise.all(updates);

    try {
      publishRealtime({ type: 'payroll:changed', ts: Date.now() });
      publishRealtime({ type: 'accounts:changed', ts: Date.now() });
      publishRealtime({ type: 'expenses:changed', ts: Date.now() });
    } catch { /* ignore */ }

    res.json({ message: 'Full payment complete', month, academicYear, scope, count: payrolls.length, total });
  } catch (error) {
    console.error('payrollFullPayment Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Delete payroll charges by month
 * Body:
 * - deleteType: all|single
 * - month: YYYY-MM
 * - academicYear: AcademicYear ObjectId
 * - staffId (required for single)
 */
export async function deletePayrollCharges(req, res) {
  try {
    const { deleteType, month, academicYear, staffId } = req.body;

    if (!month || !isValidMonth(month)) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    if (!academicYear || !isValidObjectId(academicYear)) return res.status(400).json({ message: 'academicYear is required' });
    if (!deleteType || !['all', 'single'].includes(deleteType)) return res.status(400).json({ message: 'deleteType must be all or single' });
    if (deleteType === 'single' && (!staffId || !isValidObjectId(staffId))) return res.status(400).json({ message: 'staffId is required for single delete' });

    const query = { month, status: { $ne: 'Paid' } };
    if (academicYear && isValidObjectId(academicYear)) {
      query.$or = [
        { academicYear },
        { academicYear: { $exists: false } },
        { academicYear: null },
      ];
    }
    if (deleteType === 'single') query.staff = staffId;

    // Refund any recorded payments on non-paid payrolls (Draft/Approved) before deleting.
    const payrollsToDelete = await Payroll.find(query).select('account paidAmount netSalary status paymentSplits');
    if (!payrollsToDelete.length) {
      return res.status(404).json({
        code: 'PAYROLL_DELETE_NO_MATCH_UNPAID',
        message: 'No unpaid payroll charges found for the selected delete type/month/year',
      });
    }
    const refundsByAccount = new Map();
    let refundedTotal = 0;

    for (const p of payrollsToDelete) {
      const splits = Array.isArray(p.paymentSplits) ? p.paymentSplits : [];
      if (splits.length) {
        for (const s of splits) {
          const acc = s?.account?._id ? String(s.account._id) : (s?.account ? String(s.account) : null);
          const amt = Number(s?.amount || 0);
          if (!acc || amt <= 0) continue;
          refundsByAccount.set(acc, (refundsByAccount.get(acc) || 0) + amt);
          refundedTotal += amt;
        }
        continue;
      }

      // Legacy fallback: single account + paidAmount
      const paid = Number(p.paidAmount || 0);
      const refund = paid > 0 ? paid : 0;
      const acc = p.account ? String(p.account) : null;
      if (!acc || refund <= 0) continue;
      refundsByAccount.set(acc, (refundsByAccount.get(acc) || 0) + refund);
      refundedTotal += refund;
    }

    if (refundsByAccount.size) {
      const ops = Array.from(refundsByAccount.entries())
        .filter(([, v]) => Number(v) > 0)
        .map(([id, v]) => ({
          updateOne: {
            filter: { _id: id },
            update: { $inc: { balance: Number(v) } },
          },
        }));
      if (ops.length) await Account.bulkWrite(ops, { ordered: false });
    }

    const result = await Payroll.deleteMany(query);
    try {
      publishRealtime({ type: 'payroll:changed', ts: Date.now() });
      if (refundsByAccount.size) publishRealtime({ type: 'accounts:changed', ts: Date.now() });
    } catch { /* ignore */ }
    res.json({
      message: 'Payroll charges deleted',
      deletedCount: result.deletedCount || 0,
      refundedTotal,
      refundedAccounts: refundsByAccount.size,
    });
  } catch (error) {
    console.error('deletePayrollCharges Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Delete PAID payroll records (high risk / destructive)
 * Body:
 * - scope: all|single
 * - month: YYYY-MM
 * - academicYear: AcademicYear ObjectId
 * - staffId: required for single
 * - confirm: must equal 'DELETE_PAID'
 */
export async function deletePaidPayrolls(req, res) {
  try {
    const { scope, month, academicYear, staffId, confirm } = req.body || {};

    if (confirm !== 'DELETE_PAID') {
      return res.status(400).json({ message: 'Confirmation required to delete Paid payroll records' });
    }

    if (!month || !isValidMonth(month)) return res.status(400).json({ message: 'month is required (YYYY-MM)' });
    if (!academicYear || !isValidObjectId(academicYear)) return res.status(400).json({ message: 'academicYear is required' });
    if (!scope || !['all', 'single'].includes(scope)) return res.status(400).json({ message: 'scope must be all or single' });
    if (scope === 'single' && (!staffId || !isValidObjectId(staffId))) {
      return res.status(400).json({ message: 'staffId is required for single scope' });
    }

    const query = { month, academicYear, status: 'Paid' };
    if (scope === 'single') query.staff = staffId;

    const payrollsToDelete = await Payroll.find(query).select('account paidAmount netSalary status paymentSplits');
    if (!payrollsToDelete.length) {
      return res.status(404).json({
        code: 'PAYROLL_DELETE_NO_MATCH_PAID',
        message: 'No Paid payroll records found for the selected scope/month/year',
      });
    }
    const refundsByAccount = new Map();
    let refundedTotal = 0;

    for (const p of payrollsToDelete) {
      const splits = Array.isArray(p.paymentSplits) ? p.paymentSplits : [];
      if (splits.length) {
        for (const s of splits) {
          const acc = s?.account?._id ? String(s.account._id) : (s?.account ? String(s.account) : null);
          const amt = Number(s?.amount || 0);
          if (!acc || amt <= 0) continue;
          refundsByAccount.set(acc, (refundsByAccount.get(acc) || 0) + amt);
          refundedTotal += amt;
        }
        continue;
      }

      // Legacy fallback: single account + paidAmount/netSalary
      const paid = Number(p.paidAmount || 0);
      const net = Number(p.netSalary || 0);
      const refund = paid > 0 ? paid : (net > 0 ? net : 0);
      const acc = p.account ? String(p.account) : null;
      if (!acc || refund <= 0) continue;
      refundsByAccount.set(acc, (refundsByAccount.get(acc) || 0) + refund);
      refundedTotal += refund;
    }

    if (refundsByAccount.size) {
      const ops = Array.from(refundsByAccount.entries())
        .filter(([, v]) => Number(v) > 0)
        .map(([id, v]) => ({
          updateOne: {
            filter: { _id: id },
            update: { $inc: { balance: Number(v) } },
          },
        }));
      if (ops.length) await Account.bulkWrite(ops, { ordered: false });
    }

    const result = await Payroll.deleteMany(query);

    try {
      publishRealtime({ type: 'payroll:changed', ts: Date.now() });
      if (refundsByAccount.size) publishRealtime({ type: 'accounts:changed', ts: Date.now() });
    } catch { /* ignore */ }

    res.json({
      message: 'Paid payroll records deleted',
      deletedCount: result.deletedCount || 0,
      refundedTotal,
      refundedAccounts: refundsByAccount.size,
    });
  } catch (error) {
    console.error('deletePaidPayrolls Error:', error);
    res.status(500).json({ message: error.message });
  }
}
