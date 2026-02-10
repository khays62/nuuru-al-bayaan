// models/StudentFee.js
import mongoose from 'mongoose';

const StudentFeeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    gradeSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GradeSection',
      required: true,
    },
    month: {
      type: String, // "2025-12"
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid',
    },
    paidAt: Date,
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // cashier/admin
    },
  },
  { timestamps: true }
);

StudentFeeSchema.index(
  { student: 1, month: 1 },
  { unique: true }
);

export default mongoose.model('StudentFee', StudentFeeSchema);
