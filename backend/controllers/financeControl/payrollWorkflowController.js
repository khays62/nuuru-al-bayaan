import Payroll from '../../models/Payroll.js';
import Account from '../../models/Account.js';
import Expense from '../../models/Expense.js';
import User from '../../models/User.js';
import Teacher from '../../models/Teacher.js';
import bcrypt from 'bcryptjs';
import { getDefaultInitialPassword } from '../../utils/defaultPasswords.js';

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
    const targetStaff =
      chargeType === 'single'
        ? await User.find({ _id: staffId, status: 'active' })
        : await User.find({ status: 'active', role: { $in: ['admin', 'staff', 'teacher'] } });

    if (!targetStaff.length) return res.status(404).json({ message: 'No active staff found for payroll charge' });

    // Allow missing salary values; they will be charged as 0 unless an amount is provided.

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
    res.status(201).json({
      message: 'Payroll charge complete',
      stats: { requested: targetStaff.length, created: created.length, skipped: targetStaff.length - created.length },
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
      return res.status(400).json({ message: 'Insufficient funds in the selected account', required: total, available: account.balance });
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
      payroll.paymentDate = paymentDate;
      payroll.paymentMethod = paymentMethod;
      payroll.reference = reference;
      payroll.account = accountId;
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

    const result = await Payroll.deleteMany(query);
    res.json({ message: 'Payroll charges deleted', deletedCount: result.deletedCount || 0 });
  } catch (error) {
    console.error('deletePayrollCharges Error:', error);
    res.status(500).json({ message: error.message });
  }
}
