import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  url: { type: String, trim: true },
  path: { type: String, trim: true },
  mimeType: { type: String, trim: true },
  size: { type: Number, default: 0 },
  originalName: { type: String, trim: true },
  uploadedAt: { type: Date },
}, { _id: false });

const libraryResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 2000 },
  category: { type: String, trim: true, maxlength: 64 },

  kind: { type: String, enum: ['pdf', 'link'], required: true },

  // For kind=link
  linkUrl: { type: String, trim: true },

  // For kind=pdf
  file: { type: fileSchema, default: null },

  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByRole: { type: String, trim: true },
}, { timestamps: true });

libraryResourceSchema.index({ createdAt: -1 });
libraryResourceSchema.index({ title: 'text', description: 'text', category: 'text' });

const LibraryResource = mongoose.model('LibraryResource', libraryResourceSchema);
export default LibraryResource;
