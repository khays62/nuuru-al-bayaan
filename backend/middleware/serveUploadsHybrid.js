import path from 'path';
import fsPromises from 'fs/promises';

import { getRemoteObjectStream, headRemoteObject, isRemoteUploadsEnabled } from '../services/uploadStorage.js';

function normalizeRelativePath(requestPath, { singleSegment }) {
  const raw = String(requestPath || '').trim();
  const noLeading = raw.replace(/^\/+/, '');
  if (!noLeading) return null;

  // Prevent path traversal
  const normalized = path.posix.normalize(noLeading);
  if (!normalized || normalized === '.' || normalized.startsWith('..') || normalized.includes('..')) return null;

  if (singleSegment) {
    if (normalized.includes('/')) return null;
  }

  return normalized;
}

async function fileExists(absPath) {
  try {
    const st = await fsPromises.stat(absPath);
    return st.isFile();
  } catch {
    return false;
  }
}

export function createUploadsHybridHandler({
  keyPrefix,
  localDirAbs,
  isDev,
  singleSegment = false,
}) {
  const safeKeyPrefix = String(keyPrefix || '').trim().replace(/^\/+/, '').replace(/\/+$/, '');
  const baseDir = path.resolve(String(localDirAbs || ''));

  if (!safeKeyPrefix || !safeKeyPrefix.startsWith('uploads')) {
    throw new Error('createUploadsHybridHandler: keyPrefix must start with uploads');
  }

  return async function serveUploadsHybrid(req, res) {
    const rel = normalizeRelativePath(req.path, { singleSegment });
    if (!rel) {
      return res.status(404).json({ success: false, message: req.t?.('common.notFound', null, 'Not found') || 'Not found' });
    }

    const localAbs = path.resolve(baseDir, rel);
    if (!localAbs.startsWith(baseDir + path.sep) && localAbs !== baseDir) {
      return res.status(404).json({ success: false, message: req.t?.('common.notFound', null, 'Not found') || 'Not found' });
    }

    // Prefer local filesystem (backward compatibility)
    if (await fileExists(localAbs)) {
      res.setHeader('Cache-Control', isDev ? 'no-store' : 'public, max-age=604800');
      return res.sendFile(localAbs);
    }

    if (!isRemoteUploadsEnabled()) {
      return res.status(404).json({ success: false, message: req.t?.('common.notFound', null, 'Not found') || 'Not found' });
    }

    const key = `${safeKeyPrefix}/${rel}`;
    const method = String(req.method || '').toUpperCase();

    try {
      if (method === 'HEAD') {
        const meta = await headRemoteObject({ key });
        if (!meta) {
          return res.status(404).json({ success: false, message: req.t?.('common.notFound', null, 'Not found') || 'Not found' });
        }

        if (meta.contentType) res.setHeader('Content-Type', meta.contentType);
        if (meta.contentLength != null) res.setHeader('Content-Length', String(meta.contentLength));
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', isDev ? 'no-store' : 'public, max-age=604800');
        return res.status(200).end();
      }

      const obj = await getRemoteObjectStream({ key, rangeHeader: req.headers?.range });
      if (!obj) {
        return res.status(404).json({ success: false, message: req.t?.('common.notFound', null, 'Not found') || 'Not found' });
      }

      if (obj.contentType) res.setHeader('Content-Type', obj.contentType);
      if (obj.contentLength != null) res.setHeader('Content-Length', String(obj.contentLength));
      if (obj.isPartial && obj.contentRange) {
        res.setHeader('Content-Range', obj.contentRange);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', isDev ? 'no-store' : 'public, max-age=604800');
        res.status(206);
      } else {
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', isDev ? 'no-store' : 'public, max-age=604800');
        res.status(200);
      }

      obj.body.on('error', () => {
        try {
          if (!res.headersSent) res.status(500);
        } catch {
          // ignore
        }
        try { res.end(); } catch { /* ignore */ }
      });

      return obj.body.pipe(res);
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: req.t?.('common.serverError', null, err?.message || 'Server error') || (err?.message || 'Server error'),
      });
    }
  };
}
