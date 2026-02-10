import FeeInvoice from '../../models/FeeInvoice.js';

function deriveBillingMonthFromDueDate(dueDate) {
  const dt = new Date(dueDate);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Backfill billingMonth for invoices that don't have it.
 * Admin-only maintenance endpoint.
 */
export async function backfillInvoiceBillingMonth(req, res) {
  try {
    const query = {
      $or: [{ billingMonth: { $exists: false } }, { billingMonth: null }, { billingMonth: '' }],
    };

    const invoices = await FeeInvoice.find(query).select('_id dueDate billingMonth');
    if (!invoices.length) {
      return res.json({ message: 'No invoices require backfill', matched: 0, modified: 0 });
    }

    const ops = [];
    for (const inv of invoices) {
      const bm = deriveBillingMonthFromDueDate(inv.dueDate);
      if (!bm) continue;
      ops.push({
        updateOne: {
          filter: { _id: inv._id },
          update: { $set: { billingMonth: bm } },
        },
      });
    }

    if (!ops.length) {
      return res.json({ message: 'Invoices matched but none had a valid dueDate for backfill', matched: invoices.length, modified: 0 });
    }

    const result = await FeeInvoice.bulkWrite(ops);
    res.json({
      message: 'Backfill complete',
      matched: invoices.length,
      modified: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error('backfillInvoiceBillingMonth Error:', error);
    res.status(500).json({ message: error.message });
  }
}
