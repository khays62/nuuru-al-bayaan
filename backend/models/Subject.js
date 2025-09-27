import mongoose from 'mongoose';

const { Schema } = mongoose;

const subjectSchema = new Schema({
    subjectName: { type: String, required: true },
    subjectCode: { type: String, unique: true, index: true },
    grades: [{ type: Schema.Types.ObjectId, ref: 'Grade' }]
}, { timestamps: true });

// Add a secondary index for faster regex search on name (case-insensitive partial search still uses collection scan, but index helps prefix search)
subjectSchema.index({ subjectName: 1 });

export default mongoose.model('Subject', subjectSchema);
