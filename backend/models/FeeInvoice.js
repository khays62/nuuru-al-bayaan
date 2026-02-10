import mongoose from 'mongoose';

const FeeInvoiceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GradeSection'
    }, // Snapshot of class when invoice created
    academicYear: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AcademicYear'
    },

    // Month bucket for receipt workflows and monthly invoicing (e.g. "2026-01")
    billingMonth: { type: String, trim: true },

    title: { type: String, required: true }, // e.g., "Term 1 Invoice"

    // [NEW] Granular Fee Items
    items: [{
        name: { type: String, required: true }, // e.g. "Tuition Fee"
        amount: { type: Number, required: true, min: 0 },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCategory' }
    }],

    // [NEW] Discount tracking
    discounts: [{
        name: { type: String, required: true }, // e.g. "Sibling Discount"
        type: { type: String, enum: ['percentage', 'fixed'], required: true },
        value: { type: Number, required: true }, // 10% or $50
        amountOff: { type: Number, required: true } // The actual deducted amount
    }],

    // [NEW] For Sponsored/Free Students
    isWaived: { type: Boolean, default: false },
    waiverReason: { type: String },

    // Marks invoices created ahead of their billing month (advance / Hormaris)
    isHormaris: { type: Boolean, default: false },

    amount: { type: Number, required: true, min: 0 }, // Final Total to be paid
    paidAmount: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: function () { return this.amount } },

    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Unpaid', 'Partial', 'Paid', 'Overdue', 'Cancelled'],
        default: 'Unpaid'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Helpful index for monthly receipt tables (not unique; allows multiple categories per month)
FeeInvoiceSchema.index({ student: 1, academicYear: 1, billingMonth: 1 });

// Ensure balance matches math
FeeInvoiceSchema.pre('save', function (next) {
    // 1. Calculate implied total if items exist (sanity check, usually controller handles this, but good payload safety)
    if (this.items && this.items.length > 0) {
        const subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);
        const totalDiscount = this.discounts ? this.discounts.reduce((sum, d) => sum + d.amountOff, 0) : 0;
        this.amount = Math.max(0, subtotal - totalDiscount);
    }

    // 2. Handle Waiver / Free Student logic
    if (this.isWaived) {
        this.balance = 0;
        if (this.status !== 'Cancelled') this.status = 'Paid';
    } else {
        // Standard Balance Calc
        this.balance = this.amount - this.paidAmount;

        // Status Update
        if (this.balance <= 0) {
            this.balance = 0;
            if (this.status !== 'Cancelled') this.status = 'Paid';
        } else if (this.paidAmount > 0 && this.status !== 'Cancelled') {
            this.status = 'Partial';
        } else if (this.status !== 'Cancelled') {
            this.status = 'Unpaid';
        }
    }

    next();
});

export default mongoose.model('FeeInvoice', FeeInvoiceSchema);
