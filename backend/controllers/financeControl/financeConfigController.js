import FinanceCategory from '../../models/FinanceCategory.js';
import Account from '../../models/Account.js';
import AuditLog from '../../models/AuditLog.js';
import FeeType from '../../models/FeeType.js';

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
        const category = new FinanceCategory(req.body);
        await category.save();
        await logAction(req.user, 'CREATE_FINANCE_CATEGORY', `Created ${category.type} category: ${category.name}`, req, {
            id: category._id,
            model: 'FinanceCategory',
            changes: { after: category.toObject() }
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        const oldCategory = await FinanceCategory.findById(id).lean();
        const category = await FinanceCategory.findByIdAndUpdate(id, req.body, { new: true });

        if (!category) return res.status(404).json({ message: 'Category not found' });

        await logAction(req.user, 'UPDATE_FINANCE_CATEGORY', `Updated category: ${category.name}`, req, {
            id: category._id,
            model: 'FinanceCategory',
            changes: { before: oldCategory, after: category.toObject() }
        });
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await FinanceCategory.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });

        await logAction(req.user, 'DELETE_FINANCE_CATEGORY', `Deactivated category: ${category.name}`, req, {
            id: category._id,
            model: 'FinanceCategory'
        });
        res.json({ message: 'Category deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- FEE TYPES (Personal / Free) ---

export const createFeeType = async (req, res) => {
    try {
        const { code, name } = req.body || {};
        const normalizedCode = String(code || '').toLowerCase().trim();
        const normalizedName = String(name || '').trim();

        if (!normalizedCode) return res.status(400).json({ message: 'code is required' });
        if (!['personal', 'free'].includes(normalizedCode)) {
            return res.status(400).json({ message: 'code must be personal or free' });
        }
        if (!normalizedName) return res.status(400).json({ message: 'name is required' });

        // Upsert so admin can "create" missing defaults or reactivate inactive ones.
        const feeType = await FeeType.findOneAndUpdate(
            { code: normalizedCode },
            {
                $set: { name: normalizedName, status: 'active' },
                $setOnInsert: { code: normalizedCode }
            },
            { new: true, upsert: true, runValidators: true }
        );
        await logAction(req.user, 'CREATE_FEE_TYPE', `Created fee type: ${feeType.code}`, req, {
            id: feeType._id,
            model: 'FeeType',
            changes: { after: feeType.toObject() }
        });
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
        res.json(feeType);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteFeeType = async (req, res) => {
    try {
        const { id } = req.params;
        const feeType = await FeeType.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
        if (!feeType) return res.status(404).json({ message: 'Fee type not found' });

        await logAction(req.user, 'DELETE_FEE_TYPE', `Deactivated fee type: ${feeType.code}`, req, {
            id: feeType._id,
            model: 'FeeType'
        });
        res.json({ message: 'Fee type deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- ACCOUNTS (Bank, Cash) ---

export const createAccount = async (req, res) => {
    try {
        const { name, type, institution, accountNumber } = req.body || {};
        if (!name || !String(name).trim()) return res.status(400).json({ message: 'Account name is required' });
        if (!type || !String(type).trim()) return res.status(400).json({ message: 'Account type is required' });
        if (!institution || !String(institution).trim()) return res.status(400).json({ message: 'Institution is required' });
        if (!accountNumber || !String(accountNumber).trim()) return res.status(400).json({ message: 'Account number is required' });

        const account = new Account(req.body);
        await account.save();
        await logAction(req.user, 'CREATE_ACCOUNT', `Created account: ${account.name}`, req);
        res.status(201).json(account);
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        if (!account) return res.status(404).json({ message: 'Account not found' });
        await logAction(req.user, 'UPDATE_ACCOUNT', `Updated account: ${account.name}`, req);
        res.json(account);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Transfer Funds
export const transferFunds = async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, description, date } = req.body;

        if (amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

        const fromAccount = await Account.findById(fromAccountId);
        const toAccount = await Account.findById(toAccountId);

        if (!fromAccount || !toAccount) return res.status(404).json({ message: 'Account not found' });
        if (fromAccount.status === 'inactive') return res.status(400).json({ message: 'Source account is inactive' });
        if (toAccount.status === 'inactive') return res.status(400).json({ message: 'Destination account is inactive' });
        if (fromAccount.balance < amount) return res.status(400).json({ message: 'Insufficient funds' });

        fromAccount.balance -= Number(amount);
        toAccount.balance += Number(amount);

        await fromAccount.save();
        await toAccount.save();

        const transferDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();
        await logAction(req.user, 'TRANSFER_FUNDS', `Transferred ${amount} from ${fromAccount.name} to ${toAccount.name} on ${transferDate}. Desc: ${description}`, req);

        res.json({ message: 'Transfer successful', from: fromAccount, to: toAccount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Record Income
export const recordIncome = async (req, res) => {
    try {
        const { accountId, amount, incomeName, comment, receivedNumber, date } = req.body;

        const account = await Account.findById(accountId);
        if (!account) return res.status(404).json({ message: 'Account not found' });
        if (account.status === 'inactive') return res.status(400).json({ message: 'Account is inactive' });

        if (amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

        account.balance += Number(amount);
        await account.save();

        const incomeDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();
        // Since we don't have a dedicated Income model yet, we log it and update balance.
        // Ideally we should create a Transaction record if Ledger exists, but for now AuditLog serves as history.
        await logAction(req.user, 'RECORD_INCOME', `Income: ${incomeName} ($${amount}) added to ${account.name}. Ref: ${receivedNumber}. Date: ${incomeDate}. Comment: ${comment}`, req);

        res.json({ message: 'Income recorded successfully', account });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
