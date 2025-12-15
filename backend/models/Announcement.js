// import mongoose from "mongoose";

// const announcementSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true },
//     message: { type: String, required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     targetRoles: [
//       {
//         type: String,
//         enum: ["admin", "teacher", "student", "exam_office", "registration_office"],
//       },
//     ],
//   },
//   { timestamps: true }
// );

// const Announcement = mongoose.model("Announcement", announcementSchema);
// export default Announcement;

// import mongoose from "mongoose";

// const announcementSchema = new mongoose.Schema({
//   message: { type: String, required: true },
//   author: { type: String, required: true },
//   role: { type: String, required: true },
//   date: { type: Date, default: Date.now },
// });

// export default mongoose.model("Announcement", announcementSchema);


// import mongoose from "mongoose";

// const announcementSchema = new mongoose.Schema({
//   title: {
//     type: String,
//     required: true,
//     trim: true,
//   },
//   body: {
//     type: String,
//     required: true,
//   },
//   author: String,
//   role: String,
//   date: {
//     type: Date,
//     default: Date.now,
//   },
// });

// export default mongoose.model("Announcement", announcementSchema);


import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: String,
  role: String,
  date: { type: Date, default: Date.now },
});

const Announcement = mongoose.model("Announcement", announcementSchema);
export default Announcement;
