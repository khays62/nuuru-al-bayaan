import mongoose from 'mongoose';

function isHttpUrl(v) {
  const s = String(v || '').trim();
  return /^https?:\/\//i.test(s);
}

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

  // Audience scoping
  // - public: visible to all authenticated users
  // - level: visible only to students enrolled in that Grade (any active section) and teachers assigned to that Grade
  audience: { type: String, enum: ['public', 'level'], default: 'public', required: true },
  grade: { type: mongoose.Schema.Types.ObjectId, ref: 'Grade', default: null },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },

  kind: { type: String, enum: ['pdf', 'link'], required: true },

  // For kind=link
  linkUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function validatorLinkUrl(v) {
        const kind = String(this?.kind || '').toLowerCase();
        const value = String(v || '').trim();

        if (kind === 'link') return Boolean(value) && isHttpUrl(value);
        // For kind=pdf, linkUrl should not be set
        return value.length === 0;
      },
      message: 'linkUrl must be a valid http(s) URL when kind=link and empty otherwise',
    },
  },

  // For kind=pdf
  file: {
    type: fileSchema,
    default: null,
    validate: {
      validator: function validatorFile(v) {
        const kind = String(this?.kind || '').toLowerCase();

        if (kind === 'link') return v == null;
        if (kind !== 'pdf') return true;

        // For kind=pdf (covers PDF and DOC/DOCX uploads), require key fields.
        const url = String(v?.url || '').trim();
        const p = String(v?.path || '').trim();
        return Boolean(url) && Boolean(p);
      },
      message: 'file metadata is required when kind=pdf and must be null for kind=link',
    },
  },

  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdByRole: { type: String, trim: true },
  createdByName: { type: String, trim: true },
}, { timestamps: true });

// Model-level validation to keep data consistent even if controllers change.
libraryResourceSchema.pre('validate', function (next) {
  try {
    const kind = String(this.kind || '').toLowerCase();
    const audience = String(this.audience || '').toLowerCase();

    if (audience === 'public' || !audience) {
      // Backward compatibility: treat missing audience as public.
      this.audience = 'public';
      this.grade = null;
      this.subject = null;
    } else if (audience === 'level') {
      if (!this.grade) this.invalidate('grade', 'Grade is required for level resources');
      if (!this.subject) this.invalidate('subject', 'Subject is required for level resources');
    }

    if (kind === 'link') {
      const linkUrl = String(this.linkUrl || '').trim();
      if (!linkUrl) {
        this.invalidate('linkUrl', 'Valid link URL is required');
      }
      // Links must be http/https only.
      if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
        this.invalidate('linkUrl', 'Valid link URL is required');
      }
      // Ensure we don't accidentally keep a file for link resources.
      this.file = null;
    }

    if (kind === 'pdf') {
      const fileUrl = String(this.file?.url || '').trim();
      const filePath = String(this.file?.path || '').trim();
      if (!fileUrl || !filePath) {
        this.invalidate('file', 'File is required');
      }
      // Ensure we don't accidentally keep a link for file resources.
      this.linkUrl = undefined;
    }
  } catch {
    // ignore
  }

  next();
});

libraryResourceSchema.index({ createdAt: -1 });
libraryResourceSchema.index({ title: 'text', description: 'text', category: 'text' });

const LibraryResource = mongoose.model('LibraryResource', libraryResourceSchema);
export default LibraryResource;
