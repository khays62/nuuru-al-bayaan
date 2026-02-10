import FeeInvoice from '../../models/FeeInvoice.js';
import FeeTransaction from '../../models/FeeTransaction.js';
import Payroll from '../../models/Payroll.js';
import Expense from '../../models/Expense.js';
import FinanceCategory from '../../models/FinanceCategory.js';
import AuditLog from '../../models/AuditLog.js';
import Student from '../../models/Student.js';
import mongoose from 'mongoose';
import User from '../../models/User.js';
import Teacher from '../../models/Teacher.js';
import bcrypt from 'bcryptjs';
import { getDefaultInitialPassword } from '../../utils/defaultPasswords.js';

// Helper: Log Action
const logAction = async (user, action, description, req) => {
    try {
        await AuditLog.create({
            user: user._id,
            action,
            description,
            ip: req.ip || req.connection.remoteAddress,
            device: req.headers['user-agent'] || 'Unknown'
        });
    } catch (err) {
        console.error('Audit Log Error:', err);
    }
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

// --- DASHBOARD STATS ---
// --- DASHBOARD STATS ---
export const getFinanceStats = async (req, res) => {
    try {
        // 1. Totals
        const totalRevenue = await FeeTransaction.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
        const totalExpenses = await Expense.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
        const pendingFees = await FeeInvoice.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { $group: { _id: null, total: { $sum: "$balance" } } }
        ]);

        // 2. Monthly Income vs Expenses (Last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyIncome = await FeeTransaction.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    total: { $sum: "$amount" }
                }
            }
        ]);

        const monthlyExpenses = await Expense.aggregate([
            { $match: { date: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { $month: "$date" },
                    total: { $sum: "$amount" }
                }
            }
        ]);

        // Merge Monthly Data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyStats = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const monthIdx = d.getMonth() + 1; // 1-12
            const income = monthlyIncome.find(m => m._id === monthIdx)?.total || 0;
            const expense = monthlyExpenses.find(m => m._id === monthIdx)?.total || 0;
            return {
                name: months[monthIdx - 1],
                income,
                expense
            };
        });

        // 3. Paid vs Unpaid Students (Invoice Count or Student Count?) - Let's do Invoice Status Distribution
        const invoiceStats = await FeeInvoice.aggregate([
            { $group: { _id: "$status", value: { $count: {} } } }
        ]);
        const feeStatusDistribution = invoiceStats.map(s => ({ name: s._id, value: s.value }));

        // 4. Revenue by Grade (Requires Lookup)
        // This is expensive, so let's approximate by looking at Invoices paid amounts?
        // Better: FeeTransaction -> Invoice -> Class -> Grade
        // For simplicity/performance, let's group FeeInvoices that are Paid/Partial by Class
        // Note: Real ERP would have denormalized 'grade' on invoice or transaction for reporting.
        // Let's try a simple aggregation on FeeInvoice for 'paidAmount' > 0 grouped by class
        // (Skipping deep lookup for now to ensure speed, or we can add it if GradeSection is populated)

        // 5. Expense Breakdown
        const expenseCategory = await Expense.aggregate([
            { $group: { _id: "$category", value: { $sum: "$amount" } } }
        ]);
        const expenseDistribution = expenseCategory.map(e => ({ name: e._id || 'Uncategorized', value: e.value }));


        // 6. Recent Transactions
        const recentTransactions = await FeeTransaction.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('student', 'firstName lastName');

        res.json({
            revenue: totalRevenue[0]?.total || 0,
            expenses: totalExpenses[0]?.total || 0,
            pendingFees: pendingFees[0]?.total || 0,
            monthlyStats,
            feeStatusDistribution,
            expenseDistribution,
            recentTransactions
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// --- FEE MANAGEMENT ---

// Create Invoice (Single)
// Create Invoice (Single)
// Create Invoice (Individual)
export const createInvoice = async (req, res) => {
    try {
        const { studentId, title, items, discounts, dueDate, classId, isWaived, waiverReason, billingMonth } = req.body;

        const deriveBillingMonth = (d) => {
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return undefined;
            const y = dt.getUTCFullYear();
            const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
            return `${y}-${m}`;
        };

        // Lookup student (handle both ObjectId and String ID)
        let student;
        if (studentId.match(/^[0-9a-fA-F]{24}$/)) {
            student = await Student.findById(studentId);
        } else {
            student = await Student.findOne({ studentId: studentId });
        }

        if (!student) {
            return res.status(404).json({ message: 'Student not found with provided ID' });
        }

        let finalClassId = classId;
        if (!finalClassId) {
            const Enrollment = (await import('../../models/Enrollment.js')).default;
            const enrollment = await Enrollment.findOne({ student: student._id, status: 'active' }).select('gradeSection');
            finalClassId = enrollment?.gradeSection;
        }

        const invoice = new FeeInvoice({
            student: student._id,
            class: finalClassId,
            billingMonth: billingMonth || deriveBillingMonth(dueDate),
            title,
            items: items || [],
            discounts: discounts || [],
            isWaived: isWaived || false,
            waiverReason,
            dueDate,
            amount: 0, // Calculated by pre-save hook
            createdBy: req.user._id
        });
        await invoice.save();
        await logAction(req.user, 'CREATE_INVOICE', `Created invoice ${invoice._id} for student ${studentId}`, req);
        res.status(201).json(invoice);
    } catch (error) {
        console.error("Create Invoice Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// Bulk Invoice (For a specific Class)
// Bulk Invoice (For a specific Class)
// Bulk Invoice (For a specific Class)
export const createBulkInvoice = async (req, res) => {
    try {
        const { classId, title, items, discounts, dueDate, billingMonth } = req.body;

        const deriveBillingMonth = (d) => {
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return undefined;
            const y = dt.getUTCFullYear();
            const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
            return `${y}-${m}`;
        };

        const finalBillingMonth = billingMonth || deriveBillingMonth(dueDate);

        // 1. Find all active enrollments for this class
        const Enrollment = (await import('../../models/Enrollment.js')).default;
        const enrollments = await Enrollment.find({
            gradeSection: classId,
            status: 'active'
        }).populate('student');

        if (!enrollments.length) {
            return res.status(404).json({ message: 'No active students found in this class.' });
        }

        // 2. Find existing invoices for this specific batch (Same Class, Title)
        const existingInvoices = await FeeInvoice.find({
            class: classId,
            title: title
        }).select('student');

        const existingStudentIds = new Set(existingInvoices.map(inv => inv.student.toString()));

        // 3. Prepare new invoices
        const newInvoicesToCreate = enrollments
            .filter(enrollment => !existingStudentIds.has(enrollment.student._id.toString()))
            .map(enrollment => {
                const isFree = enrollment.student.isFree;

                // Manual Calculation (insertMany bypasses pre-save)
                const subtotal = (items || []).reduce((sum, i) => sum + Number(i.amount), 0);
                const discountTotal = (discounts || []).reduce((sum, d) => sum + Number(d.amountOff), 0);
                const finalAmount = Math.max(0, subtotal - discountTotal);

                return {
                    student: enrollment.student._id,
                    class: classId,
                    billingMonth: finalBillingMonth,
                    title,
                    items: items || [],
                    discounts: discounts || [],
                    dueDate,
                    isWaived: isFree,
                    waiverReason: isFree ? 'Free Student / Scholarship' : undefined,
                    amount: finalAmount,
                    paidAmount: isFree ? finalAmount : 0, // If free, effectively paid 0 but balanced
                    balance: isFree ? 0 : finalAmount,
                    status: isFree ? 'Paid' : 'Unpaid',
                    createdBy: req.user._id
                };
            });

        const skippedCount = enrollments.length - newInvoicesToCreate.length;

        // 4. Insert only new invoices
        if (newInvoicesToCreate.length > 0) {
            await FeeInvoice.insertMany(newInvoicesToCreate);
        }

        await logAction(req.user, 'BULK_INVOICE', `Created ${newInvoicesToCreate.length} invoices, skipped ${skippedCount} duplicates for class ${classId}`, req);

        res.status(201).json({
            message: `Process Complete: Created ${newInvoicesToCreate.length} new invoices. Skipped ${skippedCount} existing invoices.`,
            stats: {
                created: newInvoicesToCreate.length,
                skipped: skippedCount,
                total: enrollments.length
            }
        });
    } catch (error) {
        console.error("Bulk Invoice Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const updateInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, amount, isWaived } = req.body;

        const invoice = await FeeInvoice.findById(id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        const oldSnapshot = invoice.toObject();

        if (title) invoice.title = title;
        if (date) invoice.dueDate = date;

        // Manual amount override (Enterprise feature)
        // Note: Usually amount is sum of items, but sometimes manual adjust is needed
        if (amount !== undefined && amount !== null) {
            invoice.amount = Number(amount);
            invoice.balance = Math.max(0, invoice.amount - invoice.paidAmount);
            if (invoice.balance === 0 && invoice.amount > 0) invoice.status = 'Paid';
            else if (invoice.paidAmount > 0) invoice.status = 'Partial';
            else invoice.status = 'Unpaid';
        }

        if (isWaived !== undefined) {
            invoice.isWaived = isWaived;
            if (isWaived) {
                invoice.balance = 0;
                invoice.status = 'Paid'; // Waived counts as cleared
            }
        }

        await invoice.save();

        await logAction(req.user, 'UPDATE_INVOICE', `Updated Invoice ${id}`, req, {
            id: id,
            model: 'FeeInvoice',
            changes: { before: oldSnapshot, after: invoice.toObject() }
        });

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await FeeInvoice.findById(id);
        if (!invoice) return res.status(404).json({ message: "Invoice not found" });

        if (invoice.paidAmount > 0) {
            return res.status(400).json({ message: "Cannot delete an invoice that has payments. Please revert payments first." });
        }

        await FeeInvoice.findByIdAndDelete(id);

        await logAction(req.user, 'DELETE_INVOICE', `Deleted Invoice ${id}`, req, {
            id: id,
            model: 'FeeInvoice',
            changes: { before: invoice.toObject() }
        });

        res.json({ message: "Invoice Deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Record Payment (Supports Hormaris and Account Balance)
export const recordPayment = async (req, res) => {
    try {
        const { invoiceId, studentId, amount, method, reference, remarks, transactionType, targetMonth, accountId, billingMonth } = req.body;

        const Account = (await import('../../models/Account.js')).default;

        // 1. HORMARIS (Advance Payment) Logic
        if (transactionType === 'Hormaris') {
            if (!targetMonth || !studentId) {
                return res.status(400).json({ message: 'Target Month and Student ID required for Hormaris.' });
            }

            // Create Credit Transaction
            const transaction = await FeeTransaction.create({
                student: studentId,
                account: accountId || undefined,
                amount,
                method,
                reference,
                remarks,
                transactionType: 'Hormaris',
                targetMonth,
                recordedBy: req.user._id
            });

            // Update Account balance if provided
            if (accountId) {
                const account = await Account.findById(accountId);
                if (account) {
                    account.balance += Number(amount);
                    await account.save();
                }
            }

            await logAction(req.user, 'RECORD_HORMARIS', `Recorded advance payment of ${amount} for ${targetMonth}`, req);
            return res.status(201).json(transaction);
        }

        // 2. NORMAL PAYMENT Logic
        const invoice = await FeeInvoice.findById(invoiceId);

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (invoice.status === 'Paid') return res.status(400).json({ message: 'Invoice is already fully paid' });
        if (amount > invoice.balance) return res.status(400).json({ message: 'Amount exceeds balance' });

        // Update Invoice
        invoice.paidAmount += Number(amount);
        if (billingMonth && !invoice.billingMonth) {
            invoice.billingMonth = billingMonth;
        }
        await invoice.save(); // Pre-save hook updates status

        // Update Account balance if provided
        if (accountId) {
            const account = await Account.findById(accountId);
            if (account) {
                account.balance += Number(amount);
                await account.save();
            }
        }

        // Create Transaction
        const transaction = await FeeTransaction.create({
            invoice: invoice._id,
            student: invoice.student,
            account: accountId || undefined,
            amount,
            method,
            reference,
            remarks,
            transactionType: 'Payment',
            recordedBy: req.user._id
        });

        await logAction(req.user, 'RECORD_PAYMENT', `Recorded payment of ${amount} for invoice ${invoiceId}`, req);
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Check Graduation Clearance
export const checkClearance = async (req, res) => {
    try {
        const { studentId } = req.params;

        // 1. Sum all Invoices
        const invoices = await FeeInvoice.aggregate([
            { $match: { student: new mongoose.Types.ObjectId(studentId), status: { $ne: 'Cancelled' } } },
            { $group: { _id: null, totalBilled: { $sum: '$amount' }, totalPaid: { $sum: '$paidAmount' } } }
        ]);

        const totals = invoices[0] || { totalBilled: 0, totalPaid: 0 };
        const balance = totals.totalBilled - totals.totalPaid;

        const isClear = balance <= 0;

        res.json({
            studentId,
            totalBilled: totals.totalBilled,
            totalPaid: totals.totalPaid,
            balance,
            status: isClear ? 'CLEARED' : 'OUTSTANDING',
            canGraduate: isClear
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Defaulters
export const getDefaulters = async (req, res) => {
    try {
        const { classId } = req.query;
        let query = { status: { $in: ['Unpaid', 'Partial'] } };

        // Filter by due date passed?
        // query.dueDate = { $lt: new Date() }; 

        if (classId) query.class = classId;

        const invoices = await FeeInvoice.find(query)
            .populate('student', 'fullName studentId phone')
            .populate('class', 'gradeName name');

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- PAYROLL MANAGEMENT ---

// --- PAYROLL MANAGEMENT ---

// --- PAYROLL MANAGEMENT ---

export const generatePayroll = async (req, res) => {
    try {
        const { month, staffList, academicYear } = req.body;

        let payrollsToCreate = [];

        if (staffList && staffList.length > 0) {
            // Use provided list
            payrollsToCreate = staffList.map(p => {
                const allowanceTotal = p.allowances ? p.allowances.reduce((sum, a) => sum + (a.amount || 0), 0) : 0;
                const deductionTotal = p.deductions ? p.deductions.reduce((sum, d) => sum + (d.amount || 0), 0) : 0;
                const net = (p.basicSalary || 0) + allowanceTotal - deductionTotal;

                return {
                    staff: p.staffId,
                    academicYear: academicYear || undefined,
                    month,
                    basicSalary: p.basicSalary || 0,
                    allowances: p.allowances || [],
                    deductions: p.deductions || [],
                    netSalary: net,
                    processedBy: req.user._id,
                    status: 'Draft'
                };
            });
        } else {
            // Auto-generate for all active staff (Teachers & Staff)
            await ensureTeacherUsers();
            const activeStaff = await User.find({ status: 'active', role: { $in: ['admin', 'staff', 'teacher'] } });

            if (activeStaff.length === 0) {
                return res.status(404).json({ message: 'No active staff found to generate payroll for.' });
            }

            // Check for existing payrolls to avoid duplicates
            const existingQuery = { month, staff: { $in: activeStaff.map(s => s._id) } };
            if (academicYear) existingQuery.academicYear = academicYear;
            const existingPayrolls = await Payroll.find(existingQuery);
            const existingStaffIds = new Set(existingPayrolls.map(p => p.staff.toString()));

            payrollsToCreate = activeStaff
                .filter(s => !existingStaffIds.has(s._id.toString()))
                .map(staff => ({
                    staff: staff._id,
                    academicYear: academicYear || null,
                    month,
                    basicSalary: staff.salary || 0,
                    allowances: [],
                    deductions: [],
                    netSalary: staff.salary || 0,
                    processedBy: req.user._id,
                    status: 'Draft'
                }));

            if (payrollsToCreate.length === 0) {
                return res.status(400).json({ message: 'Payroll already generated for all active staff for this period.' });
            }
        }

        const createdPayrolls = await Payroll.insertMany(payrollsToCreate);

        await logAction(req.user, 'GENERATE_PAYROLL', `Generated payroll for ${createdPayrolls.length} staff for ${month}`, req, {
            model: 'Payroll',
            changes: { count: createdPayrolls.length, month, academicYear: academicYear || null }
        });

        res.status(201).json(createdPayrolls);
    } catch (error) {
        console.error("Generate Payroll Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const generateSinglePayroll = async (req, res) => {
    try {
        const { month, staffId, academicYear } = req.body;

        const existingQuery = { month, staff: staffId };
        if (academicYear) existingQuery.academicYear = academicYear;
        const existing = await Payroll.findOne(existingQuery);
        if (existing) {
            return res.status(400).json({ message: "Payroll record already exists for this staff in the selected month." });
        }

        await ensureTeacherUsers();
        const staff = await User.findById(staffId);
        if (!staff) return res.status(404).json({ message: "Staff member not found" });

        const payroll = new Payroll({
            staff: staffId,
            academicYear: academicYear || null,
            month,
            basicSalary: staff.salary || 0,
            allowances: [],
            deductions: [],
            netSalary: staff.salary || 0,
            processedBy: req.user._id,
            status: 'Draft'
        });

        await payroll.save();

        await logAction(req.user, 'GENERATE_SINGLE_PAYROLL', `Generated payroll for ${staff.fullName} (${month})`, req, {
            id: payroll._id,
            model: 'Payroll'
        });

        res.status(201).json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Adjust Payroll (Draft Phase)
export const adjustPayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const { allowances, deductions, basicSalary, commission, decrease, correction } = req.body;

        const payroll = await Payroll.findById(id);
        if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });
        if (payroll.status !== 'Draft') return res.status(400).json({ message: 'Can only adjust Draft payrolls' });

        const oldSnapshot = payroll.toObject();

        if (basicSalary !== undefined) payroll.basicSalary = basicSalary;
        if (allowances) payroll.allowances = allowances;
        if (deductions) payroll.deductions = deductions;
        if (commission !== undefined) payroll.commission = commission;
        if (decrease !== undefined) payroll.decrease = decrease;
        if (correction !== undefined) payroll.correction = correction;

        // Recalculate
        const allowanceTotal = (payroll.allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
        const deductionTotal = (payroll.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
        payroll.netSalary =
            Number(payroll.basicSalary || 0) +
            Number(payroll.commission || 0) +
            Number(payroll.correction || 0) -
            Number(payroll.decrease || 0) +
            allowanceTotal -
            deductionTotal;

        await payroll.save();
        await logAction(req.user, 'ADJUST_PAYROLL', `Adjusted payroll for staff ${payroll.staff}`, req, {
            id: payroll._id,
            model: 'Payroll',
            changes: { before: oldSnapshot, after: payroll.toObject() }
        });
        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePayrollStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentMethod, reference, accountId, date } = req.body;

        const payroll = await Payroll.findById(id);
        if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });

        const oldSnapshot = payroll.toObject();

        if (status === 'Paid') {
            if (payroll.status === 'Paid') return res.status(400).json({ message: 'Already paid' });
            if (!accountId) return res.status(400).json({ message: 'accountId is required to mark payroll as Paid' });

            const Account = (await import('../../models/Account.js')).default;
            const account = await Account.findById(accountId);
            if (!account) return res.status(404).json({ message: 'Account not found' });
            if (account.balance < payroll.netSalary) return res.status(400).json({ message: 'Insufficient funds in the selected account' });

            const paymentDate = date ? new Date(date) : new Date();
            if (Number.isNaN(paymentDate.getTime())) return res.status(400).json({ message: 'Invalid date' });

            payroll.paymentDate = paymentDate;
            payroll.paymentMethod = paymentMethod;
            payroll.reference = reference;
            payroll.status = 'Paid';
            payroll.account = accountId;

            account.balance -= payroll.netSalary;
            await account.save();

            const Expense = (await import('../../models/Expense.js')).default;
            const User = (await import('../../models/User.js')).default;

            const staffUser = payroll.staff ? await User.findById(payroll.staff).select('name fullName username email') : null;
            const staffLabel = staffUser
                ? String(staffUser?.name || staffUser?.fullName || staffUser?.username || staffUser?.email || payroll.staff)
                : String(payroll.staff);

            await Expense.create({
                title: `Salary Payment - ${payroll.month}`,
                category: 'Salary',
                amount: payroll.netSalary,
                date: paymentDate,
                description: `Payroll payment for staff: ${staffLabel}`,
                account: accountId,
                approvedBy: req.user._id,
                status: 'Approved'
            });
        } else {
            payroll.status = status;
        }

        await payroll.save();
        await logAction(req.user, 'UPDATE_PAYROLL', `Updated payroll ${id} status to ${status}`, req, {
            id: payroll._id,
            model: 'Payroll',
            changes: { before: oldSnapshot, after: payroll.toObject() }
        });
        res.json(payroll);
    } catch (error) {
        console.error("Update Payroll Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const deletePayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const payroll = await Payroll.findById(id);
        if (!payroll) return res.status(404).json({ message: "Not Found" });

        // Prevent deleting paid payrolls to preserve history
        if (payroll.status === 'Paid') return res.status(400).json({ message: "Cannot delete Paid payroll records." });

        await Payroll.findByIdAndDelete(id);
        await logAction(req.user, 'DELETE_PAYROLL', `Deleted payroll draft ${id}`, req, {
            id: id,
            model: 'Payroll',
            changes: { before: payroll.toObject() }
        });
        res.json({ message: "Deleted Successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- EXPENSE MANAGEMENT ---

export const createExpense = async (req, res) => {
    try {
        const { accountId, amount, category, categoryId, title, description, date } = req.body;

        let catDoc = null;
        if (categoryId) {
            catDoc = await FinanceCategory.findOne({ _id: categoryId, type: 'expense' });
            if (!catDoc) return res.status(404).json({ message: 'Expense category not found' });
        } else if (category) {
            catDoc = await FinanceCategory.findOne({ name: category, type: 'expense' });
        }

        const categoryName = catDoc ? catDoc.name : category;
        if (!categoryName) return res.status(400).json({ message: 'category (or categoryId) is required' });

        // 1. Budget Check
        if (catDoc && catDoc.budget > 0) {
            // Calculate total expenses for this category in current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const spentThisMonth = await Expense.aggregate([
                { $match: { category: categoryName, date: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const currentSpent = spentThisMonth[0]?.total || 0;
            if (currentSpent + Number(amount) > catDoc.budget) {
                return res.status(400).json({
                    message: `Monthly budget exceeded for ${categoryName}. Current: $${currentSpent}, Limit: $${catDoc.budget}`
                });
            }
        }

        // 2. Validate Account
        if (accountId) {
            const Account = (await import('../../models/Account.js')).default;
            const account = await Account.findById(accountId);
            if (!account) return res.status(404).json({ message: 'Account not found' });
            if (account.balance < amount) return res.status(400).json({ message: 'Insufficient funds in the selected account' });
            account.balance -= Number(amount);
            await account.save();
        }

        const expense = new Expense({
            title,
            category: categoryName,
            categoryRef: catDoc?._id,
            amount: Number(amount),
            date: date ? new Date(date) : new Date(),
            description,
            account: accountId || undefined,
            approvedBy: req.user._id,
            createdBy: req.user._id,
        });
        await expense.save();

        await logAction(req.user, 'CREATE_EXPENSE', `Created expense: ${expense.title} (${expense.category}) for $${amount}`, req, {
            id: expense._id,
            model: 'Expense',
            changes: { after: expense.toObject() }
        });
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const oldExpense = await Expense.findById(id).lean();
        const expense = await Expense.findByIdAndUpdate(id, req.body, { new: true });

        if (!expense) return res.status(404).json({ message: "Not Found" });

        await logAction(req.user, 'UPDATE_EXPENSE', `Updated expense ${expense.title}`, req, {
            id: expense._id,
            model: 'Expense',
            changes: { before: oldExpense, after: expense.toObject() }
        });
        res.json(expense);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findById(id);
        if (!expense) return res.status(404).json({ message: "Not Found" });

        // Optional: Revert account balance if needed. For now, we assume simple soft delete or strict delete.
        await Expense.findByIdAndDelete(id);

        await logAction(req.user, 'DELETE_EXPENSE', `Deleted expense ${expense.title}`, req, {
            id: id,
            model: 'Expense',
            changes: { before: expense.toObject() }
        });
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// --- LISTING HELPERS ---
export const getInvoices = async (req, res) => {
    try {
        const { studentId, status, classId, search, _id } = req.query;
        let query = {};
        if (_id && mongoose.Types.ObjectId.isValid(String(_id))) query._id = String(_id);
        if (studentId) query.student = studentId;
        if (status && status !== 'All') query.status = status;
        if (classId && classId !== 'All') query.class = classId;

        // Fuzzy Search for Student Name or Invoice ID
        if (search) {
            const Student = (await import('../../models/Student.js')).default;
            // Find students matching name, studentId, or phone
            const matchingStudents = await Student.find({
                $or: [
                    { fullName: { $regex: search, $options: 'i' } },
                    { studentId: { $regex: search, $options: 'i' } },
                    { contactNumber: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');

            const studentIds = matchingStudents.map(s => s._id);

            if (mongoose.Types.ObjectId.isValid(search)) {
                // Search by Invoice ID or Student ID
                query.$or = [
                    { _id: search },
                    { student: { $in: studentIds } },
                    { student: search }
                ];
            } else {
                // Search by Student Name (via IDs)
                query.student = { $in: studentIds };
            }
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await FeeInvoice.countDocuments(query);
        const invoices = await FeeInvoice.find(query)
            .populate('student', 'fullName studentId contactNumber isFree')
            .populate({
                path: 'class',
                select: 'section grade shift fee name gradeName',
                populate: [
                    { path: 'grade', select: 'name gradeName' },
                    { path: 'shift', select: 'shiftName' }
                ]
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: invoices,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrolls = async (req, res) => {
    try {
        const { month, academicYear } = req.query;
        let query = {};
        if (month) query.month = month;
        if (academicYear) query.academicYear = academicYear;

        const payrolls = await Payroll.find(query)
            .populate('staff', 'fullName username email phone role status employeeType salary')
            .populate('academicYear', 'yearName')
            .populate('account', 'name type');
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrollStaffLedger = async (req, res) => {
    try {
        const { staffId, academicYear } = req.query;
        if (!staffId || !mongoose.Types.ObjectId.isValid(String(staffId))) {
            return res.status(400).json({ message: 'staffId is required' });
        }

        const query = { staff: staffId };
        if (academicYear && mongoose.Types.ObjectId.isValid(String(academicYear))) query.academicYear = academicYear;

        const payrolls = await Payroll.find(query)
            .populate('staff', 'fullName username email phone role status employeeType salary')
            .populate('academicYear', 'yearName')
            .populate('account', 'name type')
            .sort({ month: 1, createdAt: 1 });

        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePayrollByParams = async (req, res) => {
    try {
        const { employee, month, academicYear, updateType, amount } = req.body;

        if (!employee || !mongoose.Types.ObjectId.isValid(String(employee))) {
            return res.status(400).json({ message: 'Employee is required' });
        }
        if (!month || !/^\d{4}-\d{2}$/.test(String(month))) {
            return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
        }
        if (!academicYear || !mongoose.Types.ObjectId.isValid(String(academicYear))) {
            return res.status(400).json({ message: 'Academic Year is required' });
        }
        if (!updateType || !['salaryCharge', 'commission', 'salaryDecrease'].includes(String(updateType))) {
            return res.status(400).json({ message: 'Invalid update type' });
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount)) return res.status(400).json({ message: 'Amount is required' });

        const payroll = await Payroll.findOne({ staff: employee, month, academicYear });
        if (!payroll) return res.status(404).json({ message: 'Payroll charge not found for selected employee/month/year' });
        if (payroll.status === 'Paid') return res.status(400).json({ message: 'Cannot update a Paid payroll record' });

        const oldSnapshot = payroll.toObject();

        if (updateType === 'salaryCharge') payroll.basicSalary = numericAmount;
        if (updateType === 'commission') payroll.commission = numericAmount;
        if (updateType === 'salaryDecrease') payroll.decrease = numericAmount;

        const allowanceTotal = (payroll.allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
        const deductionTotal = (payroll.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
        payroll.netSalary =
            Number(payroll.basicSalary || 0) +
            Number(allowanceTotal || 0) +
            Number(payroll.commission || 0) +
            Number(payroll.correction || 0) -
            Number(payroll.decrease || 0) -
            Number(deductionTotal || 0);

        await payroll.save();

        await logAction(req.user, 'UPDATE_PAYROLL_BY_PARAMS', `Updated payroll ${payroll._id} (${updateType})`, req, {
            id: payroll._id,
            model: 'Payroll',
            changes: { before: oldSnapshot, after: payroll.toObject() }
        });

        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updatePayrollLedger = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(String(id))) {
            return res.status(400).json({ message: 'Invalid payroll id' });
        }

        const {
            sendNumber,
            description,
            commission,
            decrease,
            paidAmount,
        } = req.body || {};

        const payroll = await Payroll.findById(id);
        if (!payroll) return res.status(404).json({ message: 'Payroll record not found' });
        if (payroll.status === 'Paid') return res.status(400).json({ message: 'Cannot update a Paid payroll record' });

        const numericCommission = commission !== undefined ? Number(commission) : undefined;
        const numericDecrease = decrease !== undefined ? Number(decrease) : undefined;
        const numericPaid = paidAmount !== undefined ? Number(paidAmount) : undefined;

        if (numericCommission !== undefined && !Number.isFinite(numericCommission)) {
            return res.status(400).json({ message: 'Commission must be a number' });
        }
        if (numericDecrease !== undefined && !Number.isFinite(numericDecrease)) {
            return res.status(400).json({ message: 'Decrease must be a number' });
        }
        if (numericPaid !== undefined && (!Number.isFinite(numericPaid) || numericPaid < 0)) {
            return res.status(400).json({ message: 'Paid amount must be a non-negative number' });
        }

        if (sendNumber !== undefined) payroll.sendNumber = String(sendNumber || '').trim();
        if (description !== undefined) payroll.description = String(description || '').trim();
        if (numericCommission !== undefined) payroll.commission = numericCommission;
        if (numericDecrease !== undefined) payroll.decrease = numericDecrease;
        if (numericPaid !== undefined) payroll.paidAmount = numericPaid;

        const allowanceTotal = (payroll.allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
        const deductionTotal = (payroll.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
        payroll.netSalary =
            Number(payroll.basicSalary || 0) +
            Number(allowanceTotal || 0) +
            Number(payroll.commission || 0) +
            Number(payroll.correction || 0) -
            Number(payroll.decrease || 0) -
            Number(deductionTotal || 0);

        await payroll.save();

        await logAction(req.user, 'UPDATE_PAYROLL_LEDGER', `Updated payroll ledger ${id}`, req, {
            id: payroll._id,
            model: 'Payroll',
            changes: {
                sendNumber: payroll.sendNumber,
                description: payroll.description,
                commission: payroll.commission,
                decrease: payroll.decrease,
                paidAmount: payroll.paidAmount,
            },
        });

        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
