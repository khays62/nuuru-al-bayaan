import mongoose from 'mongoose';

const TeacherAssignmentSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  gradeSection: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeSection', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  role: { type: String, enum: ['main','assistant'], default: 'main' },
}, { timestamps: true });

TeacherAssignmentSchema.index({ teacher: 1, gradeSection: 1, subject: 1 }, { unique: true });

export default mongoose.models.TeacherAssignment || mongoose.model('TeacherAssignment', TeacherAssignmentSchema);
