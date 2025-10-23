import mongoose from 'mongoose';

const { Schema } = mongoose;

const enrollmentSchema = new Schema({
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    gradeSection: { type: Schema.Types.ObjectId, ref: 'GradeSection', required: true },
    academicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    grade: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
    shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
    // Denormalized: cohort-ka waxa laga qaataa GradeSection.cohort si filter/warbixin u sahlanaato
    cohort: { type: Schema.Types.ObjectId, ref: 'Cohort' },
    // 1 = ka hor mid-year (seq1), 2 = ka dib mid-year (seq2) isla AY
    sequenceInYear: { type: Number, enum: [1, 2], default: 1 },
    // Ku dar 'inactive' si si ku-meelgaar ah loo xiro socodka (transfer/promote) iyada oo aan la dhigin leftAt
    status: { type: String, enum: ['active', 'inactive', 'transferred', 'promoted', 'graduated', 'withdrawn'], default: 'active' },
    joinedAt: { type: Date, required: true },
    leftAt: { type: Date }
}, { timestamps: true });

// Unique: hal sanad (academicYear) hal sequence (1 ama 2) per student
enrollmentSchema.index({ student: 1, academicYear: 1, sequenceInYear: 1 }, { unique: true });
// Queries by section current roster
enrollmentSchema.index({ gradeSection: 1, status: 1 });
// Cohort-based queries (reports/filters)
enrollmentSchema.index({ cohort: 1, status: 1 });
// History listing per student sorted recent first
enrollmentSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model('Enrollment', enrollmentSchema);
