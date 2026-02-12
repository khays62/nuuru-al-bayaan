import Expense from '../../models/Expense.js';
import Account from '../../models/Account.js';
import FinanceCategory from '../../models/FinanceCategory.js';
import AuditLog from '../../models/AuditLog.js';
import { publishRealtime } from '../../utils/realtimeBus.js';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

const sendFinanceError = (res, status, code, message, extra = {}) => {
  return res.status(status).json({ code, message, ...extra });
};

async function logAction(user, action, description, req, target = null) {
  try {
    await AuditLog.create({
      user: user._id,
      action,
      description,
      ip: req.ip || req.connection.remoteAddress,
      device: req.headers['user-agent'] || 'Unknown',
      targetId: target?.id,
      targetModel: target?.model,
      changes: target?.changes,
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
}

function parseDateRange(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Expense ledger (info modal)
 * Query:
 * - categoryId (optional)
 * - category (optional)
 */
export async function getExpenseLedger(req, res) {
  try {
    const { categoryId, category } = req.query;

    const query = {};
    if (categoryId) {
      if (!isValidObjectId(categoryId)) return res.status(400).json({ message: 'Invalid categoryId' });
      query.categoryRef = categoryId;
    }
    if (category) query.category = category;

    const rows = await Expense.find(query)
      .populate('account', 'name type')
      .populate('approvedBy', 'fullName username')
      .populate('createdBy', 'fullName username')
      .sort({ date: -1, createdAt: -1 });

    const totals = rows.reduce(
      (acc, e) => {
        acc.count += 1;
        acc.amount += Number(e.amount || 0);
        return acc;
      },
      { count: 0, amount: 0 }
    );

    res.json({ filters: { categoryId: categoryId || null, category: category || null }, totals, rows });
  } catch (error) {
    console.error('getExpenseLedger Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Expense charges by date range (Expense Charge Update screen)
 * Query:
 * - from (required)
 * - to (required)
 */
export async function getExpenseChargesByDate(req, res) {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from and to are required' });
    const range = parseDateRange(from, to);
    if (!range) return res.status(400).json({ message: 'Invalid from/to date range' });

    const rows = await Expense.find({ date: { $gte: range.start, $lte: range.end } })
      .populate('account', 'name type')
      .populate('approvedBy', 'fullName username')
      .populate('createdBy', 'fullName username')
      .sort({ date: -1 });

    res.json({ filters: { from: range.start, to: range.end }, rows });
  } catch (error) {
    console.error('getExpenseChargesByDate Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Edit an expense charge (adjusts account balances safely)
 * Params:
 * - id
 * Body:
 * - amount (optional)
 * - accountId (optional)
 * - description (optional)
 * - date (optional)
 * - title (optional)
 * - categoryId or category (optional)
 */
export async function updateExpenseCharge(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendFinanceError(res, 400, 'FIN_INVALID_EXPENSE_ID', 'Invalid expense id');

    const expense = await Expense.findById(id);
    if (!expense) return sendFinanceError(res, 404, 'FIN_EXPENSE_NOT_FOUND', 'Expense not found');

    const oldSnapshot = expense.toObject();

    const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : Number(expense.amount);
    if (!Number.isFinite(nextAmount) || nextAmount < 0) return sendFinanceError(res, 400, 'FIN_AMOUNT_INVALID', 'Invalid amount');

    const nextAccountId = req.body.accountId !== undefined ? req.body.accountId : (expense.account ? String(expense.account) : null);
    if (nextAccountId && !isValidObjectId(nextAccountId)) return sendFinanceError(res, 400, 'FIN_INVALID_ACCOUNT_ID', 'Invalid accountId');

    // Category mapping
    let nextCategoryName = req.body.category !== undefined ? req.body.category : expense.category;
    let nextCategoryRef = expense.categoryRef;
    if (req.body.categoryId) {
      if (!isValidObjectId(req.body.categoryId)) return sendFinanceError(res, 400, 'FIN_INVALID_CATEGORY_ID', 'Invalid categoryId');
      const cat = await FinanceCategory.findOne({ _id: req.body.categoryId, type: 'expense' });
      if (!cat) return sendFinanceError(res, 404, 'FIN_EXPENSE_CATEGORY_NOT_FOUND', 'Expense category not found');
      nextCategoryName = cat.name;
      nextCategoryRef = cat._id;
    }

    // Account adjustments
    const oldAmount = Number(expense.amount || 0);
    const oldAccountId = expense.account ? String(expense.account) : null;

    const oldAccount = oldAccountId ? await Account.findById(oldAccountId) : null;
    const newAccount = nextAccountId ? await Account.findById(nextAccountId) : null;
    if (nextAccountId && !newAccount) return sendFinanceError(res, 404, 'FIN_ACCOUNT_NOT_FOUND', 'New account not found');

    if (oldAccountId === nextAccountId) {
      // same account, adjust by delta
      const delta = nextAmount - oldAmount;
      if (delta > 0) {
        if (!oldAccount) return sendFinanceError(res, 400, 'FIN_EXPENSE_ACCOUNT_MISSING', 'Old account missing on this expense; cannot increase amount');
        if (oldAccount.balance < delta) return sendFinanceError(res, 400, 'FIN_INSUFFICIENT_FUNDS', 'Insufficient funds in selected account for increase');
        oldAccount.balance -= delta;
        await oldAccount.save();
      } else if (delta < 0) {
        if (oldAccount) {
          oldAccount.balance += Math.abs(delta);
          await oldAccount.save();
        }
      }
    } else {
      // move between accounts
      if (oldAccount) {
        oldAccount.balance += oldAmount;
        await oldAccount.save();
      }
      if (newAccount) {
        if (newAccount.balance < nextAmount) return sendFinanceError(res, 400, 'FIN_INSUFFICIENT_FUNDS', 'Insufficient funds in new account');
        newAccount.balance -= nextAmount;
        await newAccount.save();
      }
    }

    // Apply updates
    expense.amount = nextAmount;
    expense.account = nextAccountId || undefined;
    expense.category = nextCategoryName;
    expense.categoryRef = nextCategoryRef;
    if (req.body.title !== undefined) expense.title = req.body.title;
    if (req.body.description !== undefined) expense.description = req.body.description;
    if (req.body.date !== undefined) {
      const nextDate = new Date(req.body.date);
      if (Number.isNaN(nextDate.getTime())) return sendFinanceError(res, 400, 'FIN_DATE_INVALID', 'Invalid date');
      expense.date = nextDate;
    }

    await expense.save();

    await logAction(req.user, 'UPDATE_EXPENSE_CHARGE', `Updated expense charge ${id}`, req, {
      id,
      model: 'Expense',
      changes: { before: oldSnapshot, after: expense.toObject() },
    });

    try {
      publishRealtime({ type: 'expenses:changed', id: String(id), ts: Date.now() });
      publishRealtime({ type: 'accounts:changed', ts: Date.now() });
    } catch { /* ignore */ }

    res.json({ message: 'Expense updated', expense });
  } catch (error) {
    console.error('updateExpenseCharge Error:', error);
    res.status(500).json({ code: 'FIN_INTERNAL_ERROR', message: error.message });
  }
}

/**
 * Delete an expense charge (reverts account balance)
 */
export async function deleteExpenseCharge(req, res) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendFinanceError(res, 400, 'FIN_INVALID_EXPENSE_ID', 'Invalid expense id');
    const expense = await Expense.findById(id);
    if (!expense) return sendFinanceError(res, 404, 'FIN_EXPENSE_NOT_FOUND', 'Expense not found');

    const oldSnapshot = expense.toObject();

    if (expense.account) {
      const account = await Account.findById(expense.account);
      if (account) {
        account.balance += Number(expense.amount || 0);
        await account.save();
      }
    }

    await Expense.findByIdAndDelete(id);

    await logAction(req.user, 'DELETE_EXPENSE_CHARGE', `Deleted expense charge ${id}`, req, {
      id,
      model: 'Expense',
      changes: { before: oldSnapshot },
    });

    try {
      publishRealtime({ type: 'expenses:changed', id: String(id), ts: Date.now() });
      publishRealtime({ type: 'accounts:changed', ts: Date.now() });
    } catch { /* ignore */ }

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error('deleteExpenseCharge Error:', error);
    res.status(500).json({ code: 'FIN_INTERNAL_ERROR', message: error.message });
  }
}
