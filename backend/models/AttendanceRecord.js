import mongoose from 'mongoose';

const AttendanceRecordSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  gradeSection: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeSection', required: true },
  periodCode: { type: String },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['present','absent','late','excused','sick','medical','family','other'], required: true },
  // Admin can mark attendance before teacher auth exists; later we can enforce markedBy.
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  // Actor metadata (supports admin/staff/teacher audit display)
  markedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  markedByRole: { type: String, enum: ['admin', 'staff', 'teacher', null], default: null },
  updatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedByRole: { type: String, enum: ['admin', 'staff', 'teacher', null], default: null },
  remarks: { type: String, default: '', trim: true },
}, { timestamps: true });

AttendanceRecordSchema.index({ gradeSection: 1, date: 1, periodCode: 1, student: 1 }, { unique: false });

export default mongoose.models.AttendanceRecord || mongoose.model('AttendanceRecord', AttendanceRecordSchema);
