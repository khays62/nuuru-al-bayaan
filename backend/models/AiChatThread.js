import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 8000,
    },
  },
  { timestamps: true }
);

const threadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: false,
      trim: true,
      maxlength: 80,
      default: 'New chat',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const aiChatThreadSchema = new mongoose.Schema(
  {
    principalModel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
    principalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    locale: {
      type: String,
      default: 'en',
      trim: true,
      maxlength: 8,
    },

    // Active conversation pointer (subdocument _id).
    activeThreadId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Conversations for this principal.
    threads: {
      type: [threadSchema],
      default: [],
    },

    // Legacy single-thread storage (kept for smooth upgrade).
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

aiChatThreadSchema.index({ principalModel: 1, principalId: 1 }, { unique: true });

export default mongoose.model('AiChatThread', aiChatThreadSchema);
