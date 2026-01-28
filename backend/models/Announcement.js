import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: String,
  role: String,
  // Audience scoping
  // - 'all': visible to all authenticated users
  // - 'gradeSections': visible to users in the listed gradeSections (students) and teachers assigned to them
  audienceType: { type: String, enum: ['all', 'gradeSections'], default: 'all' },
  audienceGradeSections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GradeSection' }],

  // Optional creator reference (best-effort; admin accounts may not be a User model)
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  date: { type: Date, default: Date.now },
});

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
