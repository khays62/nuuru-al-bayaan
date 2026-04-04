import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getDefaultInitialPassword } from '../utils/defaultPasswords.js';

const { Schema } = mongoose;

const studentSchema = new Schema({
    studentId: { type: String }, // Assigned after enrollment; unique enforced via partial index below
    fullName: { type: String, required: true, trim: true },
    motherName: { type: String, trim: true, default: '' },
    gender: { type: String, enum: ['Male', 'Female'], required: true },
    dob: { type: Date, required: true }, // renamed from dateOfBirth -> dob
    birthPlace: { type: String, trim: true, default: '' },
    guardianName: { type: String, required: true }, // renamed parentName -> guardianName
    contactNumber: { type: String, required: true, trim: true }, // renamed contact -> contactNumber

    photo: {
        url: { type: String, trim: true, default: '' },
        path: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: null },
    },

    guardianRelationship: { type: String, enum: ['Father', 'Mother', 'Guardian', 'Other'], default: 'Guardian' },
    // New canonical guardian contact fields (keep contactNumber for backward compat)
    guardianPhone1: { type: String, trim: true, default: '' },
    guardianPhone2: { type: String, trim: true, default: '' },
    guardianEmail: { type: String, trim: true, default: '' },
    // Optional student-specific contacts
    studentPhone: { type: String, trim: true, default: '' },
    studentEmail: { type: String, trim: true, default: '' },

    transfer: {
        isTransfer: { type: Boolean, default: false },
        previousSchoolName: { type: String, trim: true, default: '' },
        transferReason: { type: String, trim: true, default: '' },
    },

    notes: { type: String, trim: true, default: '' },

    medical: {
        allergies: { type: String, trim: true, default: '' },
        medicalConditions: { type: String, trim: true, default: '' },
        disabilityFlags: { type: [String], default: [] },
        bloodGroup: { type: String, trim: true, default: '' },
    },

    idDocument: {
        idType: { type: String, trim: true, default: '' },
        idNumber: { type: String, trim: true, default: '' },
        issuedBy: { type: String, trim: true, default: '' },
        expiresAt: { type: Date, default: null },
    },
    // Legacy free-text address (kept for backward compatibility in older UI exports)
    address: { type: String, trim: true },

    // Structured residence address (language-independent IDs)
    isSomali: { type: Boolean, default: true },
    residenceRegionId: { type: String, trim: true, default: '' },
    residenceDistrictId: { type: String, trim: true, default: '' },
    residenceNeighborhood: { type: String, trim: true, default: '' },
    admissionDate: { type: Date, required: true },
    // Auth fields (ported from Target)
    password: { type: String, required: true, default: () => getDefaultInitialPassword() },
    role: { type: String, default: 'student' },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
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

// Hash password automatically before saving
studentSchema.pre('save', async function (next) {
    // Important: when password comes from schema default on a NEW document,
    // Mongoose may not always mark it as "modified". We still must hash it.
    if (!this.isNew && !this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Hash passwords for bulk inserts as well (insertMany/create([..]) bypasses pre('save')).
studentSchema.pre('insertMany', async function (next, docs) {
    try {
        if (!Array.isArray(docs) || docs.length === 0) return next();
        const salt = await bcrypt.genSalt(10);
        const defaultPwd = getDefaultInitialPassword();
        for (const doc of docs) {
            const pwd = typeof doc?.password === 'string' && doc.password.length > 0 ? doc.password : defaultPwd;
            const looksHashed = typeof pwd === 'string' && pwd.startsWith('$2');
            if (!looksHashed) {
                doc.password = await bcrypt.hash(pwd, salt);
            }
        }
        return next();
    } catch (err) {
        return next(err);
    }
});

// Note: Student ID is now generated in the studentController after enrollment is created,
// using cohort prefix + cohort order + section letter + sequence (e.g., DU1A01).

export default mongoose.model('Student', studentSchema);
