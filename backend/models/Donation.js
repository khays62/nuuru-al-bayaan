import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donor',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: { type: String, default: 'USD' },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FinanceCategory', // e.g., "Building Fund" - stored as a Category
        required: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account', // Which bank/cash account received the money
        required: true
    },
    method: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'Check', 'Mobile Money'],
        required: true
    },
    reference: { type: String }, // Check number, Transaction ID
    notes: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Donation', DonationSchema);
