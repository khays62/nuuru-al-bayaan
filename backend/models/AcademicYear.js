import mongoose from 'mongoose';

const { Schema } = mongoose;

const academicYearSchema = new Schema({
    yearName: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model('AcademicYear', academicYearSchema);
