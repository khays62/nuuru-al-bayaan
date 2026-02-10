import mongoose from 'mongoose';

const AppointmentHistorySchema = new mongoose.Schema({
    action: { type: String, required: true },
    fromStatus: { type: String },
    toStatus: { type: String },
    notes: { type: String },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
}, { _id: false });

const FinanceAppointmentSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true, unique: true, index: true },
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeSection', required: true },
    amountType: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCategory', required: true },
    expectedAmount: { type: Number, required: true, min: 0 },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true }, // HH:mm
    appointmentDateTime: { type: Date, required: true, index: true },
    paymentMethod: { type: String, required: true, trim: true },
    notes: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Missed', 'Cancelled'],
        default: 'Pending',
        index: true
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    receipt: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeTransaction' },
    paidAmount: { type: Number, min: 0 },
    history: [AppointmentHistorySchema]
}, { timestamps: true });

FinanceAppointmentSchema.index({ student: 1, amountType: 1, status: 1 });

export default mongoose.model('FinanceAppointment', FinanceAppointmentSchema);
