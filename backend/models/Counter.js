import mongoose from 'mongoose';

const { Schema } = mongoose;

// Generic counter collection used for generating sequential numbers per key (e.g., student IDs per academic year)
const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.model('Counter', counterSchema);
