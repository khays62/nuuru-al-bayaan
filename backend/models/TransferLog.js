import mongoose from 'mongoose';

const { Schema } = mongoose;

const transferLogSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  fromGradeSection: { type: Schema.Types.ObjectId, ref: 'GradeSection', required: true },
  toGradeSection: { type: Schema.Types.ObjectId, ref: 'GradeSection', required: true },
  byUser: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: Date, default: Date.now },
  reason: { type: String, trim: true },
  notes: { type: String, trim: true },
  // Mark this log as a revert (returning back to the previous section)
  reverted: { type: Boolean, default: false },
  revertOf: { type: Schema.Types.ObjectId, ref: 'TransferLog', default: null }
}, { timestamps: true });

transferLogSchema.index({ student: 1, date: -1 });

export default mongoose.model('TransferLog', transferLogSchema);
