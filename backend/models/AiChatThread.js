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
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

aiChatThreadSchema.index({ principalModel: 1, principalId: 1 }, { unique: true });

export default mongoose.model('AiChatThread', aiChatThreadSchema);
