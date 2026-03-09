import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    aggregateKey: {
      type: String,
      default: "",
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    ip: {
      type: String,
      default: "",
    },

    device: {
      type: String,
      default: "",
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

AuditLogSchema.index({ user: 1, action: 1, aggregateKey: 1, timestamp: -1 });

export default mongoose.model("AuditLog", AuditLogSchema);
