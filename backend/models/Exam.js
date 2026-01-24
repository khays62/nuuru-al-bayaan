import mongoose from 'mongoose';

const { Schema } = mongoose;

const examSchema = new Schema({
    examType: { type: Schema.Types.ObjectId, ref: 'ExamType', required: true },
    academicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    gradeSection: { type: Schema.Types.ObjectId, ref: 'GradeSection', required: true },

    // Template version used when this Exam was created (ties ExamScores to the correct column set).
    templateVersion: { type: Number, required: true, default: 1 },
}, { timestamps: true });

examSchema.index({ examType: 1, academicYear: 1, gradeSection: 1, templateVersion: 1 }, { unique: true });

export default mongoose.model('Exam', examSchema);
