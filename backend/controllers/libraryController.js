import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import LibraryResource from '../models/LibraryResource.js';
import Subject from '../models/Subject.js';
import Enrollment from '../models/Enrollment.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import { publishRealtime } from '../utils/realtimeBus.js';
import { deleteRemoteObject, isRemoteUploadsEnabled, putBufferToRemote } from '../services/uploadStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sanitizeUploadsToken = (value, fallback = 'user') => {
  const s = String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return (s || fallback).slice(0, 32);
};

const libraryExtFromMimeOrName = (mimetype, originalName) => {
  const mt = String(mimetype || '').toLowerCase();
  if (mt === 'application/pdf') return '.pdf';
  if (mt === 'application/msword') return '.doc';
  if (mt === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return '.docx';
  if (mt === 'application/vnd.ms-powerpoint') return '.ppt';
  if (mt === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return '.pptx';
  const ext = path.extname(String(originalName || '')).toLowerCase();
  if (['.pdf', '.doc', '.docx', '.ppt', '.pptx'].includes(ext)) return ext;
  return '.pdf';
};

const makeLibraryFilename = ({ actor, mimetype, originalName }) => {
  const who = sanitizeUploadsToken(actor, 'library');
  const ts = Date.now();
  const rand = Math.random().toString(16).slice(2, 10);
  const ext = libraryExtFromMimeOrName(mimetype, originalName);
  return `${who}-${ts}-${rand}${ext}`;
};

function normalizeId(v) {
  try {
    if (!v) return null;
    const s = String(v);
    return mongoose.isValidObjectId(s) ? s : null;
  } catch {
    return null;
  }
}

function isHttpUrl(v) {
  const s = String(v || '').trim();
  return /^https?:\/\//i.test(s);
}

async function getStudentActiveGradeId(studentRef) {
  try {
    const sid = normalizeId(studentRef);
    if (!sid) return null;
    const row = await Enrollment.findOne({ student: sid, status: 'active' })
      .select('grade')
      .sort({ createdAt: -1 })
      .lean();
    const gid = normalizeId(row?.grade);
    return gid;
  } catch {
    return null;
  }
}

async function getTeacherAssignedGradeIds(teacherRef) {
  try {
    const tid = normalizeId(teacherRef);
    if (!tid) return [];
    const rows = await TeacherAssignment.find({ teacher: tid })
      .select('gradeSection')
      .populate({ path: 'gradeSection', select: 'grade' })
      .lean();

    const set = new Set();
    for (const r of rows || []) {
      const gid = normalizeId(r?.gradeSection?.grade);
      if (gid) set.add(gid);
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

function normalizeAudience(v) {
  const a = String(v || '').trim().toLowerCase();
  if (!a) return 'public';
  if (a === 'public' || a === 'level') return a;
  return null;
}

export async function listLibraryResources(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    const pageRaw = Number(req.query?.page || 1);
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;

    const limitRaw = Number(req.query?.limit || 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 10;

    const skip = (page - 1) * limit;

    const role = String(req.user?.role || '').toLowerCase();
    const publicExpr = { $or: [{ audience: 'public' }, { audience: { $exists: false } }, { audience: null }, { audience: '' }] };

    let visibility = null;
    if (role === 'admin' || role === 'staff') {
      visibility = null; // no restrictions
    } else if (role === 'student') {
      const gradeId = await getStudentActiveGradeId(req.user?.studentRef);
      visibility = gradeId
        ? { $or: [publicExpr, { audience: 'level', grade: gradeId }] }
        : publicExpr;
    } else if (role === 'teacher') {
      const gradeIds = await getTeacherAssignedGradeIds(req.user?.teacherRef);
      visibility = gradeIds.length > 0
        ? { $or: [publicExpr, { audience: 'level', grade: { $in: gradeIds } }] }
        : publicExpr;
    } else {
      // Unknown role: safest default
      visibility = publicExpr;
    }

    const and = [];
    if (q) and.push({ $text: { $search: q } });
    if (visibility) and.push(visibility);
    const filter = and.length > 0 ? { $and: and } : {};

    const [rows, total] = await Promise.all([
      LibraryResource.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('grade', 'gradeName')
        .populate('subject', 'subjectName')
        .lean(),
      LibraryResource.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / limit));

    return res.status(200).json({
      success: true,
      data: rows,
      meta: { page, limit, total, totalPages },
    });
  } catch (err) {
    console.error('listLibraryResources error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Server Error' });
  }
}

export async function createLibraryResource(req, res) {
  const cleanupFile = async () => {
    // Remote-only uploads use memory storage; nothing to cleanup on disk.
  };

  try {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const category = String(req.body?.category || '').trim();

    const audience = normalizeAudience(req.body?.audience);
    if (!audience) {
      await cleanupFile();
      return res.status(400).json({ success: false, message: 'Invalid audience (public/level)' });
    }

    const gradeId = normalizeId(req.body?.gradeId || req.body?.grade);
    const subjectId = normalizeId(req.body?.subjectId || req.body?.subject);

    if (!title) {
      await cleanupFile();
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const hasFile = Boolean(req.file);
    const linkUrl = String(req.body?.linkUrl || '').trim();

    let kind = String(req.body?.kind || '').trim().toLowerCase();
    if (!kind) {
      kind = hasFile ? 'pdf' : (linkUrl ? 'link' : '');
    }

    if (kind !== 'pdf' && kind !== 'link') {
      await cleanupFile();
      return res.status(400).json({ success: false, message: 'Invalid kind (pdf/link)' });
    }

    if (kind === 'pdf' && !hasFile) {
      return res.status(400).json({ success: false, message: 'PDF file is required' });
    }

    if (kind === 'link') {
      if (!linkUrl || !isHttpUrl(linkUrl)) {
        await cleanupFile();
        return res.status(400).json({ success: false, message: 'Valid link URL is required' });
      }
    }

    if (audience === 'level') {
      if (!gradeId) {
        await cleanupFile();
        return res.status(400).json({ success: false, message: 'gradeId is required for level resources' });
      }
      if (!subjectId) {
        await cleanupFile();
        return res.status(400).json({ success: false, message: 'subjectId is required for level resources' });
      }

      // Validate subject belongs to grade
      const sub = await Subject.findById(subjectId).select('grades').lean();
      const okGrade = Array.isArray(sub?.grades) && sub.grades.some((g) => normalizeId(g) === gradeId);
      if (!okGrade) {
        await cleanupFile();
        return res.status(400).json({ success: false, message: 'Subject is not valid for the selected grade' });
      }

      // Teacher restriction: can only upload to grades they are assigned to.
      const role = String(req.user?.role || '').toLowerCase();
      if (role === 'teacher') {
        const allowed = await getTeacherAssignedGradeIds(req.user?.teacherRef);
        if (!allowed.includes(gradeId)) {
          await cleanupFile();
          return res.status(403).json({ success: false, message: 'Not assigned to this level' });
        }
      }
    }

    const createdById = normalizeId(req.user?._id);
    const createdByRole = String(req.user?.role || '').toLowerCase();
    const createdByName = String(
      req.user?.fullName
      || req.user?.username
      || req.user?.email
      || ''
    ).trim();

    let uploadedFileKey = null;
    let fileMeta = null;
    if (kind === 'pdf' && req.file) {
      const file = req.file;
      if (!isRemoteUploadsEnabled()) {
        await cleanupFile();
        return res.status(500).json({ success: false, message: 'Remote uploads are required for library files' });
      }

      const filename = makeLibraryFilename({
        actor: req.user?._id || req.user?.username || 'library',
        mimetype: file.mimetype,
        originalName: file.originalname,
      });

      const relPath = path.posix.join('uploads', 'library', filename);
      const url = `/${path.posix.join('api', 'uploads', 'library', filename)}`;
      fileMeta = {
        url,
        path: relPath,
        mimeType: String(file.mimetype || ''),
        size: Number(file.size || (Buffer.isBuffer(file.buffer) ? file.buffer.length : 0) || 0),
        originalName: String(file.originalname || ''),
        uploadedAt: new Date(),
      };

      uploadedFileKey = relPath;
      await putBufferToRemote({
        buffer: file.buffer,
        key: uploadedFileKey,
        contentType: String(file.mimetype || ''),
      });
    }

    const doc = new LibraryResource({
      title,
      description: description || undefined,
      category: category || undefined,
      kind,
      audience,
      grade: audience === 'level' ? gradeId : null,
      subject: audience === 'level' ? subjectId : null,
      linkUrl: kind === 'link' ? linkUrl : undefined,
      file: kind === 'pdf' ? fileMeta : null,
      createdById: createdById || undefined,
      createdByRole: createdByRole || undefined,
      createdByName: createdByName || undefined,
    });

    try {
      await doc.save();
    } catch (e) {
      try {
        if (uploadedFileKey) await deleteRemoteObject(uploadedFileKey);
      } catch {
        // ignore
      }
      await cleanupFile();
      throw e;
    }

    // Realtime: tell all connected clients the library changed.
    publishRealtime({ type: 'library:changed', id: String(doc._id), ts: Date.now() });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    console.error('createLibraryResource error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Server Error' });
  }
}

export async function deleteLibraryResource(req, res) {
  try {
    const id = normalizeId(req.params?.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });

    const doc = await LibraryResource.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });

    const role = String(req.user?.role || '').toLowerCase();
    const userId = normalizeId(req.user?._id);

    // Authorization hardening:
    // - Admin can delete anything
    // - Staff can delete anything ONLY if they reached this handler (route checks permission)
    // - Teacher can delete only resources they uploaded
    if (role === 'admin' || role === 'staff') {
      // allowed
    } else if (role === 'teacher') {
      const ownerId = normalizeId(doc?.createdById);
      if (!userId || !ownerId || ownerId !== userId) {
        return res.status(403).json({ success: false, message: 'You can only delete resources you uploaded' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const filePath = String(doc?.file?.path || '').trim();
    await doc.deleteOne();

    if (filePath && filePath.startsWith('uploads/library/')) {
      const abs = path.join(__dirname, '..', filePath);
      try { await fs.unlink(abs); } catch { /* ignore */ }
      try { await deleteRemoteObject(filePath); } catch { /* ignore */ }
    }

    // Realtime: tell all connected clients the library changed.
    publishRealtime({ type: 'library:changed', id: String(id), ts: Date.now(), op: 'delete' });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteLibraryResource error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Server Error' });
  }
}
