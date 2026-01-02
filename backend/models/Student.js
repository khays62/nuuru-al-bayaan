import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
    // Auth fields (ported from Target)
    password: { type: String, required: true, default: '123456' },
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
        for (const doc of docs) {
            const pwd = typeof doc?.password === 'string' && doc.password.length > 0 ? doc.password : '123456';
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
// using cohort + section based sequencing (e.g., DU1SA01). Model no longer auto-assigns.

export default mongoose.model('Student', studentSchema);
