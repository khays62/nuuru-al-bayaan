import mongoose from 'mongoose';

const { Schema } = mongoose;

const shiftSchema = new Schema({
    shiftName: { type: String, required: true, unique: true }
}, { timestamps: true });

export default mongoose.model('Shift', shiftSchema);
