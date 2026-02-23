import mongoose from 'mongoose';
import FinanceAppointment from '../../models/FinanceAppointment.js';
import Student from '../../models/Student.js';
import GradeSection from '../../models/GradeSection.js';
import AcademicYear from '../../models/AcademicYear.js';
import FinanceCategory from '../../models/FinanceCategory.js';
import FeeInvoice from '../../models/FeeInvoice.js';
import FeeTransaction from '../../models/FeeTransaction.js';
import Account from '../../models/Account.js';

import { publishRealtime } from '../../utils/realtimeBus.js';

const isValidObjectId = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

const generateAppointmentId = () => `APT-${Date.now().toString(36).toUpperCase()}`;

const toDateTime = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    const [hh, mm] = String(timeStr).split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(hh, mm, 0, 0);
    return d;
};

const markMissedAppointments = async () => {
    const now = new Date();
    await FinanceAppointment.updateMany(
        { status: 'Pending', appointmentDateTime: { $lt: now } },
        { $set: { status: 'Missed' } }
    );
};

export async function createAppointment(req, res) {
    try {
        const {
            academicYear,
            studentId,
            classId,
            amountTypeId,
            expectedAmount,
            appointmentDate,
            appointmentTime,
            paymentMethod,
            notes,
            overrideConflict
        } = req.body;

        if (!academicYear || !studentId || !classId || !amountTypeId || !appointmentDate || !appointmentTime || !paymentMethod) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (![academicYear, studentId, classId, amountTypeId].every(isValidObjectId)) {
            return res.status(400).json({ message: 'Invalid IDs in request' });
        }

        const appointmentDateTime = toDateTime(appointmentDate, appointmentTime);
        if (!appointmentDateTime) return res.status(400).json({ message: 'Invalid appointment date/time' });
        if (appointmentDateTime <= new Date()) return res.status(400).json({ message: 'Appointment date must be in the future' });

        const [student, cls, year, category] = await Promise.all([
            Student.findById(studentId),
            GradeSection.findById(classId),
            AcademicYear.findById(academicYear),
            FinanceCategory.findById(amountTypeId)
        ]);

        if (!student || !cls || !year || !category) {
            return res.status(400).json({ message: 'Invalid student/class/academic year/amount type' });
        }

        if (overrideConflict && req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Only admin can override appointment conflicts' });
        }

        if (!overrideConflict) {
            const existing = await FinanceAppointment.findOne({
                student: studentId,
                amountType: amountTypeId,
                status: 'Pending'
            });
            if (existing) {
                return res.status(409).json({ message: 'Student already has an active appointment for this amount type' });
            }
        }

        const appointment = await FinanceAppointment.create({
            appointmentId: generateAppointmentId(),
            academicYear,
            student: studentId,
            class: classId,
            amountType: amountTypeId,
            expectedAmount: Number(expectedAmount || 0),
            appointmentDate: new Date(appointmentDate),
            appointmentTime,
            appointmentDateTime,
            paymentMethod,
            notes: notes || '',
            createdBy: req.user?._id,
            history: [{
                action: 'CREATE',
                toStatus: 'Pending',
                notes: notes || '',
                by: req.user?._id
            }]
        });

        try {
            publishRealtime({ type: 'financeAppointments:changed', id: String(appointment._id), status: appointment.status, ts: Date.now() });
        } catch { /* ignore */ }

        res.status(201).json(appointment);
    } catch (error) {
        console.error('createAppointment Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function listAppointments(req, res) {
    try {
        await markMissedAppointments();
        const { status, classId, academicYearId, studentId, date, from, to, page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
        const skip = (pageNum - 1) * limitNum;

        const query = {};
        if (status) query.status = status;
        if (classId && isValidObjectId(classId)) query.class = classId;
        if (academicYearId && isValidObjectId(academicYearId)) query.academicYear = academicYearId;

        if (studentId) {
            if (isValidObjectId(studentId)) query.student = studentId;
            else {
                const student = await Student.findOne({ studentId: studentId });
                if (!student) return res.json({ data: [], meta: { page: pageNum, limit: limitNum, total: 0, totalPages: 1 } });
                query.student = student._id;
            }
        }

        if (date) {
            const d = new Date(date);
            if (Number.isNaN(d.getTime())) return res.status(400).json({ message: 'Invalid date' });
            const start = new Date(d);
            start.setHours(0, 0, 0, 0);
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);
            query.appointmentDateTime = { $gte: start, $lte: end };
        } else if (from || to) {
            const start = from ? new Date(from) : new Date('1970-01-01');
            const end = to ? new Date(to) : new Date('2999-12-31');
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                return res.status(400).json({ message: 'Invalid from/to date range' });
            }
            query.appointmentDateTime = { $gte: start, $lte: end };
        }

        const [rows, total] = await Promise.all([
            FinanceAppointment.find(query)
                .populate('student', 'fullName studentId contactNumber currentClass')
                .populate({
                    path: 'class',
                    select: 'section grade shift name gradeName',
                    populate: [
                        { path: 'grade', select: 'name gradeName' },
                        { path: 'shift', select: 'shiftName' }
                    ]
                })
                .populate('academicYear', 'yearName')
                .populate('amountType', 'name type')
                .populate('createdBy', 'fullName name')
                .populate('receipt')
                .sort({ appointmentDateTime: 1 })
                .skip(skip)
                .limit(limitNum),
            FinanceAppointment.countDocuments(query)
        ]);

        const totalPages = Math.max(Math.ceil(total / limitNum), 1);
        res.json({ data: rows, meta: { page: pageNum, limit: limitNum, total, totalPages } });
    } catch (error) {
        console.error('listAppointments Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function getTodayAppointments(req, res) {
    try {
        await markMissedAppointments();
        const now = new Date();
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);

        const rows = await FinanceAppointment.find({ appointmentDateTime: { $gte: start, $lte: end } })
            .populate('student', 'fullName studentId contactNumber currentClass')
            .populate({
                path: 'class',
                select: 'section grade shift name gradeName',
                populate: [
                    { path: 'grade', select: 'name gradeName' },
                    { path: 'shift', select: 'shiftName' }
                ]
            })
            .populate('academicYear', 'yearName')
            .populate('amountType', 'name type')
            .populate('createdBy', 'fullName name')
            .populate('receipt')
            .sort({ appointmentDateTime: 1 });

        res.json({ data: rows });
    } catch (error) {
        console.error('getTodayAppointments Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function getMissedAppointments(req, res) {
    try {
        await markMissedAppointments();
        const rows = await FinanceAppointment.find({ status: 'Missed' })
            .populate('student', 'fullName studentId contactNumber currentClass')
            .populate({
                path: 'class',
                select: 'section grade shift name gradeName',
                populate: [
                    { path: 'grade', select: 'name gradeName' },
                    { path: 'shift', select: 'shiftName' }
                ]
            })
            .populate('academicYear', 'yearName')
            .populate('amountType', 'name type')
            .populate('createdBy', 'fullName name')
            .populate('receipt')
            .sort({ appointmentDateTime: 1 });

        res.json({ data: rows });
    } catch (error) {
        console.error('getMissedAppointments Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function getCompletedAppointments(req, res) {
    try {
        const rows = await FinanceAppointment.find({ status: 'Completed' })
            .populate('student', 'fullName studentId contactNumber currentClass')
            .populate({
                path: 'class',
                select: 'section grade shift name gradeName',
                populate: [
                    { path: 'grade', select: 'name gradeName' },
                    { path: 'shift', select: 'shiftName' }
                ]
            })
            .populate('academicYear', 'yearName')
            .populate('amountType', 'name type')
            .populate('createdBy', 'fullName name')
            .populate('receipt')
            .sort({ completedAt: -1 });

        res.json({ data: rows });
    } catch (error) {
        console.error('getCompletedAppointments Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function updateAppointment(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid appointment id' });

        const appt = await FinanceAppointment.findById(id);
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status !== 'Pending') return res.status(400).json({ message: 'Only pending appointments can be edited' });

        const {
            amountTypeId,
            expectedAmount,
            appointmentDate,
            appointmentTime,
            paymentMethod,
            notes
        } = req.body;

        if (amountTypeId && !isValidObjectId(amountTypeId)) return res.status(400).json({ message: 'Invalid amount type' });

        if (appointmentDate || appointmentTime) {
            const nextDate = appointmentDate || appt.appointmentDate.toISOString().slice(0, 10);
            const nextTime = appointmentTime || appt.appointmentTime;
            const nextDateTime = toDateTime(nextDate, nextTime);
            if (!nextDateTime) return res.status(400).json({ message: 'Invalid appointment date/time' });
            if (nextDateTime <= new Date()) return res.status(400).json({ message: 'Appointment date must be in the future' });
            appt.appointmentDate = new Date(nextDate);
            appt.appointmentTime = nextTime;
            appt.appointmentDateTime = nextDateTime;
        }

        if (amountTypeId) appt.amountType = amountTypeId;
        if (expectedAmount !== undefined) appt.expectedAmount = Number(expectedAmount || 0);
        if (paymentMethod) appt.paymentMethod = paymentMethod;
        if (notes !== undefined) appt.notes = notes;

        appt.history.push({
            action: 'EDIT',
            fromStatus: appt.status,
            toStatus: appt.status,
            notes: 'Appointment edited',
            by: req.user?._id
        });

        await appt.save();

        try {
            publishRealtime({ type: 'financeAppointments:changed', id: String(appt._id), status: appt.status, ts: Date.now() });
        } catch { /* ignore */ }

        res.json(appt);
    } catch (error) {
        console.error('updateAppointment Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function cancelAppointment(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid appointment id' });

        const appt = await FinanceAppointment.findById(id);
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status === 'Completed') return res.status(400).json({ message: 'Completed appointment cannot be cancelled' });

        const prevStatus = appt.status;
        appt.status = 'Cancelled';
        appt.history.push({
            action: 'CANCEL',
            fromStatus: prevStatus,
            toStatus: 'Cancelled',
            notes: 'Appointment cancelled',
            by: req.user?._id
        });
        await appt.save();

        try {
            publishRealtime({ type: 'financeAppointments:changed', id: String(appt._id), status: appt.status, ts: Date.now() });
        } catch { /* ignore */ }

        res.json({ message: 'Appointment cancelled' });
    } catch (error) {
        console.error('cancelAppointment Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function rescheduleAppointment(req, res) {
    try {
        const { id } = req.params;
        const { appointmentDate, appointmentTime, reason } = req.body;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid appointment id' });
        if (!appointmentDate || !appointmentTime) return res.status(400).json({ message: 'appointmentDate and appointmentTime are required' });

        const appt = await FinanceAppointment.findById(id);
        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status === 'Completed' || appt.status === 'Cancelled') return res.status(400).json({ message: 'Cannot reschedule completed/cancelled appointments' });

        const nextDateTime = toDateTime(appointmentDate, appointmentTime);
        if (!nextDateTime) return res.status(400).json({ message: 'Invalid appointment date/time' });
        if (nextDateTime <= new Date()) return res.status(400).json({ message: 'Appointment date must be in the future' });

        const prevStatus = appt.status;
        appt.appointmentDate = new Date(appointmentDate);
        appt.appointmentTime = appointmentTime;
        appt.appointmentDateTime = nextDateTime;
        appt.status = 'Pending';

        appt.history.push({
            action: 'RESCHEDULE',
            fromStatus: prevStatus,
            toStatus: 'Pending',
            notes: reason || 'Rescheduled',
            by: req.user?._id
        });

        await appt.save();

        try {
            publishRealtime({ type: 'financeAppointments:changed', id: String(appt._id), status: appt.status, ts: Date.now() });
        } catch { /* ignore */ }

        res.json(appt);
    } catch (error) {
        console.error('rescheduleAppointment Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function startAppointmentPayment(req, res) {
    try {
        const { id } = req.params;
        const { paidAmount, accountId, method, reference, remarks } = req.body;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid appointment id' });

        const appt = await FinanceAppointment.findById(id)
            .populate('student')
            .populate('class')
            .populate('amountType');

        if (!appt) return res.status(404).json({ message: 'Appointment not found' });
        if (appt.status !== 'Pending') return res.status(400).json({ message: 'Only pending appointments can be paid' });

        const amount = Number(paidAmount);
        if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Paid amount must be greater than zero' });

        const appointmentMonth = appt.appointmentDate ? appt.appointmentDate.toISOString().slice(0, 7) : '';

        let invoice = await FeeInvoice.findOne({
            student: appt.student?._id,
            'items.category': appt.amountType?._id,
            billingMonth: appointmentMonth,
            status: { $ne: 'Cancelled' }
        }).sort({ createdAt: -1 });

        if (!invoice) {
            invoice = await FeeInvoice.create({
                student: appt.student?._id,
                class: appt.class?._id,
                academicYear: appt.academicYear,
                billingMonth: appointmentMonth,
                title: appt.amountType?.name || 'Appointment Payment',
                items: [{
                    name: appt.amountType?.name || 'Payment',
                    amount: Number(appt.expectedAmount || 0),
                    category: appt.amountType?._id
                }],
                discounts: [],
                amount: Number(appt.expectedAmount || 0),
                paidAmount: 0,
                balance: Number(appt.expectedAmount || 0),
                dueDate: appt.appointmentDateTime || appt.appointmentDate,
                status: 'Unpaid',
                createdBy: req.user?._id
            });
        }

        if (invoice.status === 'Paid') return res.status(400).json({ message: 'Invoice already fully paid' });

        if (amount > invoice.balance) {
            return res.status(400).json({ message: 'Amount exceeds balance' });
        }

        invoice.paidAmount += amount;
        await invoice.save();

        if (accountId && isValidObjectId(accountId)) {
            const account = await Account.findById(accountId);
            if (account) {
                account.balance += amount;
                await account.save();
            }
        }

        const transaction = await FeeTransaction.create({
            invoice: invoice._id,
            student: appt.student?._id,
            account: accountId || undefined,
            amount,
            method: method || appt.paymentMethod,
            reference,
            remarks,
            transactionType: 'Payment',
            recordedBy: req.user?._id
        });

        appt.status = 'Completed';
        appt.completedAt = new Date();
        appt.receipt = transaction._id;
        appt.paidAmount = amount;
        appt.history.push({
            action: 'PAYMENT',
            fromStatus: 'Pending',
            toStatus: 'Completed',
            notes: amount < Number(appt.expectedAmount || 0)
                ? 'Underpayment'
                : (amount > Number(appt.expectedAmount || 0) ? 'Overpayment' : 'Exact payment'),
            by: req.user?._id
        });
        await appt.save();

        try {
            publishRealtime({ type: 'financeAppointments:changed', id: String(appt._id), status: appt.status, ts: Date.now() });
        } catch { /* ignore */ }

        try {
            if (appt?.student?._id) publishRealtime({ type: 'studentFinance:changed', studentId: String(appt.student._id), ts: Date.now() });
        } catch { /* ignore */ }

        try {
            publishRealtime({ type: 'accounts:changed', ts: Date.now() });
        } catch { /* ignore */ }

        res.json({ appointment: appt, receipt: transaction, invoice });
    } catch (error) {
        console.error('startAppointmentPayment Error:', error);
        res.status(500).json({ message: error.message });
    }
}

export async function getAppointmentSlip(req, res) {
    try {
        const { id } = req.params;
        if (!isValidObjectId(id)) return res.status(400).json({ message: 'Invalid appointment id' });

        const appt = await FinanceAppointment.findById(id)
            .populate('student', 'fullName studentId contactNumber currentClass')
            .populate({
                path: 'class',
                select: 'section grade shift name gradeName',
                populate: [
                    { path: 'grade', select: 'name gradeName' },
                    { path: 'shift', select: 'shiftName' }
                ]
            })
            .populate('academicYear', 'yearName')
            .populate('amountType', 'name type');

        if (!appt) return res.status(404).json({ message: 'Appointment not found' });

        res.json({ appointment: appt });
    } catch (error) {
        console.error('getAppointmentSlip Error:', error);
        res.status(500).json({ message: error.message });
    }
}
