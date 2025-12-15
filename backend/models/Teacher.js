import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, unique: true },
  teacherId: { type: String, required: true, unique: true, index: true },
  email: { type: String, trim: true, unique: true, sparse: true },
  phone: { type: String, trim: true, unique: true, sparse: true },
  status: { type: String, enum: ['active','inactive'], default: 'active' },
  lastAcademicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
}, { timestamps: true });

export default mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
