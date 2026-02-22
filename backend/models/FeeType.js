import mongoose from 'mongoose';


const FeeTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mode: {
    type: String,
    enum: ['charge', 'waive', 'discount'],
    default: 'charge'
  },
  discountPercent: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

FeeTypeSchema.index({ status: 1, code: 1 });

export default mongoose.model('FeeType', FeeTypeSchema);
