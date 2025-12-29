import mongoose from 'mongoose';

const { Schema } = mongoose;

const gradeSectionSchema = new Schema({
  section: { type: String, required: true, trim: true, default: '1' },
  capacity: { type: Number },
  grade: { type: Schema.Types.ObjectId, ref: 'Grade', required: true },
  academicYear: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  shift: { type: Schema.Types.ObjectId, ref: 'Shift', required: true },
  cohort: { type: Schema.Types.ObjectId, ref: 'Cohort' },
  subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }]
}, { timestamps: true });

// Unique per Grade + AcademicYear + Shift + Section
gradeSectionSchema.index({ grade: 1, academicYear: 1, shift: 1, section: 1 }, { unique: true });

// Store in a dedicated collection 'gradesections' (migrated from legacy 'classes')
export default mongoose.model('GradeSection', gradeSectionSchema, 'gradesections');
