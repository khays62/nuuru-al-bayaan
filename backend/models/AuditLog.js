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
      required: true, // e.g., "LOGIN", "UPDATE_PROFILE", "DELETE_USER"
    },

    description: {
      type: String,
      default: "",
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

export default mongoose.model("AuditLog", AuditLogSchema);
