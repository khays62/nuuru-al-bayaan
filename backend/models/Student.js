import mongoose from 'mongoose';

const { Schema } = mongoose;

const studentSchema = new Schema({
    studentId: { type: String }, // Assigned after enrollment; unique enforced via partial index below
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
// Enforce uniqueness only when studentId is a non-empty string (avoid null/undefined collisions during initial insert)
studentSchema.index(
    { studentId: 1 },
    // Note: $ne is not supported in partial indexes (rewritten as $not). Use $gt '' to include only non-empty strings.
    { unique: true, partialFilterExpression: { studentId: { $gt: '' } } }
);

// Note: Student ID is now generated in the studentController after enrollment is created,
// using cohort + section based sequencing (e.g., DU1SA01). Model no longer auto-assigns.

export default mongoose.model('Student', studentSchema);
