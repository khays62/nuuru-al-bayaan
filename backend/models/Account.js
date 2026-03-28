import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    institution: {
        type: String,
        required: true,
        trim: true,
        default: 'Unknown'
    },
    branch: { type: String, default: 'Main' }, // Added to match user requirement
    accountNumber: { type: String, required: true, trim: true, default: 'N/A' },
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    currency: { type: String, default: 'USD' },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

// Backward-compatibility:
// Existing documents may not have these fields yet; ensure we can still save balances/transfers.
AccountSchema.pre('validate', function (next) {
    if (!this.institution || !String(this.institution).trim()) this.institution = 'Unknown';
    if (!this.accountNumber || !String(this.accountNumber).trim()) this.accountNumber = 'N/A';
    next();
});

export default mongoose.model('Account', AccountSchema);
