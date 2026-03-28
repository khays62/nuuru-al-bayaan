import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import fsPromises from 'fs/promises';

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

export function getUploadsDriver() {
  return env('UPLOADS_DRIVER', 'local').toLowerCase();
}

export function isRemoteUploadsEnabled() {
  return getUploadsDriver() === 'b2';
}

function requiredEnv(name) {
  const v = env(name);
  if (!v) {
    const err = new Error(`Missing ${name}`);
    err.code = 'MISSING_ENV';
    err.envName = name;
    throw err;
  }
  return v;
}

let cachedClient = null;
function getS3Client() {
  if (cachedClient) return cachedClient;

  const accessKeyId = requiredEnv('B2_KEY_ID');
  const secretAccessKey = requiredEnv('B2_APPLICATION_KEY');
  const endpoint = requiredEnv('B2_ENDPOINT');
  const region = env('B2_REGION', 'us-east-005');

  cachedClient = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    // Backblaze B2 S3 is path-style.
    forcePathStyle: true,
  });

  return cachedClient;
}

function getBucketName() {
  return requiredEnv('B2_BUCKET_NAME');
}

export function isSafeUploadsKey(key) {
  const k = String(key || '').trim().replace(/^\/+/, '');
  if (!k) return false;
  if (!k.startsWith('uploads/')) return false;
  if (k.includes('..')) return false;
  return true;
}

export async function putLocalFileToRemote({ absPath, key, contentType }) {
  if (!isRemoteUploadsEnabled()) return { ok: false, skipped: true };

  const safeKey = String(key || '').trim().replace(/^\/+/, '');
  if (!isSafeUploadsKey(safeKey)) {
    const err = new Error('Invalid uploads key');
    err.code = 'BAD_KEY';
    throw err;
  }

  await fsPromises.access(absPath, fs.constants.R_OK);

  const client = getS3Client();
  const Bucket = getBucketName();

  const cmd = new PutObjectCommand({
    Bucket,
    Key: safeKey,
    Body: fs.createReadStream(absPath),
    ContentType: String(contentType || '').trim() || undefined,
  });

  const resp = await client.send(cmd);
  return { ok: true, etag: resp?.ETag || null, key: safeKey };
}

export async function putBufferToRemote({ buffer, key, contentType }) {
  if (!isRemoteUploadsEnabled()) return { ok: false, skipped: true };

  const safeKey = String(key || '').trim().replace(/^\/+/, '');
  if (!isSafeUploadsKey(safeKey)) {
    const err = new Error('Invalid uploads key');
    err.code = 'BAD_KEY';
    throw err;
  }

  const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  const client = getS3Client();
  const Bucket = getBucketName();

  const cmd = new PutObjectCommand({
    Bucket,
    Key: safeKey,
    Body: body,
    ContentType: String(contentType || '').trim() || undefined,
  });

  const resp = await client.send(cmd);
  return { ok: true, etag: resp?.ETag || null, key: safeKey };
}

export async function deleteRemoteObject(key) {
  if (!isRemoteUploadsEnabled()) return { ok: false, skipped: true };

  const safeKey = String(key || '').trim().replace(/^\/+/, '');
  if (!isSafeUploadsKey(safeKey)) {
    return { ok: false, skipped: true };
  }

  const client = getS3Client();
  const Bucket = getBucketName();

  try {
    await client.send(new DeleteObjectCommand({ Bucket, Key: safeKey }));
    return { ok: true };
  } catch (err) {
    // Best-effort: treat missing as ok.
    const status = Number(err?.$metadata?.httpStatusCode);
    if (status === 404) return { ok: true, missing: true };
    return { ok: false, error: err };
  }
}

function parseRangeHeader(rangeHeader) {
  const value = String(rangeHeader || '').trim();
  if (!value) return null;
  const m = value.match(/^bytes=(\d*)-(\d*)$/i);
  if (!m) return null;

  const startRaw = m[1];
  const endRaw = m[2];

  const start = startRaw === '' ? null : Number(startRaw);
  const end = endRaw === '' ? null : Number(endRaw);

  if (start !== null && (!Number.isFinite(start) || start < 0)) return null;
  if (end !== null && (!Number.isFinite(end) || end < 0)) return null;
  if (start !== null && end !== null && end < start) return null;

  return { start, end };
}

export async function headRemoteObject({ key }) {
  if (!isRemoteUploadsEnabled()) return null;

  const safeKey = String(key || '').trim().replace(/^\/+/, '');
  if (!isSafeUploadsKey(safeKey)) return null;

  const client = getS3Client();
  const Bucket = getBucketName();

  try {
    const resp = await client.send(new HeadObjectCommand({ Bucket, Key: safeKey }));
    return {
      key: safeKey,
      contentType: resp?.ContentType || null,
      contentLength: Number(resp?.ContentLength || 0) || null,
      etag: resp?.ETag || null,
      lastModified: resp?.LastModified ? new Date(resp.LastModified) : null,
      acceptRanges: resp?.AcceptRanges || null,
    };
  } catch (err) {
    const status = Number(err?.$metadata?.httpStatusCode);
    if (status === 404) return null;
    throw err;
  }
}

export async function getRemoteObjectStream({ key, rangeHeader }) {
  if (!isRemoteUploadsEnabled()) return null;

  const safeKey = String(key || '').trim().replace(/^\/+/, '');
  if (!isSafeUploadsKey(safeKey)) return null;

  const range = parseRangeHeader(rangeHeader);

  const client = getS3Client();
  const Bucket = getBucketName();

  try {
    const resp = await client.send(new GetObjectCommand({
      Bucket,
      Key: safeKey,
      ...(range ? { Range: `bytes=${range.start ?? ''}-${range.end ?? ''}` } : {}),
    }));

    const body = resp?.Body;
    if (!body || typeof body.pipe !== 'function') {
      const err = new Error('Remote object body is not a stream');
      err.code = 'BAD_REMOTE_BODY';
      throw err;
    }

    const isPartial = Boolean(resp?.ContentRange);

    return {
      key: safeKey,
      body,
      isPartial,
      contentRange: resp?.ContentRange || null,
      contentType: resp?.ContentType || null,
      contentLength: Number(resp?.ContentLength || 0) || null,
      etag: resp?.ETag || null,
      lastModified: resp?.LastModified ? new Date(resp.LastModified) : null,
    };
  } catch (err) {
    const status = Number(err?.$metadata?.httpStatusCode);
    if (status === 404) return null;
    throw err;
  }
}
