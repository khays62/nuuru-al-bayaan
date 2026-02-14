import FeeInvoice from '../../models/FeeInvoice.js';
import FeeTransaction from '../../models/FeeTransaction.js';
import Account from '../../models/Account.js';
import AuditLog from '../../models/AuditLog.js';
import { publishRealtime } from '../../utils/realtimeBus.js';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

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

/**
 * Edit a payment transaction (Receipt Edit)
 * Params:
 * - transactionId
 * Body (any of):
 * - amount
 * - accountId
 * - method
 * - reference
 * - remarks
 */
export async function editPaymentTransaction(req, res) {
  try {
    const { transactionId } = req.params;
    if (!isValidObjectId(transactionId)) return res.status(400).json({ message: 'Invalid transactionId' });

    const tx = await FeeTransaction.findById(transactionId);
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    if (tx.status !== 'Completed') return res.status(400).json({ message: 'Only Completed transactions can be edited' });
    if (tx.transactionType !== 'Payment') return res.status(400).json({ message: 'Only Payment transactions can be edited' });
    if (!tx.invoice) return res.status(400).json({ message: 'This payment is not linked to an invoice' });

    const invoice = await FeeInvoice.findById(tx.invoice);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found for transaction' });

    const oldTx = tx.toObject();
    const oldInvoice = invoice.toObject();

    const nextAmount = req.body.amount !== undefined ? Number(req.body.amount) : tx.amount;
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) return res.status(400).json({ message: 'amount must be > 0' });

    const nextAccountId = req.body.accountId !== undefined ? req.body.accountId : (tx.account ? String(tx.account) : null);
    if (nextAccountId && !isValidObjectId(nextAccountId)) return res.status(400).json({ message: 'Invalid accountId' });

    // 1) Adjust invoice paidAmount by delta
    const delta = nextAmount - Number(tx.amount);
    if (delta !== 0) {
      // if increasing payment, ensure it doesn't exceed invoice balance
      if (delta > 0 && delta > Number(invoice.balance)) {
        return res.status(400).json({ message: 'New amount exceeds invoice remaining balance' });
      }
      invoice.paidAmount += delta;
      if (invoice.paidAmount < 0) invoice.paidAmount = 0;
    }

    // 2) Adjust account balances
    // Old account
    const oldAccountId = tx.account ? String(tx.account) : null;
    const oldAccount = oldAccountId ? await Account.findById(oldAccountId) : null;
    const newAccount = nextAccountId ? await Account.findById(nextAccountId) : null;
    if (nextAccountId && !newAccount) return res.status(404).json({ message: 'New account not found' });

    if (oldAccountId === nextAccountId) {
      // same account: adjust by delta
      if (oldAccount && delta !== 0) {
        oldAccount.balance += delta;
        await oldAccount.save();
      }
    } else {
      // transfer between accounts: remove old amount, add new amount
      if (oldAccount) {
        oldAccount.balance -= Number(tx.amount);
        await oldAccount.save();
      }
      if (newAccount) {
        newAccount.balance += nextAmount;
        await newAccount.save();
      }
    }

    // 3) Update tx fields
    tx.amount = nextAmount;
    if (req.body.method !== undefined) tx.method = req.body.method;
    if (req.body.reference !== undefined) tx.reference = req.body.reference;
    if (req.body.remarks !== undefined) tx.remarks = req.body.remarks;
    tx.account = nextAccountId || undefined;

    await invoice.save();
    await tx.save();

    try {
      publishRealtime({ type: 'studentFinance:changed', studentId: String(invoice.student), ts: Date.now() });
      publishRealtime({ type: 'accounts:changed', ts: Date.now() });
    } catch {
      // ignore
    }

    await logAction(req.user, 'EDIT_PAYMENT', `Edited payment transaction ${transactionId}`, req, {
      id: transactionId,
      model: 'FeeTransaction',
      changes: { before: { tx: oldTx, invoice: oldInvoice }, after: { tx: tx.toObject(), invoice: invoice.toObject() } },
    });

    res.json({ message: 'Payment updated', transaction: tx, invoice });
  } catch (error) {
    console.error('editPaymentTransaction Error:', error);
    res.status(500).json({ message: error.message });
  }
}
