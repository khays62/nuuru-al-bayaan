import mongoose from 'mongoose';

const FinanceCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['fee', 'expense', 'donation', 'paymentMethod'],
        required: true
    },
    description: { type: String },
    // Used by UI for fee categorization (Standard/Mandatory/Registration/etc.)
    feeType: { type: String, trim: true, default: 'Standard' },
    defaultAmount: { type: Number, default: 0 }, // Useful for fixed fees like "Exams"
    applicableLevels: [{ type: String }], // e.g., ["Grade 1", "Grade 2"] or empty for all
    isOptional: { type: Boolean, default: false }, // For optional fees like "Trip" or "Bus"
    budget: { type: Number, default: 0 }, // For expense budget limits
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

export default mongoose.model('FinanceCategory', FinanceCategorySchema);
