import mongoose from "mongoose";

const feeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },

  gradeSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GradeSection",
    required: true
  },

  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AcademicYear",
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  balance: {
    type: Number,
    default: function () {
      return this.amount;
    }
  },

  status: {
    type: String,
    enum: ["unpaid", "partial", "paid"],
    default: "unpaid"
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true });

export default mongoose.model("Fee", feeSchema);
