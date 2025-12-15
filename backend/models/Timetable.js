import mongoose from 'mongoose';

const TimetableSchema = new mongoose.Schema({
  gradeSection: { type: mongoose.Schema.Types.ObjectId, ref: 'GradeSection', required: true },
  isBreak: { type: Boolean, default: false },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: function() { return !this.isBreak; } },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: function() { return !this.isBreak; } },
  dayOfWeek: { type: Number, min: 0, max: 6, required: true },
  startTime: { type: String, required: true }, // HH:MM
  endTime: { type: String, required: true },
  room: { type: String },
}, { timestamps: true });

// Query performance indexes
TimetableSchema.index({ teacher: 1, dayOfWeek: 1, startTime: 1 });
TimetableSchema.index({ gradeSection: 1, dayOfWeek: 1, startTime: 1 });
// Guard uniqueness at cell level within a GS (soft, still validate overlaps in controller)
TimetableSchema.index({ gradeSection: 1, dayOfWeek: 1, startTime: 1, endTime: 1 });

export default mongoose.models.Timetable || mongoose.model('Timetable', TimetableSchema);
