import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    // Dynamic category name (backed by FinanceCategory type='expense')
    category: { type: String, required: true, trim: true },
    categoryRef: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCategory' },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    description: { type: String },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    overBudget: { type: Boolean, default: false },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Approved' }
}, { timestamps: true });

ExpenseSchema.index({ categoryRef: 1, date: -1 });
ExpenseSchema.index({ category: 1, date: -1 });

export default mongoose.model('Expense', ExpenseSchema);
