import AuditLog from '../../models/AuditLog.js';
import { parsePagination } from '../../utils/pagination.js';

// Finance audit endpoint used by the finance module.
// This keeps Nuuru as the source-of-truth (AuditLog model stays in Nuuru).
export async function getAuditLogs(req, res) {
  try {
    const { pageNum, limitNum, skip } = parsePagination(req.query, {
      defaultPage: 1,
      defaultLimit: 25,
      maxLimit: 200,
    });

    // Heuristic: finance-related actions. We intentionally keep this broad so
    // new finance actions show up without changing code.
    const financeActionRegex = /(FINANCE|INVOICE|PAYROLL|EXPENSE|CHARGE|PAYMENT|HORMARIS|FEE|ACCOUNT|DONATION|RECEIPT|CLEARANCE)/i;

    const q = String(req.query?.q || '').trim();

    const filter = {
      ...(q
        ? {
            $or: [
              { action: { $regex: q, $options: 'i' } },
              { description: { $regex: q, $options: 'i' } },
            ],
          }
        : { action: { $regex: financeActionRegex } }),
    };

    const total = await AuditLog.countDocuments(filter);

    const rows = await AuditLog.find(filter)
      .select('user action description ip device timestamp')
      .populate('user', 'fullName username role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.max(1, Math.ceil(total / limitNum));

    return res.json({
      data: rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch logs' });
  }
}
