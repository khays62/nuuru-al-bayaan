import mongoose from 'mongoose';

const FeeTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    enum: ['personal', 'free'],
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
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

FeeTypeSchema.index({ status: 1, code: 1 });

export default mongoose.model('FeeType', FeeTypeSchema);
