import Announcement from "../models/Announcement.js";


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
