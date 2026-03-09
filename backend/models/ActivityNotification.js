import mongoose from 'mongoose';

const { Schema } = mongoose;

const ActivityNotificationSchema = new Schema(
  {
    category: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    actorName: {
      type: String,
      default: '',
      trim: true,
    },
    actorRole: {
      type: String,
      default: '',
      trim: true,
    },
    classLabel: {
      type: String,
      default: '',
      trim: true,
    },
    subjectLabel: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    aggregateKey: {
      type: String,
      default: '',
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

ActivityNotificationSchema.index({ resolvedAt: 1, isRead: 1, createdAt: -1 });
ActivityNotificationSchema.index({ category: 1, action: 1, createdAt: -1 });
ActivityNotificationSchema.index({ actorUserId: 1, category: 1, action: 1, aggregateKey: 1, createdAt: -1 });

export default mongoose.model('ActivityNotification', ActivityNotificationSchema);