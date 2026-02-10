// models/PaymentLog.js
import mongoose from 'mongoose';

const PaymentLogSchema = new mongoose.Schema(
  {
    studentFee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFee',
    },
    amount: Number,
    method: {
      type: String,
      enum: ['cash', 'mobile', 'bank'],
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentLog', PaymentLogSchema);
