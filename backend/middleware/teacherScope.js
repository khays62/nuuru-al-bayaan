import mongoose from 'mongoose';
import TeacherAssignment from '../models/TeacherAssignment.js';

function pickFirst(obj, keys) {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return null;
}

export const teacherOr = (nonTeacherMiddleware, teacherMiddleware) => {
  return (req, res, next) => {
    if (req.user?.role === 'teacher') return teacherMiddleware(req, res, next);
    return nonTeacherMiddleware(req, res, next);
  };
};

export const allowTeacher = (nonTeacherMiddleware) => {
  return (req, res, next) => {
    if (req.user?.role === 'teacher') return next();
    return nonTeacherMiddleware(req, res, next);
  };
};

// Allows teachers to access only their own resources by comparing req.user.teacherRef
// with a route param (default: :id). Non-teachers flow through untouched.
export const requireTeacherSelf = (paramKey = 'id') => {
  return (req, res, next) => {
    if (req.user?.role !== 'teacher') return next();
    const selfId = String(req.user?.teacherRef || '');
    const targetId = String(req.params?.[paramKey] || '');
    if (!selfId || !mongoose.isValidObjectId(selfId)) {
      return res.status(403).json({ message: 'Teacher account is missing teacherRef' });
    }
    if (!targetId || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Invalid teacher id' });
    }
    if (selfId !== targetId) {
      return res.status(403).json({ message: 'Not allowed to access another teacher' });
    }
    return next();
  };
};

export const requireTeacherAssignment = ({
  gradeSectionKeys = ['gradeSectionId', 'gradeSection', 'gs', 'gsId'],
  subjectKeys = ['subjectId', 'subject', 'subId'],
  subjectOptional = true,
} = {}) => {
  return async (req, res, next) => {
    try {
      if (req.user?.role !== 'teacher') return next();

      const teacherId = req.user?.teacherRef;
      if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
        return res.status(403).json({ message: 'Teacher account is missing teacherRef' });
      }

      const gsId =
        pickFirst(req.query, gradeSectionKeys) ??
        pickFirst(req.body, gradeSectionKeys);

      if (!gsId || !mongoose.isValidObjectId(gsId)) {
        return res.status(400).json({ message: 'gradeSectionId required' });
      }

      const subjectId =
        pickFirst(req.query, subjectKeys) ??
        pickFirst(req.body, subjectKeys);

      const q = { teacher: teacherId, gradeSection: gsId };
      if (subjectId && mongoose.isValidObjectId(subjectId)) {
        q.subject = subjectId;
      } else if (!subjectOptional) {
        return res.status(400).json({ message: 'subjectId required' });
      }

      const ok = await TeacherAssignment.exists(q);
      if (!ok) return res.status(403).json({ message: 'Not assigned to this class' });
      return next();
    } catch (e) {
      return res.status(500).json({ message: 'Server Error' });
    }
  };
};
