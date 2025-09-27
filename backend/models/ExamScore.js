import mongoose from 'mongoose';

const { Schema } = mongoose;

const examScoreSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
    scoreObtained: { type: Number, required: true }
}, { timestamps: true });

examScoreSchema.index({ student: 1, exam: 1, subject: 1 }, { unique: true });

export default mongoose.model('ExamScore', examScoreSchema);
