import mongoose from 'mongoose';

const FeeTransactionSchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FeeInvoice',
        required: false // Optional for Advance Payments (Hormaris)
    },
    transactionType: {
        type: String,
        enum: ['Payment', 'Credit', 'Hormaris', 'Refund'],
        default: 'Payment'
    },
    targetMonth: { type: String }, // For Hormaris: e.g., "2023-10"
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: false
    },
    amount: { type: Number, required: true, min: 0.01 },
    method: {
        type: String,
        required: true,
        trim: true
    },
    reference: { type: String, trim: true }, // Transaction ID, Cheque No.
    date: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Completed', 'Reversed'], default: 'Completed' },
    remarks: { type: String }
    ,
    // Groups multiple transactions created by a single month payment action
    paymentGroup: { type: mongoose.Schema.Types.ObjectId, index: true }
}, { timestamps: true });

export default mongoose.model('FeeTransaction', FeeTransactionSchema);
