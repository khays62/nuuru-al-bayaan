import mongoose from 'mongoose';

const { Schema } = mongoose;

const gradeSchema = new Schema({
    gradeName: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model('Grade', gradeSchema);
