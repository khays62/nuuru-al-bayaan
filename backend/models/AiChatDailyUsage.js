import mongoose from 'mongoose';

const { Schema } = mongoose;

const aiChatDailyUsageSchema = new Schema(
  {
    principalModel: { type: String, required: true, trim: true, maxlength: 32 },
    principalId: { type: Schema.Types.ObjectId, required: true },
    dateKey: { type: String, required: true, trim: true, maxlength: 10 }, // YYYY-MM-DD (UTC)
    count: { type: Number, default: 0, min: 0 },
    lastMessageAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

aiChatDailyUsageSchema.index({ principalModel: 1, principalId: 1, dateKey: 1 }, { unique: true });

export default mongoose.models.AiChatDailyUsage
  || mongoose.model('AiChatDailyUsage', aiChatDailyUsageSchema);
