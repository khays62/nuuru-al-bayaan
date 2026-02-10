import Expense from '../../models/Expense.js';
import FinanceCategory from '../../models/FinanceCategory.js';

function parseDateRange(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Budget report
 * Query:
 * - from (optional)
 * - to (optional)
 */
export async function getExpenseBudgetReport(req, res) {
  try {
    const { from, to } = req.query;

    let dateFilter = {};
    if (from && to) {
      const range = parseDateRange(from, to);
      if (!range) return res.status(400).json({ message: 'Invalid from/to date range' });
      dateFilter = { date: { $gte: range.start, $lte: range.end } };
    } else if (from || to) {
      return res.status(400).json({ message: 'Provide both from and to, or neither' });
    }

    const categories = await FinanceCategory.find({ type: 'expense' }).sort({ name: 1 });

    const spentAgg = await Expense.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } },
    ]);
    const spentByCategory = new Map(spentAgg.map((r) => [r._id, Number(r.spent || 0)]));

    const rows = categories.map((c) => {
      const budget = Number(c.budget || 0);
      const spent = spentByCategory.get(c.name) || 0;
      const remaining = budget - spent;
      return {
        categoryId: c._id,
        category: c.name,
        budget,
        spent,
        remaining,
        overBudget: remaining < 0,
      };
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.budget += r.budget;
        acc.spent += r.spent;
        acc.remaining += r.remaining;
        acc.overBudgetCount += r.overBudget ? 1 : 0;
        return acc;
      },
      { budget: 0, spent: 0, remaining: 0, overBudgetCount: 0 }
    );

    res.json({ filters: { from: from || null, to: to || null }, totals, rows });
  } catch (error) {
    console.error('getExpenseBudgetReport Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/**
 * Over-budget detail list for a category (optional helper)
 * Query:
 * - category (required) (category name)
 * - from,to (optional)
 */
export async function getOverBudgetExpenses(req, res) {
  try {
    const { category, from, to } = req.query;
    if (!category) return res.status(400).json({ message: 'category is required' });

    let dateFilter = {};
    if (from && to) {
      const range = parseDateRange(from, to);
      if (!range) return res.status(400).json({ message: 'Invalid from/to date range' });
      dateFilter = { date: { $gte: range.start, $lte: range.end } };
    } else if (from || to) {
      return res.status(400).json({ message: 'Provide both from and to, or neither' });
    }

    const rows = await Expense.find({ category, ...dateFilter }).sort({ date: -1, createdAt: -1 });
    const totalSpent = rows.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    res.json({ filters: { category, from: from || null, to: to || null }, totalSpent, rows });
  } catch (error) {
    console.error('getOverBudgetExpenses Error:', error);
    res.status(500).json({ message: error.message });
  }
}
