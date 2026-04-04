import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, unique: true },
  // Internal staff code (separate from login username)
  employeeId: { type: String, unique: true, sparse: true, index: true, trim: true },
  teacherId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true, unique: true, sparse: true, index: true, trim: true },
  email: { type: String, trim: true, unique: true, sparse: true },
  // Primary phone
  phone: { type: String, trim: true, unique: true, sparse: true },
  // Secondary phone
  phone2: { type: String, trim: true, default: '' },

  gender: { type: String, enum: ['Male', 'Female', ''], default: '' },
  dob: { type: Date, default: null },
  nationality: { type: String, trim: true, default: 'Somalia' },

  // Structured residence address (same shape as Student for UI reuse)
  isSomali: { type: Boolean, default: true },
  residenceRegionId: { type: String, trim: true, default: '' },
  residenceDistrictId: { type: String, trim: true, default: '' },
  residenceNeighborhood: { type: String, trim: true, default: '' },

  hireDate: { type: Date, default: null },
  employmentType: { type: String, enum: ['full-time', 'part-time', 'contract', ''], default: '' },
  salary: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active','inactive'], default: 'active' },

  specialization: { type: String, trim: true, default: '' },
  qualification: { type: String, trim: true, default: '' },
  yearsOfExperience: { type: Number, default: 0, min: 0 },

  idDocument: {
    idType: { type: String, trim: true, default: '' },
    idNumber: { type: String, trim: true, default: '' },
    issuedBy: { type: String, trim: true, default: '' },
    expiresAt: { type: Date, default: null },
  },

  notes: { type: String, trim: true, default: '' },

  photo: {
    url: { type: String, trim: true, default: '' },
    path: { type: String, trim: true, default: '' },
    mimeType: { type: String, trim: true, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: null },
  },
  lastAcademicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
}, { timestamps: true });

export default mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
