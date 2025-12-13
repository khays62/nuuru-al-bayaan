import mongoose from 'mongoose';

const LessonPlanSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  gradeSection: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeSection', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: Date, required: true },
  topic: { type: String, required: true },
  objectives: { type: String },
  materials: { type: String },
  notes: { type: String },
}, { timestamps: true });

LessonPlanSchema.index({ teacher: 1, academicYear: 1, gradeSection: 1, subject: 1, date: 1 });

export default mongoose.models.LessonPlan || mongoose.model('LessonPlan', LessonPlanSchema);
