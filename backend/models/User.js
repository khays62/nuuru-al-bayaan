import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    status: { type: String, default: 'Active' },
    privileges: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('User', userSchema);
