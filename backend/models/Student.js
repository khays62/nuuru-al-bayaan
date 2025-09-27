import mongoose from 'mongoose';
import Counter from './Counter.js';

const { Schema } = mongoose;

const studentSchema = new Schema({
    studentId: { type: String, unique: true, index: true }, // Auto-generated readable ID
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    dob: { type: Date, required: true }, // renamed from dateOfBirth -> dob
    guardianName: { type: String, required: true }, // renamed parentName -> guardianName
    contactNumber: { type: String, required: true }, // renamed contact -> contactNumber
    address: { type: String },
    admissionDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

// Create a compound text index for searching by name or studentId
studentSchema.index({ fullName: 'text', studentId: 'text' });

// Helper to build year segment from academic year string like "2025/2026" -> 2025
function extractStartYear(academicYearDoc) {
    if (!academicYearDoc) return new Date().getFullYear();
    // academicYearDoc.yearName expected pattern: "2025/2026" or "2025-2026"
    const match = /^(\d{4})[\/\-]?/.exec(academicYearDoc.yearName);
    return match ? Number(match[1]) : new Date().getFullYear();
}

// Auto-generate sequential human-friendly studentId: STU-<YEAR>-0001
// We derive YEAR from the admissionDate year as fallback; later when enrollment is created
// we may refine to academicYear start year if needed.
studentSchema.pre('save', async function (next) {
    if (this.studentId) return next();
    try {
        // Use admissionDate year as key partition (ensures uniqueness per intake year)
        const year = this.admissionDate ? new Date(this.admissionDate).getFullYear() : new Date().getFullYear();
        const key = `student-${year}`;
        const counter = await Counter.findOneAndUpdate(
            { key },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const padded = String(counter.seq).padStart(4, '0');
        this.studentId = `STU-${year}-${padded}`;
        next();
    } catch (err) {
        next(err);
    }
});

export default mongoose.model('Student', studentSchema);
