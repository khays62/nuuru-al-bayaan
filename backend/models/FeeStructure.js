// models/FeeStructure.js
import mongoose from 'mongoose';

const FeeStructureSchema = new mongoose.Schema(
  {
    gradeSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GradeSection',
      required: true,
      // unique: true,
    },
    monthlyFee: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model('FeeStructure', FeeStructureSchema);
