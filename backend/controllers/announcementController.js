// import Announcement from "../config/models/Announcement.js";

// // ✅ Create a new announcement
// export const createAnnouncement = async (req, res) => {
//   try {
//     const { title, message, targetRoles } = req.body;
//     if (!title || !message) {
//       return res.status(400).json({ message: "Title and message are required." });
//     }

//     const announcement = await Announcement.create({
//       title,
//       message,
//       targetRoles,
//       createdBy: req.user?._id, // if you're using auth middleware
//     });

//     res.status(201).json(announcement);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // ✅ Get all announcements (filtered by role)
// export const getAnnouncements = async (req, res) => {
//   try {
//     const role = req.query.role; // frontend can send ?role=student
//     const query = role ? { targetRoles: { $in: [role] } } : {};

//     const announcements = await Announcement.find(query)
//       .populate("createdBy", "fullName role")
//       .sort({ createdAt: -1 });

//     res.json(announcements);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// ✅ Delete announcement (admin only)
// export const deleteAnnouncement = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Announcement.findByIdAndDelete(id);
//     res.json({ message: "Announcement deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// import Announcement from "../config/models/Announcement.js";

// // Create announcement
// export const createAnnouncement = async (req, res) => {
//   try {
//     const { message } = req.body;
//     if (!message) return res.status(400).json({ message: "Message required" });
//     if (!req.user || !["admin", "teacher"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Not authorized to post announcements" });
//     }
    
//     const announcement = new Announcement({
//       message,
//       author: req.user.username,
//       role: req.user.role,
//       date: new Date(),
//     });

//     await announcement.save();
//     res.status(201).json(announcement);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get all announcements
// export const getAnnouncements = async (req, res) => {
//   try {
//     const announcements = await Announcement.find().sort({ date: -1 });
//     res.json(announcements);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// import Announcement from "../config/models/Announcement.js";

// export const createAnnouncement = async (req, res) => {
//   try {
//     const { message } = req.body;
//     if (!message) return res.status(400).json({ message: "Message required" });

//     // Only admin or teacher allowed to post
//     if (!["admin", "teacher"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Not authorized to post announcements" });
//     }

//     const announcement = new Announcement({
//       message,
//       author: req.user.username,
//       role: req.user.role,
//       date: new Date(),
//     });

//     await announcement.save();
//     res.status(201).json(announcement);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Anyone can view all announcements
// export const getAnnouncements = async (req, res) => {
//   try {
//     const announcements = await Announcement.find().sort({ date: -1 });
//     res.json(announcements);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// import Announcement from "../config/models/Announcement.js";

// // 🟢 Create
// export const createAnnouncement = async (req, res) => {
//   try {
//     const { message } = req.body;
//     if (!message) return res.status(400).json({ message: "Message required" });

//     if (!["admin", "teacher"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Not authorized to post announcements" });
//     }

//     const announcement = await Announcement.create({
//       message,
//       author: req.user.username,
//       role: req.user.role,
//       date: new Date(),
//     });

//     res.status(201).json(announcement);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // 🟢 Get all
// export const getAnnouncements = async (req, res) => {
//   try {
//     const announcements = await Announcement.find().sort({ date: -1 });
//     res.json(announcements);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // 🟠 Update
// export const updateAnnouncement = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { message } = req.body;

//     const announcement = await Announcement.findById(id);
//     if (!announcement) return res.status(404).json({ message: "Announcement not found" });

//     // Only the author or an admin can edit
//     if (req.user.username !== announcement.author && req.user.role !== "admin") {
//       return res.status(403).json({ message: "Not authorized to edit this announcement" });
//     }

//     announcement.message = message;
//     await announcement.save();

//     res.json(announcement);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // 🔴 Delete
// export const deleteAnnouncement = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const announcement = await Announcement.findById(id);
//     if (!announcement) return res.status(404).json({ message: "Announcement not found" });

//     if (req.user.username !== announcement.author && req.user.role !== "admin") {
//       return res.status(403).json({ message: "Not authorized to delete this announcement" });
//     }

//     await announcement.deleteOne();
//     res.json({ message: "Announcement deleted" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


// import Announcement from "../config/models/Announcement.js";

// // Create
// export const createAnnouncement = async (req, res) => {
//   try {
//     const { title, body } = req.body;
//     if (!title || !body) {
//       return res.status(400).json({ message: "Title and body are required" });
//     }

//     if (!["admin", "teacher"].includes(req.user.role)) {
//       return res.status(403).json({ message: "Not authorized to post" });
//     }

//     const announcement = new Announcement({
//       title,
//       body,
//       author: req.user.username,
//       role: req.user.role,
//     });

//     await announcement.save();
//     res.status(201).json(announcement);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Get All
// export const getAnnouncements = async (req, res) => {
//   try {
//     const announcements = await Announcement.find().sort({ date: -1 });
//     res.json(announcements);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Update
// export const updateAnnouncement = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { title, body } = req.body;
//     const announcement = await Announcement.findById(id);
//     if (!announcement) return res.status(404).json({ message: "Announcement not found" });

//     if (req.user.username !== announcement.author && req.user.role !== "admin") {
//       return res.status(403).json({ message: "Not authorized to edit" });
//     }

//     announcement.title = title ?? announcement.title;
//     announcement.body = body ?? announcement.body;
//     await announcement.save();

//     res.json(announcement);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// // Delete
// export const deleteAnnouncement = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const announcement = await Announcement.findById(id);
//     if (!announcement) return res.status(404).json({ message: "Announcement not found" });

//     if (req.user.username !== announcement.author && req.user.role !== "admin") {
//       return res.status(403).json({ message: "Not authorized to delete" });
//     }

//     await announcement.deleteOne();
//     res.json({ message: "Announcement deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


import Announcement from "../models/Announcement.js";

// ✅ Create announcement
// export const createAnnouncement = async (req, res) => {
//   try {
//     const { title, body } = req.body;

//     if (!title || !body) {
//       return res.status(400).json({ message: "Title and body are required" });
//     }

//     const announcement = new Announcement({
//       title,
//       body,
//       author: req.user.username,
//       role: req.user.role,
//       date: new Date(),
//     });

//     await announcement.save();
//     res.status(201).json(announcement);
//   } catch (err) {
//     console.error("Create announcement error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };

export const createAnnouncement = async (req, res) => {
  try {
    console.log("Incoming body:", req.body); // 👈 Add this line
    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    const announcement = new Announcement({
      title,
      body,
      author: req.user.username,
      role: req.user.role,
      date: new Date(),
    });

    await announcement.save();
    res.status(201).json(announcement);
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ message: err.message });
  }
};


// ✅ Get all announcements
export const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find().sort({ date: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update announcement
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body } = req.body;

    const updated = await Announcement.findByIdAndUpdate(
      id,
      { title, body },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Announcement not found" });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete announcement
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Announcement.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Announcement not found" });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
