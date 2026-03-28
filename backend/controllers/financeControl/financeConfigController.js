import FinanceCategory from '../../models/FinanceCategory.js';
import Account from '../../models/Account.js';
import FinanceAccountType from '../../models/FinanceAccountType.js';
import AuditLog from '../../models/AuditLog.js';
import FeeType from '../../models/FeeType.js';
import FeeInvoice from '../../models/FeeInvoice.js';
import Expense from '../../models/Expense.js';
import { publishRealtime } from '../../utils/realtimeBus.js';

const sendFinanceError = (res, status, code, message, extra = {}) => {
    return res.status(status).json({ code, message, ...extra });
};

// Helper: Audit Log
// Helper: Audit Log
const logAction = async (user, action, description, req, target = null) => {
    try {
        await AuditLog.create({
            user: user._id,
            action,
            description,
            ip: req.ip || req.connection.remoteAddress,
            device: req.headers['user-agent'] || 'Unknown',
            targetId: target?.id,
            targetModel: target?.model,
            changes: target?.changes
        });
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
};

// --- CATEGORIES (Fee Types, Expense Types, Donation Projects) ---

export const createCategory = async (req, res) => {
    try {
        const payload = req.body || {};
        const name = String(payload?.name || '').trim();
        const type = String(payload?.type || '').trim();

        if (!name) return sendFinanceError(res, 400, 'FIN_CATEGORY_NAME_REQUIRED', 'name is required');
        if (!type) return sendFinanceError(res, 400, 'FIN_CATEGORY_TYPE_REQUIRED', 'type is required');

        const category = new FinanceCategory({ ...payload, name, type });
        await category.save();
        await logAction(req.user, 'CREATE_FINANCE_CATEGORY', `Created ${category.type} category: ${category.name}`, req, {
            id: category._id,
            model: 'FinanceCategory',
            changes: { after: category.toObject() }
        });

        try {
            publishRealtime({ type: 'financeCategories:changed', id: String(category._id), categoryType: category.type, ts: Date.now() });
        } catch { /* ignore */ }

        res.status(201).json(category);
    } catch (error) {
        if (error?.code === 11000) {
            return sendFinanceError(res, 409, 'FIN_CATEGORY_DUPLICATE', 'Category already exists');
        }
        res.status(500).json({ code: 'FIN_INTERNAL_ERROR', message: error.message });
    }
};

export const getCategories = async (req, res) => {
    try {
        const { type } = req.query;
        const query = type ? { type, status: 'active' } : {};

        let categories = await FinanceCategory.find(query).sort({ name: 1 });

        // Bootstrap defaults for fresh installs so Finance workflows don't start empty.
        if (type && String(type).toLowerCase() === 'fee' && categories.length === 0) {
            const defaults = [
                { name: 'Monthly Tuition', type: 'fee', feeType: 'Standard', defaultAmount: 0, status: 'active' },
                { name: 'Registration Fee', type: 'fee', feeType: 'Registration', defaultAmount: 0, status: 'active' },
                { name: 'Graduation Fee', type: 'fee', feeType: 'Graduation', defaultAmount: 0, status: 'active' },
            ];

            await Promise.all(
                defaults.map((doc) =>
                    FinanceCategory.updateOne(
                        { name: doc.name },
                        { $setOnInsert: doc },
                        { upsert: true }
                    )
                )
            );

            categories = await FinanceCategory.find(query).sort({ name: 1 });
        }

        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(String(id))) {
            return sendFinanceError(res, 400, 'FIN_INVALID_CATEGORY_ID', 'Invalid category id');
        }
        const oldCategory = await FinanceCategory.findById(id).lean();
        if (!oldCategory) return sendFinanceError(res, 404, 'FIN_CATEGORY_NOT_FOUND', 'Category not found');

        // If this is an expense category and already used in expenses, prevent renaming.
        const incomingName = req.body?.name !== undefined ? String(req.body?.name || '').trim() : undefined;
        if (String(oldCategory?.type || '').toLowerCase() === 'expense' && incomingName !== undefined) {
            const oldName = String(oldCategory?.name || '').trim();
            if (incomingName && incomingName !== oldName) {
                const inUse = await Expense.exists({ $or: [{ categoryRef: id }, { category: oldName }] });
                if (inUse) {
                    return sendFinanceError(res, 400, 'FIN_CATEGORY_IN_USE', 'Category is already used in expenses and cannot be renamed');
                }
            }
        }

        const category = await FinanceCategory.findByIdAndUpdate(id, req.body, { new: true });

        if (!category) return sendFinanceError(res, 404, 'FIN_CATEGORY_NOT_FOUND', 'Category not found');

        await logAction(req.user, 'UPDATE_FINANCE_CATEGORY', `Updated category: ${category.name}`, req, {
            id: category._id,
            model: 'FinanceCategory',
            changes: { before: oldCategory, after: category.toObject() }
        });

        try {
            publishRealtime({ type: 'financeCategories:changed', id: String(category._id), categoryType: category.type, ts: Date.now() });
        } catch { /* ignore */ }

        res.json(category);
    } catch (error) {
        if (error?.code === 11000) {
            return sendFinanceError(res, 409, 'FIN_CATEGORY_DUPLICATE', 'Category already exists');
        }
        res.status(500).json({ code: 'FIN_INTERNAL_ERROR', message: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(String(id))) {
            return sendFinanceError(res, 400, 'FIN_INVALID_CATEGORY_ID', 'Invalid category id');
        }
        const existing = await FinanceCategory.findById(id).lean();
        if (!existing) return sendFinanceError(res, 404, 'FIN_CATEGORY_NOT_FOUND', 'Category not found');

        // Do not allow archiving expense categories that have recorded expenses.
        if (String(existing?.type || '').toLowerCase() === 'expense') {
            const oldName = String(existing?.name || '').trim();
            const inUse = await Expense.exists({ $or: [{ categoryRef: id }, { category: oldName }] });
            if (inUse) {
                return sendFinanceError(res, 400, 'FIN_CATEGORY_IN_USE', 'Category is already used in expenses and cannot be archived');
            }
        }

        const category = await FinanceCategory.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
        if (!category) return sendFinanceError(res, 404, 'FIN_CATEGORY_NOT_FOUND', 'Category not found');

        await logAction(req.user, 'DELETE_FINANCE_CATEGORY', `Deactivated category: ${category.name}`, req, {
            id: category._id,
            model: 'FinanceCategory'
        });

        try {
            publishRealtime({ type: 'financeCategories:changed', id: String(category._id), categoryType: category.type, ts: Date.now() });
        } catch { /* ignore */ }

        res.json({ message: 'Category deactivated successfully' });
    } catch (error) {
        res.status(500).json({ code: 'FIN_INTERNAL_ERROR', message: error.message });
    }
};

// --- FEE TYPES (Personal / Free) ---

export const createFeeType = async (req, res) => {
    try {
        const { code, name, mode, discountPercent, status } = req.body || {};
        const normalizedName = String(name || '').trim();

        if (!normalizedName) return res.status(400).json({ message: 'name is required' });

        // Determine code: prefer provided code (sanitized), otherwise generate from name
        const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        let normalizedCode = code ? String(code || '').toLowerCase().trim() : slugify(normalizedName) || 'fee';

        // Ensure unique code by appending suffix if needed
        let candidate = normalizedCode;
        let suffix = 1;
        while (await FeeType.exists({ code: candidate })) {
            candidate = `${normalizedCode}-${suffix++}`;
            if (suffix > 1000) break;
        }
        normalizedCode = candidate;

        const payload = {
            code: normalizedCode,
            name: normalizedName,
            mode: ['charge', 'waive', 'discount'].includes(String(mode || 'charge')) ? String(mode || 'charge') : 'charge',
            discountPercent: Number(discountPercent || 0) || 0,
            status: status || 'active'
        };

        const feeType = new FeeType(payload);
        await feeType.save();
        await logAction(req.user, 'CREATE_FEE_TYPE', `Created fee type: ${feeType.code}`, req, {
            id: feeType._id,
            model: 'FeeType',
            changes: { after: feeType.toObject() }
        });

        try {
            publishRealtime({ type: 'feeTypes:changed', id: String(feeType._id), code: feeType.code, ts: Date.now() });
        } catch { /* ignore */ }

        res.status(201).json(feeType);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFeeTypes = async (req, res) => {
    try {
        // Ensure the two system fee types always exist.
        // These are used by charging logic, so we avoid forcing admins to "create codes".
        await FeeType.updateOne(
            { code: 'personal' },
            { $setOnInsert: { code: 'personal', name: 'Personal', status: 'active' } },
            { upsert: true }
        );
        await FeeType.updateOne(
            { code: 'free' },
            { $setOnInsert: { code: 'free', name: 'Free', status: 'active' } },
            { upsert: true }
        );

        const { includeInactive } = req.query;
        const query = String(includeInactive).toLowerCase() === 'true' ? {} : { status: 'active' };
        const feeTypes = await FeeType.find(query).sort({ code: 1 });
        res.json(feeTypes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateFeeType = async (req, res) => {
    try {
        const { id } = req.params;
        const oldDoc = await FeeType.findById(id).lean();
        if (!oldDoc) return res.status(404).json({ message: 'Fee type not found' });

        const update = {};
        if (req.body?.name !== undefined) update.name = String(req.body.name || '').trim();
        if (req.body?.mode !== undefined) update.mode = req.body.mode;
        if (req.body?.discountPercent !== undefined) update.discountPercent = Number(req.body.discountPercent || 0);
        if (req.body?.status !== undefined) update.status = req.body.status;

        if (update.name !== undefined && !update.name) {
            return res.status(400).json({ message: 'name cannot be empty' });
        }

        const feeType = await FeeType.findByIdAndUpdate(id, update, { new: true, runValidators: true });
        await logAction(req.user, 'UPDATE_FEE_TYPE', `Updated fee type: ${feeType.code}`, req, {
            id: feeType._id,
            model: 'FeeType',
            changes: { before: oldDoc, after: feeType.toObject() }
        });

        try {
            publishRealtime({ type: 'feeTypes:changed', id: String(feeType._id), code: feeType.code, ts: Date.now() });
        } catch { /* ignore */ }

        res.json(feeType);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteFeeType = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(String(id))) {
            return res.status(400).json({ code: 'FIN_INVALID_FEE_TYPE_ID', message: 'Invalid fee type id' });
        }

        const feeType = await FeeType.findById(id).lean();
        if (!feeType) return res.status(404).json({ message: 'Fee type not found' });

        // Check for references:
        // - FinanceCategory.feeType (string)
        // - FeeInvoice.discounts.name
        const codeVal = String(feeType.code || '').trim();
        const nameVal = String(feeType.name || '').trim();

        const inCategory = await FinanceCategory.exists({ feeType: { $in: [codeVal, nameVal] } });
        const inInvoiceDiscount = await FeeInvoice.exists({ 'discounts.name': { $in: [nameVal, codeVal] } });

        if (inCategory || inInvoiceDiscount) {
            return res.status(400).json({ code: 'FEE_TYPE_IN_USE', message: 'Cannot delete — this fee type is referenced by other records.' });
        }

        // Safe to delete
        await FeeType.deleteOne({ _id: id });

        await logAction(req.user, 'DELETE_FEE_TYPE', `Deleted fee type: ${feeType.code}`, req, {
            id: id,
            model: 'FeeType',
            changes: { before: feeType, after: null }
        });

        try {
            publishRealtime({ type: 'feeTypes:changed', id: String(id), code: feeType.code, ts: Date.now() });
        } catch { /* ignore */ }

        res.json({ message: 'Fee type deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const canDeleteFeeType = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !/^[0-9a-fA-F]{24}$/.test(String(id))) {
            return res.status(400).json({ code: 'FIN_INVALID_FEE_TYPE_ID', message: 'Invalid fee type id' });
        }

        const feeType = await FeeType.findById(id).lean();
        if (!feeType) return res.status(404).json({ message: 'Fee type not found' });

        const codeVal = String(feeType.code || '').trim();
        const nameVal = String(feeType.name || '').trim();

        const inCategory = await FinanceCategory.exists({ feeType: { $in: [codeVal, nameVal] } });
        const inInvoiceDiscount = await FeeInvoice.exists({ 'discounts.name': { $in: [nameVal, codeVal] } });

        if (inCategory || inInvoiceDiscount) {
            return res.status(400).json({ code: 'FEE_TYPE_IN_USE', message: 'Cannot delete — this fee type is referenced by other records.' });
        }

        return res.json({ canDelete: true });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

// --- ACCOUNT TYPES (Bank, Cash, Mobile Money, EVC, etc.) ---

export const getAccountTypes = async (req, res) => {
    try {
        // Bootstrap defaults so Accounts UI always has choices.
        await FinanceAccountType.updateOne(
            { nameLower: 'bank' },
            { $setOnInsert: { name: 'Bank', status: 'active' } },
            { upsert: true }
        );
        await FinanceAccountType.updateOne(
            { nameLower: 'cash' },
            { $setOnInsert: { name: 'Cash', status: 'active' } },
            { upsert: true }
        );
        await FinanceAccountType.updateOne(
            { nameLower: 'mobile money' },
            { $setOnInsert: { name: 'Mobile Money', status: 'active' } },
            { upsert: true }
        );

        const includeInactive = ['1', 'true', 'yes'].includes(String(req.query?.includeInactive || '').toLowerCase());
        const query = includeInactive ? {} : { status: 'active' };
        const types = await FinanceAccountType.find(query).sort({ name: 1 });
        res.json(types);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createAccountType = async (req, res) => {
    try {
        const payload = req.body || {};
        const name = String(payload?.name || '').trim();
        if (!name) return sendFinanceError(res, 400, 'FIN_ACCOUNT_TYPE_NAME_REQUIRED', 'name is required');

        const nameLower = name.toLowerCase();
        const exists = await FinanceAccountType.exists({ nameLower });
        if (exists) return sendFinanceError(res, 409, 'FIN_ACCOUNT_TYPE_DUPLICATE', 'Account type already exists');

        const doc = new FinanceAccountType({ name, status: 'active' });
        await doc.save();

        await logAction(req.user, 'CREATE_ACCOUNT_TYPE', `Created account type: ${doc.name}`, req, {
            id: doc._id,
            model: 'FinanceAccountType',
            changes: { after: doc.toObject() }
        });

        try {
            publishRealtime({ type: 'accountTypes:changed', id: String(doc._id), name: doc.name, ts: Date.now() });
        } catch { /* ignore */ }

        res.status(201).json(doc);
    } catch (error) {
        if (error?.code === 11000) {
            return sendFinanceError(res, 409, 'FIN_ACCOUNT_TYPE_DUPLICATE', 'Account type already exists');
        }
        res.status(500).json({ code: 'FIN_INTERNAL_ERROR', message: error.message });
    }
};

// --- ACCOUNTS (Bank, Cash) ---

export const createAccount = async (req, res) => {
    try {
        const { name, type, institution, accountNumber } = req.body || {};
        if (!name || !String(name).trim()) return sendFinanceError(res, 400, 'FIN_ACCOUNT_NAME_REQUIRED', 'Account name is required');
        if (!type || !String(type).trim()) return sendFinanceError(res, 400, 'FIN_ACCOUNT_TYPE_REQUIRED', 'Account type is required');
        if (!institution || !String(institution).trim()) return sendFinanceError(res, 400, 'FIN_ACCOUNT_INSTITUTION_REQUIRED', 'Institution is required');
        if (!accountNumber || !String(accountNumber).trim()) return sendFinanceError(res, 400, 'FIN_ACCOUNT_NUMBER_REQUIRED', 'Account number is required');

        const account = new Account(req.body);
        await account.save();
        await logAction(req.user, 'CREATE_ACCOUNT', `Created account: ${account.name}`, req);

        try {
            publishRealtime({ type: 'accounts:changed', id: String(account._id), ts: Date.now() });
        } catch { /* ignore */ }
        res.status(201).json(account);
    } catch (error) {
        if (error?.code === 11000) {
            return sendFinanceError(res, 409, 'FIN_ACCOUNT_DUPLICATE', 'An account with the same details already exists');
        }
        if (error?.name === 'ValidationError') {
            return sendFinanceError(res, 400, 'FIN_VALIDATION_ERROR', 'Validation error');
        }
        return sendFinanceError(res, 500, 'FIN_INTERNAL_ERROR', 'Server error');
    }
};

export const getAccounts = async (req, res) => {
    try {
        const includeInactive = ['1', 'true', 'yes'].includes(String(req.query?.includeInactive || '').toLowerCase());
        const filter = includeInactive
            ? {}
            : {
                $or: [
                    { status: { $ne: 'inactive' } },
                    { status: { $exists: false } }
                ]
            };

        const accounts = await Account.find(filter).sort({ name: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const account = await Account.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
        if (!account) return sendFinanceError(res, 404, 'FIN_ACCOUNT_NOT_FOUND', 'Account not found');
        await logAction(req.user, 'UPDATE_ACCOUNT', `Updated account: ${account.name}`, req);

        try {
            publishRealtime({ type: 'accounts:changed', id: String(account._id), ts: Date.now() });
        } catch { /* ignore */ }
        res.json(account);
    } catch (error) {
        if (error?.name === 'CastError') {
            return sendFinanceError(res, 400, 'FIN_INVALID_ACCOUNT_ID', 'Invalid account id');
        }
        if (error?.code === 11000) {
            return sendFinanceError(res, 409, 'FIN_ACCOUNT_DUPLICATE', 'An account with the same details already exists');
        }
        if (error?.name === 'ValidationError') {
            return sendFinanceError(res, 400, 'FIN_VALIDATION_ERROR', 'Validation error');
        }
        return sendFinanceError(res, 500, 'FIN_INTERNAL_ERROR', 'Server error');
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;

        const account = await Account.findById(id);
        if (!account) return sendFinanceError(res, 404, 'FIN_ACCOUNT_NOT_FOUND', 'Account not found');

        const balance = Number(account.balance || 0);
        // Hard rule: accounts with money (or any non-zero balance) cannot be deleted.
        if (!Number.isFinite(balance) || balance !== 0) {
            return sendFinanceError(res, 400, 'FIN_ACCOUNT_DELETE_BALANCE_NOT_ZERO', 'Cannot delete an account with a non-zero balance');
        }

        await Account.deleteOne({ _id: account._id });

        await logAction(req.user, 'DELETE_ACCOUNT', `Deleted account: ${account.name}`, req, {
            id: account._id,
            model: 'Account',
            changes: { before: account.toObject(), after: null },
        });

        try {
            publishRealtime({ type: 'accounts:changed', id: String(account._id), ts: Date.now() });
        } catch { /* ignore */ }

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        if (error?.name === 'CastError') {
            return sendFinanceError(res, 400, 'FIN_INVALID_ACCOUNT_ID', 'Invalid account id');
        }
        return sendFinanceError(res, 500, 'FIN_INTERNAL_ERROR', 'Server error');
    }
};

// Transfer Funds
export const transferFunds = async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, description, date } = req.body;

        if (amount <= 0) return sendFinanceError(res, 400, 'FIN_AMOUNT_MUST_BE_POSITIVE', 'Amount must be positive');

        const fromAccount = await Account.findById(fromAccountId);
        const toAccount = await Account.findById(toAccountId);

        if (!fromAccount || !toAccount) return sendFinanceError(res, 404, 'FIN_ACCOUNT_NOT_FOUND', 'Account not found');
        if (fromAccount.status === 'inactive') return sendFinanceError(res, 400, 'FIN_SOURCE_ACCOUNT_INACTIVE', 'Source account is inactive');
        if (toAccount.status === 'inactive') return sendFinanceError(res, 400, 'FIN_DEST_ACCOUNT_INACTIVE', 'Destination account is inactive');
        if (fromAccount.balance < amount) return sendFinanceError(res, 400, 'FIN_INSUFFICIENT_FUNDS', 'Insufficient funds');

        fromAccount.balance -= Number(amount);
        toAccount.balance += Number(amount);

        await fromAccount.save();
        await toAccount.save();

        const transferDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();
        await logAction(req.user, 'TRANSFER_FUNDS', `Transferred ${amount} from ${fromAccount.name} to ${toAccount.name} on ${transferDate}. Desc: ${description}`, req);

        try {
            publishRealtime({ type: 'accounts:changed', ts: Date.now() });
        } catch { /* ignore */ }

        res.json({ message: 'Transfer successful', from: fromAccount, to: toAccount });
    } catch (error) {
        if (error?.name === 'CastError') {
            return sendFinanceError(res, 400, 'FIN_INVALID_ACCOUNT_ID', 'Invalid account id');
        }
        return sendFinanceError(res, 500, 'FIN_INTERNAL_ERROR', 'Server error');
    }
};

// Record Income
export const recordIncome = async (req, res) => {
    try {
        const { accountId, amount, incomeName, comment, receivedNumber, date } = req.body;

        const account = await Account.findById(accountId);
        if (!account) return sendFinanceError(res, 404, 'FIN_ACCOUNT_NOT_FOUND', 'Account not found');
        if (account.status === 'inactive') return sendFinanceError(res, 400, 'FIN_ACCOUNT_INACTIVE', 'Account is inactive');

        if (amount <= 0) return sendFinanceError(res, 400, 'FIN_AMOUNT_MUST_BE_POSITIVE', 'Amount must be positive');

        account.balance += Number(amount);
        await account.save();

        const incomeDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();
        // Since we don't have a dedicated Income model yet, we log it and update balance.
        // Ideally we should create a Transaction record if Ledger exists, but for now AuditLog serves as history.
        await logAction(req.user, 'RECORD_INCOME', `Income: ${incomeName} ($${amount}) added to ${account.name}. Ref: ${receivedNumber}. Date: ${incomeDate}. Comment: ${comment}`, req);

        try {
            publishRealtime({ type: 'accounts:changed', id: String(account._id), ts: Date.now() });
        } catch { /* ignore */ }

        res.json({ message: 'Income recorded successfully', account });
    } catch (error) {
        if (error?.name === 'CastError') {
            return sendFinanceError(res, 400, 'FIN_INVALID_ACCOUNT_ID', 'Invalid account id');
        }
        return sendFinanceError(res, 500, 'FIN_INTERNAL_ERROR', 'Server error');
    }
};
