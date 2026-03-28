import mongoose from 'mongoose';

const FinanceAccountTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameLower: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

FinanceAccountTypeSchema.pre('validate', function (next) {
  const normalized = String(this.name || '').trim();
  this.name = normalized;
  this.nameLower = normalized.toLowerCase();
  next();
});

export default mongoose.model('FinanceAccountType', FinanceAccountTypeSchema);
