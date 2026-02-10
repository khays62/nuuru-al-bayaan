import mongoose from 'mongoose';

const DonorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    type: {
        type: String,
        enum: ['Individual', 'Organization', 'Government'],
        default: 'Individual'
    },
    address: { type: String },
    notes: { type: String },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

export default mongoose.model('Donor', DonorSchema);
