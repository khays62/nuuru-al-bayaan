import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  fee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fee",
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 1
  },

  paymentMethod: {
    type: String,
    enum: ["cash", "mobile", "bank"],
    default: "cash"
  },

  reference: String,

  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  paidAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model("FeePayment", paymentSchema);
