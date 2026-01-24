import mongoose from 'mongoose';

const { Schema } = mongoose;

const examTypeSchema = new Schema({
    typeName: { type: String, required: true },

    // Template versioning (v1, v2, ...). Each version can have its own set of components.
    templateVersion: { type: Number, required: true, default: 1 },

    // Per-component maximum score (e.g. Mid-term=40, Final=60)
    maxScore: { type: Number, required: true, default: 100 },

    // Declared total for this template version (stored redundantly per component doc).
    // Activation requires sum(maxScore) === templateTotal.
    templateTotal: { type: Number, required: true, default: 100 },

    // Display/order of columns in the grid
    order: { type: Number, required: true, default: 0 },

    // Marks which template version is currently the default for new work.
    // We store this on each component doc to avoid creating a new settings model (for now).
    isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true });

// Allow same typeName to exist across versions, but keep uniqueness within a version.
examTypeSchema.index({ templateVersion: 1, typeName: 1 }, { unique: true });
examTypeSchema.index({ templateVersion: 1, order: 1 });

export default mongoose.model('ExamType', examTypeSchema);
