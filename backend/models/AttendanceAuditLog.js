import mongoose from 'mongoose';

const AttendanceAuditLogSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  gradeSection: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeSection', required: true },
  periodCode: { type: String, required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

  oldStatus: { type: String, enum: ['present', 'absent', 'late', 'excused', 'sick', 'medical', 'family', 'other', null], default: null },
  newStatus: { type: String, enum: ['present', 'absent', 'late', 'excused', 'sick', 'medical', 'family', 'other'], required: true },

  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
}, { timestamps: true });

AttendanceAuditLogSchema.index({ gradeSection: 1, date: 1, periodCode: 1, student: 1, createdAt: -1 });
AttendanceAuditLogSchema.index({ markedBy: 1, createdAt: -1 });

export default mongoose.models.AttendanceAuditLog || mongoose.model('AttendanceAuditLog', AttendanceAuditLogSchema);
