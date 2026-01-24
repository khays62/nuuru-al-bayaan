import mongoose from 'mongoose';

const { Schema } = mongoose;

const AuthLockEventSchema = new Schema(
  {
    principalModel: {
      type: String,
      enum: ['User', 'Admin', 'Unknown'],
      required: true,
    },
    principalId: {
      type: Schema.Types.ObjectId,
      default: null,
      required: function () {
        return String(this.principalModel || '') !== 'Unknown';
      },
    },
    username: {
      type: String,
      default: '',
    },
    fullName: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      default: '',
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    occurrences: {
      type: Number,
      default: 1,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
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
    resolution: {
      type: String,
      default: '',
    },
  },
  { timestamps: false }
);

AuthLockEventSchema.index({ resolvedAt: 1, isRead: 1, lastSeenAt: -1 });
AuthLockEventSchema.index({ principalModel: 1, principalId: 1, resolvedAt: 1 });

export default mongoose.model('AuthLockEvent', AuthLockEventSchema);
