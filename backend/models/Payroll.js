import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
    staff: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Linking to User (Teacher/Staff)
        required: true
    },
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear',
        required: false
    },
    month: { type: String, required: true }, // YYYY-MM
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: [{
        title: String,
        amount: Number
    }],
    deductions: [{
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear'
    },
        title: String,
        amount: Number
    }],
    commission: { type: Number, default: 0 },
    decrease: { type: Number, default: 0 },
    correction: { type: Number, default: 0 },
    sendNumber: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    paidAmount: { type: Number, default: 0 },
    // Tracks how much was actually paid from which account(s).
    // Used for accurate refunds when deleting payroll records.
    paymentSplits: [{
        account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
        amount: { type: Number, default: 0, min: 0 },
        date: { type: Date },
    }],
    netSalary: { type: Number, required: true },
    paymentDate: { type: Date },
    status: {
        type: String,
        enum: ['Draft', 'Approved', 'Paid'],
        default: 'Draft'
    },
    paymentMethod: { type: String },
    reference: { type: String },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Payroll', PayrollSchema);
