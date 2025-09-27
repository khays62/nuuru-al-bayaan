import mongoose from 'mongoose';

const { Schema } = mongoose;

const examTypeSchema = new Schema({
    typeName: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model('ExamType', examTypeSchema);
