import Announcement from "../models/Announcement.js";
import mongoose from 'mongoose';
import TeacherAssignment from '../models/TeacherAssignment.js';
import { registerAnnouncementStream, broadcastAnnouncementEvent } from '../services/announcementStream.js';
import User from '../models/User.js';

function normalizeId(v) {
  try {
    if (!v) return null;
    const s = String(v);
    return mongoose.isValidObjectId(s) ? s : null;
  } catch {
    return null;
  }
}

async function getStudentVisibleGradeSectionId(studentRefId) {
  const sid = normalizeId(studentRefId);
  if (!sid) return null;
  const Enrollment = (await import('../models/Enrollment.js')).default;
  const active = await Enrollment.findOne({ student: sid, status: 'active' })
    .sort({ joinedAt: -1, createdAt: -1 })
    .select('gradeSection')
    .lean();
  const latest = active || await Enrollment.findOne({ student: sid })
    .sort({ joinedAt: -1, createdAt: -1 })
    .select('gradeSection')
    .lean();
  return normalizeId(latest?.gradeSection);
}

async function getTeacherAssignedGradeSectionIds(teacherRefId) {
  const tid = normalizeId(teacherRefId);
  if (!tid) return [];
  const ids = await TeacherAssignment.find({ teacher: tid }).distinct('gradeSection');
  return (Array.isArray(ids) ? ids : []).map((x) => normalizeId(x)).filter(Boolean);
}

function buildVisibilityQueryForUser({ role, studentGradeSectionId, teacherGradeSectionIds }) {
  const r = String(role || '').toLowerCase();
  if (r === 'admin' || r === 'staff') return {}; // see all

  const base = [{ audienceType: { $in: [null, 'all'] } }];

  if (r === 'student') {
    if (studentGradeSectionId) {
      base.push({ audienceType: 'gradeSections', audienceGradeSections: studentGradeSectionId });
    }
  } else if (r === 'teacher') {
    const gs = Array.isArray(teacherGradeSectionIds) ? teacherGradeSectionIds : [];
    if (gs.length) {
      base.push({ audienceType: 'gradeSections', audienceGradeSections: { $in: gs } });
    }
  }

  return { $or: base };
}

export const streamAnnouncements = async (req, res) => {
  try {
    return await registerAnnouncementStream({ req, res });
  } catch {
    return res.status(500).json({ message: 'Server Error' });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: "Title and body are required" });
    }

    const roleLower = String(req.user?.role || '').toLowerCase();

    let audienceType = 'all';
    let audienceGradeSections = [];

    if (roleLower === 'teacher') {
      const assigned = await getTeacherAssignedGradeSectionIds(req.user?.teacherRef);
      if (!assigned.length) {
        return res.status(403).json({ message: 'Teacher has no assigned classes' });
      }
      audienceType = 'gradeSections';
      audienceGradeSections = assigned;
    }

    const announcement = new Announcement({
      title,
      body,
      author: req.user.username,
      role: roleLower,
      createdById: normalizeId(req.user?._id),
      audienceType,
      audienceGradeSections,
      date: new Date(),
    });

    await announcement.save();
    broadcastAnnouncementEvent({ type: 'created', announcement });
    res.status(201).json(announcement);
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ message: err.message });
  }
};


// ✅ Get all announcements
export const getAnnouncements = async (req, res) => {
  try {
    const roleLower = String(req.user?.role || '').toLowerCase();
    const teacherGradeSections = roleLower === 'teacher'
      ? await getTeacherAssignedGradeSectionIds(req.user?.teacherRef)
      : [];
    const studentGradeSectionId = roleLower === 'student'
      ? await getStudentVisibleGradeSectionId(req.user?.studentRef)
      : null;

    const q = buildVisibilityQueryForUser({
      role: roleLower,
      studentGradeSectionId,
      teacherGradeSectionIds: teacherGradeSections,
    });

    const announcements = await Announcement.find(q).sort({ date: -1 });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Unread count (per user, persists across login/devices)
export const getAnnouncementsUnreadCount = async (req, res) => {
  try {
    const roleLower = String(req.user?.role || '').toLowerCase();
    const teacherGradeSections = roleLower === 'teacher'
      ? await getTeacherAssignedGradeSectionIds(req.user?.teacherRef)
      : [];
    const studentGradeSectionId = roleLower === 'student'
      ? await getStudentVisibleGradeSectionId(req.user?.studentRef)
      : null;

    const q = buildVisibilityQueryForUser({
      role: roleLower,
      studentGradeSectionId,
      teacherGradeSectionIds: teacherGradeSections,
    });

    const lastSeenAt = req.user?.announcementsLastSeenAt ? new Date(req.user.announcementsLastSeenAt) : null;
    const since = (lastSeenAt && !Number.isNaN(lastSeenAt.getTime())) ? lastSeenAt : null;
    const qWithDate = since ? { ...q, date: { $gt: since } } : q;

    const count = await Announcement.countDocuments(qWithDate);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Mark announcements as read for THIS user only
export const markAnnouncementsRead = async (req, res) => {
  try {
    const uid = normalizeId(req.user?._id);
    if (!uid) return res.status(401).json({ message: 'Unauthorized' });

    await User.findByIdAndUpdate(uid, { announcementsLastSeenAt: new Date() }, { new: false });
    res.json({ success: true });
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

    broadcastAnnouncementEvent({ type: 'updated', announcement: updated });
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

    broadcastAnnouncementEvent({ type: 'deleted', id });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
