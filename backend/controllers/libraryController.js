import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import LibraryResource from '../models/LibraryResource.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export async function listLibraryResources(req, res) {
  try {
    const q = String(req.query?.q || '').trim();
    const limitRaw = Number(req.query?.limit || 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;

    const filter = q ? { $text: { $search: q } } : {};

    const rows = await LibraryResource.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('listLibraryResources error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Server Error' });
  }
}

export async function createLibraryResource(req, res) {
  const cleanupFile = async () => {
    const file = req.file;
    if (!file?.path) return;
    try { await fs.unlink(file.path); } catch { /* ignore */ }
  };

  try {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const category = String(req.body?.category || '').trim();

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

    const createdById = normalizeId(req.user?._id);
    const createdByRole = String(req.user?.role || '').toLowerCase();

    let fileMeta = null;
    if (kind === 'pdf' && req.file) {
      const file = req.file;
      const relPath = path.posix.join('uploads', 'library', String(file.filename || ''));
      const url = `/${path.posix.join('api', 'uploads', 'library', String(file.filename || ''))}`;
      fileMeta = {
        url,
        path: relPath,
        mimeType: String(file.mimetype || ''),
        size: Number(file.size || 0),
        originalName: String(file.originalname || ''),
        uploadedAt: new Date(),
      };
    }

    const doc = new LibraryResource({
      title,
      description: description || undefined,
      category: category || undefined,
      kind,
      linkUrl: kind === 'link' ? linkUrl : undefined,
      file: kind === 'pdf' ? fileMeta : null,
      createdById: createdById || undefined,
      createdByRole: createdByRole || undefined,
    });

    await doc.save();
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

    const filePath = String(doc?.file?.path || '').trim();
    await doc.deleteOne();

    if (filePath && filePath.startsWith('uploads/library/')) {
      const abs = path.join(__dirname, '..', filePath);
      try { await fs.unlink(abs); } catch { /* ignore */ }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('deleteLibraryResource error:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Server Error' });
  }
}
