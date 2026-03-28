import 'dotenv/config';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import {
  putLocalFileToRemote,
  getRemoteObjectStream,
  deleteRemoteObject,
  headRemoteObject,
} from '../services/uploadStorage.js';

async function readStreamToString(stream) {
  let out = '';
  for await (const chunk of stream) {
    out += Buffer.from(chunk).toString('utf8');
    if (out.length > 1024 * 64) break;
  }
  return out;
}

async function main() {
  process.env.UPLOADS_DRIVER = process.env.UPLOADS_DRIVER || 'b2';

  const now = Date.now();
  const tmp = path.join(os.tmpdir(), 'b2-smoke-' + now + '.txt');
  const key = 'uploads/_smoke/b2-' + now + '.txt';

  try {
    await fs.writeFile(tmp, 'hello');

    await putLocalFileToRemote({
      absPath: tmp,
      key,
      contentType: 'text/plain',
    });

    const head = await headRemoteObject({ key });
    if (!head) throw new Error('HEAD missing');

    const obj = await getRemoteObjectStream({ key });
    if (!obj) throw new Error('GET missing');

    const data = await readStreamToString(obj.body);
    if (data !== 'hello') throw new Error('Content mismatch: ' + data);

    await deleteRemoteObject(key);
    console.log('B2 smoke OK');
  } finally {
    try { await fs.unlink(tmp); } catch {}
    try { await deleteRemoteObject(key); } catch {}
  }
}

main().catch((e) => {
  const msg = e && e.message ? e.message : String(e);
  console.error('B2 smoke FAIL:', msg);
  process.exit(1);
});
