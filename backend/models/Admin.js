import mongoose from "mongoose";

// const adminSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   password: { type: String, required: true }
// });

// export default mongoose.model("Admin", adminSchema);


const adminSchema = new mongoose.Schema({

  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // Session invalidation: increment to invalidate all existing JWTs for this account.
  tokenVersion: { type: Number, default: 0 },
  // Add role
  role: {
    type: String,
    enum: ["admin", "staff", "teacher", "student"],
    default: "admin",
  },

  // Progressive login protection
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  loginCooldownLevel: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model("Admin", adminSchema);
