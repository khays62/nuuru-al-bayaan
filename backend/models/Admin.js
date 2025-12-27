import mongoose from "mongoose";



const adminSchema = new mongoose.Schema({

  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // Add role
  role: {
    type: String,
    enum: ["admin", "staff", "teacher", "student"],
    default: "admin",
  },
});

export default mongoose.model("Admin", adminSchema);
