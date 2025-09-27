import mongoose from 'mongoose';

const { Schema } = mongoose;

const enrollmentSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    gradeSection: { type: Schema.Types.ObjectId, ref: 'GradeSection', required: true },
    academicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    grade: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    status: { type: String, enum: ['active', 'transferred', 'promoted', 'graduated', 'withdrawn'], default: 'active' },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date }
}, { timestamps: true });

// Unique: hal sanad (academicYear) hal enrollment oo keliya per student
enrollmentSchema.index({ student: 1, academicYear: 1 }, { unique: true });
// Queries by section current roster
enrollmentSchema.index({ gradeSection: 1, status: 1 });
// History listing per student sorted recent first
enrollmentSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model('Enrollment', enrollmentSchema);
