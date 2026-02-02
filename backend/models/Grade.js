import mongoose from 'mongoose';

const { Schema } = mongoose;

const gradeSchema = new Schema({
    gradeName: { type: String, required: true, unique: true },
    // DB-driven level ordering (language-agnostic). Example: 1..10
    // Optional for now to avoid breaking existing seed data; Promotions will require it.
    order: {
        type: Number,
        required: false,
        unique: true,
        sparse: true,
        min: 1,
        validate: {
            validator: (v) => v === undefined || v === null || (Number.isInteger(v) && v >= 1),
            message: 'order must be a positive integer'
        }
    }
}, { timestamps: true });

export default mongoose.model('Grade', gradeSchema);
